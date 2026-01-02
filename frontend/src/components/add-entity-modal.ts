import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

/**
 * Modal component to select an entity to add to the scene.
 */
@customElement("dt3d-add-entity-modal")
export class DT3DAddEntityModal extends LitElement {
	static styles = css`
		:host {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background: rgba(0, 0, 0, 0.3);
			z-index: 1000;
		}

		.dialog {
			width: min(420px, 90%);
			background: var(--ha-color-neutral-10);
			padding: 20px;
			border-radius: 10px;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
		}

		h3 {
			margin: 0 0 10px 0;
		}

		input {
			width: 100%;
			padding: 6px 8px;
			margin: 8px 0 12px 0;
			border-radius: 6px;
			border: 1px solid var(--ha-color-border);
			background: var(--ha-color-neutral-05);
			color: var(--ha-color-neutral-95);
			box-sizing: border-box;
		}

		ul {
			list-style: none;
			padding: 0;
			margin: 10px 0;
			max-height: 240px;
			overflow-y: auto;
		}

		li {
			padding: 6px;
			cursor: pointer;
			border-bottom: 1px solid var(--ha-color-border);
		}

		li:hover {
			background: var(--ha-color-primary-10);
		}

		button {
			margin-top: 10px;
			padding: 5px 10px;
			background: var(--ha-color-red-40);
			color: white;
			border: none;
			border-radius: 5px;
			cursor: pointer;
		}
	`;

	@property({ attribute: false })
	public states: Record<string, unknown> = {};

	@state()
	private query = "";

	private get filteredEntityIds(): string[] {
		const query = this.query.trim().toLowerCase();

		return Object.keys(this.states ?? {}).filter(
			(entityId) => !query || entityId.toLowerCase().includes(query),
		);
	}

	private handleClose(): void {
		this.dispatchEvent(
			new CustomEvent("modal-close", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleSearch(event: Event): void {
		this.query = (event.target as HTMLInputElement)?.value ?? "";
	}

	private handleEntitySelect(entityId: string): void {
		this.dispatchEvent(
			new CustomEvent("entity-selected", {
				detail: { entityId },
				bubbles: true,
				composed: true,
			}),
		);
	}

	protected render() {
		return html`
			<div class="dialog" @click=${(event: Event) => event.stopPropagation()}>
				<h3>Select an Entity</h3>
				<input
					type="search"
					placeholder="Search entities..."
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
				<button @click=${this.handleClose}>Cancel</button>
			</div>
		`;
	}
}
