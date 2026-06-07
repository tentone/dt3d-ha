import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {MESH_OPTIONS} from "../../editor/mesh-handler.js";
import {localManager} from "../../locale/locale.js";
import componentStyles from "./mesh-menu.css?inline";

@customElement("dt3d-mesh-menu")
export class DT3DMeshMenu extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: Number})
	public x = 0;

	@property({type: Number})
	public y = 0;

	private close() {
		this.dispatchEvent(
			new CustomEvent("modal-close", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private addObject(type: string) {
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
				style=${`left: ${this.x}px; top: ${this.y}px;`}
				@click=${(event: Event) => event.stopPropagation()}
			>
				${MESH_OPTIONS.map(
		(option) => html`
						<button
							@click=${() => this.addObject(option.type)}
							aria-label=${`${localManager.get("add")} ${option.label}`}
						>
							${option.label}
						</button>
					`,
	)}
			</div>
		`;
	}
}
