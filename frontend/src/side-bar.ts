import { LitElement, html, css, unsafeCSS } from "lit";
import { customElement } from 'lit/decorators.js';
import style from './style.css?inline';

@customElement('dt3d-sidebar')
export class DT3DSidebar extends LitElement {
        static styles = [unsafeCSS(style), css`
                :host {
                        display: block;
                        width: 220px;
                        background: color-mix(in srgb, var(--dt3d-card-bg-dark) 90%, transparent);
                        color: var(--dt3d-text-inverted);
                        height: 100%;
                        padding: 16px 0;
                        z-index: 1;
                        transition: width 0.2s;
                        overflow: hidden;
                }

                :host([collapsed]) {
                        width: 40px;
                        padding: 16px 0 16px 0;
                }

                .collapse-btn {
                        position: absolute;
                        top: 12px;
                        right: 8px;
                        background: none;
                        border: none;
                        color: var(--dt3d-text-inverted);
                        cursor: pointer;
                        font-size: 1.2em;
                        width: 24px;
                        height: 24px;
                        padding: 0;
                        z-index: 10;
                }

                .sidebar-section {
                        margin-bottom: 24px;
                        padding: 0 16px;
                        transition: opacity 0.2s;
                }

                :host([collapsed]) .sidebar-section {
                        opacity: 0;
                        pointer-events: none;
                        height: 0;
                        padding: 0;
                        margin: 0;
                }

                .sidebar-title {
                        font-size: 1.1em;
                        margin-bottom: 8px;
                        font-weight: bold;
                        letter-spacing: 1px;
                        color: var(--dt3d-primary-light);
                }

                button {
                        display: block;
                        width: 100%;
                        margin-bottom: 8px;
                        padding: 10px 0;
                        background: var(--dt3d-primary-dark);
                        color: var(--dt3d-text-inverted);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 1em;
                        transition: background 0.2s, transform 0.2s;
                        box-shadow: 0 2px 4px color-mix(in srgb, var(--dt3d-gray-999) 20%, transparent);
                }

                button:hover {
                        background: var(--dt3d-primary);
                        transform: translateY(-1px);
                }

                button:active {
                        background: var(--dt3d-primary-dark);
                        transform: translateY(0);
                }
        `];

	static properties = {
		collapsed: { type: Boolean, reflect: true }
	};

	public collapsed = true;

	private toggleCollapse() {
		this.collapsed = !this.collapsed;
		
		this.requestUpdate();

	}

	private handleTransformSelect(tool: string) {
		this.dispatchEvent(new CustomEvent('transform-tool-selected', {
			detail: { tool },
			bubbles: true,
			composed: true
		}));
	}

	private handleAddObject(type: string) {
		this.dispatchEvent(new CustomEvent('add-object', {
			detail: { type },
			bubbles: true,
			composed: true
		}));
	}

	render() {
		return html`
			<button class="collapse-btn" @click=${this.toggleCollapse} title="Collapse sidebar">
				${this.collapsed ? '⮞' : '⮜'}
			</button>
			<div class="sidebar-section">
				<div class="sidebar-title">Controls</div>
				<button @click=${() => this.handleTransformSelect('translate')}>Translate</button>
				<button @click=${() => this.handleTransformSelect('rotate')}>Rotate</button>
				<button @click=${() => this.handleTransformSelect('scale')}>Scale</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Add Object</div>
				<button @click=${() => this.handleAddObject('cube')}>Cube</button>
				<button @click=${() => this.handleAddObject('sphere')}>Sphere</button>
				<button @click=${() => this.handleAddObject('plane')}>Plane</button>
				<button @click=${() => this.handleAddObject('upload')}>Upload</button>
				<button @click=${() => this.handleAddObject('entity')}>Entity</button>
			</div>
		`;
	}
}
