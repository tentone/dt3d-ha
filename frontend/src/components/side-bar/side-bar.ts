import { LitElement, html, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import componentStyles from "./side-bar.css?inline";

/**
 * Sidebar contains tools to edit the space.
 */
@customElement("dt3d-sidebar")
export class DT3DSidebar extends LitElement {
	static styles = unsafeCSS(componentStyles);

	static properties = {
		collapsed: { type: Boolean, reflect: true },
	};

	public collapsed = true;

	public disconnectedCallback(): void {
		super.disconnectedCallback();
	}

	/**
	 * Toggle collapsed state of the side bar.
	 */
	private toggleCollapse() {
		this.collapsed = !this.collapsed;

		this.requestUpdate();
	}

	/**
	 * Change v bnnnn
	 * @param tool
	 */
	private handleTransformSelect(tool: string) {
		this.dispatchEvent(
			new CustomEvent("transform-tool-selected", {
				detail: { tool },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleAddObject(type: string) {
		this.dispatchEvent(
			new CustomEvent("add-object", {
				detail: { type },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Select measurement tool.
	 *
	 * @param mode - Measuremente tool to use.
	 */
	private handleMeasurementSelect(mode: "distance" | "angle" | "none") {
		this.dispatchEvent(
			new CustomEvent("measurement-mode-selected", {
				detail: { mode },
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		return html`
			<button
				class="collapse-btn"
				@click=${this.toggleCollapse}
				title="Collapse sidebar">
			${this.collapsed ?  html`<ha-icon icon="mdi:arrow-right-drop-circle-outline"></ha-icon>` :  html`<ha-icon icon="mdi:arrow-left-drop-circle-outline"></ha-icon>`}
			</button>
			<div class="sidebar-section">
				<div class="sidebar-title">Controls</div>
				<button @click=${() => this.handleTransformSelect("translate")}>
					<ha-icon icon="mdi:cursor-move"></ha-icon>
				</button>
				<button @click=${() => this.handleTransformSelect("rotate")}>
					<ha-icon icon="mdi:rotate-right"></ha-icon>
				</button>
				<button @click=${() => this.handleTransformSelect("scale")}>
					<ha-icon icon="mdi:resize"></ha-icon>
				</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Add</div>
				<button @click=${() => this.handleAddObject("cube")}>
					<ha-icon icon="mdi:cube-outline"></ha-icon>
				</button>
				<button @click=${() => this.handleAddObject("sphere")}>
					<ha-icon icon="mdi:sphere"></ha-icon>
				</button>
				<button @click=${() => this.handleAddObject("plane")}>
					<ha-icon icon="mdi:square-outline"></ha-icon>
				</button>
				<button @click=${() => this.handleAddObject("upload")}>
					<ha-icon icon="mdi:upload-box-outline"></ha-icon>
				</button>
				<button @click=${() => this.handleAddObject("entity")}>
					<ha-icon icon="mdi:state-machine"></ha-icon>
				</button>
			</div>
			<!-- --ha-color-primary-30) -->
			<div class="sidebar-section">
				<div class="sidebar-title">Measure</div>
				<button @click=${() => this.handleMeasurementSelect("distance")}>
					<ha-icon icon="mdi:social-distance-2-meters"></ha-icon>
				</button>
				<button @click=${() => this.handleMeasurementSelect("angle")}>
					<ha-icon icon="mdi:angle-acute"></ha-icon>
				</button>
				<button @click=${() => this.handleMeasurementSelect("none")}>
					<ha-icon icon="mdi:cancel"></ha-icon>
				</button>
			</div>
		`;
	}
}
