import { LitElement, html, css } from "lit";
import { customElement, property, state } from 'lit/decorators.js';
import type { Object3D, Scene } from "three";

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

    static styles = css`
        :host {
            display: block;
            width: 220px;
            background: #23272f55;
            color: #fff;
            height: 100%;
            padding: 16px 0;
            z-index: 1;
            transition: width 0.2s;
            overflow: hidden;
        }
        .tree-node {
            padding-left: 16px;
            cursor: pointer;
            user-select: none;
            text-overflow: ellipsis;
            white-space: nowrap;
            width: 100%;
        }
        .tree-node.selected {
            background: #3a4050;
        }
        .tree-node.dragging {
            opacity: 0.6;
        }
        .tree-node.drop-target {
            background: #2a7fff55;
        }
        .toggle {
            cursor: pointer;
            margin-right: 4px;
        }
        .drop-zone {
            height: 6px;
            margin: 2px 0;
            border: 1px dashed transparent;
        }
        .drop-zone.visible {
            border-color: #3a405088;
        }
        .drop-zone.active {
            border-color: #3aa0ff;
            background: #3aa0ff55;
        }
    `;
    
    /**
     * The 3D scene to visualize.
     */
    @property({ type: Array })
    public scene: Scene = null;

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
    public tree: TreeNode[] = [];

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
    public updateTreeFromScene(scene?: Scene, reset: boolean = false) {
        scene = scene || this.scene;

        console.log('DT3d: Updating tree from scene', scene, reset);

        const toTreeNode = (obj: Object3D): TreeNode => ({
            id: obj.uuid,
            name: obj.name || obj.type,
            children: obj.children.length > 0 ? obj.children.map(toTreeNode) : undefined
        });

        this.tree = [toTreeNode(scene)];

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

        this.dispatchEvent(new CustomEvent('object-selected', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
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
            <div>
                ${this.renderTree(this.tree)}
            </div>
        `;
    }
}
