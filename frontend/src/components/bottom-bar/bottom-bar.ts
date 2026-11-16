import "../tooltip/tooltip.js";

import {html, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import {LocalizedElement} from "../../locale/localized-element.js";
import {LocalStorage} from "../../utils/local-storage.js";
import componentStyles from "./bottom-bar.css?inline";

export type TransformOptions = "translate" | "rotate" | "scale" | "none";
export type MeasurementOptions = "distance" | "angle" | "none";

const COLLISION_AVOIDANCE_STORAGE_KEY = "collision-avoidance";

/**
 * Persistent editor controls presented along the bottom of the scene.
 */
@customElement("dt3d-bottom-bar")
export class DT3DBottomBar extends LocalizedElement {
	static styles = unsafeCSS(componentStyles);

	static properties = {
		blocked: {type: Boolean, reflect: true},
		blockedReason: {type: String},
		loading: {type: Boolean},
		transformTool: {type: String},
		measurementTool: {type: String},
		gridEnabled: {type: Boolean},
		gridSnapEnabled: {type: Boolean},
		collisionAvoidanceEnabled: {type: Boolean},
		hasSelection: {type: Boolean},
		objectSidebarCollapsed: {
			type: Boolean,
			reflect: true,
			attribute: "object-sidebar-collapsed",
		},
	};

	public transformTool: TransformOptions = "translate";
	public blocked = true;
	public blockedReason = "";
	public loading = true;

	private get blockedLabel(): string {
		return this.loading
			? this.locale.get("loadingSpace")
			: this.locale.get(this.blockedReason || "editingUnavailable");
	}
	public measurementTool: MeasurementOptions = "none";
	public gridEnabled = true;
	public gridSnapEnabled = false;
	public collisionAvoidanceEnabled =
		LocalStorage.read(COLLISION_AVOIDANCE_STORAGE_KEY, false) ?? false;
	public hasSelection = false;
	public objectSidebarCollapsed = true;

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

	private handleMeasurementsClear(): void {
		this.measurementTool = "none";
		this.dispatchEvent(
			new CustomEvent("measurements-clear", {
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

	private handleFocusSelection(): void {
		this.dispatchEvent(
			new CustomEvent("focus-selection", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private renderButton(
		icon: string,
		label: string,
		selected: boolean,
		onClick: () => void,
		disabled = false,
	) {
		return html`
			<dt3d-tooltip .content=${this.blocked ? this.blockedLabel : label} placement="top">
				<button
					class=${selected ? "selected" : ""}
					@click=${onClick}
					aria-label=${label}
					aria-pressed=${selected}
					?disabled=${disabled || this.blocked}
				>
					<ha-icon icon=${icon}></ha-icon>
				</button>
			</dt3d-tooltip>
		`;
	}

	render() {
		return html`
			<nav class="editor-toolbar" aria-label=${this.locale.get("editorTools")}>
				<div class="tool-group" aria-label=${this.locale.get("controls")}>
					${this.renderButton(
						"mdi:cursor-move",
						this.locale.get("translateObject"),
						this.transformTool === "translate",
						() => this.handleTransformSelect("translate"),
					)}
					${this.renderButton(
						"mdi:rotate-right",
						this.locale.get("rotateObject"),
						this.transformTool === "rotate",
						() => this.handleTransformSelect("rotate"),
					)}
					${this.renderButton(
						"mdi:resize",
						this.locale.get("scaleObject"),
						this.transformTool === "scale",
						() => this.handleTransformSelect("scale"),
					)}
					${this.renderButton(
						"mdi:cursor-default-outline",
						this.locale.get("disableTransformControls"),
						this.transformTool === "none",
						() => this.handleTransformSelect("none"),
					)}
					${this.renderButton(
						"mdi:focus-field",
						this.locale.get("focusSelectedObjects"),
						false,
						() => this.handleFocusSelection(),
						!this.hasSelection,
					)}
				</div>
				<div class="tool-group" aria-label=${this.locale.get("measure")}>
					${this.renderButton(
						"mdi:social-distance-2-meters",
						this.locale.get("measureDistance"),
						this.measurementTool === "distance",
						() => this.handleMeasurementSelect("distance"),
					)}
					${this.renderButton(
						"mdi:angle-acute",
						this.locale.get("measureAngle"),
						this.measurementTool === "angle",
						() => this.handleMeasurementSelect("angle"),
					)}
					${this.renderButton(
						"mdi:cancel",
						this.locale.get("clearMeasurements"),
						false,
						() => this.handleMeasurementsClear(),
					)}
				</div>
			<div class="tool-group settings-toolbar" aria-label=${this.locale.get("gridAndCollisionSettings")}>
				${this.renderButton(
					"mdi:grid",
					this.locale.get("toggleGrid"),
					this.gridEnabled,
					() => this.handleGridToggle(),
				)}
				${this.renderButton(
					"mdi:magnet",
					this.locale.get("snapToGrid"),
					this.gridSnapEnabled,
					() => this.handleGridSnapToggle(),
				)}
				${this.renderButton(
					"mdi:grid-large",
					this.locale.get("configureGrid"),
					false,
					() => this.handleGridConfigOpen(),
				)}
				${this.renderButton(
					"mdi:shield-half-full",
					this.locale.get("preventObjectClipping"),
					this.collisionAvoidanceEnabled,
					() => this.handleCollisionAvoidanceToggle(),
				)}
			</div>
			</nav>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-bottom-bar": DT3DBottomBar;
	}
}
