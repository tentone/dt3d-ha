import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import componentStyles from "../mesh-menu/mesh-menu.css?inline";

const UPLOAD_OPTIONS = [
	{labelKey: "uploadModelFiles", directory: false},
	{labelKey: "uploadModelDirectory", directory: true},
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

	private select(directory: boolean): void {
		this.dispatchEvent(new CustomEvent("upload-model", {
			detail: {directory},
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
				style=${`left: ${this.x}px; top: ${this.y}px;`}
				@click=${(event: Event) => event.stopPropagation()}
			>
				${UPLOAD_OPTIONS.map((option) => html`
					<button
						@click=${() => this.select(option.directory)}
						aria-label=${localManager.get(option.labelKey)}
					>
						${localManager.get(option.labelKey)}
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
