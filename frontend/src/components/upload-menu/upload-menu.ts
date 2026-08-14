import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import componentStyles from "../mesh-menu/mesh-menu.css?inline";

const UPLOAD_OPTIONS = [
	{labelKey: "uploadModelFiles", action: "model-files", icon: "mdi:file-upload-outline"},
	{labelKey: "uploadModelDirectory", action: "model-directory", icon: "mdi:folder-upload-outline"},
	{labelKey: "uploadFloorplan", action: "floorplan", icon: "mdi:floor-plan"},
];

@customElement("dt3d-upload-menu")
export class DT3DUploadMenu extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: Number}) public x = 0;
	@property({type: Number}) public y = 0;

	private close(): void {
		this.dispatchEvent(new CustomEvent("modal-close", {
			bubbles: true,
			composed: true,
		}));
	}

	private select(action: string): void {
		this.dispatchEvent(new CustomEvent("upload-selected", {
			detail: {action},
			bubbles: true,
			composed: true,
		}));
		this.close();
	}

	public render() {
		return html`
			<div class="overlay" @click=${this.close}></div>
			<div
				class="menu"
				style=${`--menu-x: ${this.x}px; --menu-y: ${this.y}px;`}
				@click=${(event: Event) => event.stopPropagation()}
			>
				${UPLOAD_OPTIONS.map((option) => html`
					<button
						@click=${() => this.select(option.action)}
						aria-label=${localManager.get(option.labelKey)}
					>
						<ha-icon icon=${option.icon}></ha-icon>
						<span>${localManager.get(option.labelKey)}</span>
					</button>
				`)}
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-upload-menu": DT3DUploadMenu;
	}
}
