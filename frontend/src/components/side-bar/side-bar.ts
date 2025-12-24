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
				title="Collapse sidebar"
			>
				${this.collapsed ? "⮞" : "⮜"}
			</button>
			<div class="sidebar-section">
				<div class="sidebar-title">Controls</div>
				<button @click=${() => this.handleTransformSelect("translate")}>
					Translate
				</button>
				<button @click=${() => this.handleTransformSelect("rotate")}>
					Rotate
				</button>
				<button @click=${() => this.handleTransformSelect("scale")}>
					Scale
				</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Add</div>
				<button @click=${() => this.handleAddObject("cube")}>Cube</button>
				<button @click=${() => this.handleAddObject("sphere")}>Sphere</button>
				<button @click=${() => this.handleAddObject("plane")}>Plane</button>
				<button @click=${() => this.handleAddObject("upload")}>Upload</button>
				<button @click=${() => this.handleAddObject("entity")}>Entity</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Measure</div>
				<button @click=${() => this.handleMeasurementSelect("distance")}>
					Distance
				</button>
				<button @click=${() => this.handleMeasurementSelect("angle")}>
					Angle
				</button>
				<button @click=${() => this.handleMeasurementSelect("none")}>
					Clear
				</button>
			</div>
		`;
	}
}
