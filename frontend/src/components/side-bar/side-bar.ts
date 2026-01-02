import { LitElement, html, unsafeCSS, type PropertyValues } from "lit";
import { customElement } from "lit/decorators.js";
import tippy, { type Instance, type Props } from "tippy.js";
import componentStyles from "./side-bar.css?inline";
import "tippy.js/dist/tippy.css";

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
	private tooltipInstances: Array<Instance<Props>> = [];

	public disconnectedCallback(): void {
		this.destroyTooltips();
		super.disconnectedCallback();
	}

	protected firstUpdated(_changedProperties: PropertyValues<this>): void {
		super.firstUpdated(_changedProperties);
		this.createTooltips();
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

	private createTooltips() {
		this.destroyTooltips();

		const tooltipTargets =
			this.renderRoot?.querySelectorAll<HTMLElement>("[data-tooltip]") ?? [];

		tooltipTargets.forEach((element) => {
			const content = element.dataset.tooltip;

			if (!content) {
				return;
			}

			const instance = tippy(element, {
				content,
				placement: "right",
				appendTo: document.body,
			});

			this.tooltipInstances.push(instance);
		});
	}

	private destroyTooltips() {
		this.tooltipInstances.forEach((instance) => instance.destroy());
		this.tooltipInstances = [];
	}

	render() {
		return html`
			<button
				class="collapse-btn"
				@click=${this.toggleCollapse}
				data-tooltip="Collapse sidebar"
				aria-label="Collapse sidebar"
				title="Collapse sidebar">
			${this.collapsed ?  html`<ha-icon icon="mdi:arrow-right-drop-circle-outline"></ha-icon>` :  html`<ha-icon icon="mdi:arrow-left-drop-circle-outline"></ha-icon>`}
			</button>
			<div class="sidebar-section">
				<div class="sidebar-title">Controls</div>
				<button
					@click=${() => this.handleTransformSelect("translate")}
					data-tooltip="Translate object"
					aria-label="Translate object">
					<ha-icon icon="mdi:cursor-move"></ha-icon>
				</button>
				<button
					@click=${() => this.handleTransformSelect("rotate")}
					data-tooltip="Rotate object"
					aria-label="Rotate object">
					<ha-icon icon="mdi:rotate-right"></ha-icon>
				</button>
				<button
					@click=${() => this.handleTransformSelect("scale")}
					data-tooltip="Scale object"
					aria-label="Scale object">
					<ha-icon icon="mdi:resize"></ha-icon>
				</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Add</div>
				<button
					@click=${() => this.handleAddObject("cube")}
					data-tooltip="Add cube"
					aria-label="Add cube">
					<ha-icon icon="mdi:cube-outline"></ha-icon>
				</button>
				<button
					@click=${() => this.handleAddObject("sphere")}
					data-tooltip="Add sphere"
					aria-label="Add sphere">
					<ha-icon icon="mdi:sphere"></ha-icon>
				</button>
				<button
					@click=${() => this.handleAddObject("plane")}
					data-tooltip="Add plane"
					aria-label="Add plane">
					<ha-icon icon="mdi:square-outline"></ha-icon>
				</button>
				<button
					@click=${() => this.handleAddObject("upload")}
					data-tooltip="Upload model"
					aria-label="Upload model">
					<ha-icon icon="mdi:upload-box-outline"></ha-icon>
				</button>
				<button
					@click=${() => this.handleAddObject("entity")}
					data-tooltip="Add entity"
					aria-label="Add entity">
					<ha-icon icon="mdi:state-machine"></ha-icon>
				</button>
			</div>
			<!-- --ha-color-primary-30) -->
			<div class="sidebar-section">
				<div class="sidebar-title">Measure</div>
				<button
					@click=${() => this.handleMeasurementSelect("distance")}
					data-tooltip="Measure distance"
					aria-label="Measure distance">
					<ha-icon icon="mdi:social-distance-2-meters"></ha-icon>
				</button>
				<button
					@click=${() => this.handleMeasurementSelect("angle")}
					data-tooltip="Measure angle"
					aria-label="Measure angle">
					<ha-icon icon="mdi:angle-acute"></ha-icon>
				</button>
				<button
					@click=${() => this.handleMeasurementSelect("none")}
					data-tooltip="Clear measurements"
					aria-label="Clear measurements">
					<ha-icon icon="mdi:cancel"></ha-icon>
				</button>
			</div>
		`;
	}
}
