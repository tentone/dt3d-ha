import {html, LitElement, nothing, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import type {SpaceResponse} from "../../service/space-api.js";
import componentStyles from "./space-selector.css?inline";

@customElement("dt3d-space-selector")
export class DT3DSpaceSelector extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public spaces: SpaceResponse[] = [];

	@property({type: String})
	public selectedSpaceId = "";

	@property({type: Boolean})
	public loading = false;

	private handleChange(event: Event): void {
		const spaceId = (event.target as HTMLSelectElement).value;
		this.selectedSpaceId = spaceId;
		this.dispatchEvent(
			new CustomEvent("space-change", {
				detail: {spaceId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	protected render() {
		if (this.spaces.length === 0) {
			return nothing;
		}

		return html`
			<div class="selector">
				<label for="active-space">${localManager.get("space")}</label>
				<select
					id="active-space"
					.value=${this.selectedSpaceId}
					?disabled=${this.loading}
					@change=${this.handleChange}>
					${this.spaces.map(
						(space) => html`<option value=${space.id}>${space.name}</option>`,
					)}
				</select>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-space-selector": DT3DSpaceSelector;
	}
}
