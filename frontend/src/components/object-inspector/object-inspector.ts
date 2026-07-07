import "../dynamic-form/dynamic-form.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";
import type {Object3D} from "three";
import {Color, Mesh} from "three";

import {applyImageTextureToMesh, clearMeshTexture} from "../../editor/material-texture.js";
import {getMeshGeometryParameters, MESH_GEOMETRY_PARAMETER_DEFINITIONS, resolveMeshType, updateMeshGeometry} from "../../editor/mesh-handler.js";
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
import { findMesh } from "../../utils/object3d-utils.js";

@customElement("dt3d-object-inspector")
export class DT3DObjectInspector extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public selectedObject: Object3D | null = null;

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
	 * Dispatch a updated event, which can be used to notify other components that the selected object has been updated.
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

	/**
	 * Set a nested attribute of an object using a dot-separated string path.
	 * 
	 * E.g. setNestedAttribute(obj, "position.x", 10) will set obj.position.x to 10.
	 * 
	 * @param target - The target object on which to set the attribute. 
	 * @param attribute - The dot-separated string path of the attribute to set.
	 * @param value - The value to set the attribute to.
	 */
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

	/**
	 * Handle changes to the form fields and update the selected object's properties accordingly.
	 * 
	 * @param event - The custom event containing the form field change details.
	 */
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
		} else if (attribute === "material.texture") {
			const mesh = findMesh(this.selectedObject);
			if (!mesh || !(value instanceof File)) {
				return;
			}
			void applyImageTextureToMesh(mesh, value).then(() => {
				this.dispatchUpdated();
				this.requestUpdate();
			});
			return;
		} else if (attribute === "material.clearTexture") {
			const mesh = findMesh(this.selectedObject);
			if (!mesh || value !== true) {
				return;
			}
			clearMeshTexture(mesh);
		} else if (attribute === "height" || attribute === "thickness") {
			if (!(this.selectedObject instanceof WallObject)) {
				return;
			}
			const rawValue = Number(value);
			if (Number.isNaN(rawValue)) return;
			if (attribute === "height") {
				this.selectedObject.setHeight(rawValue);
			} else {
				this.selectedObject.setThickness(rawValue);
			}
		} else if (attribute.startsWith("geometry.")) {
			if (!(this.selectedObject instanceof Mesh)) {
				return;
			}
			const geometryParameters = getMeshGeometryParameters(this.selectedObject);
			if (!geometryParameters) {
				return;
			}
			const parameterName = attribute.slice("geometry.".length);
			geometryParameters[parameterName] = value as number | boolean;
			if (!updateMeshGeometry(this.selectedObject, geometryParameters)) {
				return;
			}
		} else if (attribute === "open") {
			if (this.selectedObject instanceof DoorObject) {
				this.selectedObject.setOpen(Boolean(value));
			} else if (this.selectedObject instanceof WindowObject) {
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
		);

		return fields;
	}

	private getTransformFields(locked: boolean): DynamicFormField[] {
		if (!this.selectedObject) return [];

		return [
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
		];
	}

	private getMaterialFields(locked: boolean): DynamicFormField[] {
		if (!this.selectedObject) return [];

		const fields: DynamicFormField[] = [];

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

		if (findMesh(this.selectedObject)) {
			fields.push(
				{
					label: localManager.get("materialTexture"),
					attribute: "material.texture",
					type: "file",
					tooltip: localManager.get("materialTextureTooltip"),
					editable: !locked,
					enabled: true,
				},
				{
					label: localManager.get("clearMaterialTexture"),
					attribute: "material.clearTexture",
					type: "boolean",
					tooltip: localManager.get("clearMaterialTextureTooltip"),
					editable: !locked,
					enabled: true,
				},
			);
		}

		return fields;
	}

	private addSubFormField(
		fields: DynamicFormField[],
		attribute: string,
		label: string,
		subFields: DynamicFormField[],
		data: unknown = this.selectedObject,
	) {
		if (subFields.length === 0) {
			return;
		}

		fields.push({
			label,
			attribute,
			type: "sub-form",
			enabled: true,
			fields: subFields,
			data,
		});
	}

	private renderEntityDetails() {
		if (!(this.selectedObject instanceof EntityObject)) {
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
		if (!(this.selectedObject instanceof WallObject)) {
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
		if (!(this.selectedObject instanceof DoorObject) && !(this.selectedObject instanceof WindowObject)) {
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

	private getGeometryFields(locked: boolean): DynamicFormField[] {
		if (!this.selectedObject || !(this.selectedObject instanceof Mesh)) {
			return [];
		}

		const meshType = resolveMeshType(this.selectedObject);
		if (!meshType) {
			return [];
		}

		const geometryParameters = getMeshGeometryParameters(this.selectedObject);
		const definitions = MESH_GEOMETRY_PARAMETER_DEFINITIONS[meshType] ?? [];
		if (!geometryParameters || definitions.length === 0) {
			return [];
		}

		this.selectedObject.userData.geometryParameters = geometryParameters;

		return definitions.map((definition) => ({
			label: definition.label,
			attribute: `geometry.${definition.name}`,
			type: definition.type === "boolean" ? "boolean" : "number",
			tooltip: localManager.get("geometryParameterTooltip"),
			editable: !locked,
			enabled: true,
			step: definition.step,
			min: definition.min,
		}));
	}

	private getEntityFields(): DynamicFormField[] {
		if (!(this.selectedObject instanceof EntityObject)) {
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
		if (!(this.selectedObject instanceof EntityObject)) {
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

	private getInspectorFields(locked: boolean): DynamicFormField[] {
		const fields: DynamicFormField[] = [];
		const geometryData = this.selectedObject instanceof Mesh ? this.selectedObject.userData : null;
		const entityData = this.getEntityData();

		this.addSubFormField(
			fields,
			"configuration",
			localManager.get("configuration"),
			this.getBaseFields(locked),
		);
		this.addSubFormField(
			fields,
			"transform",
			localManager.get("transform"),
			this.getTransformFields(locked),
		);
		this.addSubFormField(
			fields,
			"material",
			localManager.get("material"),
			this.getMaterialFields(locked),
		);
		this.addSubFormField(
			fields,
			"wall",
			localManager.get("wall"),
			this.getWallFields(locked),
		);
		this.addSubFormField(
			fields,
			"opening",
			this.selectedObject instanceof DoorObject ? localManager.get("door") : localManager.get("window"),
			this.getOpeningFields(locked),
		);
		this.addSubFormField(
			fields,
			"geometry",
			localManager.get("geometry"),
			this.getGeometryFields(locked),
			geometryData,
		);
		this.addSubFormField(
			fields,
			"entity",
			localManager.get("entity"),
			this.getEntityFields(),
			entityData,
		);

		return fields;
	}

	public render() {
		const locked = this.isLocked();
		const inspectorFields = this.getInspectorFields(locked);

		return html`
			<h4>${localManager.get("selectedObject")}</h4>
			${this.selectedObject
		? html`
						<dt3d-dynamic-form
							.fields=${inspectorFields}
							.data=${this.selectedObject}
							@field-change=${(event: CustomEvent<DynamicFormChangeDetail>) =>
		this.handleFormFieldChange(event)}
						></dt3d-dynamic-form>
						${locked
		? html`<div class="placeholder">
									${localManager.get("objectLocked")}
								</div>`
		: null}
						${this.renderEntityDetails()}
					`
		: html`<div class="placeholder">
						${localManager.get("selectObjectPrompt")}
					</div>`}
		`;
	}
}
