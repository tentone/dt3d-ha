import {html, LitElement, unsafeCSS} from "lit";
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

	private requestCreate(): void {
		this.dispatchEvent(
			new CustomEvent("space-create-request", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private requestDelete(): void {
		if (!this.selectedSpaceId) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent("space-delete-request", {
				detail: {spaceId: this.selectedSpaceId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	protected render() {
		return html`
			<div class="selector">
				<label for="active-space">${localManager.get("space")}</label>
				<select
					id="active-space"
					.value=${this.selectedSpaceId}
					?disabled=${this.loading || this.spaces.length === 0}
					@change=${this.handleChange}>
					${this.spaces.length === 0
						? html`<option value="">${localManager.get("noSpaces")}</option>`
						: null}
					${this.spaces.map(
						(space) => html`<option value=${space.id}>${space.name}</option>`,
					)}
				</select>
				<button
					type="button"
					?disabled=${this.loading}
					@click=${this.requestCreate}
					title=${localManager.get("createSpace")}
					aria-label=${localManager.get("createSpace")}>
					<ha-icon icon="mdi:plus"></ha-icon>
				</button>
				<button
					type="button"
					class="delete-button"
					?disabled=${this.loading || !this.selectedSpaceId}
					@click=${this.requestDelete}
					title=${localManager.get("deleteSpace")}
					aria-label=${localManager.get("deleteSpace")}>
					<ha-icon icon="mdi:delete-outline"></ha-icon>
				</button>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-space-selector": DT3DSpaceSelector;
	}
}
