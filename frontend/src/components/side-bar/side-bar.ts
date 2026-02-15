import { LitElement, html, unsafeCSS, type PropertyValues } from "lit";
import { customElement } from "lit/decorators.js";
import tippy, { type Instance, type Props } from "tippy.js";
import componentStyles from "./side-bar.css?inline";
import tippyStyles from  "tippy.js/dist/tippy.css?inline";
import {LocalStorage} from "../../utils/local-storage.js";
import { MESH_OPTIONS } from "../mesh-options.js";

/**
 * Transform options.
 */
export type TransformOptions = "translate" | "rotate" | "scale" | "none";

/**
 * Measurement options.
 */
export type MeasurementOptions = "distance" | "angle" | "none";

/**
 * Wall placement options.
 */
export type WallOptions = "wall" | "door" | "window" | "none";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

/**
 * Sidebar contains tools to edit the space.
 */
@customElement("dt3d-sidebar")
export class DT3DSidebar extends LitElement {
	static styles = unsafeCSS(componentStyles + tippyStyles);

	static properties = {
		collapsed: { type: Boolean, reflect: true },
		transformTool: { type: String },
		measurementTool: { type: String },
		wallTool: { type: String },
		gridEnabled: { type: Boolean },
		gridSnapEnabled: { type: Boolean },
	};

	/**
	 * Indicates if the sidebar is collapsed or open.
	 */
	public collapsed =
		LocalStorage.read(SIDEBAR_COLLAPSED_STORAGE_KEY, true) ??
		true;
	
	/**
	 * Tooltip instances to preview the option name.
	 */
	private tooltipInstances: Array<Instance<Props>> = [];

	/**
	 * The selected transform tool.
	 */
	public transformTool: TransformOptions = "translate";

	/**
	 * Toggle grid visibility.
	 */
	public gridEnabled = true;

	/**
	 * Selected measurement tool.
	 */
	public measurementTool: MeasurementOptions = "none";

	/**
	 * Selected wall tool.
	 */
	public wallTool: WallOptions = "none";

	/**
	 * Toggle snapping transforms to the grid.
	 */
	public gridSnapEnabled = false;

	public disconnectedCallback(): void {
		this.destroyTooltips();
		super.disconnectedCallback();
	}

	/**
	 * Called on first render of the component.
	 */
	protected firstUpdated(_changedProperties: PropertyValues<this>): void {
		super.firstUpdated(_changedProperties);

		this.createTooltips();
	}

	/**
	 * Toggle collapsed state of the side bar.
	 */
	private toggleCollapse() {
		this.collapsed = !this.collapsed;

		LocalStorage.write(SIDEBAR_COLLAPSED_STORAGE_KEY, this.collapsed);

		this.requestUpdate();
	}

	/**
	 * Change v bnnnn
	 * @param tool
	 */
	private handleTransformSelect(tool: TransformOptions) {
		this.transformTool = tool;

		this.dispatchEvent(
			new CustomEvent("transform-tool-selected", {
				detail: { tool },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/** 
	 * Dispatch a new add object event.
	 * 
	 * @param type - Type of object to be created.
	 */
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
	private handleMeasurementSelect(mode: MeasurementOptions) {
		this.measurementTool = mode;
		this.dispatchEvent(
			new CustomEvent("measurement-mode-selected", {
				detail: { mode },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Select wall drawing tool.
	 *
	 * @param mode - Wall tool to use.
	 */
	private handleWallSelect(mode: WallOptions) {
		this.wallTool = mode;
		this.dispatchEvent(
			new CustomEvent("wall-tool-selected", {
				detail: { mode },
				bubbles: true,
				composed: true,
			}),
		);
	}

  /*
	 * Toggle grid visibility.
	 */
	private handleGridToggle() {
		this.gridEnabled = !this.gridEnabled;
		this.dispatchEvent(
			new CustomEvent("grid-visibility-toggle", {
				detail: { enabled: this.gridEnabled },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Toggle grid snapping for transform controls.
	 */
	private handleGridSnapToggle() {
		this.gridSnapEnabled = !this.gridSnapEnabled;
		this.dispatchEvent(
			new CustomEvent("grid-snap-toggle", {
				detail: { enabled: this.gridSnapEnabled },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Create the tooltip element for each of the options.
	 */
	private createTooltips() {
		this.destroyTooltips();

		
		const tooltipTargets: NodeListOf<HTMLElement> = this.renderRoot?.querySelectorAll<HTMLElement>("[data-tooltip]") ?? [];

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

	/**
	 * Destroy all tooltips created.
	 */
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
			<div class="sidebar-content">
				<div class="sidebar-section">
					<div class="sidebar-title">Controls</div>
					<button
						@click=${() => this.handleTransformSelect("translate")}
          class=${`transform-btn ${this.transformTool === "translate" ? "selected" : ""}`.trim()}
						data-tooltip="Translate object"
						aria-label="Translate object">
						<ha-icon icon="mdi:cursor-move"></ha-icon>
					</button>
					<button
						@click=${() => this.handleTransformSelect("rotate")}
          	class=${`transform-btn ${this.transformTool === "rotate" ? "selected" : ""}`.trim()}
						data-tooltip="Rotate object"
						aria-label="Rotate object">
						<ha-icon icon="mdi:rotate-right"></ha-icon>
					</button>
					<button
          class=${`transform-btn ${this.transformTool === "scale" ? "selected" : ""}`.trim()}
						@click=${() => this.handleTransformSelect("scale")}
						data-tooltip="Scale object"
						aria-label="Scale object">
						<ha-icon icon="mdi:resize"></ha-icon>
					</button>
					<button
          class=${`transform-btn ${this.transformTool === "none" ? "selected" : ""}`.trim()}
						@click=${() => this.handleTransformSelect("none")}
						data-tooltip="Disable transform controls"
						aria-label="Disable transform controls">
						<ha-icon icon="mdi:cursor-default-outline"></ha-icon>
					</button>
					<button
						@click=${() => this.handleGridSnapToggle()}
						class=${`toggle-btn ${this.gridSnapEnabled ? "selected" : ""}`.trim()}
						data-tooltip="Snap transforms to grid"
						aria-label="Snap transforms to grid">
						<ha-icon icon="mdi:magnet"></ha-icon>
					</button>
					<button
						@click=${() => this.handleGridToggle()}
						class=${`toggle-btn ${this.gridEnabled ? "selected" : ""}`.trim()}
						data-tooltip="Toggle grid"
						aria-label="Toggle grid">
						<ha-icon icon="mdi:grid"></ha-icon>
					</button>
				</div>
				<div class="sidebar-section">
					<div class="sidebar-title">Add</div>
					<details class="mesh-submenu">
						<summary
							data-tooltip="Add mesh"
							aria-label="Add mesh">
							<ha-icon icon="mdi:shape-outline"></ha-icon>
						</summary>
						<div class="mesh-submenu-items">
							${MESH_OPTIONS.map(
								(option) => html`
									<button
										@click=${() => this.handleAddObject(option.type)}
										data-tooltip=${`Add ${option.label}`}
										aria-label=${`Add ${option.label}`}>
										${option.label}
									</button>
								`,
							)}
						</div>
					</details>
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
						class=${this.measurementTool === "distance" ? "selected" : ""}
						data-tooltip="Measure distance"
						aria-label="Measure distance">
						<ha-icon icon="mdi:social-distance-2-meters"></ha-icon>
					</button>
					<button
						@click=${() => this.handleMeasurementSelect("angle")}
						class=${this.measurementTool === "angle" ? "selected" : ""}
						data-tooltip="Measure angle"
						aria-label="Measure angle">
						<ha-icon icon="mdi:angle-acute"></ha-icon>
					</button>
					<button
						@click=${() => this.handleMeasurementSelect("none")}
						class=${this.measurementTool === "none" && this.wallTool === "none" ? "selected" : ""}
						data-tooltip="Clear measurements"
						aria-label="Clear measurements">
						<ha-icon icon="mdi:cancel"></ha-icon>
					</button>
				</div>
				<div class="sidebar-section">
					<div class="sidebar-title">Walls</div>
					<button
						@click=${() => this.handleWallSelect("wall")}
						class=${this.wallTool === "wall" ? "selected" : ""}
						data-tooltip="Draw wall"
						aria-label="Draw wall">
						<ha-icon icon="mdi:vector-line"></ha-icon>
					</button>
					<button
						@click=${() => this.handleWallSelect("door")}
						class=${this.wallTool === "door" ? "selected" : ""}
						data-tooltip="Add door to selected wall"
						aria-label="Add door to selected wall">
						<ha-icon icon="mdi:door"></ha-icon>
					</button>
					<button
						@click=${() => this.handleWallSelect("window")}
						class=${this.wallTool === "window" ? "selected" : ""}
						data-tooltip="Add window to selected wall"
						aria-label="Add window to selected wall">
						<ha-icon icon="mdi:window-closed-variant"></ha-icon>
					</button>
					<button
						@click=${() => this.handleWallSelect("none")}
						class=${this.measurementTool === "none" && this.wallTool === "none" ? "selected" : ""}
						data-tooltip="Exit wall tools"
						aria-label="Exit wall tools">
						<ha-icon icon="mdi:cancel"></ha-icon>
					</button>
				</div>
			</div>
		`;
	}
}
