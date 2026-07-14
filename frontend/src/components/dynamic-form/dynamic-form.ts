import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import componentStyles from "./dynamic-form.css?inline";

/**
 * Types of fields supported by the DynamicForm component.
 */
export type DynamicInputFieldType =
	| "Vector3"
	| "string"
	| "number"
	| "boolean"
	| "color"
	| "info"
	| "file"
	| "select";

export type DynamicFieldType = DynamicInputFieldType | "sub-form";

/**
 * The description of a single input field to be rendered in the DynamicForm component.
 */
export type DynamicFormInputField = {
	label: string;
	attribute: string;
	type: DynamicInputFieldType;
	tooltip?: string;
	editable: boolean;
	enabled: boolean;
	step?: number;
	min?: number;
	max?: number;
	options?: Array<{
		label: string;
		value: string | number | boolean;
	}>;
};

/**
 * A group of fields rendered in a collapsible DynamicForm section.
 */
export type DynamicFormSubFormField = {
	label: string;
	attribute?: string;
	type: "sub-form";
	tooltip?: string;
	enabled: boolean;
	fields: DynamicFormField[];
	data?: unknown;
	collapsed?: boolean;
};

export type DynamicFormField = DynamicFormInputField | DynamicFormSubFormField;

/**
 * Detail of a change in a field of the DynamicForm component, emitted in the "field-change" event.
 */
export type DynamicFormChangeDetail = {
	attribute: string;
	value: unknown;
	type: DynamicInputFieldType;
};

/**
 * Type to represent a 3D vector value.
 *
 * Optional flag to indicate if it's an Euler angle (for display purposes).
 */
type VectorValue = {
	x: number;
	y: number;
	z: number;
	isEuler?: boolean;
};

@customElement("dt3d-dynamic-form")
export class DynamicForm extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public fields: DynamicFormField[] = [];

	@property({attribute: false})
	public data: unknown = null;

	private subFormOpenState = new Map<string, boolean>();

	private getFieldValue(
		field: DynamicFormInputField,
		data = this.data,
	): unknown {
		if (!data) {
			return null;
		}

		const path = field.attribute.split(".");
		let current: any = data;
		for (const segment of path) {
			if (current == null) {
				return null;
			}
			current = current[segment];
		}

		return current ?? null;
	}

	private formatNumber(value: number, decimals = 2) {
		if (Number.isNaN(value)) {
			return "";
		}

		return value.toFixed(decimals);
	}

	private getVectorDisplayValue(
		field: DynamicFormInputField,
		data: unknown,
	): VectorValue | null {
		const value = this.getFieldValue(field, data);
		if (!value || typeof value !== "object") {
			return null;
		}

		const vector = value as VectorValue;
		if (typeof vector.x !== "number") {
			return null;
		}

		const isEuler = Boolean((vector as any).isEuler);
		const factor = isEuler ? 180 / Math.PI : 1;

		return {
			x: vector.x * factor,
			y: vector.y * factor,
			z: vector.z * factor,
			isEuler,
		};
	}

	/**
	 *
	 * @param field
	 * @returns
	 */
	private getColorValue(field: DynamicFormInputField, data: unknown): string {
		const value = this.getFieldValue(field, data);
		if (!value) return "#000000";
		if (typeof value === "string") {
			return value;
		}
		if (typeof (value as any).getHexString === "function") {
			return `#${(value as any).getHexString()}`;
		}
		return "#000000";
	}

	/**
	 * Dispatch a "field-change" event when a field value is changed by the user.
	 *
	 * @param attribute - The attribute path of the changed field.
	 * @param type - The type of the changed field.
	 * @param value - The new value of the changed field.
	 */
	private dispatchFieldChange(
		attribute: string,
		type: DynamicInputFieldType,
		value: unknown,
	) {
		this.dispatchEvent(
			new CustomEvent<DynamicFormChangeDetail>("field-change", {
				detail: {attribute, value, type},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private getAxisColor(axis: "x" | "y" | "z"): string {
		switch (axis) {
			case "x":
				return "#ff0000";
			case "y":
				return "#00ff00";
			case "z":
				return "#0000ff";
			default:
				return "#000000";
		}
	}

	private getSubFormKey(field: DynamicFormSubFormField): string {
		return field.attribute ?? field.label;
	}

	private isSubFormOpen(field: DynamicFormSubFormField): boolean {
		const key = this.getSubFormKey(field);
		return this.subFormOpenState.get(key) ?? field.collapsed !== true;
	}

	private handleSubFormToggle(field: DynamicFormSubFormField, event: Event) {
		const details = event.currentTarget as HTMLDetailsElement;
		this.subFormOpenState.set(this.getSubFormKey(field), details.open);
	}

	private renderSubForm(field: DynamicFormSubFormField, data: unknown) {
		const subFormData = field.data === undefined ? data : field.data;

		return html`
			<details
				class="sub-form"
				?open=${this.isSubFormOpen(field)}
				@toggle=${(event: Event) => this.handleSubFormToggle(field, event)}
			>
				<summary class="sub-form-summary" title=${field.tooltip ?? ""}>
					<span>${field.label}</span>
				</summary>
				<div class="sub-form-fields">
					${field.fields.map((subField) =>
						this.renderField(subField, subFormData),
					)}
				</div>
			</details>
		`;
	}

	/**
	 * Render a field of the form.
	 *
	 * @param field - Field description to render.
	 * @returns Rendered template for the field, or null if the field type is not supported or the field is disabled.
	 */
	private renderField(field: DynamicFormField, data = this.data) {
		if (!field.enabled) {
			return null;
		}

		switch (field.type) {
			case "sub-form":
				return this.renderSubForm(field, data);
			case "Vector3":
				const vector = this.getVectorDisplayValue(field, data);
				if (!vector) {
					return null;
				}

				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<div class="group-row">
							${(["x", "y", "z"] as const).map(
								(axis) => html`
									<label style="color: ${this.getAxisColor(axis)}">
										${axis.toUpperCase()}
										<input
											type="number"
											step="0.01"
											.value=${this.formatNumber(vector[axis])}
											?disabled=${!field.editable || !field.enabled}
											@change=${(event: Event) => {
												const rawValue = parseFloat(
													(event.target as HTMLInputElement).value,
												);
												if (Number.isNaN(rawValue)) return;
												this.dispatchFieldChange(
													`${field.attribute}.${axis}`,
													field.type,
													rawValue,
												);
											}}
										/>
									</label>
								`,
							)}
						</div>
					</div>
				`;
			case "boolean": {
				const value = Boolean(this.getFieldValue(field, data));
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>
							<input
								type="checkbox"
								.checked=${value}
								?disabled=${!field.editable}
								@change=${(event: Event) =>
									this.dispatchFieldChange(
										field.attribute,
										field.type,
										(event.target as HTMLInputElement).checked,
									)}
							/>
							${field.label}
						</label>
					</div>
				`;
			}
			case "color": {
				const value = this.getColorValue(field, data);
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<input
							type="color"
							class="color-input"
							.value=${value}
							?disabled=${!field.editable}
							@input=${(event: Event) =>
								this.dispatchFieldChange(
									field.attribute,
									field.type,
									(event.target as HTMLInputElement).value,
								)}
						/>
					</div>
				`;
			}
			case "file": {
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<input
							type="file"
							accept="image/*"
							?disabled=${!field.editable}
							@change=${(event: Event) => {
								const file = (event.target as HTMLInputElement).files?.[0];
								if (!file) return;
								this.dispatchFieldChange(field.attribute, field.type, file);
							}}
						/>
					</div>
				`;
			}
			case "info": {
				const value = this.getFieldValue(field, data);
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<input
							type="text"
							class="info-input"
							.value=${value == null ? "" : String(value)}
							readonly
							disabled
						/>
					</div>
				`;
			}
			case "select": {
				const value = this.getFieldValue(field, data);
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<select
							?disabled=${!field.editable}
							.value=${value == null ? "" : String(value)}
							@change=${(event: Event) =>
								this.dispatchFieldChange(
									field.attribute,
									field.type,
									(event.target as HTMLSelectElement).value,
								)}
						>
							${(field.options ?? []).map(
								(option) => html`
									<option value=${String(option.value)}>${option.label}</option>
								`,
							)}
						</select>
					</div>
				`;
			}
			case "number": {
				const value = Number(this.getFieldValue(field, data) ?? 0);
				const step = field.step ?? 0.01;
				const decimals =
					step >= 1 ? 0 : Math.min(6, Math.ceil(-Math.log10(step)));
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<input
							type="number"
							step=${String(step)}
							min=${field.min == null ? undefined : String(field.min)}
							max=${field.max == null ? undefined : String(field.max)}
							.value=${this.formatNumber(value, decimals)}
							?disabled=${!field.editable}
							@change=${(event: Event) => {
								const rawValue = parseFloat(
									(event.target as HTMLInputElement).value,
								);
								if (Number.isNaN(rawValue)) return;
								this.dispatchFieldChange(field.attribute, field.type, rawValue);
							}}
						/>
					</div>
				`;
			}
			case "string": {
				const value = this.getFieldValue(field, data);
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<input
							type="text"
							.value=${value == null ? "" : String(value)}
							?disabled=${!field.editable}
							@input=${(event: Event) =>
								this.dispatchFieldChange(
									field.attribute,
									field.type,
									(event.target as HTMLInputElement).value,
								)}
						/>
					</div>
				`;
			}
			default:
				return null;
		}
	}

	/**
	 * Render the component.
	 *
	 * @returns Rendered template for the component.
	 */
	public render() {
		return html`${this.fields.map((field) => this.renderField(field))}`;
	}
}
