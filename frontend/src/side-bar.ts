import { LitElement, html, css } from "lit";
import { customElement } from 'lit/decorators.js';

@customElement('dt3d-sidebar')
export class DT3DSidebar extends LitElement {
        static styles = [css`
                :host {
                        display: block;
                        width: 220px;
                        background: color-mix(in srgb, var(--ha-color-neutral-10) 90%, transparent);
                        color: var(--ha-color-neutral-95);
                        height: 100%;
                        padding: 16px 0;
                        z-index: 1;
                        transition: width 0.2s;
                        overflow: visible;
                        position: relative;
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
                        color: var(--ha-color-neutral-95);
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
                        color: var(--ha-color-primary-60);
                }

                button {
                        display: block;
                        width: 100%;
                        margin-bottom: 8px;
                        padding: 10px 0;
                        background: var(--ha-color-primary-60);
                        color: var(--ha-color-neutral-95);
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 1em;
                        transition: background 0.2s, transform 0.2s;
                        box-shadow: 0 2px 4px color-mix(in srgb, var(--ha-color-neutral-10) 20%, transparent);
                }

                button:hover {
                        background: var(--ha-color-primary-60);
                        transform: translateY(-1px);
                }

                button:active {
                        background: var(--ha-color-primary-60);
                        transform: translateY(0);
                }

                .resize-handle {
                        position: absolute;
                        top: 0;
                        right: -4px;
                        width: 8px;
                        height: 100%;
                        cursor: ew-resize;
                        z-index: 5;
                        background: transparent;
                }
        `];

        static properties = {
                collapsed: { type: Boolean, reflect: true }
        };

        public collapsed = true;

        private resizing = false;
        private startX = 0;
        private startWidth = 220;

        private handleResizeMove = (event: MouseEvent) => {
                if (!this.resizing) {
                        return;
                }

                const delta = event.clientX - this.startX;
                const nextWidth = Math.min(Math.max(this.startWidth + delta, 160), 400);
                this.style.width = `${nextWidth}px`;
        };

        private handleResizeEnd = () => {
                if (!this.resizing) {
                        return;
                }

                this.resizing = false;
                document.body.style.cursor = '';
                window.removeEventListener('mousemove', this.handleResizeMove);
                window.removeEventListener('mouseup', this.handleResizeEnd);
        };

        public disconnectedCallback(): void {
                super.disconnectedCallback();
                this.handleResizeEnd();
        }

        private startResize(event: MouseEvent) {
                if (this.collapsed) {
                        return;
                }

                this.resizing = true;
                this.startX = event.clientX;
                this.startWidth = this.getBoundingClientRect().width;
                document.body.style.cursor = 'ew-resize';

                window.addEventListener('mousemove', this.handleResizeMove);
                window.addEventListener('mouseup', this.handleResizeEnd);
        }

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

        private handleMeasurementSelect(mode: 'distance' | 'angle' | 'none') {
                this.dispatchEvent(new CustomEvent('measurement-mode-selected', {
                        detail: { mode },
                        bubbles: true,
                        composed: true
                }));
        }

        render() {
                return html`
                        <button class="collapse-btn" @click=${this.toggleCollapse} title="Collapse sidebar">
                                ${this.collapsed ? '⮞' : '⮜'}
                        </button>
                        <div class="resize-handle" @mousedown=${(event: MouseEvent) => this.startResize(event)}></div>
                        <div class="sidebar-section">
                                <div class="sidebar-title">Controls</div>
                                <button @click=${() => this.handleTransformSelect('translate')}>Translate</button>
				<button @click=${() => this.handleTransformSelect('rotate')}>Rotate</button>
				<button @click=${() => this.handleTransformSelect('scale')}>Scale</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Add</div>
				<button @click=${() => this.handleAddObject('cube')}>Cube</button>
                                <button @click=${() => this.handleAddObject('sphere')}>Sphere</button>
                                <button @click=${() => this.handleAddObject('plane')}>Plane</button>
                                <button @click=${() => this.handleAddObject('upload')}>Upload</button>
                                <button @click=${() => this.handleAddObject('entity')}>Entity</button>
                        </div>
                        <div class="sidebar-section">
                                <div class="sidebar-title">Measure</div>
                                <button @click=${() => this.handleMeasurementSelect('distance')}>Distance</button>
                                <button @click=${() => this.handleMeasurementSelect('angle')}>Angle</button>
                                <button @click=${() => this.handleMeasurementSelect('none')}>Clear</button>
                        </div>
                        <div class="sidebar-section">
                                <div class="sidebar-title">Edit</div>
                                <button @click=${() => this.handleAddObject('cube')}>Delete</button>
                        </div>
                `;
	}
}
