import { LitElement, html, unsafeCSS } from "lit";
import { customElement, property } from "lit/decorators.js";
import componentStyles from "./object-inspector.css?inline";
import type { Object3D } from "three";
import { EntityObject } from "../objects/entity-object.js";

@customElement("dt3d-object-inspector")
export class DT3DObjectInspector extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({ attribute: false })
	public selectedObject: Object3D | null = null;

	private isEntityObject(object: Object3D | null): object is EntityObject {
		return object instanceof EntityObject;
	}

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

	private renderRotationControls() {
		if (!this.selectedObject) return null;

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

	private renderEntityDetails() {
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
						${this.renderRotationControls()} ${this.renderEntityDetails()}
					`
				: html`<div class="placeholder">
						Select an object from the tree to edit its properties.
					</div>`}
		`;
	}
}
