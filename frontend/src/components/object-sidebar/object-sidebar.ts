import {html, LitElement, type PropertyValues, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";
import tippy, {type Instance, type Props} from "tippy.js";
import tippyStyles from "tippy.js/dist/tippy.css?inline";

import {localManager} from "../../locale/locale.js";
import {LocalStorage} from "../../utils/local-storage.js";
import componentStyles from "./object-sidebar.css?inline";

/**
 * Wall placement options.
 */
export type WallOptions = "wall" | "door" | "window" | "none";

const OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

/**
 * Sidebar containing object creation and wall editing tools.
 */
@customElement("dt3d-object-sidebar")
export class DT3DObjectSidebar extends LitElement {
	static styles = unsafeCSS(componentStyles + tippyStyles);

	static properties = {
		collapsed: {type: Boolean, reflect: true},
		wallTool: {type: String},
	};

	public collapsed =
		LocalStorage.read(OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY, true) ?? true;

	public wallTool: WallOptions = "none";

	private tooltipInstances: Array<Instance<Props>> = [];

	public disconnectedCallback(): void {
		this.destroyTooltips();
		super.disconnectedCallback();
	}

	protected firstUpdated(_changedProperties: PropertyValues<this>): void {
		super.firstUpdated(_changedProperties);
		this.createTooltips();
	}

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
				placement: "right",
				theme: "dt3d-object-sidebar",
				appendTo: () => this.renderRoot as unknown as Element,
			});

			this.tooltipInstances.push(instance);
		});
	}

	private destroyTooltips(): void {
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
			<div class="object-sidebar-content">
				<section class="object-sidebar-section">
					<div class="object-sidebar-title">${localManager.get("add")}</div>
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
				</section>
				<section class="object-sidebar-section">
					<div class="object-sidebar-title">${localManager.get("walls")}</div>
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
						class=${this.wallTool === "none" ? "selected" : ""}
						data-tooltip=${localManager.get("exitWallTools")}
						aria-label=${localManager.get("exitWallTools")}
					>
						<ha-icon icon="mdi:cancel"></ha-icon>
					</button>
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
