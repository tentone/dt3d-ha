import {html, LitElement, type PropertyValues, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";
import tippy, {type Instance, type Props} from "tippy.js";
import tippyStyles from "tippy.js/dist/tippy.css?inline";

import {localManager} from "../../locale/locale.js";
import {LocalStorage} from "../../utils/local-storage.js";
import componentStyles from "./side-bar.css?inline";

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
		collapsed: {type: Boolean, reflect: true},
		transformTool: {type: String},
		measurementTool: {type: String},
		wallTool: {type: String},
		gridEnabled: {type: Boolean},
		gridSnapEnabled: {type: Boolean},
	};

	/**
	 * Indicates if the sidebar is collapsed or open.
	 */
	public collapsed =
		LocalStorage.read(SIDEBAR_COLLAPSED_STORAGE_KEY, true) ?? true;

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
	private toggleCollapse(): void {
		this.collapsed = !this.collapsed;

		LocalStorage.write(SIDEBAR_COLLAPSED_STORAGE_KEY, this.collapsed);
		this.dispatchEvent(
			new CustomEvent("sidebar-collapse-changed", {
				detail: {collapsed: this.collapsed},
				bubbles: true,
				composed: true,
			}),
		);

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
				detail: {tool},
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
				detail: {type},
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
				detail: {mode},
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
				detail: {mode},
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
				detail: {enabled: this.gridEnabled},
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
				detail: {enabled: this.gridSnapEnabled},
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Open grid configuration.
	 */
	private handleGridConfigOpen() {
		this.dispatchEvent(
			new CustomEvent("grid-config-open", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Open the mesh add menu at card level so it is not clipped by the sidebar.
	 *
	 * @param event - Click event from the mesh button.
	 */
	private handleMeshMenuOpen(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement | null;
		const rect = target?.getBoundingClientRect();

		this.dispatchEvent(
			new CustomEvent("mesh-menu-open", {
				detail: rect
					? {
						left: rect.right + 8,
						top: rect.top,
					}
					: null,
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Open the model upload menu at card level.
	 *
	 * @param event - Click event from the upload button.
	 */
	private handleUploadMenuOpen(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement | null;
		const rect = target?.getBoundingClientRect();

		this.dispatchEvent(
			new CustomEvent("upload-menu-open", {
				detail: rect ? {left: rect.right + 8, top: rect.top} : null,
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Open the static-light type menu at card level.
	 *
	 * @param event - Click event from the static-light button.
	 */
	private handleLightMenuOpen(event: MouseEvent) {
		const target = event.currentTarget as HTMLElement | null;
		const rect = target?.getBoundingClientRect();

		this.dispatchEvent(
			new CustomEvent("light-menu-open", {
				detail: rect ? {left: rect.right + 8, top: rect.top} : null,
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Open the space-level scene configuration menu.
	 */
	private handleSpaceConfigOpen() {
		this.dispatchEvent(
			new CustomEvent("space-config-open", {
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

		const tooltipTargets: NodeListOf<HTMLElement> =
			this.renderRoot?.querySelectorAll<HTMLElement>("[data-tooltip]") ?? [];

		tooltipTargets.forEach((element) => {
			const content = element.dataset.tooltip;

			if (!content) {
				return;
			}

			const instance = tippy(element, {
				content,
				placement: "right",
				theme: "dt3d-sidebar",
				appendTo: () => this.renderRoot as unknown as Element,
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
				data-tooltip=${localManager.get("collapseSidebar")}
				aria-label=${localManager.get("collapseSidebar")}
				title=${localManager.get("collapseSidebar")}
			>
				${this.collapsed
					? html`<ha-icon icon="mdi:arrow-right-drop-circle-outline"></ha-icon>`
					: html`<ha-icon icon="mdi:arrow-left-drop-circle-outline"></ha-icon>`}
			</button>
			<div class="sidebar-content">
				<div class="sidebar-section">
					<div class="sidebar-title">${localManager.get("controls")}</div>
					<button
						@click=${() => this.handleTransformSelect("translate")}
						class=${`transform-btn ${this.transformTool === "translate" ? "selected" : ""}`.trim()}
						data-tooltip=${localManager.get("translateObject")}
						aria-label=${localManager.get("translateObject")}
					>
						<ha-icon icon="mdi:cursor-move"></ha-icon>
					</button>
					<button
						@click=${() => this.handleTransformSelect("rotate")}
						class=${`transform-btn ${this.transformTool === "rotate" ? "selected" : ""}`.trim()}
						data-tooltip=${localManager.get("rotateObject")}
						aria-label=${localManager.get("rotateObject")}
					>
						<ha-icon icon="mdi:rotate-right"></ha-icon>
					</button>
					<button
						class=${`transform-btn ${this.transformTool === "scale" ? "selected" : ""}`.trim()}
						@click=${() => this.handleTransformSelect("scale")}
						data-tooltip=${localManager.get("scaleObject")}
						aria-label=${localManager.get("scaleObject")}
					>
						<ha-icon icon="mdi:resize"></ha-icon>
					</button>
					<button
						class=${`transform-btn ${this.transformTool === "none" ? "selected" : ""}`.trim()}
						@click=${() => this.handleTransformSelect("none")}
						data-tooltip=${localManager.get("disableTransformControls")}
						aria-label=${localManager.get("disableTransformControls")}
					>
						<ha-icon icon="mdi:cursor-default-outline"></ha-icon>
					</button>
					<button
						@click=${() => this.handleGridSnapToggle()}
						class=${`toggle-btn ${this.gridSnapEnabled ? "selected" : ""}`.trim()}
						data-tooltip=${localManager.get("snapToGrid")}
						aria-label=${localManager.get("snapToGrid")}
					>
						<ha-icon icon="mdi:magnet"></ha-icon>
					</button>
					<button
						@click=${() => this.handleGridToggle()}
						class=${`toggle-btn ${this.gridEnabled ? "selected" : ""}`.trim()}
						data-tooltip=${localManager.get("toggleGrid")}
						aria-label=${localManager.get("toggleGrid")}
					>
						<ha-icon icon="mdi:grid"></ha-icon>
					</button>
					<button
						@click=${() => this.handleGridConfigOpen()}
						data-tooltip=${localManager.get("configureGrid")}
						aria-label=${localManager.get("configureGrid")}
					>
						<ha-icon icon="mdi:grid-large"></ha-icon>
					</button>
				</div>
				<div class="sidebar-section">
					<div class="sidebar-title">${localManager.get("space")}</div>
					<button
						@click=${() => this.handleSpaceConfigOpen()}
						data-tooltip=${localManager.get("spaceConfiguration")}
						aria-label=${localManager.get("spaceConfiguration")}
					>
						<ha-icon icon="mdi:white-balance-sunny"></ha-icon>
					</button>
				</div>
				<div class="sidebar-section">
					<div class="sidebar-title">${localManager.get("add")}</div>
					<button
						@click=${(event: MouseEvent) => this.handleMeshMenuOpen(event)}
						data-tooltip=${localManager.get("addMesh")}
						aria-label=${localManager.get("addMesh")}
					>
						<ha-icon icon="mdi:shape-outline"></ha-icon>
					</button>
					<button
						@click=${(event: MouseEvent) => this.handleUploadMenuOpen(event)}
						data-tooltip=${localManager.get("uploadModel")}
						aria-label=${localManager.get("uploadModel")}
					>
						<ha-icon icon="mdi:upload-box-outline"></ha-icon>
					</button>
					<button
						@click=${() => this.handleAddObject("entity")}
						data-tooltip=${localManager.get("addEntity")}
						aria-label=${localManager.get("addEntity")}
					>
						<ha-icon icon="mdi:state-machine"></ha-icon>
					</button>
					<button
						@click=${(event: MouseEvent) => this.handleLightMenuOpen(event)}
						data-tooltip=${localManager.get("addStaticLight")}
						aria-label=${localManager.get("addStaticLight")}
					>
						<ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>
					</button>
					<button
						@click=${() => this.handleAddObject("group")}
						data-tooltip=${localManager.get("addGroup")}
						aria-label=${localManager.get("addGroup")}
					>
						<ha-icon icon="mdi:folder-plus-outline"></ha-icon>
					</button>
					<button
						@click=${() => this.handleAddObject("viewport")}
						data-tooltip=${localManager.get("addViewport")}
						aria-label=${localManager.get("addViewport")}
					>
						<ha-icon icon="mdi:camera-plus-outline"></ha-icon>
					</button>
				</div>
				<!-- --ha-color-primary-30) -->
				<div class="sidebar-section">
					<div class="sidebar-title">${localManager.get("measure")}</div>
					<button
						@click=${() => this.handleMeasurementSelect("distance")}
						class=${this.measurementTool === "distance" ? "selected" : ""}
						data-tooltip=${localManager.get("measureDistance")}
						aria-label=${localManager.get("measureDistance")}
					>
						<ha-icon icon="mdi:social-distance-2-meters"></ha-icon>
					</button>
					<button
						@click=${() => this.handleMeasurementSelect("angle")}
						class=${this.measurementTool === "angle" ? "selected" : ""}
						data-tooltip=${localManager.get("measureAngle")}
						aria-label=${localManager.get("measureAngle")}
					>
						<ha-icon icon="mdi:angle-acute"></ha-icon>
					</button>
					<button
						@click=${() => this.handleMeasurementSelect("none")}
						class=${this.measurementTool === "none" && this.wallTool === "none"
							? "selected"
							: ""}
						data-tooltip=${localManager.get("clearMeasurements")}
						aria-label=${localManager.get("clearMeasurements")}
					>
						<ha-icon icon="mdi:cancel"></ha-icon>
					</button>
				</div>
				<div class="sidebar-section">
					<div class="sidebar-title">${localManager.get("walls")}</div>
					<button
						@click=${() => this.handleWallSelect("wall")}
						class=${this.wallTool === "wall" ? "selected" : ""}
						data-tooltip=${localManager.get("drawWall")}
						aria-label=${localManager.get("drawWall")}
					>
						<ha-icon icon="mdi:vector-line"></ha-icon>
					</button>
					<button
						@click=${() => this.handleWallSelect("door")}
						class=${this.wallTool === "door" ? "selected" : ""}
						data-tooltip=${localManager.get("addDoor")}
						aria-label=${localManager.get("addDoor")}
					>
						<ha-icon icon="mdi:door"></ha-icon>
					</button>
					<button
						@click=${() => this.handleWallSelect("window")}
						class=${this.wallTool === "window" ? "selected" : ""}
						data-tooltip=${localManager.get("addWindow")}
						aria-label=${localManager.get("addWindow")}
					>
						<ha-icon icon="mdi:window-closed-variant"></ha-icon>
					</button>
					<button
						@click=${() => this.handleWallSelect("none")}
						class=${this.measurementTool === "none" && this.wallTool === "none"
							? "selected"
							: ""}
						data-tooltip=${localManager.get("exitWallTools")}
						aria-label=${localManager.get("exitWallTools")}
					>
						<ha-icon icon="mdi:cancel"></ha-icon>
					</button>
				</div>
			</div>
		`;
	}
}
