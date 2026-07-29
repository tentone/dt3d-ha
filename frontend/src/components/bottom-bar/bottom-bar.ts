import {html, LitElement, type PropertyValues, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";
import tippy, {type Instance, type Props} from "tippy.js";
import tippyStyles from "tippy.js/dist/tippy.css?inline";

import {localManager} from "../../locale/locale.js";
import {LocalStorage} from "../../utils/local-storage.js";
import componentStyles from "./bottom-bar.css?inline";

export type TransformOptions = "translate" | "rotate" | "scale" | "none";
export type MeasurementOptions = "distance" | "angle" | "none";

const COLLISION_AVOIDANCE_STORAGE_KEY = "collision-avoidance";

/**
 * Persistent editor controls presented along the bottom of the scene.
 */
@customElement("dt3d-bottom-bar")
export class DT3DBottomBar extends LitElement {
	static styles = unsafeCSS(componentStyles + tippyStyles);

	static properties = {
		transformTool: {type: String},
		measurementTool: {type: String},
		gridEnabled: {type: Boolean},
		gridSnapEnabled: {type: Boolean},
		collisionAvoidanceEnabled: {type: Boolean},
		objectSidebarCollapsed: {
			type: Boolean,
			reflect: true,
			attribute: "object-sidebar-collapsed",
		},
	};

	public transformTool: TransformOptions = "translate";
	public measurementTool: MeasurementOptions = "none";
	public gridEnabled = true;
	public gridSnapEnabled = false;
	public collisionAvoidanceEnabled =
		LocalStorage.read(COLLISION_AVOIDANCE_STORAGE_KEY, false) ?? false;
	public objectSidebarCollapsed = true;

	private tooltipInstances: Array<Instance<Props>> = [];

	public disconnectedCallback(): void {
		this.destroyTooltips();
		super.disconnectedCallback();
	}

	protected firstUpdated(_changedProperties: PropertyValues<this>): void {
		super.firstUpdated(_changedProperties);
		this.createTooltips();
	}

	private handleTransformSelect(tool: TransformOptions): void {
		this.transformTool = tool;
		this.dispatchEvent(
			new CustomEvent("transform-tool-selected", {
				detail: {tool},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleMeasurementSelect(mode: MeasurementOptions): void {
		this.measurementTool = mode;
		this.dispatchEvent(
			new CustomEvent("measurement-mode-selected", {
				detail: {mode},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleGridToggle(): void {
		this.gridEnabled = !this.gridEnabled;
		this.dispatchEvent(
			new CustomEvent("grid-visibility-toggle", {
				detail: {enabled: this.gridEnabled},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleGridSnapToggle(): void {
		this.gridSnapEnabled = !this.gridSnapEnabled;
		this.dispatchEvent(
			new CustomEvent("grid-snap-toggle", {
				detail: {enabled: this.gridSnapEnabled},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleCollisionAvoidanceToggle(): void {
		this.collisionAvoidanceEnabled = !this.collisionAvoidanceEnabled;
		LocalStorage.write(
			COLLISION_AVOIDANCE_STORAGE_KEY,
			this.collisionAvoidanceEnabled,
		);
		this.dispatchEvent(
			new CustomEvent("collision-avoidance-toggle", {
				detail: {enabled: this.collisionAvoidanceEnabled},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleGridConfigOpen(): void {
		this.dispatchEvent(
			new CustomEvent("grid-config-open", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private createTooltips(): void {
		this.destroyTooltips();
		const tooltipTargets = Array.from(
			this.renderRoot?.querySelectorAll<HTMLElement>("[data-tooltip]") ?? [],
		);

		tooltipTargets.forEach((element) => {
			const content = element.dataset.tooltip;
			if (!content) {
				return;
			}

			const instance = tippy(element, {
				content,
				placement: "top",
				theme: "dt3d-bottom-bar",
				appendTo: () => this.renderRoot as unknown as Element,
			});

			this.tooltipInstances.push(instance);
		});
	}

	private destroyTooltips(): void {
		this.tooltipInstances.forEach((instance) => instance.destroy());
		this.tooltipInstances = [];
	}

	private renderButton(
		icon: string,
		label: string,
		selected: boolean,
		onClick: () => void,
	) {
		return html`
			<button
				class=${selected ? "selected" : ""}
				@click=${onClick}
				data-tooltip=${label}
				aria-label=${label}
				aria-pressed=${selected}
			>
				<ha-icon icon=${icon}></ha-icon>
			</button>
		`;
	}

	render() {
		return html`
			<nav class="editor-toolbar" aria-label="Editor tools">
				<div class="tool-group" aria-label=${localManager.get("controls")}>
					${this.renderButton(
						"mdi:cursor-move",
						localManager.get("translateObject"),
						this.transformTool === "translate",
						() => this.handleTransformSelect("translate"),
					)}
					${this.renderButton(
						"mdi:rotate-right",
						localManager.get("rotateObject"),
						this.transformTool === "rotate",
						() => this.handleTransformSelect("rotate"),
					)}
					${this.renderButton(
						"mdi:resize",
						localManager.get("scaleObject"),
						this.transformTool === "scale",
						() => this.handleTransformSelect("scale"),
					)}
					${this.renderButton(
						"mdi:cursor-default-outline",
						localManager.get("disableTransformControls"),
						this.transformTool === "none",
						() => this.handleTransformSelect("none"),
					)}
				</div>
				<div class="group-space" aria-hidden="true"></div>
				<div class="tool-group" aria-label=${localManager.get("measure")}>
					${this.renderButton(
						"mdi:social-distance-2-meters",
						localManager.get("measureDistance"),
						this.measurementTool === "distance",
						() => this.handleMeasurementSelect("distance"),
					)}
					${this.renderButton(
						"mdi:angle-acute",
						localManager.get("measureAngle"),
						this.measurementTool === "angle",
						() => this.handleMeasurementSelect("angle"),
					)}
					${this.renderButton(
						"mdi:cancel",
						localManager.get("clearMeasurements"),
						this.measurementTool === "none",
						() => this.handleMeasurementSelect("none"),
					)}
				</div>
			</nav>

			<div class="settings-toolbar" aria-label="Grid and collision settings">
				${this.renderButton(
					"mdi:grid",
					localManager.get("toggleGrid"),
					this.gridEnabled,
					() => this.handleGridToggle(),
				)}
				${this.renderButton(
					"mdi:magnet",
					localManager.get("snapToGrid"),
					this.gridSnapEnabled,
					() => this.handleGridSnapToggle(),
				)}
				${this.renderButton(
					"mdi:grid-large",
					localManager.get("configureGrid"),
					false,
					() => this.handleGridConfigOpen(),
				)}
				${this.renderButton(
					"mdi:shield-half-full",
					localManager.get("preventObjectClipping"),
					this.collisionAvoidanceEnabled,
					() => this.handleCollisionAvoidanceToggle(),
				)}
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-bottom-bar": DT3DBottomBar;
	}
}
