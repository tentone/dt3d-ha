import "../dynamic-form/dynamic-form.js";
import "../entity-rules/entity-rules.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";
import type {Material, Object3D} from "three";
import {Mesh} from "three";

import {normalizeEntityActionOverride} from "../../editor/entity-actions.js";
import type {EntityRule} from "../../editor/entity-rules.js";
import {getEntityRules, setEntityRules} from "../../editor/entity-rules.js";
import type {MaterialObject} from "../../editor/material-handler.js";
import {
	changeMaterialType,
	findMaterialObject,
	getCompatibleMaterialTypes,
	getMaterialPropertyDefinitions,
	getMaterials,
	getPrimaryMaterial,
	setMaterialProperty,
} from "../../editor/material-handler.js";
import {
	applyImageTextureToMaterial,
	clearMaterialTexture,
} from "../../editor/material-texture.js";
import {
	getMeshGeometryParameters,
	MESH_GEOMETRY_PARAMETER_DEFINITIONS,
	resolveMeshType,
	updateMeshGeometry,
} from "../../editor/mesh-handler.js";
import {localManager} from "../../locale/locale.js";
import {DTObject} from "../../objects/dt-object.js";
import {EntityLight} from "../../objects/entity-light.js";
import {EntityObject, isToggleable} from "../../objects/entity-object.js";
import {FurnitureObject} from "../../objects/furniture/furniture.js";
import {DoorObject} from "../../objects/house/door.js";
import {GateObject} from "../../objects/house/gate.js";
import {WallObject} from "../../objects/house/wall.js";
import {WindowObject} from "../../objects/house/window.js";
import {StaticLightObject} from "../../objects/static-light.js";
import {ViewportObject} from "../../objects/viewport-object.js";
import type {
	DynamicFormChangeDetail,
	DynamicFormEntityOption,
	DynamicFormField,
} from "../dynamic-form/dynamic-form.js";
import type {EntityRulesChangeDetail} from "../entity-rules/entity-rules.js";
import componentStyles from "./object-inspector.css?inline";

export type ObjectUpdateDetail = {
	object: Object3D;
	objects?: Object3D[];
	attribute: string;
	undo: () => void;
	redo: () => void;
};

export type MaterialUpdateDetail = {
	material: Material;
	attribute: string;
	undo: () => void;
	redo: () => void;
};

const WALL_CONFIGURATION_ATTRIBUTES = new Set([
	"connectionShape",
	"height",
	"thickness",
	"baseboardEnabled",
	"baseboardHeight",
	"baseboardDepth",
	"baseboardColor",
]);

const DOOR_CONFIGURATION_ATTRIBUTES = new Set([
	"width",
	"height",
	"thickness",
	"open",
	"openAmount",
	"openEntityId",
	"operationType",
	"panelCount",
	"hingeSide",
	"openingDirection",
	"knobStyle",
	"knobColor",
	"borderEnabled",
	"borderWidth",
	"borderDepth",
	"borderColor",
	"windowEnabled",
	"windowWidth",
	"windowHeight",
	"windowPositionX",
	"windowPositionY",
	"windowBorderWidth",
	"windowColor",
	"windowOpacity",
]);

const WINDOW_CONFIGURATION_ATTRIBUTES = new Set([
	"width",
	"height",
	"thickness",
	"open",
	"openAmount",
	"openEntityId",
	"openingType",
	"panelCount",
	"hingeSide",
	"openingDirection",
	"glassColor",
	"glassOpacity",
	"glassRoughness",
	"borderEnabled",
	"borderThickness",
	"borderDepth",
	"borderColor",
	"gridEnabled",
	"gridRows",
	"gridColumns",
	"gridBarThickness",
	"gridHorizontalSpacing",
	"gridVerticalSpacing",
	"blindsEnabled",
	"blindPlacement",
	"blindPosition",
	"blindOpenEntityId",
	"blindSlatSpacing",
	"blindColor",
	"shuttersEnabled",
	"shutterPanelCount",
	"shutterOpenAmount",
	"shutterOpenEntityId",
	"shutterPlacement",
	"shutterBladeCount",
	"shutterBladeOpenAmount",
	"shutterBladeOpenEntityId",
	"shutterColor",
]);

const GATE_CONFIGURATION_ATTRIBUTES = new Set([
	"width",
	"height",
	"thickness",
	"open",
	"openAmount",
	"openEntityId",
	"operationType",
	"panelCount",
	"style",
	"hingeSide",
	"openingDirection",
	"barWidth",
	"barSpacing",
]);

const OPENING_ENTITY_FILTER =
	/^(?:binary_sensor|cover|input_boolean|input_number|number|sensor|switch)\./i;

@customElement("dt3d-object-inspector")
export class DT3DObjectInspector extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public selectedObject: Object3D | null = null;

	@property({attribute: false})
	public selectedObjects: Object3D[] = [];

	@property({attribute: false})
	public selectedMaterial: Material | null = null;

	@property({type: Boolean})
	public multiple = false;

	@property({attribute: false})
	public entityOptions: DynamicFormEntityOption[] = [];

	private materialTextureVersions = new Map<string, number>();

	private getStandaloneMaterialTarget(
		material: Material = this.selectedMaterial,
	): MaterialObject | null {
		return material
			? ({material} as unknown as MaterialObject)
			: null;
	}

	private captureMaterialRestore(material: Material): () => void {
		const snapshot = material.clone();
		return () => {
			material.copy(snapshot);
			material.needsUpdate = true;
		};
	}

	private dispatchMaterialUpdated(
		material: Material,
		attribute: string,
		undo: () => void,
		redo: () => void,
	): void {
		this.dispatchEvent(
			new CustomEvent<MaterialUpdateDetail>("material-updated", {
				detail: {material, attribute, undo, redo},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleMaterialFieldChange(
		event: CustomEvent<DynamicFormChangeDetail>,
	): void {
		const material = this.selectedMaterial;
		if (!material) return;

		const {attribute, type, value} = event.detail;
		if (!attribute.startsWith("material.") || attribute === "material.type") {
			return;
		}

		const target = this.getStandaloneMaterialTarget(material);
		if (!target) return;
		const property = attribute.slice("material.".length);
		const undo = this.captureMaterialRestore(material);

		if (type === "texture") {
			const textureKey = `${material.uuid}:${property}`;
			const textureVersion =
				(this.materialTextureVersions.get(textureKey) ?? 0) + 1;
			this.materialTextureVersions.set(textureKey, textureVersion);
			if (value === null) {
				if (!clearMaterialTexture(target, property)) return;
			} else if (value instanceof File) {
				void applyImageTextureToMaterial(
					target,
					property,
					value,
					() =>
						this.materialTextureVersions.get(textureKey) === textureVersion &&
						this.selectedMaterial === material,
				)
					.then((changed) => {
						if (!changed) return;
						const redo = this.captureMaterialRestore(material);
						this.dispatchMaterialUpdated(material, attribute, undo, redo);
						this.requestUpdate();
					})
					.catch((error) => {
						console.error("Failed to apply material texture", error);
					});
				return;
			} else {
				return;
			}
		} else if (!setMaterialProperty(target, property, value)) {
			return;
		}

		const redo = this.captureMaterialRestore(material);
		this.dispatchMaterialUpdated(material, attribute, undo, redo);
		this.requestUpdate();
	}

	private isLocked(
		object: Object3D | null = this.selectedObject,
	): object is DTObject {
		return object instanceof DTObject && object.locked;
	}

	/**
	 * Dispatch a updated event, which can be used to notify other components that the selected object has been updated.
	 */
	private dispatchUpdated(
		attribute: string,
		undo: () => void,
		redo: () => void,
		objects: Object3D[] = this.selectedObject ? [this.selectedObject] : [],
	) {
		this.dispatchEvent(
			new CustomEvent<ObjectUpdateDetail>("object-updated", {
				detail: {
					object: this.selectedObject!,
					objects,
					attribute,
					undo,
					redo,
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private getCommonHouseSelection(): Array<
		WallObject | DoorObject | WindowObject | GateObject
		> {
		const objects = this.selectedObjects.length
			? this.selectedObjects
			: this.selectedObject
				? [this.selectedObject]
				: [];
		const first = objects[0];
		if (
			!(first instanceof WallObject) &&
			!(first instanceof DoorObject) &&
			!(first instanceof WindowObject) &&
			!(first instanceof GateObject)
		) {
			return [];
		}
		const constructor = first.constructor;
		return objects.every(
			(object) => object.constructor === constructor && object instanceof DTObject,
		)
			? (objects as Array<WallObject | DoorObject | WindowObject | GateObject>)
			: [];
	}

	private handleMultipleFormFieldChange(
		event: CustomEvent<DynamicFormChangeDetail>,
	): void {
		const objects = this.getCommonHouseSelection();
		if (objects.length < 2 || objects.some((object) => object.locked)) return;

		const {attribute, type, value} = event.detail;
		const supported = objects.every(
			(object) =>
				this.isHouseConfigurationAttribute(object, attribute) ||
				attribute === "material.color",
		);
		if (!supported) return;

		const undoRestores = objects.map((object) =>
			this.captureRestore(object, attribute, type),
		);
		for (let index = 0; index < objects.length; index += 1) {
			const object = objects[index];
			const changed = this.isHouseConfigurationAttribute(object, attribute)
				? object.setConfiguration(attribute, value)
				: (() => {
					const materialObject = findMaterialObject(object);
					return Boolean(
						materialObject &&
								setMaterialProperty(materialObject, "color", value),
					);
				})();
			if (!changed) {
				for (let undoIndex = index; undoIndex >= 0; undoIndex -= 1) {
					undoRestores[undoIndex]();
				}
				return;
			}
		}

		const redoRestores = objects.map((object) =>
			this.captureRestore(object, attribute, type),
		);
		this.dispatchUpdated(
			attribute,
			() => undoRestores.forEach((restore) => restore()),
			() => redoRestores.forEach((restore) => restore()),
			objects,
		);
		this.requestUpdate();
	}

	private getNestedAttribute(target: any, attribute: string): unknown {
		let current = target;
		for (const key of attribute.split(".")) {
			if (current == null) return undefined;
			current = current[key];
		}
		return current;
	}

	private isHouseConfigurationAttribute(
		object: Object3D,
		attribute: string,
	): object is WallObject | DoorObject | WindowObject | GateObject {
		return (
			(object instanceof WallObject &&
				WALL_CONFIGURATION_ATTRIBUTES.has(attribute)) ||
			(object instanceof DoorObject &&
				DOOR_CONFIGURATION_ATTRIBUTES.has(attribute)) ||
			(object instanceof WindowObject &&
				WINDOW_CONFIGURATION_ATTRIBUTES.has(attribute)) ||
			(object instanceof GateObject &&
				GATE_CONFIGURATION_ATTRIBUTES.has(attribute))
		);
	}

	private isFurnitureConfigurationAttribute(
		object: Object3D,
		attribute: string,
	): object is FurnitureObject {
		return (
			object instanceof FurnitureObject &&
			object.parameterDefinitions.some(
				(definition) => definition.name === attribute,
			)
		);
	}

	/**
	 * Capture only the mutable state represented by a form field. Keeping the memento field-sized avoids replacing live Three.js objects during undo.
	 */
	private captureRestore(
		object: Object3D,
		attribute: string,
		type: string,
	): () => void {
		if (attribute.startsWith("material.")) {
			const materialObject = findMaterialObject(object);
			if (materialObject) {
				if (attribute === "material.type") {
					const snapshot = Array.isArray(materialObject.material)
						? materialObject.material.map((material) => material.clone())
						: materialObject.material.clone();
					return () => {
						materialObject.material = Array.isArray(snapshot)
							? snapshot.map((material) => material.clone())
							: snapshot.clone();
					};
				}
				const originalMaterials = getMaterials(materialObject);
				const snapshots = originalMaterials.map((material) => material.clone());
				return () => {
					for (let index = 0; index < originalMaterials.length; index += 1) {
						originalMaterials[index].copy(snapshots[index]);
						originalMaterials[index].needsUpdate = true;
					}
				};
			}
		}

		if (attribute.startsWith("geometry.") && object instanceof Mesh) {
			const parameters = getMeshGeometryParameters(object);
			if (parameters) {
				const snapshot = {...parameters};
				return () => {
					updateMeshGeometry(object, {...snapshot});
				};
			}
		}

		if (
			attribute === "open" &&
			(object instanceof DoorObject ||
				object instanceof WindowObject ||
				object instanceof GateObject)
		) {
			const amount = object.openAmount;
			return () => object.setOpenAmount(amount);
		}

		if (attribute === "openingType" && object instanceof WindowObject) {
			const openingType = object.openingType;
			const panelCount = object.panelCount;
			return () => {
				object.setConfiguration("openingType", openingType);
				if (openingType === "hinged") {
					object.setConfiguration("panelCount", panelCount);
				}
			};
		}

		if (
			(attribute === "openEntityId" ||
				attribute === "blindOpenEntityId" ||
				attribute === "shutterOpenEntityId" ||
				attribute === "shutterBladeOpenEntityId") &&
			(object instanceof DoorObject ||
				object instanceof WindowObject ||
				object instanceof GateObject)
		) {
			const entityId = String(this.getNestedAttribute(object, attribute) ?? "");
			const amount =
				attribute === "blindOpenEntityId" && object instanceof WindowObject
					? object.blindPosition
					: attribute === "shutterOpenEntityId" &&
						  object instanceof WindowObject
						? object.shutterOpenAmount
						: attribute === "shutterBladeOpenEntityId" &&
							  object instanceof WindowObject
							? object.shutterBladeOpenAmount
							: object.openAmount;
			return () => {
				object.setConfiguration(attribute, entityId);
				if (attribute === "blindOpenEntityId" && object instanceof WindowObject) {
					object.setBlindPosition(amount);
				} else if (
					attribute === "shutterOpenEntityId" &&
					object instanceof WindowObject
				) {
					object.setShutterOpenAmount(amount);
				} else if (
					attribute === "shutterBladeOpenEntityId" &&
					object instanceof WindowObject
				) {
					object.setShutterBladeOpenAmount(amount);
				} else {
					object.setOpenAmount(amount);
				}
			};
		}

		if (attribute === "connectionShape" && object instanceof WallObject) {
			const connectionShape = object.connectionShape;
			const connectionShapeRevision = object.connectionShapeRevision;
			return () => {
				object.connectionShape = connectionShape;
				object.connectionShapeRevision = connectionShapeRevision;
			};
		}

		if (this.isHouseConfigurationAttribute(object, attribute)) {
			const value = this.getNestedAttribute(object, attribute);
			return () => object.setConfiguration(attribute, value);
		}

		if (this.isFurnitureConfigurationAttribute(object, attribute)) {
			const value = object.parameters[attribute];
			return () => object.setConfiguration(attribute, value);
		}

		if (attribute === "color" && object instanceof StaticLightObject) {
			const value = `#${object.color.getHexString()}`;
			return () => object.setColor(value);
		}

		const current = this.getNestedAttribute(object, attribute);
		if (
			type === "Vector3" &&
			current &&
			typeof current === "object" &&
			"clone" in current &&
			typeof (current as {clone?: unknown}).clone === "function"
		) {
			const value = (current as {clone: () => any}).clone();
			return () => {
				const target = this.getNestedAttribute(object, attribute) as {
					copy?: (source: unknown) => void;
				};
				target?.copy?.(value);
			};
		}

		const value =
			current &&
			typeof current === "object" &&
			"clone" in current &&
			typeof (current as {clone?: unknown}).clone === "function"
				? (current as {clone: () => unknown}).clone()
				: current;
		return () => this.setNestedAttribute(object, attribute, value);
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

	private setVectorAttribute(
		target: any,
		attribute: string,
		value: unknown,
	): boolean {
		if (!value || typeof value !== "object") {
			return false;
		}

		const vectorValue = value as {x?: unknown; y?: unknown; z?: unknown};
		if (
			typeof vectorValue.x !== "number" ||
			typeof vectorValue.y !== "number" ||
			typeof vectorValue.z !== "number"
		) {
			return false;
		}

		const keys = attribute.split(".");
		let vector = target;
		for (const key of keys) {
			if (vector == null) return false;
			vector = vector[key];
		}

		if (!vector || typeof vector !== "object") {
			return false;
		}

		const factor = vector.isEuler ? Math.PI / 180 : 1;
		const x = vectorValue.x * factor;
		const y = vectorValue.y * factor;
		const z = vectorValue.z * factor;
		if (typeof vector.set === "function") {
			vector.set(x, y, z);
		} else {
			vector.x = x;
			vector.y = y;
			vector.z = z;
		}

		return true;
	}

	/**
	 * Handle changes to the form fields and update the selected object's properties accordingly.
	 *
	 * @param event - The custom event containing the form field change details.
	 */
	private handleFormFieldChange(event: CustomEvent<DynamicFormChangeDetail>) {
		if (!this.selectedObject) return;

		const {attribute, type, value} = event.detail;
		const updatedObject = this.selectedObject;
		if (this.isLocked() && attribute !== "locked") {
			return;
		}
		const undo = this.captureRestore(updatedObject, attribute, type);

		if (attribute === "locked") {
			if (this.selectedObject instanceof DTObject) {
				this.selectedObject.locked = Boolean(value);
			}
		} else if (attribute === "defaultViewport") {
			if (!(this.selectedObject instanceof ViewportObject)) {
				return;
			}

			this.selectedObject.defaultViewport = Boolean(value);
		} else if (type === "Vector3" && typeof value === "object") {
			if (!this.setVectorAttribute(this.selectedObject, attribute, value)) {
				return;
			}
		} else if (attribute.startsWith("rotation.")) {
			const axis = attribute.split(".")[1] as "x" | "y" | "z";
			const rawValue = Number(value);
			if (Number.isNaN(rawValue)) return;
			this.selectedObject.rotation[axis] = (rawValue * Math.PI) / 180;
		} else if (attribute === "material.type") {
			const materialObject = findMaterialObject(this.selectedObject);
			if (
				!materialObject ||
				!changeMaterialType(materialObject, String(value))
			) {
				return;
			}
		} else if (attribute === "color") {
			if (!(this.selectedObject instanceof StaticLightObject)) {
				return;
			}
			const colorValue = String(value);
			if (!/^#[0-9a-fA-F]{6}$/.test(colorValue)) {
				return;
			}
			this.selectedObject.setColor(colorValue);
		} else if (type === "texture" && attribute.startsWith("material.")) {
			const materialObject = findMaterialObject(this.selectedObject);
			if (!materialObject) {
				return;
			}

			const materialProperty = attribute.slice("material.".length);
			const textureKey = `${materialObject.uuid}:${materialProperty}`;
			const textureVersion =
				(this.materialTextureVersions.get(textureKey) ?? 0) + 1;
			this.materialTextureVersions.set(textureKey, textureVersion);
			if (value === null) {
				if (!clearMaterialTexture(materialObject, materialProperty)) {
					return;
				}
			} else if (value instanceof File) {
				void applyImageTextureToMaterial(
					materialObject,
					materialProperty,
					value,
					() =>
						this.materialTextureVersions.get(textureKey) === textureVersion &&
						findMaterialObject(this.selectedObject) === materialObject,
				)
					.then((changed) => {
						if (!changed) return;
						const redo = this.captureRestore(updatedObject, attribute, type);
						this.dispatchUpdated(attribute, undo, redo);
						this.requestUpdate();
					})
					.catch((error) => {
						console.error("Failed to apply material texture", error);
					});
				return;
			} else {
				return;
			}
		} else if (attribute.startsWith("material.")) {
			const materialObject = findMaterialObject(this.selectedObject);
			const materialProperty = attribute.slice("material.".length);
			if (
				!materialObject ||
				!setMaterialProperty(materialObject, materialProperty, value)
			) {
				return;
			}
		} else if (
			this.isHouseConfigurationAttribute(this.selectedObject, attribute)
		) {
			if (!this.selectedObject.setConfiguration(attribute, value)) return;
		} else if (
			this.isFurnitureConfigurationAttribute(this.selectedObject, attribute)
		) {
			if (!this.selectedObject.setConfiguration(attribute, value)) return;
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
		} else if (
			attribute === "clickAction" ||
			attribute === "doubleClickAction"
		) {
			if (!(this.selectedObject instanceof EntityObject)) {
				return;
			}
			const action = normalizeEntityActionOverride(value);
			if (action === "toggle" && !isToggleable(this.selectedObject)) {
				return;
			}
			this.selectedObject[attribute] = action;
		} else {
			this.setNestedAttribute(this.selectedObject, attribute, value);
		}

		const redo = this.captureRestore(updatedObject, attribute, type);
		this.dispatchUpdated(attribute, undo, redo);
		this.requestUpdate();
	}

	private handleEntityRulesChange(
		event: CustomEvent<EntityRulesChangeDetail>,
	): void {
		if (!this.selectedObject || this.isLocked()) return;

		const object = this.selectedObject;
		const previous = getEntityRules(object);
		const next = event.detail.rules;
		const apply = (rules: EntityRule[]) => setEntityRules(object, rules);

		apply(next);
		this.dispatchUpdated(
			"entityRules",
			() => apply(previous),
			() => apply(next),
		);
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

		fields.push({
			label: localManager.get("objectUUID"),
			attribute: "uuid",
			type: "info",
			tooltip: localManager.get("objectUUIDTooltip"),
			editable: false,
			enabled: true,
		});

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
				linked: true,
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

	private getShadowFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof Mesh)) {
			return [];
		}

		return [
			{
				label: localManager.get("meshCastShadows"),
				attribute: "castShadow",
				type: "boolean",
				tooltip: localManager.get("meshCastShadowsTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("meshReceiveShadows"),
				attribute: "receiveShadow",
				type: "boolean",
				tooltip: localManager.get("meshReceiveShadowsTooltip"),
				editable: !locked,
				enabled: true,
			},
		];
	}

	private getMaterialFields(locked: boolean): DynamicFormField[] {
		const materialObject = this.selectedMaterial
			? this.getStandaloneMaterialTarget()
			: findMaterialObject(this.selectedObject);
		if (!materialObject) return [];
		const material = getPrimaryMaterial(materialObject);
		if (!material) return [];

		const materialTypes = this.selectedMaterial
			? [material.type]
			: getCompatibleMaterialTypes(materialObject);
		const fields: DynamicFormField[] = [
			{
				label: localManager.get("materialType"),
				attribute: "material.type",
				type: "select",
				tooltip: localManager.get("materialTypeTooltip"),
				editable: !locked && materialTypes.length > 1,
				enabled: true,
				options: materialTypes.map((type) => ({label: type, value: type})),
			},
		];

		fields.push(
			...getMaterialPropertyDefinitions(material).map((definition) => ({
				label: localManager.get(definition.label),
				attribute: `material.${definition.property}`,
				type: definition.type,
				tooltip: localManager.get("materialPropertyTooltip"),
				editable: !locked,
				enabled: true,
				step: definition.step,
				min: definition.min,
				max: definition.max,
				options: definition.options,
				placeholder:
					definition.type === "texture"
						? localManager.get("materialTextureDrop")
						: undefined,
				replaceLabel:
					definition.type === "texture"
						? localManager.get("materialTextureReplace")
						: undefined,
				clearLabel:
					definition.type === "texture"
						? localManager.get("clearMaterialTexture")
						: undefined,
			})),
		);

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
			collapsed: attribute !== "configuration",
		});
	}

	private getEntityAttributeLabel(attribute: string): string {
		const translatedLabel = localManager.get(attribute);
		if (translatedLabel !== attribute) {
			return translatedLabel;
		}

		return attribute
			.split("_")
			.filter(Boolean)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	private getEntityAttributeFields(): DynamicFormField[] {
		if (!(this.selectedObject instanceof EntityObject)) {
			return [];
		}

		const attributes = this.selectedObject.getEntity()?.attributes ?? {};
		return Object.keys(attributes).map((attribute) => ({
			label: this.getEntityAttributeLabel(attribute),
			attribute: `attributes.${attribute}`,
			type: "info",
			editable: false,
			enabled: true,
		}));
	}

	private getWallFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof WallObject)) {
			return [];
		}

		return [
			{
				label: localManager.get("wallConnectionShape"),
				attribute: "connectionShape",
				type: "select",
				tooltip: localManager.get("wallConnectionShapeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("rectangular"), value: "rectangle"},
					{label: localManager.get("circular"), value: "circle"},
				],
			},
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
			{
				label: localManager.get("baseboardEnabled"),
				attribute: "baseboardEnabled",
				type: "boolean",
				tooltip: localManager.get("baseboardEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("baseboardHeight"),
				attribute: "baseboardHeight",
				type: "number",
				tooltip: localManager.get("baseboardHeightTooltip"),
				editable: !locked && this.selectedObject.baseboardEnabled,
				enabled: true,
				min: 0.01,
				step: 0.01,
			},
			{
				label: localManager.get("baseboardDepth"),
				attribute: "baseboardDepth",
				type: "number",
				tooltip: localManager.get("baseboardDepthTooltip"),
				editable: !locked && this.selectedObject.baseboardEnabled,
				enabled: true,
				min: 0,
				step: 0.005,
			},
			{
				label: localManager.get("baseboardColor"),
				attribute: "baseboardColor",
				type: "color",
				tooltip: localManager.get("baseboardColorTooltip"),
				editable: !locked && this.selectedObject.baseboardEnabled,
				enabled: true,
			},
		];
	}

	private getOpeningFields(locked: boolean): DynamicFormField[] {
		if (
			!(this.selectedObject instanceof DoorObject) &&
			!(this.selectedObject instanceof WindowObject) &&
			!(this.selectedObject instanceof GateObject)
		) {
			return [];
		}
		const controlledByEntity = Boolean(this.selectedObject.openEntityId);

		return [
			{
				label: localManager.get("openingWidth"),
				attribute: "width",
				type: "number",
				tooltip: localManager.get("openingWidthTooltip"),
				editable: !locked,
				enabled: true,
				min: 0.1,
				step: 0.01,
			},
			{
				label: localManager.get("openingHeight"),
				attribute: "height",
				type: "number",
				tooltip: localManager.get("openingHeightTooltip"),
				editable: !locked,
				enabled: true,
				min: 0.1,
				step: 0.01,
			},
			{
				label: localManager.get("openingThickness"),
				attribute: "thickness",
				type: "number",
				tooltip: localManager.get("openingThicknessTooltip"),
				editable: !locked,
				enabled: true,
				min: 0.01,
				step: 0.01,
			},
			{
				label: localManager.get("openingEntityId"),
				attribute: "openEntityId",
				type: "entity",
				tooltip: localManager.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "cover.living_room",
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("open"),
				attribute: "open",
				type: "boolean",
				tooltip: localManager.get("openTooltip"),
				editable: !locked && !controlledByEntity,
				enabled: true,
			},
			{
				label: localManager.get("openingAmount"),
				attribute: "openAmount",
				type: "number",
				tooltip: localManager.get("openingAmountTooltip"),
				editable: !locked && !controlledByEntity,
				enabled: true,
				min: 0,
				max: 100,
				step: 5,
			},
		];
	}

	private getDoorHardwareFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof DoorObject)) return [];
		return [
			{
				label: localManager.get("doorOperationType"),
				attribute: "operationType",
				type: "select",
				tooltip: localManager.get("doorOperationTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("hinged"), value: "hinged"},
					{label: localManager.get("sliding"), value: "sliding"},
				],
			},
			{
				label: localManager.get("doorPanelCount"),
				attribute: "panelCount",
				type: "select",
				tooltip: localManager.get("doorPanelCountTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("single"), value: 1},
					{label: localManager.get("double"), value: 2},
				],
			},
			{
				label:
					this.selectedObject.operationType === "sliding"
						? localManager.get("slideSide")
						: localManager.get("doorHingeSide"),
				attribute: "hingeSide",
				type: "select",
				tooltip:
					this.selectedObject.operationType === "sliding"
						? localManager.get("slideSideTooltip")
						: localManager.get("doorHingeSideTooltip"),
				editable: !locked && this.selectedObject.panelCount === 1,
				enabled: true,
				options: [
					{label: localManager.get("left"), value: "left"},
					{label: localManager.get("right"), value: "right"},
				],
			},
			{
				label: localManager.get("doorOpeningDirection"),
				attribute: "openingDirection",
				type: "select",
				tooltip: localManager.get("doorOpeningDirectionTooltip"),
				editable: !locked && this.selectedObject.operationType === "hinged",
				enabled: true,
				options: [
					{label: localManager.get("inward"), value: "inward"},
					{label: localManager.get("outward"), value: "outward"},
				],
			},
			{
				label: localManager.get("doorKnobStyle"),
				attribute: "knobStyle",
				type: "select",
				tooltip: localManager.get("doorKnobStyleTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("none"), value: "none"},
					{label: localManager.get("round"), value: "round"},
					{label: localManager.get("lever"), value: "lever"},
					{label: localManager.get("bar"), value: "bar"},
				],
			},
			{
				label: localManager.get("doorKnobColor"),
				attribute: "knobColor",
				type: "color",
				tooltip: localManager.get("doorKnobColorTooltip"),
				editable: !locked && this.selectedObject.knobStyle !== "none",
				enabled: true,
			},
		];
	}

	private getGateFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof GateObject)) return [];
		const verticalBars = this.selectedObject.style === "verticalBars";
		return [
			{
				label: localManager.get("gateOperationType"),
				attribute: "operationType",
				type: "select",
				tooltip: localManager.get("gateOperationTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("gateDoorStyle"), value: "hinged"},
					{label: localManager.get("sliding"), value: "sliding"},
				],
			},
			{
				label: localManager.get("gatePanelCount"),
				attribute: "panelCount",
				type: "select",
				tooltip: localManager.get("gatePanelCountTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("single"), value: 1},
					{label: localManager.get("double"), value: 2},
				],
			},
			{
				label:
					this.selectedObject.operationType === "sliding"
						? localManager.get("slideSide")
						: localManager.get("doorHingeSide"),
				attribute: "hingeSide",
				type: "select",
				tooltip:
					this.selectedObject.operationType === "sliding"
						? localManager.get("slideSideTooltip")
						: localManager.get("doorHingeSideTooltip"),
				editable: !locked && this.selectedObject.panelCount === 1,
				enabled: true,
				options: [
					{label: localManager.get("left"), value: "left"},
					{label: localManager.get("right"), value: "right"},
				],
			},
			{
				label: localManager.get("doorOpeningDirection"),
				attribute: "openingDirection",
				type: "select",
				tooltip: localManager.get("gateOpeningDirectionTooltip"),
				editable: !locked && this.selectedObject.operationType === "hinged",
				enabled: true,
				options: [
					{label: localManager.get("inward"), value: "inward"},
					{label: localManager.get("outward"), value: "outward"},
				],
			},
			{
				label: localManager.get("gateStyle"),
				attribute: "style",
				type: "select",
				tooltip: localManager.get("gateStyleTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("gateSolid"), value: "solid"},
					{
						label: localManager.get("gateVerticalBars"),
						value: "verticalBars",
					},
				],
			},
			{
				label: localManager.get("gateBarWidth"),
				attribute: "barWidth",
				type: "number",
				tooltip: localManager.get("gateBarWidthTooltip"),
				editable: !locked && verticalBars,
				enabled: true,
				min: 0.01,
				step: 0.01,
			},
			{
				label: localManager.get("gateBarSpacing"),
				attribute: "barSpacing",
				type: "number",
				tooltip: localManager.get("gateBarSpacingTooltip"),
				editable: !locked && verticalBars,
				enabled: true,
				min: 0.01,
				step: 0.01,
			},
		];
	}

	private getWindowOperationFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof WindowObject)) return [];
		return [
			{
				label: localManager.get("windowOpeningType"),
				attribute: "openingType",
				type: "select",
				tooltip: localManager.get("windowOpeningTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("sliding"), value: "sliding"},
					{label: localManager.get("hinged"), value: "hinged"},
				],
			},
			{
				label: localManager.get("windowPanelCount"),
				attribute: "panelCount",
				type: "select",
				tooltip: localManager.get("windowPanelCountTooltip"),
				editable: !locked && this.selectedObject.openingType === "hinged",
				enabled: true,
				options: [
					{label: localManager.get("single"), value: 1},
					{label: localManager.get("double"), value: 2},
				],
			},
			{
				label:
					this.selectedObject.openingType === "sliding"
						? localManager.get("windowSlidingPanel")
						: localManager.get("doorHingeSide"),
				attribute: "hingeSide",
				type: "select",
				tooltip:
					this.selectedObject.openingType === "sliding"
						? localManager.get("windowSlidingPanelTooltip")
						: localManager.get("doorHingeSideTooltip"),
				editable:
					!locked &&
					(this.selectedObject.openingType === "sliding" ||
						this.selectedObject.panelCount === 1),
				enabled: true,
				options: [
					{label: localManager.get("left"), value: "left"},
					{label: localManager.get("right"), value: "right"},
				],
			},
			{
				label: localManager.get("openingDirection"),
				attribute: "openingDirection",
				type: "select",
				tooltip: localManager.get("openingDirectionTooltip"),
				editable: !locked && this.selectedObject.openingType === "hinged",
				enabled: true,
				options: [
					{label: localManager.get("inward"), value: "inward"},
					{label: localManager.get("outward"), value: "outward"},
				],
			},
		];
	}

	private getBorderFields(locked: boolean): DynamicFormField[] {
		const object = this.selectedObject;
		if (!(object instanceof DoorObject) && !(object instanceof WindowObject)) {
			return [];
		}
		const enabled = object.borderEnabled;
		const widthAttribute =
			object instanceof DoorObject ? "borderWidth" : "borderThickness";
		return [
			{
				label: localManager.get("borderEnabled"),
				attribute: "borderEnabled",
				type: "boolean",
				tooltip: localManager.get("borderEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("borderThickness"),
				attribute: widthAttribute,
				type: "number",
				tooltip: localManager.get("borderThicknessTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 0.005,
				step: 0.005,
			},
			{
				label: localManager.get("borderDepth"),
				attribute: "borderDepth",
				type: "number",
				tooltip: localManager.get("borderDepthTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 0,
				step: 0.005,
			},
			{
				label: localManager.get("borderColor"),
				attribute: "borderColor",
				type: "color",
				tooltip: localManager.get("borderColorTooltip"),
				editable: !locked && enabled,
				enabled: true,
			},
		];
	}

	private getDoorWindowFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof DoorObject)) return [];
		const enabled = this.selectedObject.windowEnabled;
		return [
			{
				label: localManager.get("doorWindowEnabled"),
				attribute: "windowEnabled",
				type: "boolean",
				tooltip: localManager.get("doorWindowEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			...[
				["doorWindowWidth", "windowWidth", 0.01],
				["doorWindowHeight", "windowHeight", 0.01],
				["doorWindowPositionX", "windowPositionX", 0.01],
				["doorWindowPositionY", "windowPositionY", 0.01],
				["doorWindowBorderWidth", "windowBorderWidth", 0.005],
			].map(([label, attribute, step]) => ({
				label: localManager.get(label as string),
				attribute: attribute as string,
				type: "number" as const,
				tooltip: localManager.get(`${label}Tooltip`),
				editable: !locked && enabled,
				enabled: true,
				step: step as number,
				min:
					attribute === "windowPositionX" || attribute === "windowPositionY"
						? undefined
						: 0.01,
			})),
			{
				label: localManager.get("doorWindowColor"),
				attribute: "windowColor",
				type: "color",
				tooltip: localManager.get("doorWindowColorTooltip"),
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: localManager.get("doorWindowOpacity"),
				attribute: "windowOpacity",
				type: "number",
				tooltip: localManager.get("doorWindowOpacityTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 0,
				max: 1,
				step: 0.05,
			},
		];
	}

	private getWindowGlassFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof WindowObject)) return [];
		return [
			{
				label: localManager.get("glassColor"),
				attribute: "glassColor",
				type: "color",
				tooltip: localManager.get("glassColorTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("glassOpacity"),
				attribute: "glassOpacity",
				type: "number",
				tooltip: localManager.get("glassOpacityTooltip"),
				editable: !locked,
				enabled: true,
				min: 0,
				max: 1,
				step: 0.05,
			},
			{
				label: localManager.get("glassRoughness"),
				attribute: "glassRoughness",
				type: "number",
				tooltip: localManager.get("glassRoughnessTooltip"),
				editable: !locked,
				enabled: true,
				min: 0,
				max: 1,
				step: 0.05,
			},
		];
	}

	private getWindowGridFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof WindowObject)) return [];
		const enabled = this.selectedObject.gridEnabled;
		return [
			{
				label: localManager.get("windowGridEnabled"),
				attribute: "gridEnabled",
				type: "boolean",
				tooltip: localManager.get("windowGridEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			...[
				["windowGridRows", "gridRows", 1, 1],
				["windowGridColumns", "gridColumns", 1, 1],
				["windowGridBarThickness", "gridBarThickness", 0.005, 0.005],
				["windowGridHorizontalSpacing", "gridHorizontalSpacing", 0.01, 0],
				["windowGridVerticalSpacing", "gridVerticalSpacing", 0.01, 0],
			].map(([label, attribute, step, min]) => ({
				label: localManager.get(label as string),
				attribute: attribute as string,
				type: "number" as const,
				tooltip: localManager.get(`${label}Tooltip`),
				editable: !locked && enabled,
				enabled: true,
				step: step as number,
				min: min as number,
			})),
		];
	}

	private getWindowBlindFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof WindowObject)) return [];
		const enabled = this.selectedObject.blindsEnabled;
		return [
			{
				label: localManager.get("windowBlindsEnabled"),
				attribute: "blindsEnabled",
				type: "boolean",
				tooltip: localManager.get("windowBlindsEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("windowBlindEntityId"),
				attribute: "blindOpenEntityId",
				type: "entity",
				tooltip: localManager.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "cover.living_room_blind",
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: localManager.get("windowBlindPlacement"),
				attribute: "blindPlacement",
				type: "select",
				tooltip: localManager.get("windowBlindPlacementTooltip"),
				editable: !locked && enabled,
				enabled: true,
				options: [
					{label: localManager.get("inside"), value: "inside"},
					{label: localManager.get("outside"), value: "outside"},
				],
			},
			{
				label: localManager.get("windowBlindPosition"),
				attribute: "blindPosition",
				type: "number",
				tooltip: localManager.get("windowBlindPositionTooltip"),
				editable:
					!locked && enabled && !this.selectedObject.blindOpenEntityId,
				enabled: true,
				min: 0,
				max: 100,
				step: 5,
			},
			{
				label: localManager.get("windowBlindSlatSpacing"),
				attribute: "blindSlatSpacing",
				type: "number",
				tooltip: localManager.get("windowBlindSlatSpacingTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 0.02,
				step: 0.01,
			},
			{
				label: localManager.get("windowBlindColor"),
				attribute: "blindColor",
				type: "color",
				tooltip: localManager.get("windowBlindColorTooltip"),
				editable: !locked && enabled,
				enabled: true,
			},
		];
	}

	private getWindowShutterFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof WindowObject)) return [];
		const enabled = this.selectedObject.shuttersEnabled;
		return [
			{
				label: localManager.get("windowShuttersEnabled"),
				attribute: "shuttersEnabled",
				type: "boolean",
				tooltip: localManager.get("windowShuttersEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: localManager.get("windowShutterEntityId"),
				attribute: "shutterOpenEntityId",
				type: "entity",
				tooltip: localManager.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "cover.living_room_shutter",
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: localManager.get("windowShutterPanelCount"),
				attribute: "shutterPanelCount",
				type: "select",
				tooltip: localManager.get("windowShutterPanelCountTooltip"),
				editable: !locked && enabled,
				enabled: true,
				options: [
					{label: localManager.get("single"), value: 1},
					{label: localManager.get("double"), value: 2},
				],
			},
			{
				label: localManager.get("windowShutterPlacement"),
				attribute: "shutterPlacement",
				type: "select",
				tooltip: localManager.get("windowShutterPlacementTooltip"),
				editable: !locked && enabled,
				enabled: true,
				options: [
					{label: localManager.get("outside"), value: "outside"},
					{label: localManager.get("inside"), value: "inside"},
				],
			},
			{
				label: localManager.get("windowShutterOpenAmount"),
				attribute: "shutterOpenAmount",
				type: "number",
				tooltip: localManager.get("windowShutterOpenAmountTooltip"),
				editable:
					!locked && enabled && !this.selectedObject.shutterOpenEntityId,
				enabled: true,
				min: 0,
				max: 100,
				step: 5,
			},
			{
				label: localManager.get("windowShutterBladeCount"),
				attribute: "shutterBladeCount",
				type: "number",
				tooltip: localManager.get("windowShutterBladeCountTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 1,
				max: 50,
				step: 1,
			},
			{
				label: localManager.get("windowShutterBladeOpenAmount"),
				attribute: "shutterBladeOpenAmount",
				type: "number",
				tooltip: localManager.get("windowShutterBladeOpenAmountTooltip"),
				editable:
					!locked && enabled && !this.selectedObject.shutterBladeOpenEntityId,
				enabled: true,
				min: 0,
				max: 100,
				step: 5,
			},
			{
				label: localManager.get("windowShutterBladeEntityId"),
				attribute: "shutterBladeOpenEntityId",
				type: "entity",
				tooltip: localManager.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "number.living_room_shutter_blades",
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: localManager.get("windowShutterColor"),
				attribute: "shutterColor",
				type: "color",
				tooltip: localManager.get("windowShutterColorTooltip"),
				editable: !locked && enabled,
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

	private getFurnitureFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof FurnitureObject)) {
			return [];
		}

		return this.selectedObject.parameterDefinitions.map((definition) => ({
			label: localManager.get(definition.labelKey),
			attribute: definition.name,
			type: definition.type === "boolean" ? "boolean" : "number",
			tooltip: localManager.get(definition.tooltipKey),
			editable: !locked,
			enabled: true,
			step: definition.step,
			min: definition.min,
			max: definition.max,
		}));
	}

	private getEntityFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof EntityObject)) {
			return [];
		}
		const attributeFields = this.getEntityAttributeFields();
		const actionOptions = [
			{label: localManager.get("cardDefaultAction"), value: "default"},
			{label: localManager.get("openEntity"), value: "open"},
			...(isToggleable(this.selectedObject)
				? [{label: localManager.get("toggleEntity"), value: "toggle"}]
				: []),
			{label: localManager.get("nothing"), value: "nothing"},
		];

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
			...attributeFields,
			{
				label: localManager.get("entityClickAction"),
				attribute: "clickAction",
				type: "select",
				tooltip: localManager.get("entityClickActionDescription"),
				editable: !locked,
				enabled: true,
				options: actionOptions,
			},
			{
				label: localManager.get("entityDoubleClickAction"),
				attribute: "doubleClickAction",
				type: "select",
				tooltip: localManager.get("entityDoubleClickActionDescription"),
				editable: !locked,
				enabled: true,
				options: actionOptions,
			},
		];
	}

	private getViewportFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof ViewportObject)) {
			return [];
		}

		return [
			{
				label: localManager.get("defaultViewport"),
				attribute: "defaultViewport",
				type: "boolean",
				tooltip: localManager.get("defaultViewportTooltip"),
				editable: !locked,
				enabled: true,
			},
		];
	}

	private getLightFields(locked: boolean): DynamicFormField[] {
		const object = this.selectedObject;
		if (
			!(object instanceof StaticLightObject) &&
			!(object instanceof EntityLight)
		) {
			return [];
		}

		const fields: DynamicFormField[] = [
			{
				label: localManager.get("lightSourceType"),
				attribute: "sourceType",
				type: "select",
				tooltip: localManager.get("lightSourceTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: localManager.get("ambientLight"), value: "ambient"},
					{label: localManager.get("directionalLight"), value: "directional"},
					{label: localManager.get("pointLight"), value: "point"},
					{label: localManager.get("spotLight"), value: "spot"},
					{label: localManager.get("rectAreaLight"), value: "rect-area"},
				],
			},
		];

		if (object instanceof StaticLightObject) {
			fields.push({
				label: localManager.get("lightEnabled"),
				attribute: "enabled",
				type: "boolean",
				tooltip: localManager.get("lightEnabledTooltip"),
				editable: !locked,
				enabled: true,
			});
			fields.push({
				label: localManager.get("lightColor"),
				attribute: "color",
				type: "color",
				tooltip: localManager.get("lightColorTooltip"),
				editable: !locked,
				enabled: true,
			});
		}

		fields.push({
			label: localManager.get("lightIntensity"),
			attribute: "intensity",
			type: "number",
			tooltip: localManager.get("lightIntensityTooltip"),
			editable: !locked,
			enabled: true,
			min: 0,
			step: 0.1,
		});

		if (object.sourceType === "point" || object.sourceType === "spot") {
			fields.push({
				label: localManager.get("lightDistance"),
				attribute: "distance",
				type: "number",
				tooltip: localManager.get("lightDistanceTooltip"),
				editable: !locked,
				enabled: true,
				min: 0,
				step: 0.1,
			});
			fields.push({
				label: localManager.get("lightDecay"),
				attribute: "decay",
				type: "number",
				tooltip: localManager.get("lightDecayTooltip"),
				editable: !locked,
				enabled: true,
				min: 0,
				step: 0.1,
			});
		}

		if (
			object.sourceType === "directional" ||
			object.sourceType === "point" ||
			object.sourceType === "spot"
		) {
			fields.push({
				label: localManager.get("lightCastsShadows"),
				attribute: "castsShadows",
				type: "boolean",
				tooltip: localManager.get("lightCastsShadowsTooltip"),
				editable: !locked,
				enabled: true,
			});
			fields.push({
				label: localManager.get("lightShadowBias"),
				attribute: "shadowBias",
				type: "number",
				tooltip: localManager.get("lightShadowBiasTooltip"),
				editable: !locked,
				enabled: true,
				step: 0.0001,
			});
		}

		if (object.sourceType === "spot") {
			fields.push(
				{
					label: localManager.get("lightAngle"),
					attribute: "angle",
					type: "number",
					tooltip: localManager.get("lightAngleTooltip"),
					editable: !locked,
					enabled: true,
					min: 1,
					max: 90,
					step: 1,
				},
				{
					label: localManager.get("lightPenumbra"),
					attribute: "penumbra",
					type: "number",
					tooltip: localManager.get("lightPenumbraTooltip"),
					editable: !locked,
					enabled: true,
					min: 0,
					max: 1,
					step: 0.05,
				},
			);
		}

		if (object.sourceType === "rect-area") {
			fields.push(
				{
					label: localManager.get("lightWidth"),
					attribute: "width",
					type: "number",
					tooltip: localManager.get("lightWidthTooltip"),
					editable: !locked,
					enabled: true,
					min: 0.01,
					step: 0.1,
				},
				{
					label: localManager.get("lightHeight"),
					attribute: "height",
					type: "number",
					tooltip: localManager.get("lightHeightTooltip"),
					editable: !locked,
					enabled: true,
					min: 0.01,
					step: 0.1,
				},
			);
		}

		return fields;
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
			attributes: entityData?.attributes ?? {},
			clickAction: this.selectedObject.clickAction,
			doubleClickAction: this.selectedObject.doubleClickAction,
		};
	}

	private getInspectorFields(locked: boolean): DynamicFormField[] {
		const fields: DynamicFormField[] = [];
		const isFloorplannerObject =
			this.selectedObject instanceof WallObject ||
			this.selectedObject instanceof DoorObject ||
			this.selectedObject instanceof WindowObject ||
			this.selectedObject instanceof GateObject ||
			this.selectedObject instanceof FurnitureObject;
		const geometryData =
			this.selectedObject instanceof Mesh ? this.selectedObject.userData : null;
		const materialObject = findMaterialObject(this.selectedObject);
		const materialData = materialObject
			? {material: getPrimaryMaterial(materialObject)}
			: null;
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
		const addAppearanceFields = () => {
			this.addSubFormField(
				fields,
				"shadows",
				localManager.get("shadows"),
				this.getShadowFields(locked),
			);
			this.addSubFormField(
				fields,
				"material",
				localManager.get("material"),
				this.getMaterialFields(locked),
				materialData,
			);
		};
		if (!isFloorplannerObject) {
			addAppearanceFields();
		}
		this.addSubFormField(
			fields,
			"wall",
			localManager.get("wall"),
			this.getWallFields(locked),
		);
		this.addSubFormField(
			fields,
			"opening",
			this.selectedObject instanceof GateObject
				? localManager.get("gate")
				: this.selectedObject instanceof DoorObject
					? localManager.get("door")
					: localManager.get("window"),
			this.getOpeningFields(locked),
		);
		this.addSubFormField(
			fields,
			"gate",
			localManager.get("gateConfiguration"),
			this.getGateFields(locked),
		);
		this.addSubFormField(
			fields,
			"doorHardware",
			localManager.get("doorHardware"),
			this.getDoorHardwareFields(locked),
		);
		this.addSubFormField(
			fields,
			"border",
			localManager.get("border"),
			this.getBorderFields(locked),
		);
		this.addSubFormField(
			fields,
			"doorWindow",
			localManager.get("doorWindow"),
			this.getDoorWindowFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowGlass",
			localManager.get("windowGlass"),
			this.getWindowGlassFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowOperation",
			localManager.get("windowOperation"),
			this.getWindowOperationFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowGrid",
			localManager.get("windowGrid"),
			this.getWindowGridFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowBlinds",
			localManager.get("windowBlinds"),
			this.getWindowBlindFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowShutters",
			localManager.get("windowShutters"),
			this.getWindowShutterFields(locked),
		);
		this.addSubFormField(
			fields,
			"furniture",
			this.selectedObject instanceof FurnitureObject
				? localManager.get(this.selectedObject.editorLabelKey)
				: localManager.get("furnitureDimensions"),
			this.getFurnitureFields(locked),
			this.selectedObject instanceof FurnitureObject
				? this.selectedObject.parameters
				: null,
		);
		if (isFloorplannerObject) {
			addAppearanceFields();
		}
		this.addSubFormField(
			fields,
			"geometry",
			localManager.get("geometry"),
			this.getGeometryFields(locked),
			geometryData,
		);
		this.addSubFormField(
			fields,
			"light",
			localManager.get("lighting"),
			this.getLightFields(locked),
		);
		this.addSubFormField(
			fields,
			"viewport",
			localManager.get("viewport"),
			this.getViewportFields(locked),
		);
		this.addSubFormField(
			fields,
			"entity",
			localManager.get("entity"),
			this.getEntityFields(locked),
			entityData,
		);

		return fields;
	}

	private getComparableFieldValue(
		object: WallObject | DoorObject | WindowObject | GateObject,
		attribute: string,
	): unknown {
		const materialObject = findMaterialObject(object);
		const value = attribute.startsWith("material.")
			? this.getNestedAttribute(
				materialObject ? getPrimaryMaterial(materialObject) : null,
				attribute.slice("material.".length),
			)
			: this.getNestedAttribute(object, attribute);
		if (
			value &&
			typeof value === "object" &&
			"getHexString" in value &&
			typeof (value as {getHexString?: unknown}).getHexString === "function"
		) {
			return `#${(value as {getHexString: () => string}).getHexString()}`;
		}
		return value;
	}

	private markMixedFields(
		fields: DynamicFormField[],
		objects: Array<WallObject | DoorObject | WindowObject | GateObject>,
	): DynamicFormField[] {
		return fields.map((field) => {
			if (field.type === "sub-form") {
				return {...field, fields: this.markMixedFields(field.fields, objects)};
			}
			const firstValue = this.getComparableFieldValue(
				objects[0],
				field.attribute,
			);
			return {
				...field,
				mixed: objects
					.slice(1)
					.some(
						(object) =>
							this.getComparableFieldValue(object, field.attribute) !==
							firstValue,
					),
			};
		});
	}

	/** Only object-type configuration is exposed for a homogeneous selection. */
	private getMultipleInspectorFields(
		objects: Array<WallObject | DoorObject | WindowObject | GateObject>,
	): DynamicFormField[] {
		const fields: DynamicFormField[] = [];
		const locked = objects.some((object) => object.locked);
		const materialObject = findMaterialObject(this.selectedObject);
		const materialData = materialObject
			? {material: getPrimaryMaterial(materialObject)}
			: null;
		const colorFields = this.getMaterialFields(locked).filter(
			(field) => field.attribute === "material.color",
		);

		this.addSubFormField(fields, "wall", localManager.get("wall"), this.getWallFields(locked));
		this.addSubFormField(
			fields,
			"opening",
			this.selectedObject instanceof GateObject
				? localManager.get("gate")
				: this.selectedObject instanceof DoorObject
					? localManager.get("door")
					: localManager.get("window"),
			this.getOpeningFields(locked),
		);
		this.addSubFormField(fields, "gate", localManager.get("gateConfiguration"), this.getGateFields(locked));
		this.addSubFormField(fields, "doorHardware", localManager.get("doorHardware"), this.getDoorHardwareFields(locked));
		this.addSubFormField(fields, "border", localManager.get("border"), this.getBorderFields(locked));
		this.addSubFormField(fields, "doorWindow", localManager.get("doorWindow"), this.getDoorWindowFields(locked));
		this.addSubFormField(fields, "windowGlass", localManager.get("windowGlass"), this.getWindowGlassFields(locked));
		this.addSubFormField(fields, "windowOperation", localManager.get("windowOperation"), this.getWindowOperationFields(locked));
		this.addSubFormField(fields, "windowGrid", localManager.get("windowGrid"), this.getWindowGridFields(locked));
		this.addSubFormField(fields, "windowBlinds", localManager.get("windowBlinds"), this.getWindowBlindFields(locked));
		this.addSubFormField(fields, "windowShutters", localManager.get("windowShutters"), this.getWindowShutterFields(locked));
		this.addSubFormField(fields, "material", localManager.get("material"), colorFields, materialData);

		return this.markMixedFields(fields, objects);
	}

	public render() {
		if (this.selectedMaterial) {
			return html`
				<h4>${localManager.get("selectedMaterial")}</h4>
				<dt3d-dynamic-form
					.fields=${this.getMaterialFields(false)}
					.data=${{material: this.selectedMaterial}}
					.entityOptions=${this.entityOptions}
					@field-change=${(
						event: CustomEvent<DynamicFormChangeDetail>,
					) => this.handleMaterialFieldChange(event)}
				></dt3d-dynamic-form>
			`;
		}

		if (this.multiple) {
			const objects = this.getCommonHouseSelection();
			if (objects.length > 1 && this.selectedObject) {
				return html`
					<h4>${localManager.get("multipleObjectsSelected")}</h4>
					<dt3d-dynamic-form
						.fields=${this.getMultipleInspectorFields(objects)}
						.data=${this.selectedObject}
						.entityOptions=${this.entityOptions}
						@field-change=${(
							event: CustomEvent<DynamicFormChangeDetail>,
						) => this.handleMultipleFormFieldChange(event)}
					></dt3d-dynamic-form>
				`;
			}
			return html`
				<div class="placeholder">
					${localManager.get("multipleObjectsSelected")}
				</div>
			`;
		}

		const locked = this.isLocked();
		const inspectorFields = this.getInspectorFields(locked);

		return html`
			<h4>${localManager.get("selectedObject")}</h4>
			${this.selectedObject
				? html`
						<dt3d-dynamic-form
							.fields=${inspectorFields}
							.data=${this.selectedObject}
							.entityOptions=${this.entityOptions}
							@field-change=${(event: CustomEvent<DynamicFormChangeDetail>) =>
								this.handleFormFieldChange(event)}
						></dt3d-dynamic-form>
						<details class="rules-section">
							<summary>
								${localManager.get("entityRules")}
								<span>${getEntityRules(this.selectedObject).length}</span>
							</summary>
							<dt3d-entity-rules
								.object=${this.selectedObject}
								.entityOptions=${this.entityOptions}
								.disabled=${locked}
								@entity-rules-change=${(
									event: CustomEvent<EntityRulesChangeDetail>,
								) => this.handleEntityRulesChange(event)}
							></dt3d-entity-rules>
						</details>
						${locked
							? html`<div class="placeholder">
									${localManager.get("objectLocked")}
								</div>`
							: null}
					`
				: html`<div class="placeholder">
						${localManager.get("selectObjectPrompt")}
					</div>`}
		`;
	}
}
