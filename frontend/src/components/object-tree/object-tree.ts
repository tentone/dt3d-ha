import "../object-inspector/object-inspector.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {repeat} from "lit/directives/repeat.js";
import type {Object3D} from "three";
import {Camera, Group, Light, Line, Mesh, Points, Scene, Sprite} from "three";

import {resolveMeshType} from "../../editor/mesh-handler.js";
import {localManager} from "../../locale/locale.js";
import {DTObject} from "../../objects/dt-object.js";
import {EntityObject, isToggleable} from "../../objects/entity-object.js";
import {DoorObject} from "../../objects/house/door.js";
import {WallObject} from "../../objects/house/wall.js";
import {WindowObject} from "../../objects/house/window.js";
import {ViewportObject} from "../../objects/viewport-object.js";
import {LocalStorage} from "../../utils/local-storage.js";
import componentStyles from "./object-tree.css?inline";

type UUID = string;

const DEFAULT_NODE_ICON = "mdi:help-circle-outline";

const ENTITY_DOMAIN_ICONS: Record<string, string> = {
	alarm_control_panel: "mdi:shield-home",
	automation: "mdi:robot",
	binary_sensor: "mdi:checkbox-marked-circle-outline",
	button: "mdi:gesture-tap-button",
	camera: "mdi:cctv",
	climate: "mdi:thermometer",
	cover: "mdi:window-shutter",
	device_tracker: "mdi:crosshairs-gps",
	fan: "mdi:fan",
	humidifier: "mdi:air-humidifier",
	input_boolean: "mdi:toggle-switch-outline",
	light: "mdi:lightbulb",
	lock: "mdi:lock",
	media_player: "mdi:play-box-outline",
	number: "mdi:numeric",
	person: "mdi:account",
	remote: "mdi:remote",
	scene: "mdi:palette",
	script: "mdi:script-text-outline",
	select: "mdi:format-list-bulleted",
	sensor: "mdi:gauge",
	switch: "mdi:toggle-switch",
	update: "mdi:update",
	vacuum: "mdi:robot-vacuum",
	valve: "mdi:valve",
	water_heater: "mdi:water-boiler",
	weather: "mdi:weather-partly-cloudy",
};

const BINARY_SENSOR_DEVICE_CLASS_ICONS: Record<string, string> = {
	connectivity: "mdi:power-socket",
	door: "mdi:door",
	garage_door: "mdi:garage",
	gas: "mdi:smoke-detector",
	moisture: "mdi:leak",
	motion: "mdi:motion-sensor",
	occupancy: "mdi:motion-sensor",
	opening: "mdi:door-open",
	plug: "mdi:power-socket",
	presence: "mdi:motion-sensor",
	problem: "mdi:alert-circle-outline",
	safety: "mdi:shield-home",
	smoke: "mdi:smoke-detector",
	window: "mdi:window-closed-variant",
};

const MESH_TYPE_ICONS: Record<string, string> = {
	capsule: "mdi:stadium-outline",
	circle: "mdi:circle-outline",
	cone: "mdi:cone",
	cube: "mdi:cube-outline",
	cylinder: "mdi:cylinder",
	dodecahedron: "mdi:octahedron",
	icosahedron: "mdi:octahedron",
	octahedron: "mdi:octahedron",
	plane: "mdi:rectangle-outline",
	ring: "mdi:circle-outline",
	sphere: "mdi:sphere",
	tetrahedron: "mdi:pyramid",
	torus: "mdi:circle-double",
	torusKnot: "mdi:vector-polyline",
};

interface TreeNode {
	// Unique identifier of the node
	id: UUID;
	// Display name of the node
	name: string;
	// Home Assistant icon name for this object type
	icon: string;
	// Locked state for DTObjects
	locked?: boolean;
	// Entity ID if the node represents an EntityObject
	entityId?: string;
	// Whether the node represents a saved viewport object
	viewport?: boolean;
	// Whether a viewport node is currently the default viewport
	defaultViewport?: boolean;
	// Whether the node's entity supports toggling
	toggleable?: boolean;
	// Children nodes
	children?: TreeNode[];
}

const TREE_WIDTH_STORAGE_KEY = "object-tree-width";
const TREE_COLLAPSED_STORAGE_KEY = "object-tree-collapsed";

@customElement("dt3d-tree")
export class DT3DTree extends LitElement {
	static styles = unsafeCSS(componentStyles);

	/**
	 * Indicates whether the object tree explorer is collapsed.
	 */
	@property({type: Boolean, reflect: true})
	public collapsed =
			LocalStorage.read(TREE_COLLAPSED_STORAGE_KEY, false) ?? false;

	/**
	 * The 3D scene to visualize.
	 */
	@property({type: Array})
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
	 * Toggle the visibility of the object tree explorer.
	 */
	private toggleCollapse(): void {
		this.collapsed = !this.collapsed;
		this.style.width = this.collapsed ? "0px" : this.width + "px";
		LocalStorage.write(TREE_COLLAPSED_STORAGE_KEY, this.collapsed);

		if (this.collapsed) {
			this.closeContextMenu();
			this.handleResizeEnd();
		}
	}

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

		this.style.width = this.collapsed ? "0px" : this.width + "px";
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
	 * @param reset - When true, rebuild tree state and collapse everything except the root.
	 */
	public updateTreeFromScene(scene?: Object3D, reset: boolean = false) {
		const targetScene = scene ?? this.scene;
		if (!targetScene) {
			return;
		}

		this.scene = targetScene;

		if (!reset) {
			this.updateTreeDiff(targetScene);
			return;
		}

		console.log("DT3d: Rebuilding tree from scene", targetScene, reset);

		const root = this.createTreeNode(targetScene);
		this.tree = root ? [root] : [];

		if (this.selectedId) {
			this.selectedObject =
				this.scene?.getObjectByProperty("uuid", this.selectedId) ?? null;
		}

		this.requestUpdate();

		// Reset expanded/selected state
		if (reset) {
			this.expanded = new Set([targetScene.uuid]);
			this.selectedId = null;
		}
	}

	/**
	 * Reconcile the existing tree with the current Three.js scene graph.
	 *
	 * Existing nodes are reused by UUID and only their metadata/children are updated.
	 * This preserves expanded state and gives Lit stable keyed nodes to patch instead
	 * of rebuilding the whole rendered tree.
	 *
	 * @param scene - Scene or object subtree to diff into the current tree.
	 */
	public updateTreeDiff(scene?: Object3D): void {
		const targetScene = scene ?? this.scene;
		if (!targetScene) {
			return;
		}

		this.scene = targetScene;

		console.log("DT3d: Diffing tree from scene", targetScene);

		const existingRoot = this.tree.find((node) => node.id === targetScene.uuid) ?? null;
		const root = this.syncTreeNode(targetScene, existingRoot);
		this.tree = root ? [root] : [];

		if (root && !existingRoot) {
			this.expanded = new Set([...this.expanded, root.id]);
		}

		this.pruneExpandedState();

		if (this.selectedId) {
			this.selectedObject =
				this.scene?.getObjectByProperty("uuid", this.selectedId) ?? null;

			if (!this.selectedObject) {
				this.selectedId = null;
			}
		}

		this.requestUpdate();
	}

	/**
	 * Create a tree node from a Three.js object and all non-internal descendants.
	 *
	 * @param obj - Object to convert.
	 */
	private createTreeNode(obj: Object3D): TreeNode | null {
		if (obj?.internal === true) {
			return null;
		}

		const children = obj.children
			.map((child) => this.createTreeNode(child))
			.filter((child): child is TreeNode => child !== null);

		return {
			...this.getNodeMetadata(obj),
			children: children.length > 0 ? children : undefined,
		};
	}

	/**
	 * Update or create a tree node for an object while preserving matching child nodes.
	 *
	 * @param obj - Object to reconcile.
	 * @param existing - Existing tree node with the same UUID, if present.
	 */
	private syncTreeNode(obj: Object3D, existing: TreeNode | null): TreeNode | null {
		if (obj?.internal === true) {
			return null;
		}

		const node = existing ?? this.getNodeMetadata(obj);
		const existingChildren = new Map(
			(existing?.children ?? []).map((child) => [child.id, child]),
		);
		const children = obj.children
			.map((child) => this.syncTreeNode(
				child,
				existingChildren.get(child.uuid) ?? null,
			))
			.filter((child): child is TreeNode => child !== null);
		const metadata = this.getNodeMetadata(obj);

		node.name = metadata.name;
		node.icon = metadata.icon;
		node.locked = metadata.locked;
		node.entityId = metadata.entityId;
		node.viewport = metadata.viewport;
		node.defaultViewport = metadata.defaultViewport;
		node.toggleable = metadata.toggleable;

		if (children.length > 0) {
			node.children = children;
		} else {
			delete node.children;
		}

		return node;
	}

	/**
	 * Build display metadata for a tree node.
	 *
	 * @param obj - Source object.
	 */
	private getNodeMetadata(obj: Object3D): TreeNode {
		return {
			id: obj.uuid,
			name: obj.name || obj.type,
			icon: this.getObjectIcon(obj),
			locked: obj instanceof DTObject ? obj.locked : false,
			entityId: obj instanceof EntityObject ? obj.entityId : undefined,
			viewport: obj instanceof ViewportObject,
			defaultViewport: obj instanceof ViewportObject ? obj.defaultViewport : undefined,
			toggleable: obj instanceof EntityObject && isToggleable(obj),
		};
	}

	/**
	 * Resolve the HA icon for an object tree node.
	 *
	 * @param obj - Source object.
	 */
	private getObjectIcon(obj: Object3D): string {
		if (obj instanceof EntityObject) {
			return this.getEntityIcon(obj);
		}

		if (obj instanceof ViewportObject) {
			return "mdi:camera-marker-outline";
		}

		if (obj instanceof WallObject) {
			return "mdi:wall";
		}

		if (obj instanceof DoorObject) {
			return obj.open ? "mdi:door-open" : "mdi:door";
		}

		if (obj instanceof WindowObject) {
			return obj.open ? "mdi:window-open-variant" : "mdi:window-closed-variant";
		}

		const meshType = resolveMeshType(obj);
		if (meshType) {
			return MESH_TYPE_ICONS[meshType] ?? "mdi:shape-outline";
		}

		if (obj instanceof Mesh) {
			return "mdi:shape-outline";
		}

		if (obj instanceof Light) {
			return "mdi:lightbulb-on-outline";
		}

		if (obj instanceof Camera) {
			return "mdi:camera-outline";
		}

		if (obj instanceof Line) {
			return "mdi:vector-line";
		}

		if (obj instanceof Points) {
			return "mdi:dots-triangle";
		}

		if (obj instanceof Sprite) {
			return "mdi:image-outline";
		}

		if (obj instanceof Scene) {
			return "mdi:file-tree-outline";
		}

		if (obj instanceof Group) {
			return "mdi:folder-outline";
		}

		return DEFAULT_NODE_ICON;
	}

	/**
	 * Resolve the HA icon for an entity object from entity attributes or domain.
	 *
	 * @param object - Entity object to inspect.
	 */
	private getEntityIcon(object: EntityObject): string {
		const entity = object.getEntity();
		const explicitIcon = entity?.attributes?.icon;
		if (typeof explicitIcon === "string" && explicitIcon.includes(":")) {
			return explicitIcon;
		}

		const domain = object.entityId.split(".")[0];
		const deviceClass = entity?.attributes?.device_class;
		if (domain === "binary_sensor" && typeof deviceClass === "string") {
			return BINARY_SENSOR_DEVICE_CLASS_ICONS[deviceClass] ?? ENTITY_DOMAIN_ICONS[domain];
		}

		return ENTITY_DOMAIN_ICONS[domain] ?? "mdi:state-machine";
	}

	/**
	 * Remove expanded IDs for nodes that no longer exist after a diff update.
	 */
	private pruneExpandedState(): void {
		const validIds = new Set<UUID>();
		const collectIds = (nodes: TreeNode[]) => {
			for (const node of nodes) {
				validIds.add(node.id);
				if (node.children) {
					collectIds(node.children);
				}
			}
		};

		collectIds(this.tree);
		this.expanded = new Set(
			[...this.expanded].filter((id) => validIds.has(id)),
		);
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
					detail: {id},
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
		this.openContextMenu(id, event.clientX, event.clientY);
	}

	/**
	 * Open the context menu for an object at viewport coordinates.
	 *
	 * @param id - ID of the object that opened the context menu.
	 * @param x - Viewport X coordinate.
	 * @param y - Viewport Y coordinate.
	 */
	public openContextMenu(id: UUID, x: number, y: number): void {
		this.contextMenu = {id, x, y};
	}

	/**
	 * Close the context menu.
	 */
	public closeContextMenu(): void {
		this.contextMenu = null;
	}

	/**
	 * Dispatch a object delete event.
	 * @param id - UUID of the object to be clones.
	 */
	private dispatchDelete(id: UUID) {
		this.dispatchEvent(
			new CustomEvent("object-delete", {
				detail: {id},
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
				detail: {id},
				bubbles: true,
				composed: true,
			}),
		);
		this.closeContextMenu();
	}

	/**
	 * Dispatch open-entity event for the given entity ID.
	 *
	 * @param entityId - Home Assistant entity ID to open.
	 */
	private dispatchOpenEntity(entityId: string) {
		this.dispatchEvent(
			new CustomEvent("entity-open", {
				detail: {entityId},
				bubbles: true,
				composed: true,
			}),
		);
		this.closeContextMenu();
	}

	/**
	 * Dispatch entity-toggle event for the given object ID.
	 *
	 * @param id - UUID of the object whose entity should be toggled.
	 */
	private dispatchToggle(id: UUID) {
		this.dispatchEvent(
			new CustomEvent("entity-toggle", {
				detail: {id},
				bubbles: true,
				composed: true,
			}),
		);
		this.closeContextMenu();
	}

	/**
	 * Dispatch viewport-default event for the given object ID.
	 *
	 * @param id - UUID of the viewport object to mark as default.
	 */
	private dispatchSetDefaultViewport(id: UUID) {
		this.dispatchEvent(
			new CustomEvent("viewport-set-default", {
				detail: {id},
				bubbles: true,
				composed: true,
			}),
		);
		this.closeContextMenu();
	}

	/**
	 * Dispatch viewport-update event for the given object ID.
	 *
	 * @param id - UUID of the viewport object to update from the active camera.
	 */
	private dispatchUpdateViewport(id: UUID) {
		this.dispatchEvent(
			new CustomEvent("viewport-update", {
				detail: {id},
				bubbles: true,
				composed: true,
			}),
		);
		this.closeContextMenu();
	}

	/**
	 * Find a tree node by its ID.
	 *
	 * @param nodes - Tree nodes to search.
	 * @param id - UUID to look for.
	 */
	private findNodeById(nodes: TreeNode[], id: UUID): TreeNode | null {
		for (const node of nodes) {
			if (node.id === id) {
				return node;
			}

			if (node.children) {
				const found = this.findNodeById(node.children, id);
				if (found) {
					return found;
				}
			}
		}

		return null;
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

		this.updateTreeDiff(this.scene);
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

		const {id, x, y} = this.contextMenu;
		const node = this.findNodeById(this.tree, id);

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
					${localManager.get("delete")}
				</button>
				<button
					@click=${(event: MouseEvent) => {
						event.stopPropagation();
						this.dispatchClone(id);
					}}
				>
					${localManager.get("clone")}
				</button>
				${node?.entityId
				? html`
					<button
						@click=${(event: MouseEvent) => {
							event.stopPropagation();
							this.dispatchOpenEntity(node.entityId!);
						}}
					>
						${localManager.get("viewEntity")}
					</button>`
				: null}
				${node?.toggleable
				? html`
					<button
						@click=${(event: MouseEvent) => {
							event.stopPropagation();
							this.dispatchToggle(id);
						}}
					>
						${localManager.get("toggleEntity")}
					</button>`
				: null}
				${node?.viewport
				? html`
					<button
						@click=${(event: MouseEvent) => {
							event.stopPropagation();
							this.dispatchSetDefaultViewport(id);
						}}
					>
						${localManager.get("setDefaultViewport")}
					</button>
					<button
						@click=${(event: MouseEvent) => {
							event.stopPropagation();
							this.dispatchUpdateViewport(id);
						}}
					>
						${localManager.get("updateViewport")}
					</button>`
				: null}
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
				${repeat(
		nodes,
		(node) => node.id,
		(node) => html`
						<li>
							<!-- Node -->
							<div
								class="tree-node ${this.selectedId === node.id ? "selected" : ""}"
								style=${`--tree-depth: ${depth};`}
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
		: html`<span class="toggle-spacer"></span>`}
								<ha-icon
									class="node-icon"
									icon=${node.icon}
									aria-hidden="true"
								></ha-icon>
								<span class="node-label">
									<span class="label-text">${node.name}</span>
									${node.locked
		? html`<ha-icon
												class="lock-icon"
												icon="mdi:lock"
												title=${localManager.get("lockedTitle")}
											></ha-icon>`
		: null}
									${node.defaultViewport
		? html`<ha-icon
												class="default-viewport-icon"
												icon="mdi:star"
												title=${localManager.get("defaultViewport")}
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
		const collapseLabel = localManager.get(
			this.collapsed ? "expandObjectTree" : "collapseObjectTree",
		);

		return html`
			<button
				class="collapse-btn"
				@click=${this.toggleCollapse}
				aria-label=${collapseLabel}
				title=${collapseLabel}
			>
				<ha-icon
					icon=${this.collapsed
						? "mdi:arrow-left-drop-circle-outline"
						: "mdi:arrow-right-drop-circle-outline"}
				></ha-icon>
			</button>
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
