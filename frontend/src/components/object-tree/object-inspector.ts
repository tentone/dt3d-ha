import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Color, Object3D } from "three";
import { EntityObject } from "../../objects/entity-object.js";
import componentStyles from "./object-inspector.css?inline";

@customElement("dt3d-object-inspector")
export class DT3DObjectInspector extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({ attribute: false })
	public selectedObject: Object3D | null = null;

	/**
	 * Check if object is a entity object.
	 *
	 * @param object - Object attached to the inspector.
	 * @returns True if object is a entity object.
	 */
	private isEntityObject(object: Object3D | null): object is EntityObject {
		return object instanceof EntityObject;
	}

	/**
	 * Check if object has a material with a color.
	 *
	 * @param object - Object attached to the inspector.
	 * @returns True if the object has a material color to edit.
	 */
	private hasEditableColor(
		object: Object3D | null,
	): object is Object3D & { material: { color: Color } } {
		if (!object || !("material" in object)) {
			return false;
		}

		const material = (object as any).material;
		return Boolean(material?.color && material.color instanceof Color);
	}

	/**
	 *
	 */
	private dispatchUpdated() {
		this.dispatchEvent(
			new CustomEvent("object-updated", {
				detail: { object: this.selectedObject },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleNameChange(event: Event) {
		if (!this.selectedObject) return;

		const value = (event.target as HTMLInputElement).value;
		this.selectedObject.name = value;
		this.dispatchUpdated();
	}

	/**
	 *
	 * @param type
	 * @param axis
	 * @param event
	 * @returns
	 */
	private handleVectorChange(
		type: "position" | "scale",
		axis: "x" | "y" | "z",
		event: Event,
	) {
		if (!this.selectedObject) return;

		const value = parseFloat((event.target as HTMLInputElement).value);
		if (Number.isNaN(value)) return;

		if (type === "position") {
			this.selectedObject.position[axis] = value;
		} else {
			this.selectedObject.scale[axis] = value;
		}

		this.dispatchUpdated();
		this.requestUpdate();
	}

	private handleRotationChange(axis: "x" | "y" | "z", event: Event) {
		if (!this.selectedObject) return;

		const value = parseFloat((event.target as HTMLInputElement).value);
		if (Number.isNaN(value)) return;

		this.selectedObject.rotation[axis] = (value * Math.PI) / 180;
		this.dispatchUpdated();
		this.requestUpdate();
	}

	private handleColorChange(event: Event) {
		if (!this.hasEditableColor(this.selectedObject)) {
			return;
		}

		const value = (event.target as HTMLInputElement).value;
		if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
			return;
		}

		this.selectedObject.material.color.set(value);
		this.dispatchUpdated();
		this.requestUpdate();
	}

	/**
	 * Render a vector control element.
	 *
	 * @param label - Label of the element.
	 * @param type - Type (position or scale)
	 * @returns Rendered element.
	 */
	private renderVectorControls(label: string, type: "position" | "scale") {
		if (!this.selectedObject) return null;

		const source =
			type === "position"
				? this.selectedObject.position
				: this.selectedObject.scale;

		return html`
			<div class="field">
				<label>${label}</label>
				<div class="group-row">
					${(["x", "y", "z"] as const).map(
						(axis) => html`
							<label
								>${axis.toUpperCase()}
								<input
									type="number"
									step="0.01"
									.value=${source[axis].toFixed(2)}
									@change=${(event: Event) =>
										this.handleVectorChange(type, axis, event)}
								/>
							</label>
						`,
					)}
				</div>
			</div>
		`;
	}

	/**
	 * Render euler rotation controls.
	 *
	 * @returns - Renderer element for rotation controls.
	 */
	private renderRotationControls() {
		if (!this.selectedObject) {
			return null;
		}

		return html`
			<div class="field">
				<label>Rotation (degrees)</label>
				<div class="group-row">
					${(["x", "y", "z"] as const).map(
						(axis) => html`
							<label
								>${axis.toUpperCase()}
								<input
									type="number"
									step="1"
									.value=${(
										(this.selectedObject!.rotation[axis] * 180) /
										Math.PI
									).toFixed(1)}
									@change=${(event: Event) =>
										this.handleRotationChange(axis, event)}
								/>
							</label>
						`,
					)}
				</div>
			</div>
		`;
	}

	private renderMaterialControls() {
		if (!this.hasEditableColor(this.selectedObject)) {
			return null;
		}

		const color = this.selectedObject.material.color;

		return html`
			<div class="field color-field">
				<label>Material Color</label>
				<input
					type="color"
					class="color-input"
					.value=${`#${color.getHexString()}`}
					@input=${(event: Event) => this.handleColorChange(event)}
				/>
			</div>
		`;
	}

	private renderEntityDetails() {
		// Check if object is entity
		if (!this.isEntityObject(this.selectedObject)) {
			return null;
		}

		const entityData = this.selectedObject.getEntity();
		const friendlyName =
			entityData?.attributes?.friendly_name ?? this.selectedObject.entityId;
		const stateValue = entityData?.state ?? "unknown";
		const attributes = entityData?.attributes ?? {};
		const attributeEntries = Object.entries(attributes);

		return html`
			<h4>Entity</h4>
			<div class="field">
				<label>Entity ID</label>
				<input type="text" .value=${this.selectedObject.entityId} readonly />
			</div>
			<div class="field">
				<label>Entity Name</label>
				<input type="text" .value=${friendlyName} readonly />
			</div>
			<div class="field">
				<label>State</label>
				<input type="text" .value=${String(stateValue)} readonly />
			</div>
			<div class="field">
				<label>Attributes</label>
				${attributeEntries.length
					? html`<div class="attribute-list">
							${attributeEntries.map(
								([key, value]) =>
									html`<div class="attribute-row">
										<span class="attr-key">${key}</span>
										<span class="attr-value">
											${typeof value === "object"
												? JSON.stringify(value)
												: String(value)}
										</span>
									</div>`,
							)}
						</div>`
					: html`<div class="placeholder">No attributes available.</div>`}
			</div>
		`;
	}

	public render() {
		return html`
			<h4>Selected Object</h4>
			${this.selectedObject
				? html`
						<div class="field">
							<label>Name</label>
							<input
								type="text"
								.value=${this.selectedObject.name || ""}
								@input=${(event: Event) => this.handleNameChange(event)}
							/>
						</div>
						<div class="field">
							<label>UUID</label>
							<input type="text" .value=${this.selectedObject.uuid} readonly />
						</div>
						${this.renderVectorControls("Position", "position")}
						${this.renderVectorControls("Scale", "scale")}
						${this.renderRotationControls()} ${this.renderMaterialControls()}
						${this.renderEntityDetails()}
					`
				: html`<div class="placeholder">
						Select an object from the tree to edit its properties.
					</div>`}
		`;
	}
}
