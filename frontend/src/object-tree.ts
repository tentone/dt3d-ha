import { LitElement, html, css } from "lit";
import { customElement, property, state } from 'lit/decorators.js';
import type { Object3D, Scene } from "three";

type UUID = string;

interface TreeNode {
    id: UUID;
    name: string;
    children?: TreeNode[];
}

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
        }
        .tree-node.selected {
            background: #3a4050;
        }
        .toggle {
            cursor: pointer;
            margin-right: 4px;
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
    private renderTree(nodes: TreeNode[]): any {
        return html`
            <ul style="list-style: none; margin: 0; padding: 0;">
                ${nodes.map(node => html`
                    <li>
                        <div
                            class="tree-node ${this.selectedId === node.id ? 'selected' : ''}"
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
                            ? this.renderTree(node.children)
                            : null}
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
