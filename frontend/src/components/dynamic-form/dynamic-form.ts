import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import componentStyles from "./dynamic-form.css?inline";

/**
 * Types of fields supported by the DynamicForm component.
 */
export type DynamicFieldType =
	| "Vector3"
	| "string"
	| "number"
	| "boolean"
	| "color"
	| "info";

/**
 * The description of a single field to be rendered in the DynamicForm component.
 */
export type DynamicFormField = {
	label: string;
	attribute: string;
	type: DynamicFieldType;
	tooltip?: string;
	editable: boolean;
	enabled: boolean;
};

/**
 * Detail of a change in a field of the DynamicForm component, emitted in the "field-change" event.
 */
export type DynamicFormChangeDetail = {
	attribute: string;
	value: unknown;
	type: DynamicFieldType;
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

	@property({ attribute: false })
	public fields: DynamicFormField[] = [];

	@property({ attribute: false })
	public data: Record<string, unknown> | null = null;

	private getFieldValue(field: DynamicFormField): unknown {
		if (!this.data) {
			return null;
		}

		const path = field.attribute.split(".");
		let current: any = this.data;
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

	private getVectorDisplayValue(field: DynamicFormField): VectorValue | null {
		const value = this.getFieldValue(field);
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
	private getColorValue(field: DynamicFormField): string {
		const value = this.getFieldValue(field);
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
	private dispatchFieldChange(attribute: string,type: DynamicFieldType,value: unknown,) {
		this.dispatchEvent(
			new CustomEvent<DynamicFormChangeDetail>("field-change", {
				detail: { attribute, value, type },
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Render a field of the form.
	 * 
	 * @param field - Field description to render.
	 * @returns Rendered template for the field, or null if the field type is not supported or the field is disabled.
	 */
	private renderField(field: DynamicFormField) {
		if (!field.enabled) {
			return null;
		}

		switch (field.type) {
			case "Vector3":
				const vector = this.getVectorDisplayValue(field);
				if (!vector) return null;

				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<div class="group-row">
							${(["x", "y", "z"] as const).map(
								(axis) => html`
									<label>
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
				const value = Boolean(this.getFieldValue(field));
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
				const value = this.getColorValue(field);
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
			case "info": {
				const value = this.getFieldValue(field);
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
			case "number": {
				const value = Number(this.getFieldValue(field) ?? 0);
				return html`
					<div class="field">
						<label title=${field.tooltip ?? ""}>${field.label}</label>
						<input
							type="number"
							step="0.01"
							.value=${this.formatNumber(value)}
							?disabled=${!field.editable}
							@change=${(event: Event) => {
								const rawValue = parseFloat(
									(event.target as HTMLInputElement).value,
								);
								if (Number.isNaN(rawValue)) return;
								this.dispatchFieldChange(
									field.attribute,
									field.type,
									rawValue,
								);
							}}
						/>
					</div>
				`;
			}
			case "string": {
				const value = this.getFieldValue(field);
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
