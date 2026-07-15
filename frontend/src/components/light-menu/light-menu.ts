import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import componentStyles from "../mesh-menu/mesh-menu.css?inline";

const LIGHT_OPTIONS = [
	{labelKey: "pointLight", type: "light-point"},
	{labelKey: "spotLight", type: "light-spot"},
	{labelKey: "rectAreaLight", type: "light-rect-area"},
];

@customElement("dt3d-light-menu")
export class DT3DLightMenu extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: Number}) public x = 0;
	@property({type: Number}) public y = 0;

	private close(): void {
		this.dispatchEvent(new CustomEvent("modal-close", {bubbles: true, composed: true}));
	}

	private addObject(type: string): void {
		this.dispatchEvent(new CustomEvent("add-object", {
			detail: {type},
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
				${LIGHT_OPTIONS.map((option) => html`
					<button
						@click=${() => this.addObject(option.type)}
						aria-label=${`${localManager.get("add")} ${localManager.get(option.labelKey)}`}
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
		"dt3d-light-menu": DT3DLightMenu;
	}
}
