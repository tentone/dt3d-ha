import "../tooltip/tooltip.js";

import {html, LitElement, nothing, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import {LocalStorage} from "../../utils/local-storage.js";
import componentStyles from "./object-sidebar.css?inline";

/** Wall placement options. Openings are selected from the Model Library. */
export type WallOptions =
	| "wall"
	| "floor"
	| "door"
	| "window"
	| "gate"
	| "none";

const OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY = "sidebar-collapsed";

@customElement("dt3d-object-sidebar")
export class DT3DObjectSidebar extends LitElement {
	static styles = unsafeCSS(componentStyles);
	static properties = {
		collapsed: {type: Boolean, reflect: true},
		wallTool: {type: String},
		libraryOpen: {type: Boolean},
	};

	public collapsed =
		LocalStorage.read(OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY, true) ?? true;
	public wallTool: WallOptions = "none";
	public libraryOpen = false;

	private emit(name: string, detail?: unknown): void {
		this.dispatchEvent(
			new CustomEvent(name, {detail, bubbles: true, composed: true}),
		);
	}

	private toggleCollapse(): void {
		this.collapsed = !this.collapsed;
		LocalStorage.write(OBJECT_SIDEBAR_COLLAPSED_STORAGE_KEY, this.collapsed);
		this.emit("object-sidebar-collapse-changed", {collapsed: this.collapsed});
	}

	private selectWall(mode: WallOptions): void {
		this.wallTool = mode;
		this.emit("wall-tool-selected", {mode});
	}

	private openLibrary(event: MouseEvent): void {
		const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		this.emit("model-library-open", {left: rect.right + 8, top: rect.top});
	}

	public focusLibraryButton(): void {
		this.renderRoot
			.querySelector<HTMLButtonElement>(".library-button")
			?.focus();
	}

	private action(
		labelKey: string,
		icon: string,
		action: () => void,
		selected?: boolean,
	) {
		return html`<dt3d-tooltip
			.content=${localManager.get(labelKey)}
			placement="right"
		>
			<button
				@click=${action}
				class=${selected ? "selected" : ""}
				aria-label=${localManager.get(labelKey)}
				aria-pressed=${selected ?? nothing}
			>
				<ha-icon icon=${icon}></ha-icon
				><span>${localManager.get(labelKey)}</span>
			</button>
		</dt3d-tooltip>`;
	}

	public render() {
		return html`
			<dt3d-tooltip
				.content=${localManager.get("collapseSidebar")}
				placement="right"
			>
				<button
					class="collapse-btn"
					@click=${this.toggleCollapse}
					aria-label=${localManager.get("collapseSidebar")}
					aria-expanded=${!this.collapsed}
				>
					<ha-icon
						icon=${this.collapsed
							? "mdi:arrow-right-drop-circle-outline"
							: "mdi:arrow-left-drop-circle-outline"}
					></ha-icon>
				</button>
			</dt3d-tooltip>
			<div class="object-sidebar-content" ?inert=${this.collapsed}>
				<section class="object-sidebar-section">
					<button
						class="library-button"
						@click=${this.openLibrary}
						aria-label=${localManager.get("modelLibrary")}
						aria-haspopup="dialog"
						aria-expanded=${this.libraryOpen}
					>
						<ha-icon icon="mdi:view-grid-plus-outline"></ha-icon
						><span>${localManager.get("modelLibrary")}</span>
					</button>
				</section>
				<section class="object-sidebar-section">
					<div class="object-sidebar-title">
						${localManager.get("sceneTools")}
					</div>
					${this.action("addEntity", "mdi:state-machine", () =>
						this.emit("add-object", {type: "entity"}),
					)}
					${this.action("addGroup", "mdi:folder-plus-outline", () =>
						this.emit("add-object", {type: "group"}),
					)}
					${this.action("addViewport", "mdi:camera-plus-outline", () =>
						this.emit("add-object", {type: "viewport"}),
					)}
				</section>
				<section class="object-sidebar-section">
					<div class="object-sidebar-title">${localManager.get("walls")}</div>
					${this.action(
						"drawWall",
						"mdi:vector-line",
						() => this.selectWall("wall"),
						this.wallTool === "wall",
					)}
					${this.action(
						"drawFloor",
						"mdi:floor-plan",
						() => this.selectWall("floor"),
						this.wallTool === "floor",
					)}
					${this.action("wallCreationDefaults", "mdi:tune-variant", () =>
						this.emit("wall-settings-open"),
					)}
					${this.action("uploadFloorplan", "mdi:image-plus-outline", () =>
						this.emit("floorplan-upload"),
					)}
					${this.action(
						"exitWallTools",
						"mdi:cancel",
						() => this.selectWall("none"),
						this.wallTool === "none",
					)}
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
