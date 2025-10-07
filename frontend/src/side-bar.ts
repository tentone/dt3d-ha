import { LitElement, html, css } from "lit";
import { customElement } from 'lit/decorators.js';

@customElement('dt3d-sidebar')
export class DT3DSidebar extends LitElement {
	static styles = css`
		:host {
			display: block;
			width: 220px;
			background: #363a4255;
			color: #fff;
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
			color: #fff;
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
		}

		button {
			display: block;
			width: 100%;
			margin-bottom: 8px;
			padding: 10px 0;
			background: #2d323c;
			color: #fff;
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 1em;
			transition: background 0.2s;
		}

		button:hover {
			background: #3a4050;
		}
	`;

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
