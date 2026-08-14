import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import {FURNITURE_OPTIONS} from "../../objects/furniture/furniture-registry.js";
import componentStyles from "../mesh-menu/mesh-menu.css?inline";

@customElement("dt3d-furniture-menu")
export class DT3DFurnitureMenu extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: Number}) public x = 0;
	@property({type: Number}) public y = 0;

	private close(): void {
		this.dispatchEvent(
			new CustomEvent("modal-close", {bubbles: true, composed: true}),
		);
	}

	private addObject(type: string): void {
		this.dispatchEvent(
			new CustomEvent("add-object", {
				detail: {type},
				bubbles: true,
				composed: true,
			}),
		);
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
				${FURNITURE_OPTIONS.map(
					(option) => html`
						<button
							@click=${() => this.addObject(option.type)}
							aria-label=${`${localManager.get("add")} ${localManager.get(option.labelKey)}`}
						>
							<ha-icon icon=${option.icon}></ha-icon>
							<span>${localManager.get(option.labelKey)}</span>
						</button>
					`,
				)}
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-furniture-menu": DT3DFurnitureMenu;
	}
}
