import { LitElement, html, css } from "lit";
import { customElement, property, state } from 'lit/decorators.js';

interface TreeNode {
    id: string;
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

    @property({ type: Array })
    tree: TreeNode[] = [
        {
            id: '1',
            name: 'Scene',
            children: [
                { id: '2', name: 'Cube' },
                { id: '3', name: 'Sphere' },
                {
                    id: '4',
                    name: 'Group',
                    children: [
                        { id: '5', name: 'Plane' }
                    ]
                }
            ]
        }
    ];

    @state()
    private expanded: Set<string> = new Set(['1']);

    @state()
    private selectedId: string | null = null;

    private toggleNode(id: string) {
        const expanded = new Set(this.expanded);
        if (expanded.has(id)) expanded.delete(id);
        else expanded.add(id);
        this.expanded = expanded;
    }

    private selectNode(id: string) {
        this.selectedId = id;
        this.dispatchEvent(new CustomEvent('object-selected', {
            detail: { id },
            bubbles: true,
            composed: true
        }));
    }

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

    render() {
        return html`
            <div>
                ${this.renderTree(this.tree)}
            </div>
        `;
    }
}
