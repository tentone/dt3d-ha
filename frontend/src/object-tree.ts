import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import componentStyles from "./object-tree.css?inline";
import type { Object3D } from "three";

import "./object-inspector.js";

type UUID = string;

interface TreeNode {
	// Unique identifier of the node
	id: UUID;
	// Display name of the node
	name: string;
	// Children nodes
	children?: TreeNode[];
}

type DropPosition = "before" | "after" | "inside";

@customElement("dt3d-tree")
export class DT3DTree extends LitElement {
	static styles = unsafeCSS(componentStyles);

	/**
	 * The 3D scene to visualize.
	 */
	@property({ type: Array })
	public scene: Object3D = null;

	/**
	 * Set of expanded node IDs.
	 */
	@state()
	private expanded: Set<UUID> = new Set([]);

	/**
	 * Currently selected node ID.
	 */
	@state()
	private selectedId: UUID = null;

	/**
	 * Tree data structure representing the 3D scene graph.
	 */
	private tree: TreeNode[] = [];

	/**
	 * Currently selected Object3D instance.
	 */
	@state()
	private selectedObject: Object3D | null = null;

	/**
	 * ID of the node being dragged.
	 */
	@state()
	private draggedId: UUID = null;

	/**
	 * Active drop target descriptor.
	 */
	@state()
	private dropTarget: { id: UUID; position: DropPosition } = null;

	/**
	 * Active context menu target and position.
	 */
	@state()
	private contextMenu: { id: UUID; x: number; y: number } | null = null;

	private resizing = false;

	private handleResizeMove = (event: MouseEvent) => {
		if (!this.resizing) {
			return;
		}

		const rect = this.getBoundingClientRect();
		const nextWidth = Math.min(Math.max(rect.right - event.clientX, 200), 420);
		this.style.width = `${nextWidth}px`;
	};

	private handleResizeEnd = () => {
		if (!this.resizing) {
			return;
		}

		this.resizing = false;
		document.body.style.cursor = "";
		window.removeEventListener("mousemove", this.handleResizeMove);
		window.removeEventListener("mouseup", this.handleResizeEnd);
	};

	private startResize(_event: MouseEvent) {
		this.resizing = true;
		document.body.style.cursor = "ew-resize";

		window.addEventListener("mousemove", this.handleResizeMove);
		window.addEventListener("mouseup", this.handleResizeEnd);
	}

	public disconnectedCallback(): void {
		super.disconnectedCallback();
		this.handleResizeEnd();
	}

	/**
	 * React to property changes.
	 *
	 * @param changedProps - Changed properties map.
	 */
	public updated(changedProps: Map<string, any>) {
		super.updated(changedProps);

		if (changedProps.has("scene") && this.scene) {
			this.updateTreeFromScene();
		}
	}

	/**
	 * Toggle the expanded/collapsed state of a node.
	 *
	 * @param id - The ID of the node to toggle.
	 */
	private toggleNode(id: UUID) {
		const expanded = new Set(this.expanded);
		if (expanded.has(id)) expanded.delete(id);
		else expanded.add(id);

		this.expanded = expanded;
	}

	/**
	 * Convert a Three.js scene into a tree structure.
	 *
	 * @param scene - The Three.js scene to convert into a tree structure.
	 */
	public updateTreeFromScene(scene?: Object3D, reset: boolean = false) {
		this.scene = scene || this.scene;

		console.log("DT3d: Updating tree from scene", scene, reset);

		const toTreeNode = (obj: Object3D): TreeNode => ({
			id: obj.uuid,
			name: obj.name || obj.type,
			children:
				obj.children.length > 0 ? obj.children.map(toTreeNode) : undefined,
		});

		this.tree = [toTreeNode(scene)];

		if (this.selectedId) {
			this.selectedObject =
				this.scene?.getObjectByProperty("uuid", this.selectedId) ?? null;
		}

		this.requestUpdate();

		// Reset expanded/selected state
		if (reset) {
			this.expanded = new Set([scene.uuid]);
			this.selectedId = null;
		}
	}

	// Find the parent ID of a given child ID in the tree.
	private findParentId(
		nodes: TreeNode[],
		childId: UUID,
		parentId: UUID = null,
	): UUID | null {
		for (const node of nodes) {
			if (node.id === childId) {
				return parentId;
			}

			if (node.children) {
				const result = this.findParentId(node.children, childId, node.id);
				if (result !== null) {
					return result;
				}
			}
		}

		return null;
	}

	// Check if ancestorId is an ancestor of nodeId in the tree.
	private isAncestor(ancestorId: UUID, nodeId: UUID): boolean {
		if (!ancestorId || !nodeId || ancestorId === nodeId) {
			return false;
		}

		const parentId = this.findParentId(this.tree, nodeId);
		if (parentId === null) {
			return false;
		}

		if (parentId === ancestorId) {
			return true;
		}

		return this.isAncestor(ancestorId, parentId);
	}

	// Check if a node can be dropped onto a target node.
	private canDrop(targetId: UUID, position: DropPosition): boolean {
		if (!this.draggedId || this.draggedId === targetId) {
			return false;
		}

		if (this.isAncestor(this.draggedId, targetId)) {
			return false;
		}

		if (position === "inside") {
			return true;
		}

		const parentId = this.findParentId(this.tree, targetId);
		if (parentId === null) {
			return false;
		}

		return true;
	}

	// Handle the start of a drag operation.
	private handleDragStart(event: DragEvent, id: UUID) {
		console.log("DT3D: Drag started for", id);

		// Set drag data
		event.dataTransfer?.setData("text/plain", id);
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = "move";
		}
		this.draggedId = id;
	}

	private handleDragEnd() {
		console.log("DT3D: Drag ended");

		this.draggedId = null;
		this.dropTarget = null;
	}

	private handleDragOver(event: DragEvent, id: UUID, position: DropPosition) {
		console.log("DT3D: Drag over", id, position);

		if (!this.canDrop(id, position)) {
			return;
		}

		event.preventDefault();
		if (event.dataTransfer) {
			event.dataTransfer.dropEffect = "move";
		}

		this.dropTarget = { id, position };
	}

	private handleDragLeave(_event: DragEvent, id: UUID, position: DropPosition) {
		console.log("DT3D: Drag leave", id, position);

		if (
			this.dropTarget &&
			this.dropTarget.id === id &&
			this.dropTarget.position === position
		) {
			this.dropTarget = null;
		}
	}

	private handleDrop(event: DragEvent, id: UUID, position: DropPosition) {
		console.log("DT3D: Drop on", id, position);

		if (!this.canDrop(id, position)) {
			return;
		}

		event.preventDefault();
		const sourceId =
			event.dataTransfer?.getData("text/plain") || this.draggedId;
		if (!sourceId) {
			return;
		}

		if (position === "inside") {
			const expanded = new Set(this.expanded);
			expanded.add(id);
			this.expanded = expanded;
		}

		this.dispatchEvent(
			new CustomEvent("object-dropped", {
				detail: { sourceId, targetId: id, position },
				bubbles: true,
				composed: true,
			}),
		);

		this.draggedId = null;
		this.dropTarget = null;
	}

	private renderDropZone(id: UUID, position: DropPosition, depth: number): any {
		if (!this.draggedId || (depth === 0 && position !== "inside")) {
			return null;
		}

		const classes = ["drop-zone"];
		if (this.draggedId) {
			classes.push("visible");
		}

		if (
			this.dropTarget &&
			this.dropTarget.id === id &&
			this.dropTarget.position === position
		) {
			classes.push("active");
		}

		return html`
			<div
				class="${classes.join(" ")}"
				@dragover=${(dragEvent: DragEvent) =>
					this.handleDragOver(dragEvent, id, position)}
				@dragleave=${(dragEvent: DragEvent) =>
					this.handleDragLeave(dragEvent, id, position)}
				@drop=${(dragEvent: DragEvent) =>
					this.handleDrop(dragEvent, id, position)}
			></div>
		`;
	}

	/**
	 * Select a node by its ID, dispatching an event.
	 *
	 * @param id - The ID of the node to select.
	 */
	private selectNode(id: UUID) {
		this.selectedId = id;

		this.selectedObject = this.scene?.getObjectByProperty("uuid", id) ?? null;

		this.dispatchEvent(
			new CustomEvent("object-selected", {
				detail: { id },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleContextMenu(event: MouseEvent, id: UUID) {
		event.preventDefault();
		event.stopPropagation();
		this.contextMenu = { id, x: event.clientX, y: event.clientY };
	}

	private closeContextMenu() {
		this.contextMenu = null;
	}

	private dispatchDelete(id: UUID) {
		this.dispatchEvent(
			new CustomEvent("object-delete", {
				detail: { id },
				bubbles: true,
				composed: true,
			}),
		);
		this.closeContextMenu();
	}

	private dispatchClone(id: UUID) {
		this.dispatchEvent(
			new CustomEvent("object-clone", {
				detail: { id },
				bubbles: true,
				composed: true,
			}),
		);
		this.closeContextMenu();
	}

	/**
	 * Refresh the inspector panel when the selected object changes externally.
	 */
	public refreshSelectedObject() {
		if (!this.selectedId || !this.scene) {
			return;
		}

		this.selectedObject =
			this.scene.getObjectByProperty("uuid", this.selectedId) ?? null;
		this.requestUpdate();
	}

	private handleObjectUpdated() {
		if (!this.scene) return;

		this.updateTreeFromScene();
	}

	private renderContextMenu() {
		if (!this.contextMenu) return null;

		const { id, x, y } = this.contextMenu;

		return html`
			<div
				class="context-overlay"
				@click=${() => this.closeContextMenu()}
			></div>
			<div class="context-menu" style="top:${y}px; left:${x}px;">
				<button
					@click=${(event: MouseEvent) => {
						event.stopPropagation();
						this.dispatchDelete(id);
					}}
				>
					Delete
				</button>
				<button
					@click=${(event: MouseEvent) => {
						event.stopPropagation();
						this.dispatchClone(id);
					}}
				>
					Clone
				</button>
			</div>
		`;
	}

	/**
	 * Render the tree recursively.
	 *
	 * @param nodes - The tree nodes to render.
	 * @returns Rendered HTML template.
	 */
	private renderTree(nodes: TreeNode[], depth: number = 0): any {
		return html`
			<ul style="list-style: none; margin: 0; padding: 0;">
				${nodes.map(
					(node) => html`
						<li>
							${this.renderDropZone(node.id, "before", depth)}
							<div
								class="tree-node ${this.selectedId === node.id
									? "selected"
									: ""} ${this.draggedId === node.id ? "dragging" : ""} ${this
									.dropTarget &&
								this.dropTarget.id === node.id &&
								this.dropTarget.position === "inside"
									? "drop-target"
									: ""}"
								draggable=${depth > 0}
								@dragstart=${(dragEvent: DragEvent) =>
									this.handleDragStart(dragEvent, node.id)}
								@dragend=${() => this.handleDragEnd()}
								@dragover=${(dragEvent: DragEvent) =>
									this.handleDragOver(dragEvent, node.id, "inside")}
								@dragleave=${(dragEvent: DragEvent) =>
									this.handleDragLeave(dragEvent, node.id, "inside")}
								@drop=${(dragEvent: DragEvent) =>
									this.handleDrop(dragEvent, node.id, "inside")}
								@click=${() => this.selectNode(node.id)}
								@contextmenu=${(event: MouseEvent) =>
									this.handleContextMenu(event, node.id)}
							>
								${node.children && node.children.length
									? html`
											<span
												class="toggle"
												@click=${(e: Event) => {
													e.stopPropagation();
													this.toggleNode(node.id);
												}}
											>
												${this.expanded.has(node.id) ? "▼" : "▶"}
											</span>
										`
									: html`<span style="display:inline-block;width:16px"></span>`}
								${node.name}
							</div>
							${node.children &&
							node.children.length &&
							this.expanded.has(node.id)
								? this.renderTree(node.children, depth + 1)
								: null}
							${this.renderDropZone(node.id, "after", depth)}
						</li>
					`,
				)}
			</ul>
		`;
	}

	public render() {
		return html`
			<div
				class="resize-handle"
				@mousedown=${(event: MouseEvent) => this.startResize(event)}
			></div>
			<div class="panel">
				<div class="tree-section">${this.renderTree(this.tree)}</div>
				<dt3d-object-inspector
					.selectedObject=${this.selectedObject}
					@object-updated=${this.handleObjectUpdated}
				></dt3d-object-inspector>
				${this.renderContextMenu()}
			</div>
		`;
	}
}
