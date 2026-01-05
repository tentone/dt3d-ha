import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Color, Object3D } from "three";
import { EntityObject } from "../../objects/entity-object.js";
import { DTObject } from "../../objects/dt-object.js";
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

	private isLocked(object: Object3D | null = this.selectedObject): object is DTObject {
		return object instanceof DTObject && object.locked;
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
		if (!this.selectedObject || this.isLocked()) return;

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
		if (!this.selectedObject || this.isLocked()) return;

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
		if (!this.selectedObject || this.isLocked()) return;

		const value = parseFloat((event.target as HTMLInputElement).value);
		if (Number.isNaN(value)) return;

		this.selectedObject.rotation[axis] = (value * Math.PI) / 180;
		this.dispatchUpdated();
		this.requestUpdate();
	}

	private handleColorChange(event: Event) {
		if (!this.hasEditableColor(this.selectedObject) || this.isLocked()) {
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

	private handleLockChange(event: Event) {
		if (!this.selectedObject || !(this.selectedObject instanceof DTObject)) {
			return;
		}

		this.selectedObject.locked = (event.target as HTMLInputElement).checked;
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
	private renderVectorControls(
		label: string,
		type: "position" | "scale",
		locked: boolean,
	) {
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
									?disabled=${locked}
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
	private renderRotationControls(locked: boolean) {
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
									?disabled=${locked}
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

	private renderMaterialControls(locked: boolean) {
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
					?disabled=${locked}
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
		const locked = this.isLocked();
		const isDTObject = this.selectedObject instanceof DTObject;

		return html`
			<h4>Selected Object</h4>
			${this.selectedObject
				? html`
						<div class="field">
							<label>Name</label>
							<input
								type="text"
								.value=${this.selectedObject.name || ""}
								?disabled=${locked}
								@input=${(event: Event) => this.handleNameChange(event)}
							/>
						</div>
						${isDTObject
							? html`<div class="field">
									<label>
										<input
											type="checkbox"
											.checked=${locked}
											@change=${(event: Event) => this.handleLockChange(event)}
										/>
										Locked
									</label>
								</div>`
							: null}
						<div class="field">
							<label>UUID</label>
							<input type="text" .value=${this.selectedObject.uuid} readonly />
						</div>
						${locked
							? html`<div class="placeholder">
									This object is locked and cannot be edited.
								</div>`
							: null}
						${this.renderVectorControls("Position", "position", locked)}
						${this.renderVectorControls("Scale", "scale", locked)}
						${this.renderRotationControls(locked)}
						${this.renderMaterialControls(locked)}
						${this.renderEntityDetails()}
					`
				: html`<div class="placeholder">
						Select an object from the tree to edit its properties.
					</div>`}
		`;
	}
}
