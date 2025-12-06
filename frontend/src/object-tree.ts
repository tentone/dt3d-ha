import { LitElement, html, css } from "lit";
import { customElement, property, state } from 'lit/decorators.js';
import type { Object3D } from "three";

type UUID = string;

interface TreeNode {
    // Unique identifier of the node
    id: UUID;
    // Display name of the node
    name: string;
    // Children nodes
    children?: TreeNode[];
}

type DropPosition = 'before' | 'after' | 'inside';

@customElement('dt3d-tree')
export class DT3DTree extends LitElement {

    static styles = [ css`
        :host {
            display: flex;
            flex-direction: column;
            width: 220px;
            background: color-mix(in srgb, var(--ha-color-neutral-10) 90%, transparent);
            color: var(--ha-color-neutral-95);
            height: 100%;
            padding: 12px 0;
            z-index: 1;
            transition: width 0.2s;
            overflow: hidden;
            position: relative;
        }
        .panel {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .tree-node {
            padding-left: 16px;
            cursor: pointer;
            user-select: none;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
            color: var(--ha-color-neutral-95);
        }
        .tree-node.selected {
            background: color-mix(in srgb, var(--ha-color-primary-60) 40%, transparent);
            color: var(--ha-color-neutral-95);
        }
        .tree-node.dragging {
            opacity: 0.6;
        }
        .tree-node.drop-target {
            background: color-mix(in srgb, var(--ha-color-primary-60) 35%, transparent);
        }
        .toggle {
            cursor: pointer;
            margin-right: 4px;
            color: var(--ha-color-primary-60);
        }
        .drop-zone {
            height: 6px;
            margin: 2px 0;
            border: 1px dashed transparent;
        }
        .drop-zone.visible {
            border-color: color-mix(in srgb, var(--ha-color-primary-60) 30%, transparent);
        }
        .drop-zone.active {
            border-color: var(--ha-color-primary-60);
            background: color-mix(in srgb, var(--ha-color-primary-60) 35%, transparent);
        }
        .tree-section {
            flex: 1 1 55%;
            min-height: 40%;
            overflow-y: auto;
            overflow-x: hidden;
            padding-right: 8px;
            border-bottom: 1px solid color-mix(in srgb, var(--ha-color-neutral-20) 60%, transparent);
            margin-bottom: 8px;
        }
        .inspector {
            flex: 1 1 45%;
            padding: 0 12px;
            overflow-y: auto;
            color: var(--ha-color-neutral-90);
        }
        .inspector h4 {
            margin: 4px 0 8px 0;
            font-size: 14px;
            color: var(--ha-color-primary-60);
        }
        .field {
            display: flex;
            flex-direction: column;
            margin-bottom: 8px;
            gap: 4px;
        }
        .field label {
            font-size: 12px;
            color: var(--ha-color-neutral-80);
        }
        .field input {
            background: color-mix(in srgb, var(--ha-color-neutral-10) 95%, transparent);
            border: 1px solid color-mix(in srgb, var(--ha-color-neutral-30) 80%, transparent);
            border-radius: 4px;
            padding: 6px 8px;
            color: var(--ha-color-neutral-90);
        }
        .group-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
        }
        .group-row label {
            display: flex;
            flex-direction: column;
            gap: 4px;
            font-size: 12px;
            color: var(--ha-color-neutral-80);
        }
        .group-row input {
            width: 100%;
            padding: 6px 8px;
            box-sizing: border-box;
            border-radius: 4px;
            border: 1px solid color-mix(in srgb, var(--ha-color-neutral-30) 80%, transparent);
            background: color-mix(in srgb, var(--ha-color-neutral-10) 95%, transparent);
            color: var(--ha-color-neutral-90);
        }
        .placeholder {
            color: var(--ha-color-neutral-70);
            font-size: 13px;
            line-height: 1.4;
        }
        .context-overlay {
            position: absolute;
            inset: 0;
            background: transparent;
            z-index: 10;
        }
        .context-menu {
            position: fixed;
            min-width: 140px;
            background: color-mix(in srgb, var(--ha-color-neutral-10) 90%, transparent);
            border: 1px solid color-mix(in srgb, var(--ha-color-neutral-30) 80%, transparent);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
            border-radius: 6px;
            padding: 4px 0;
            z-index: 11;
        }
        .context-menu button {
            display: flex;
            width: 100%;
            padding: 8px 12px;
            background: transparent;
            border: none;
            color: var(--ha-color-neutral-95);
            text-align: left;
            cursor: pointer;
        }
        .context-menu button:hover {
            background: color-mix(in srgb, var(--ha-color-primary-60) 25%, transparent);
        }
    `];
    
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

    /**
     * React to property changes.
     * 
     * @param changedProps - Changed properties map.
     */
    public updated(changedProps: Map<string, any>) {
        super.updated(changedProps);

        if (changedProps.has('scene') && this.scene) {
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

        console.log('DT3d: Updating tree from scene', scene, reset);

        const toTreeNode = (obj: Object3D): TreeNode => ({
            id: obj.uuid,
            name: obj.name || obj.type,
            children: obj.children.length > 0 ? obj.children.map(toTreeNode) : undefined
        });

        this.tree = [toTreeNode(scene)];

        if (this.selectedId) {
            this.selectedObject = this.scene?.getObjectByProperty('uuid', this.selectedId) ?? null;
        }

        this.requestUpdate();

        // Reset expanded/selected state
        if (reset) {
            this.expanded = new Set([scene.uuid]);
            this.selectedId = null;
        }
    }

    // Find the parent ID of a given child ID in the tree.
    private findParentId(nodes: TreeNode[], childId: UUID, parentId: UUID = null): UUID | null {
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

        if (position === 'inside') {
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
        // Set drag data
        event.dataTransfer?.setData('text/plain', id);
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
        }
        this.draggedId = id;
    }

    private handleDragEnd() {
        this.draggedId = null;
        this.dropTarget = null;
    }

    private handleDragOver(event: DragEvent, id: UUID, position: DropPosition) {
        if (!this.canDrop(id, position)) {
            return;
        }

        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = 'move';
        }

        this.dropTarget = { id, position };
    }

    private handleDragLeave(_event: DragEvent, id: UUID, position: DropPosition) {
        if (this.dropTarget && this.dropTarget.id === id && this.dropTarget.position === position) {
            this.dropTarget = null;
        }
    }

    private handleDrop(event: DragEvent, id: UUID, position: DropPosition) {
        if (!this.canDrop(id, position)) {
            return;
        }

        event.preventDefault();
        const sourceId = event.dataTransfer?.getData('text/plain') || this.draggedId;
        if (!sourceId) {
            return;
        }

        if (position === 'inside') {
            const expanded = new Set(this.expanded);
            expanded.add(id);
            this.expanded = expanded;
        }

        this.dispatchEvent(new CustomEvent('object-dropped', {
            detail: { sourceId, targetId: id, position },
            bubbles: true,
            composed: true
        }));

        this.draggedId = null;
        this.dropTarget = null;
    }

    private renderDropZone(id: UUID, position: DropPosition, depth: number): any {
        if (!this.draggedId || (depth === 0 && position !== 'inside')) {
            return null;
        }

        const classes = ["drop-zone"];
        if (this.draggedId) {
            classes.push('visible');
        }

        if (this.dropTarget && this.dropTarget.id === id && this.dropTarget.position === position) {
            classes.push('active');
        }

        return html`
            <div
                class="${classes.join(' ')}"
                @dragover=${(dragEvent: DragEvent) => this.handleDragOver(dragEvent, id, position)}
                @dragleave=${(dragEvent: DragEvent) => this.handleDragLeave(dragEvent, id, position)}
                @drop=${(dragEvent: DragEvent) => this.handleDrop(dragEvent, id, position)}
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

        this.selectedObject = this.scene?.getObjectByProperty('uuid', id) ?? null;

        this.dispatchEvent(new CustomEvent('object-selected', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
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
        this.dispatchEvent(new CustomEvent('object-delete', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
        this.closeContextMenu();
    }

    private dispatchClone(id: UUID) {
        this.dispatchEvent(new CustomEvent('object-clone', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
        this.closeContextMenu();
    }

    /**
     * Refresh the inspector panel when the selected object changes externally.
     */
    public refreshSelectedObject() {
        if (!this.selectedId || !this.scene) {
            return;
        }

        this.selectedObject = this.scene.getObjectByProperty('uuid', this.selectedId) ?? null;
        this.requestUpdate();
    }

    private handleNameChange(event: Event) {
        if (!this.selectedObject) return;

        const value = (event.target as HTMLInputElement).value;
        this.selectedObject.name = value;
        this.updateTreeFromScene();
    }

    private handleVectorChange(type: 'position' | 'scale', axis: 'x' | 'y' | 'z', event: Event) {
        if (!this.selectedObject) return;

        const value = parseFloat((event.target as HTMLInputElement).value);
        if (Number.isNaN(value)) return;

        if (type === 'position') {
            this.selectedObject.position[axis] = value;
        } else {
            this.selectedObject.scale[axis] = value;
        }

        this.requestUpdate();
    }

    private handleRotationChange(axis: 'x' | 'y' | 'z', event: Event) {
        if (!this.selectedObject) return;

        const value = parseFloat((event.target as HTMLInputElement).value);
        if (Number.isNaN(value)) return;

        this.selectedObject.rotation[axis] = (value * Math.PI) / 180;
        this.requestUpdate();
    }

    private renderVectorControls(label: string, type: 'position' | 'scale') {
        if (!this.selectedObject) return null;

        const source = type === 'position' ? this.selectedObject.position : this.selectedObject.scale;

        return html`
            <div class="field">
                <label>${label}</label>
                <div class="group-row">
                    ${(['x', 'y', 'z'] as const).map(axis => html`
                        <label>${axis.toUpperCase()}
                            <input
                                type="number"
                                step="0.01"
                                .value=${source[axis].toFixed(2)}
                                @change=${(event: Event) => this.handleVectorChange(type, axis, event)}
                            />
                        </label>
                    `)}
                </div>
            </div>
        `;
    }

    private renderRotationControls() {
        if (!this.selectedObject) return null;

        return html`
            <div class="field">
                <label>Rotation (degrees)</label>
                <div class="group-row">
                    ${(['x', 'y', 'z'] as const).map(axis => html`
                        <label>${axis.toUpperCase()}
                            <input
                                type="number"
                                step="1"
                                .value=${(this.selectedObject!.rotation[axis] * 180 / Math.PI).toFixed(1)}
                                @change=${(event: Event) => this.handleRotationChange(axis, event)}
                            />
                        </label>
                    `)}
                </div>
            </div>
        `;
    }

    private renderContextMenu() {
        if (!this.contextMenu) return null;

        const { id, x, y } = this.contextMenu;

        return html`
            <div class="context-overlay" @click=${() => this.closeContextMenu()}></div>
            <div class="context-menu" style="top:${y}px; left:${x}px;">
                <button @click=${(event: MouseEvent) => { event.stopPropagation(); this.dispatchDelete(id); }}>Delete</button>
                <button @click=${(event: MouseEvent) => { event.stopPropagation(); this.dispatchClone(id); }}>Clone</button>
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
                ${nodes.map(node => html`
                    <li>
                        ${this.renderDropZone(node.id, 'before', depth)}
                        <div
                            class="tree-node ${this.selectedId === node.id ? 'selected' : ''} ${this.draggedId === node.id ? 'dragging' : ''} ${this.dropTarget && this.dropTarget.id === node.id && this.dropTarget.position === 'inside' ? 'drop-target' : ''}"
                            draggable=${depth > 0}
                            @dragstart=${(dragEvent: DragEvent) => this.handleDragStart(dragEvent, node.id)}
                            @dragend=${() => this.handleDragEnd()}
                            @dragover=${(dragEvent: DragEvent) => this.handleDragOver(dragEvent, node.id, 'inside')}
                            @dragleave=${(dragEvent: DragEvent) => this.handleDragLeave(dragEvent, node.id, 'inside')}
                            @drop=${(dragEvent: DragEvent) => this.handleDrop(dragEvent, node.id, 'inside')}
                            @click=${() => this.selectNode(node.id)}
                            @contextmenu=${(event: MouseEvent) => this.handleContextMenu(event, node.id)}
                        >
                            ${node.children && node.children.length
                                ? html`
                                    <span class="toggle" @click=${(e: Event) => { e.stopPropagation(); this.toggleNode(node.id); }}>
                                        ${this.expanded.has(node.id) ? '▼' : '▶'}
                                    </span>
                                `
                                : html`<span style="display:inline-block;width:16px"></span>`
                            }
                            ${node.name}
                        </div>
                        ${node.children && node.children.length && this.expanded.has(node.id)
                            ? this.renderTree(node.children, depth + 1)
                            : null}
                        ${this.renderDropZone(node.id, 'after', depth)}
                    </li>
                `)}
            </ul>
        `;
    }

    public render() {
        return html`
            <div class="panel">
                <div class="tree-section">
                    ${this.renderTree(this.tree)}
                </div>
                <div class="inspector">
                    <h4>Selected Object</h4>
                    ${this.selectedObject ? html`
                        <div class="field">
                            <label>Name</label>
                            <input type="text" .value=${this.selectedObject.name || ''} @input=${(event: Event) => this.handleNameChange(event)} />
                        </div>
                        <div class="field">
                            <label>UUID</label>
                            <input type="text" .value=${this.selectedObject.uuid} readonly />
                        </div>
                        ${this.renderVectorControls('Position', 'position')}
                        ${this.renderVectorControls('Scale', 'scale')}
                        ${this.renderRotationControls()}
                    ` : html`<div class="placeholder">Select an object from the tree to edit its properties.</div>`}
                </div>
                ${this.renderContextMenu()}
            </div>
        `;
    }
}
