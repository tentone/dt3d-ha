import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import componentStyles from "./object-tree.css?inline";
import type { Object3D } from "three";
import { DTObject } from "../../objects/dt-object.js";

import {LocalStorage} from "../../utils/local-storage.js";
import "./object-inspector.js";

type UUID = string;

interface TreeNode {
	// Unique identifier of the node
	id: UUID;
	// Display name of the node
	name: string;
	// Locked state for DTObjects
	locked?: boolean;
	// Children nodes
	children?: TreeNode[];
}

const TREE_WIDTH_STORAGE_KEY = "object-tree-width";

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
	 * Data of the context menu, (object id and context menu position).
	 */
	@state()
	private contextMenu: { id: UUID; x: number; y: number } | null = null;

	/**
	 * Object tree resizing flag. Set true when the
	 */
	private resizing = false;

	/**
	 * Initial position of the mouse when resizing.
	 */
	private resizeStartX = 0;

	/**
	 * Width of the element.
	 */
	private width = LocalStorage.read(TREE_WIDTH_STORAGE_KEY, 220) ?? 220;

	private resizeInitialSize = 0;

	/**
	 * Handle the resize move event.
	 *
	 * @param event - Mouse event when resizing the tree.
	 */
	private handleResizeMove = (event: MouseEvent) => {
		if (!this.resizing) {
			return;
		}

		const newWidth =
			this.resizeInitialSize + (this.resizeStartX - event.clientX);

		if (newWidth > 50 && newWidth < document.body.clientWidth / 2) {
			this.width = newWidth;
			this.style.width = this.width + "px";
		}
	};

	/**
	 * Stop the resizing operation.
	 *
	 * Destroys event listeners and resets state.
	 */
	private handleResizeEnd = () => {
		if (!this.resizing) {
			return;
		}

		this.resizing = false;

		LocalStorage.write(TREE_WIDTH_STORAGE_KEY, this.width);

		document.body.style.cursor = "";
		window.removeEventListener("mousemove", this.handleResizeMove);
		window.removeEventListener("mouseup", this.handleResizeEnd);
	};

	/**
	 * Start the resizing process.
	 *
	 * @param event - Pointer event
	 */
	private handleResizeStart(event: MouseEvent) {
		this.resizing = true;
		this.resizeStartX = event.clientX;
		this.resizeInitialSize = this.width;

		document.body.style.cursor = "ew-resize";

		window.addEventListener("mousemove", this.handleResizeMove);
		window.addEventListener("mouseup", this.handleResizeEnd);
	}

	public connectedCallback(): void {
		super.connectedCallback();

		this.style.width = this.width + "px";
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
		if (!scene) {
			return;
		}

		this.scene = scene || this.scene;

		console.log("DT3d: Updating tree from scene", scene, reset);

		const toTreeNode = (obj: Object3D): TreeNode | null => {
			if (obj?.internal === true) {
				return null;
			}

			const children =
				obj.children.length > 0
					? obj.children
							.map(toTreeNode)
							.filter((child): child is TreeNode => child !== null)
					: [];

			return {
				id: obj.uuid,
				name: obj.name || obj.type,
				locked: obj instanceof DTObject ? obj.locked : false,
				children: children.length > 0 ? children : undefined,
			};
		};

		const root = toTreeNode(scene);
		this.tree = root ? [root] : [];

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

	/**
	 * Find the parent ID of a given child ID in the tree.
	 *
	 * @param nodes - Tree nodes.
	 * @param childId - Child UUID
	 * @param parentId - Parent UUID
	 */
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

	/**
	 * Check if ancestorId is an ancestor of nodeId in the tree.
	 *
	 * @param ancestorId - Ancestor ID
	 * @param nodeId - Node ID
	 */
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

	/**
	 * Select a object by its ID, dispatching an event.
	 *
	 * @param id - The ID of the node to select.
	 * @param event - If select event shoudl be dispatched.
	 */
	public selectObject(id: UUID, event: boolean = false) {
		this.selectedId = id;
		this.selectedObject = this.scene?.getObjectByProperty("uuid", id) ?? null;

		if (event) {
			this.dispatchEvent(
				new CustomEvent("object-selected", {
					detail: { id },
					bubbles: true,
					composed: true,
				}),
			);
		}

	}

	/**
	 * Open the context menu, in a specific position.
	 *
	 * @param event - Mouse event with the position to open the context menu.
	 * @param id - ID of the object that opened the context menu.
	 */
	private handleContextMenu(event: MouseEvent, id: UUID) {
		event.preventDefault();
		event.stopPropagation();
		this.contextMenu = { id, x: event.clientX, y: event.clientY };
	}

	/**
	 * Close the context menu.
	 */
	private closeContextMenu() {
		this.contextMenu = null;
	}

	/**
	 * Dispatch a object delete event. 
	 * @param id - UUID of the object to be clones.
	 */
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

	/**
	 * Dispatch clone event.
	 * 
	 * @param id - ID of the object to be cloned.
	 */
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
	 *
	 * Must be called when changes are applied.
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

		this.updateTreeFromScene(this.scene);
	}


	/**
	 * Render a context menu when the user right clicks a object in the tree.
	 *
	 * @returns - Context menu object.
	 */
	private renderContextMenu() {
		if (!this.contextMenu) {
			return null;
		}

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
					${"Delete"}
				</button>
				<button
					@click=${(event: MouseEvent) => {
						event.stopPropagation();
						this.dispatchClone(id);
					}}
				>
					${"Clone"}
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
							<!-- Node -->
							<div
								class="tree-node ${this.selectedId === node.id ? "selected" : ""}"
								@click=${() => this.selectObject(node.id, true)}
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
								<span class="node-label">
									${node.name}
									${node.locked
										? html`<ha-icon
												class="lock-icon"
												icon="mdi:lock"
												title="Locked"
											></ha-icon>`
										: null}
								</span>
							</div>
							${node.children &&
							node.children.length &&
							this.expanded.has(node.id) ? this.renderTree(node.children, depth + 1) : null}
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
				@mousedown=${(event: MouseEvent) => this.handleResizeStart(event)}
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
