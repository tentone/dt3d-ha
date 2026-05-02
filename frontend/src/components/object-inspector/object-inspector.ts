import "../dynamic-form/dynamic-form.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";
import type {Object3D} from "three";
import {Color} from "three";

import {localManager} from "../../locale/locale.js";
import {DTObject} from "../../objects/dt-object.js";
import {EntityObject} from "../../objects/entity-object.js";
import {DoorObject} from "../../objects/house/door.js";
import {WallObject} from "../../objects/house/wall.js";
import {WindowObject} from "../../objects/house/window.js";
import type {
	DynamicFormChangeDetail,
	DynamicFormField,
} from "../dynamic-form/dynamic-form.js";
import componentStyles from "./object-inspector.css?inline";

@customElement("dt3d-object-inspector")
export class DT3DObjectInspector extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
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

	private isWallObject(object: Object3D | null): object is WallObject {
		return object instanceof WallObject;
	}

	private isDoorObject(object: Object3D | null): object is DoorObject {
		return object instanceof DoorObject;
	}

	private isWindowObject(object: Object3D | null): object is WindowObject {
		return object instanceof WindowObject;
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
				detail: {object: this.selectedObject},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private setNestedAttribute(target: any, attribute: string, value: unknown) {
		const keys = attribute.split(".");
		let current = target;
		for (let i = 0; i < keys.length - 1; i += 1) {
			if (current == null) return;
			current = current[keys[i]];
		}

		if (current == null) return;
		current[keys[keys.length - 1]] = value;
	}

	private handleFormFieldChange(event: CustomEvent<DynamicFormChangeDetail>) {
		if (!this.selectedObject) return;

		const {attribute, value} = event.detail;
		if (this.isLocked() && attribute !== "locked") {
			return;
		}

		if (attribute === "locked") {
			if (this.selectedObject instanceof DTObject) {
				this.selectedObject.locked = Boolean(value);
			}
		} else if (attribute.startsWith("rotation.")) {
			const axis = attribute.split(".")[1] as "x" | "y" | "z";
			const rawValue = Number(value);
			if (Number.isNaN(rawValue)) return;
			this.selectedObject.rotation[axis] = (rawValue * Math.PI) / 180;
		} else if (attribute === "material.color") {
			if (!this.hasEditableColor(this.selectedObject)) {
				return;
			}
			const colorValue = String(value);
			if (!/^#[0-9a-fA-F]{6}$/.test(colorValue)) {
				return;
			}
			this.selectedObject.material.color.set(colorValue);
		} else if (attribute === "height" || attribute === "thickness") {
			if (!this.isWallObject(this.selectedObject)) {
				return;
			}
			const rawValue = Number(value);
			if (Number.isNaN(rawValue)) return;
			if (attribute === "height") {
				this.selectedObject.setHeight(rawValue);
			} else {
				this.selectedObject.setThickness(rawValue);
			}
		} else if (attribute === "open") {
			if (this.isDoorObject(this.selectedObject)) {
				this.selectedObject.setOpen(Boolean(value));
			} else if (this.isWindowObject(this.selectedObject)) {
				this.selectedObject.setOpen(Boolean(value));
			}
		} else {
			this.setNestedAttribute(this.selectedObject, attribute, value);
		}

		this.dispatchUpdated();
		this.requestUpdate();
	}

	private getBaseFields(locked: boolean): DynamicFormField[] {
		if (!this.selectedObject) return [];

		const fields: DynamicFormField[] = [
			{
				label: localManager.get("objectName"),
				attribute: "name",
				type: "string",
				tooltip: localManager.get("objectNameTooltip"),
				editable: !locked,
				enabled: true,
			},
		];

		if (this.selectedObject instanceof DTObject) {
			fields.push({
				label: localManager.get("locked"),
				attribute: "locked",
				type: "boolean",
				tooltip: localManager.get("lockedTooltip"),
				editable: true,
				enabled: true,
			});
		}

		fields.push(
			{
				label: localManager.get("objectUUID"),
				attribute: "uuid",
				type: "info",
				tooltip: localManager.get("objectUUIDTooltip"),
				editable: false,
				enabled: true,
			},
			{
				label: localManager.get("position"),
				attribute: "position",
				type: "Vector3",
				tooltip: localManager.get("positionTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("scale"),
				attribute: "scale",
				type: "Vector3",
				tooltip: localManager.get("scaleTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("rotation"),
				attribute: "rotation",
				type: "Vector3",
				tooltip: localManager.get("rotationTooltip"),
				editable: !locked,
				enabled: true,
			},
		);

		if (this.hasEditableColor(this.selectedObject)) {
			fields.push({
				label: localManager.get("materialColor"),
				attribute: "material.color",
				type: "color",
				tooltip: localManager.get("materialColorTooltip"),
				editable: !locked,
				enabled: true,
			});
		}

		return fields;
	}

	private renderEntityDetails() {
		if (!this.isEntityObject(this.selectedObject)) {
			return null;
		}

		const entityData = this.selectedObject.getEntity();
		const attributes = entityData?.attributes ?? {};
		const attributeEntries = Object.entries(attributes);

		return html`
			<div class="field">
				<label>${localManager.get("attributes")}</label>
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
		: html`<div class="placeholder">${localManager.get("noAttributes")}</div>`}
			</div>
		`;
	}

	private getWallFields(locked: boolean): DynamicFormField[] {
		if (!this.isWallObject(this.selectedObject)) {
			return [];
		}

		return [
			{
				label: localManager.get("wallHeight"),
				attribute: "height",
				type: "number",
				tooltip: localManager.get("wallHeightTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("wallThickness"),
				attribute: "thickness",
				type: "number",
				tooltip: localManager.get("wallThicknessTooltip"),
				editable: !locked,
				enabled: true,
			},
		];
	}

	private getOpeningFields(locked: boolean): DynamicFormField[] {
		if (!this.isDoorObject(this.selectedObject) && !this.isWindowObject(this.selectedObject)) {
			return [];
		}

		return [
			{
				label: localManager.get("open"),
				attribute: "open",
				type: "boolean",
				tooltip: localManager.get("openTooltip"),
				editable: !locked,
				enabled: true,
			},
		];
	}

	private getEntityFields(): DynamicFormField[] {
		if (!this.isEntityObject(this.selectedObject)) {
			return [];
		}

		return [
			{
				label: localManager.get("entityId"),
				attribute: "entityId",
				type: "info",
				editable: false,
				enabled: true,
			},
			{
				label: localManager.get("entityName"),
				attribute: "entityName",
				type: "info",
				editable: false,
				enabled: true,
			},
			{
				label: localManager.get("entityState"),
				attribute: "entityState",
				type: "info",
				editable: false,
				enabled: true,
			},
		];
	}

	private getEntityData(): Record<string, unknown> | null {
		if (!this.isEntityObject(this.selectedObject)) {
			return null;
		}

		const entityData = this.selectedObject.getEntity();
		const friendlyName =
			entityData?.attributes?.friendly_name ?? this.selectedObject.entityId;
		const stateValue = entityData?.state ?? "unknown";

		return {
			entityId: this.selectedObject.entityId,
			entityName: friendlyName,
			entityState: String(stateValue),
		};
	}

	public render() {
		const locked = this.isLocked();
		const baseFields = this.getBaseFields(locked);
		const wallFields = this.getWallFields(locked);
		const openingFields = this.getOpeningFields(locked);
		const entityFields = this.getEntityFields();
		const entityData = this.getEntityData();

		return html`
			<h4>${localManager.get("selectedObject")}</h4>
			${this.selectedObject
		? html`
						<dt3d-dynamic-form
							.fields=${baseFields}
							.data=${this.selectedObject}
							@field-change=${(event: CustomEvent<DynamicFormChangeDetail>) =>
		this.handleFormFieldChange(event)}
						></dt3d-dynamic-form>
						${locked
		? html`<div class="placeholder">
									${localManager.get("objectLocked")}
								</div>`
		: null}
						${wallFields.length
		? html`
									<h4>${localManager.get("wall")}</h4>
									<dt3d-dynamic-form
										.fields=${wallFields}
										.data=${this.selectedObject}
										@field-change=${(
		event: CustomEvent<DynamicFormChangeDetail>,
	) => this.handleFormFieldChange(event)}
									></dt3d-dynamic-form>
								`
		: null}
						${openingFields.length
		? html`
									<h4>
										${this.isDoorObject(this.selectedObject)
		? localManager.get("door")
		: localManager.get("window")}
									</h4>
									<dt3d-dynamic-form
										.fields=${openingFields}
										.data=${this.selectedObject}
										@field-change=${(
		event: CustomEvent<DynamicFormChangeDetail>,
	) => this.handleFormFieldChange(event)}
									></dt3d-dynamic-form>
								`
		: null}
						${entityFields.length
		? html`
									<h4>${localManager.get("entity")}</h4>
									<dt3d-dynamic-form
										.fields=${entityFields}
										.data=${entityData}
									></dt3d-dynamic-form>
								`
		: null}
						${this.renderEntityDetails()}
					`
		: html`<div class="placeholder">
						${localManager.get("selectObjectPrompt")}
					</div>`}
		`;
	}
}
