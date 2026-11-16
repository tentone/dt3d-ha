import {html, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {LocalizedElement} from "../../locale/localized-element.js";
import componentStyles from "./confirmation-modal.css?inline";

export type ConfirmationActionType = "blue" | "green" | "red";

@customElement("dt3d-confirmation-modal")
export class DT3DConfirmationModal extends LocalizedElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: String})
	public heading?: string;

	@property({type: String})
	public message = "";

	@property({type: String})
	public confirmLabel?: string;

	@property({type: String})
	public cancelLabel?: string;

	@property({type: String})
	public secondaryLabel = "";

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

	private secondary(): void {
		this.dispatchEvent(
			new CustomEvent("modal-secondary", {
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
					class=${this.secondaryLabel ? "dialog choice-dialog" : "dialog"}
					role="dialog"
					aria-modal="true"
					aria-labelledby="confirmation-heading"
					@submit=${this.handleSubmit}
					@click=${(event: Event) => event.stopPropagation()}
				>
					<header>
						<h3 id="confirmation-heading">${this.heading ?? this.locale.get("confirm")}</h3>
					</header>
					<p>${this.message}</p>
					<div class="actions">
						<button type="button" class="cancel-button" @click=${this.close}>
							${this.cancelLabel ?? this.locale.get("cancel")}
						</button>
						${this.secondaryLabel
							? html`
								<button
									type="button"
									class="secondary-button"
									@click=${this.secondary}
								>
									${this.secondaryLabel}
								</button>
							`
							: null}
						<button type="submit" class=${this.buttonClass}>
							${this.confirmLabel ?? this.locale.get("confirm")}
						</button>
					</div>
				</form>
			</div>
		`;
	}
}
