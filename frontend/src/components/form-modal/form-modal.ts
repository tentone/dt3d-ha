import "../dynamic-form/dynamic-form.js";

import {html, LitElement, nothing, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import type {
	DynamicFormChangeDetail,
	DynamicFormField,
} from "../dynamic-form/dynamic-form.js";
import componentStyles from "./form-modal.css?inline";

export type FormModalSubmitDetail = {
	values: Record<string, unknown>;
};

const cloneFormData = (value: unknown): any => {
	if (Array.isArray(value)) {
		return value.map((item) => cloneFormData(item));
	}

	if (value && typeof value === "object") {
		if (typeof File !== "undefined" && value instanceof File) {
			return value;
		}

		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
				key,
				cloneFormData(entry),
			]),
		);
	}

	return value;
};

@customElement("dt3d-form-modal")
export class DT3DFormModal extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: String})
	public heading = "";

	@property({type: String})
	public description = "";

	@property({type: String})
	public confirmLabel = localManager.get("save");

	@property({type: String})
	public cancelLabel = localManager.get("cancel");

	@property({attribute: false})
	public fields: DynamicFormField[] = [];

	private _data: Record<string, unknown> = {};

	@state()
	private values: Record<string, unknown> = {};

	@property({attribute: false})
	public get data(): Record<string, unknown> {
		return this._data;
	}

	public set data(value: Record<string, unknown>) {
		const oldValue = this._data;
		this._data = value ?? {};
		this.values = cloneFormData(this._data);
		this.requestUpdate("data", oldValue);
	}

	private close(): void {
		this.dispatchEvent(
			new CustomEvent("modal-close", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private submit(): void {
		this.dispatchEvent(
			new CustomEvent<FormModalSubmitDetail>("form-submit", {
				detail: {values: cloneFormData(this.values)},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleSubmit(event: Event): void {
		event.preventDefault();
		this.submit();
	}

	private handleFieldChange(event: CustomEvent<DynamicFormChangeDetail>): void {
		const nextValues = cloneFormData(this.values);
		this.setNestedAttribute(
			nextValues,
			event.detail.attribute,
			event.detail.value,
		);
		this.values = nextValues;
	}

	private setNestedAttribute(
		target: Record<string, unknown>,
		attribute: string,
		value: unknown,
	): void {
		const keys = attribute.split(".");
		let current: Record<string, unknown> = target;

		for (let index = 0; index < keys.length - 1; index += 1) {
			const key = keys[index];
			const next = current[key];
			current[key] = next && typeof next === "object"
				? {...(next as Record<string, unknown>)}
				: {};
			current = current[key] as Record<string, unknown>;
		}

		current[keys[keys.length - 1]] = value;
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (event.key === "Escape") {
			event.preventDefault();
			this.close();
		}
	}

	public render() {
		return html`
			<div class="overlay" @click=${this.close} @keydown=${this.handleKeyDown}>
				<form
					class="dialog"
					role="dialog"
					aria-modal="true"
					aria-labelledby="form-modal-heading"
					@submit=${this.handleSubmit}
					@click=${(event: Event) => event.stopPropagation()}
				>
					<header>
						<div>
							<h3 id="form-modal-heading">${this.heading}</h3>
							${this.description ? html`<p>${this.description}</p>` : nothing}
						</div>
						<button
							type="button"
							class="close-button"
							@click=${this.close}
							aria-label=${this.cancelLabel}
						>
							<ha-icon icon="mdi:close"></ha-icon>
						</button>
					</header>
					<dt3d-dynamic-form
						.fields=${this.fields}
						.data=${this.values}
						@field-change=${(event: CustomEvent<DynamicFormChangeDetail>) =>
		this.handleFieldChange(event)}
					></dt3d-dynamic-form>
					<div class="actions">
						<button type="button" class="cancel-button" @click=${this.close}>
							${this.cancelLabel}
						</button>
						<button type="submit" class="confirm-button">
							${this.confirmLabel}
						</button>
					</div>
				</form>
			</div>
		`;
	}
}
