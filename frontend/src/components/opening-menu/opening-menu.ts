import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import componentStyles from "../mesh-menu/mesh-menu.css?inline";

export type OpeningTool = "door" | "window" | "gate";

const OPENING_OPTIONS: Array<{
	labelKey: string;
	mode: OpeningTool;
	icon: string;
}> = [
	{labelKey: "door", mode: "door", icon: "mdi:door"},
	{labelKey: "window", mode: "window", icon: "mdi:window-closed-variant"},
	{labelKey: "gate", mode: "gate", icon: "mdi:gate"},
];

@customElement("dt3d-opening-menu")
export class DT3DOpeningMenu extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: Number}) public x = 0;
	@property({type: Number}) public y = 0;

	private close(): void {
		this.dispatchEvent(
			new CustomEvent("modal-close", {bubbles: true, composed: true}),
		);
	}

	private select(mode: OpeningTool): void {
		this.dispatchEvent(
			new CustomEvent("wall-tool-selected", {
				detail: {mode},
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
				${OPENING_OPTIONS.map(
					(option) => html`
						<button
							@click=${() => this.select(option.mode)}
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
		"dt3d-opening-menu": DT3DOpeningMenu;
	}
}
