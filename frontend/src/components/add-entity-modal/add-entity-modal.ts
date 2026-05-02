import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import componentStyles from "./add-entity-modal.css?inline";

/**
 * Modal component to select an entity to add to the scene.
 */
@customElement("dt3d-add-entity-modal")
export class DT3DAddEntityModal extends LitElement {
	static styles = unsafeCSS(componentStyles);

	/**
	 * States of the entities in the system, where the key is the entity ID and the value is the state object.
	 */
	@property({attribute: false})
	public states: Record<string, unknown> = {};

	@state()
	private query = "";

	/**
	 * Get the list of entity IDs filtered by the search query.
	 */
	private get filteredEntityIds(): string[] {
		const query = this.query.trim().toLowerCase();

		return Object.keys(this.states ?? {}).filter(
			(entityId) => !query || entityId.toLowerCase().includes(query),
		);
	}


	/**
	 * Apply search filter to the entity list.
	 *
	 * @param event The input event from the search field.
	 */
	private handleSearch(event: Event): void {
		this.query = (event.target as HTMLInputElement)?.value ?? "";
	}

	/**
	 * Close the list of entities without selecting any.
	 */
	private handleClose(): void {
		this.dispatchEvent(
			new CustomEvent("modal-close", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Handle the selection of an entity from the list and dispatch an event with the selected entity ID.
	 *
	 * @param entityId - ID of the entity selected.
	 */
	private handleEntitySelect(entityId: string): void {
		this.dispatchEvent(
			new CustomEvent("entity-selected", {
				detail: {entityId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	protected render() {
		return html`
			<div class="dialog" @click=${(event: Event) => event.stopPropagation()}>
				<h3>${localManager.get("selectAnEntity")}</h3>
				<input
					type="search"
					placeholder=${localManager.get("searchEntities")}
					.value=${this.query}
					@input=${this.handleSearch} />
				<ul>
					${this.filteredEntityIds.map(
		(entityId) =>
			html`<li @click=${() => this.handleEntitySelect(entityId)}>
								${entityId}
							</li>`,
	)}
				</ul>
				<button @click=${this.handleClose}>${localManager.get("cancel")}</button>
			</div>
		`;
	}
}
