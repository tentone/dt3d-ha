import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import componentStyles from "./dynamic-form.css?inline";

export type DynamicFieldType =
	| "Vector3"
	| "string"
	| "number"
	| "boolean"
	| "color"
	| "info";

export type DynamicFormField = {
	label: string;
	attribute: string;
	type: DynamicFieldType;
	tooltip?: string;
	editable: boolean;
	enabled: boolean;
};

export type DynamicFormChangeDetail = {
	attribute: string;
	value: unknown;
	type: DynamicFieldType;
};

type VectorValue = {
	x: number;
	y: number;
	z: number;
	isEuler?: boolean;
};

@customElement("dynamic-form")
export class DynamicForm extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({ attribute: false })
	public fields: DynamicFormField[] = [];

	@property({ attribute: false })
	public data: Record<string, unknown> | null = null;

	private getFieldValue(field: DynamicFormField): unknown {
		if (!this.data) return null;
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
		if (Number.isNaN(value)) return "";
		return value.toFixed(decimals);
	}

	private getVectorDisplayValue(field: DynamicFormField): VectorValue | null {
		const value = this.getFieldValue(field);
		if (!value || typeof value !== "object") return null;
		const vector = value as VectorValue;
		if (typeof vector.x !== "number") return null;

		const isEuler = Boolean((vector as any).isEuler);
		const factor = isEuler ? 180 / Math.PI : 1;

		return {
			x: vector.x * factor,
			y: vector.y * factor,
			z: vector.z * factor,
			isEuler,
		};
	}

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

	private dispatchFieldChange(
		attribute: string,
		type: DynamicFieldType,
		value: unknown,
	) {
		this.dispatchEvent(
			new CustomEvent<DynamicFormChangeDetail>("field-change", {
				detail: { attribute, value, type },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private renderVectorField(field: DynamicFormField) {
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
	}

	private renderField(field: DynamicFormField) {
		if (!field.enabled) {
			return null;
		}

		switch (field.type) {
			case "Vector3":
				return this.renderVectorField(field);
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

	public render() {
		return html`${this.fields.map((field) => this.renderField(field))}`;
	}
}
