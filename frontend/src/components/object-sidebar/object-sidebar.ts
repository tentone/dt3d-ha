import "../tooltip/tooltip.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import {LocalStorage} from "../../utils/local-storage.js";
import componentStyles from "./object-sidebar.css?inline";

/**
 * Wall placement options.
 */
export type WallOptions =
	| "wall"
	| "floor"
	| "door"
	| "window"
	| "gate"
	| "none";

const OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

/**
 * Sidebar containing object creation and wall editing tools.
 */
@customElement("dt3d-object-sidebar")
export class DT3DObjectSidebar extends LitElement {
	static styles = unsafeCSS(componentStyles);

	static properties = {
		collapsed: {type: Boolean, reflect: true},
		wallTool: {type: String},
	};

	public collapsed =
		LocalStorage.read(OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY, true) ?? true;

	public wallTool: WallOptions = "none";

	private toggleCollapse(): void {
		this.collapsed = !this.collapsed;
		LocalStorage.write(OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY, this.collapsed);
		this.dispatchEvent(
			new CustomEvent("object-sidebar-collapse-changed", {
				detail: {collapsed: this.collapsed},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleAddObject(type: string): void {
		this.dispatchEvent(
			new CustomEvent("add-object", {
				detail: {type},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleWallSelect(mode: WallOptions): void {
		this.wallTool = mode;
		this.dispatchEvent(
			new CustomEvent("wall-tool-selected", {
				detail: {mode},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleMeshMenuOpen(event: MouseEvent): void {
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

	private handleUploadMenuOpen(event: MouseEvent): void {
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

	private handleLightMenuOpen(event: MouseEvent): void {
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

	render() {
		return html`
			<dt3d-tooltip
				.content=${localManager.get("collapseSidebar")}
				placement="right"
			>
				<button
					class="collapse-btn"
					@click=${this.toggleCollapse}
					aria-label=${localManager.get("collapseSidebar")}
				>
					${this.collapsed
						? html`<ha-icon
								icon="mdi:arrow-right-drop-circle-outline"
							></ha-icon>`
						: html`<ha-icon
								icon="mdi:arrow-left-drop-circle-outline"
							></ha-icon>`}
				</button>
			</dt3d-tooltip>
			<div class="object-sidebar-content">
				<section class="object-sidebar-section">
					<div class="object-sidebar-title">${localManager.get("add")}</div>
					<dt3d-tooltip
						.content=${localManager.get("addMesh")}
						placement="right"
					>
						<button
							@click=${(event: MouseEvent) => this.handleMeshMenuOpen(event)}
							aria-label=${localManager.get("addMesh")}
						>
							<ha-icon icon="mdi:shape-outline"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("uploadModel")}
						placement="right"
					>
						<button
							@click=${(event: MouseEvent) => this.handleUploadMenuOpen(event)}
							aria-label=${localManager.get("uploadModel")}
						>
							<ha-icon icon="mdi:upload-box-outline"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("addEntity")}
						placement="right"
					>
						<button
							@click=${() => this.handleAddObject("entity")}
							aria-label=${localManager.get("addEntity")}
						>
							<ha-icon icon="mdi:state-machine"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("addStaticLight")}
						placement="right"
					>
						<button
							@click=${(event: MouseEvent) => this.handleLightMenuOpen(event)}
							aria-label=${localManager.get("addStaticLight")}
						>
							<ha-icon icon="mdi:lightbulb-on-outline"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("addGroup")}
						placement="right"
					>
						<button
							@click=${() => this.handleAddObject("group")}
							aria-label=${localManager.get("addGroup")}
						>
							<ha-icon icon="mdi:folder-plus-outline"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("addViewport")}
						placement="right"
					>
						<button
							@click=${() => this.handleAddObject("viewport")}
							aria-label=${localManager.get("addViewport")}
						>
							<ha-icon icon="mdi:camera-plus-outline"></ha-icon>
						</button>
					</dt3d-tooltip>
				</section>
				<section class="object-sidebar-section">
					<div class="object-sidebar-title">${localManager.get("walls")}</div>
					<dt3d-tooltip
						.content=${localManager.get("drawWall")}
						placement="right"
					>
						<button
							@click=${() => this.handleWallSelect("wall")}
							class=${this.wallTool === "wall" ? "selected" : ""}
							aria-label=${localManager.get("drawWall")}
						>
							<ha-icon icon="mdi:vector-line"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("drawFloor")}
						placement="right"
					>
						<button
							@click=${() => this.handleWallSelect("floor")}
							class=${this.wallTool === "floor" ? "selected" : ""}
							aria-label=${localManager.get("drawFloor")}
						>
							<ha-icon icon="mdi:floor-plan"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("addDoor")}
						placement="right"
					>
						<button
							@click=${() => this.handleWallSelect("door")}
							class=${this.wallTool === "door" ? "selected" : ""}
							aria-label=${localManager.get("addDoor")}
						>
							<ha-icon icon="mdi:door"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("addWindow")}
						placement="right"
					>
						<button
							@click=${() => this.handleWallSelect("window")}
							class=${this.wallTool === "window" ? "selected" : ""}
							aria-label=${localManager.get("addWindow")}
						>
							<ha-icon icon="mdi:window-closed-variant"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("addGate")}
						placement="right"
					>
						<button
							@click=${() => this.handleWallSelect("gate")}
							class=${this.wallTool === "gate" ? "selected" : ""}
							aria-label=${localManager.get("addGate")}
						>
							<ha-icon icon="mdi:gate"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip
						.content=${localManager.get("exitWallTools")}
						placement="right"
					>
						<button
							@click=${() => this.handleWallSelect("none")}
							class=${this.wallTool === "none" ? "selected" : ""}
							aria-label=${localManager.get("exitWallTools")}
						>
							<ha-icon icon="mdi:cancel"></ha-icon>
						</button>
					</dt3d-tooltip>
				</section>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-object-sidebar": DT3DObjectSidebar;
	}
}
