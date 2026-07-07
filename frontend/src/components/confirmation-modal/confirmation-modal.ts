import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import componentStyles from "./confirmation-modal.css?inline";

export type ConfirmationActionType = "blue" | "green" | "red";

@customElement("dt3d-confirmation-modal")
export class DT3DConfirmationModal extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: String})
	public heading = localManager.get("confirm");

	@property({type: String})
	public message = "";

	@property({type: String})
	public confirmLabel = localManager.get("confirm");

	@property({type: String})
	public cancelLabel = localManager.get("cancel");

	@property({type: String, attribute: "action-type"})
	public actionType: ConfirmationActionType = "blue";

	protected firstUpdated(): void {
		this.renderRoot.querySelector<HTMLButtonElement>(".confirm-button")?.focus();
	}

	private close(): void {
		this.dispatchEvent(
			new CustomEvent("modal-close", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private confirm(): void {
		this.dispatchEvent(
			new CustomEvent("modal-confirm", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleSubmit(event: Event): void {
		event.preventDefault();
		this.confirm();
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (event.key === "Escape") {
			event.preventDefault();
			this.close();
		}
	}

	private get buttonClass(): string {
		const actionType = ["blue", "green", "red"].includes(this.actionType)
			? this.actionType
			: "blue";

		return `confirm-button ${actionType}`;
	}

	public render() {
		return html`
			<div class="overlay" @click=${this.close} @keydown=${this.handleKeyDown}>
				<form
					class="dialog"
					role="dialog"
					aria-modal="true"
					aria-labelledby="confirmation-heading"
					@submit=${this.handleSubmit}
					@click=${(event: Event) => event.stopPropagation()}
				>
					<header>
						<h3 id="confirmation-heading">${this.heading}</h3>
					</header>
					<p>${this.message}</p>
					<div class="actions">
						<button type="button" class="cancel-button" @click=${this.close}>
							${this.cancelLabel}
						</button>
						<button type="submit" class=${this.buttonClass}>
							${this.confirmLabel}
						</button>
					</div>
				</form>
			</div>
		`;
	}
}
