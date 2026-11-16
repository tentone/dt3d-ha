import "../dynamic-form/dynamic-form.js";
import "../entity-rules/entity-rules.js";

import {html, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";
import type {Material, Object3D} from "three";
import {Mesh, Vector3} from "three";

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
import {markMaterialUserManaged} from "../../editor/material-library.js";
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
import {LocalizedElement} from "../../locale/localized-element.js";
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

export type WallGeometryUpdateDetail = {
	wall: WallObject;
	attribute: "startPoint" | "endPoint" | "length";
	value: Vector3 | number;
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
export class DT3DObjectInspector extends LocalizedElement {
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

	/** Coordinate system used for editable wall endpoints. */
	@property({attribute: false})
	public coordinateRoot: Object3D | null = null;

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

	private markMaterialTargetUserManaged(target: MaterialObject): void {
		for (const material of getMaterials(target)) {
			markMaterialUserManaged(material);
		}
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
						this.markMaterialTargetUserManaged(target);
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

		this.markMaterialTargetUserManaged(target);
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
		if (attribute.startsWith("material.")) {
			for (const object of objects) {
				const materialObject = findMaterialObject(object);
				if (materialObject) {
					this.markMaterialTargetUserManaged(materialObject);
				}
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
		if (attribute === "entityId" && object instanceof EntityObject) {
			const entityId = object.entityId;
			return () => object.setEntityId(entityId);
		}

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
			const parameters = object.getParameters();
			return () => object.setParameters(parameters);
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
		const [wallGeometryAttribute, wallGeometryAxis] = attribute.split(".") as [
			"startPoint" | "endPoint" | "length" | string,
			"x" | "y" | "z" | undefined,
		];
		if (
			updatedObject instanceof WallObject &&
			(wallGeometryAttribute === "startPoint" ||
				wallGeometryAttribute === "endPoint" ||
				wallGeometryAttribute === "length")
		) {
			let geometryValue: number | Vector3;
			if (wallGeometryAttribute === "length") {
				geometryValue = Number(value);
			} else if (
				wallGeometryAxis === "x" ||
				wallGeometryAxis === "y" ||
				wallGeometryAxis === "z"
			) {
				const currentPoint =
					this.getWallGeometryData()?.[wallGeometryAttribute];
				if (!currentPoint) {
					return;
				}
				geometryValue = currentPoint.clone();
				geometryValue[wallGeometryAxis] = Number(value);
			} else if (value && typeof value === "object") {
				geometryValue = new Vector3(
					Number((value as {x?: unknown}).x),
					Number((value as {y?: unknown}).y),
					Number((value as {z?: unknown}).z),
				);
			} else {
				return;
			}
			if (
				typeof geometryValue === "number"
					? !Number.isFinite(geometryValue) || geometryValue <= 0
					: !geometryValue.toArray().every(Number.isFinite)
			) {
				return;
			}
			this.dispatchEvent(
				new CustomEvent<WallGeometryUpdateDetail>("wall-geometry-updated", {
					detail: {
						wall: updatedObject,
						attribute: wallGeometryAttribute,
						value: geometryValue,
					},
					bubbles: true,
					composed: true,
				}),
			);
			this.requestUpdate();
			return;
		}
		const undo = this.captureRestore(updatedObject, attribute, type);

		if (attribute === "locked") {
			if (this.selectedObject instanceof DTObject) {
				this.selectedObject.locked = Boolean(value);
			}
		} else if (attribute === "entityId") {
			if (!(this.selectedObject instanceof EntityObject)) {
				return;
			}

			const entityId = String(value).trim();
			const domain = this.selectedObject.entityId.split(".", 1)[0];
			if (
				entityId === this.selectedObject.entityId ||
				!entityId.startsWith(`${domain}.`) ||
				!this.entityOptions.some((option) => option.entityId === entityId)
			) {
				return;
			}
			this.selectedObject.setEntityId(entityId);
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
						this.markMaterialTargetUserManaged(materialObject);
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

		if (attribute.startsWith("material.")) {
			const materialObject = findMaterialObject(updatedObject);
			if (materialObject) {
				this.markMaterialTargetUserManaged(materialObject);
			}
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
				label: this.locale.get("objectName"),
				attribute: "name",
				type: "string",
				tooltip: this.locale.get("objectNameTooltip"),
				editable: !locked,
				enabled: true,
			},
		];

		if (this.selectedObject instanceof DTObject) {
			fields.push({
				label: this.locale.get("locked"),
				attribute: "locked",
				type: "boolean",
				tooltip: this.locale.get("lockedTooltip"),
				editable: true,
				enabled: true,
			});
		}

		fields.push({
			label: this.locale.get("objectUUID"),
			attribute: "uuid",
			type: "info",
			tooltip: this.locale.get("objectUUIDTooltip"),
			editable: false,
			enabled: true,
		});

		return fields;
	}

	private getTransformFields(locked: boolean): DynamicFormField[] {
		if (!this.selectedObject) return [];

		return [
			{
				label: this.locale.get("position"),
				attribute: "position",
				type: "Vector3",
				tooltip: this.locale.get("positionTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("scale"),
				attribute: "scale",
				type: "Vector3",
				tooltip: this.locale.get("scaleTooltip"),
				editable: !locked,
				enabled: true,
				linked: true,
			},
			{
				label: this.locale.get("rotation"),
				attribute: "rotation",
				type: "Vector3",
				tooltip: this.locale.get("rotationTooltip"),
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
				label: this.locale.get("meshCastShadows"),
				attribute: "castShadow",
				type: "boolean",
				tooltip: this.locale.get("meshCastShadowsTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("meshReceiveShadows"),
				attribute: "receiveShadow",
				type: "boolean",
				tooltip: this.locale.get("meshReceiveShadowsTooltip"),
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
				label: this.locale.get("materialType"),
				attribute: "material.type",
				type: "select",
				tooltip: this.locale.get("materialTypeTooltip"),
				editable: !locked && materialTypes.length > 1,
				enabled: true,
				options: materialTypes.map((type) => ({label: type, value: type})),
			},
		];

		fields.push(
			...getMaterialPropertyDefinitions(material).map((definition) => ({
				label: this.locale.get(definition.label),
				attribute: `material.${definition.property}`,
				type: definition.type,
				tooltip: this.locale.get("materialPropertyTooltip"),
				editable: !locked,
				enabled: true,
				step: definition.step,
				min: definition.min,
				max: definition.max,
				options: definition.options,
				placeholder:
					definition.type === "texture"
						? this.locale.get("materialTextureDrop")
						: undefined,
				replaceLabel:
					definition.type === "texture"
						? this.locale.get("materialTextureReplace")
						: undefined,
				clearLabel:
					definition.type === "texture"
						? this.locale.get("clearMaterialTexture")
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
		const translatedLabel = this.locale.get(attribute);
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
				label: this.locale.get("wallConnectionShape"),
				attribute: "connectionShape",
				type: "select",
				tooltip: this.locale.get("wallConnectionShapeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("rectangular"), value: "rectangle"},
					{label: this.locale.get("circular"), value: "circle"},
				],
			},
			{
				label: this.locale.get("wallHeight"),
				attribute: "height",
				type: "number",
				tooltip: this.locale.get("wallHeightTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("wallThickness"),
				attribute: "thickness",
				type: "number",
				tooltip: this.locale.get("wallThicknessTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("baseboardEnabled"),
				attribute: "baseboardEnabled",
				type: "boolean",
				tooltip: this.locale.get("baseboardEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("baseboardHeight"),
				attribute: "baseboardHeight",
				type: "number",
				tooltip: this.locale.get("baseboardHeightTooltip"),
				editable: !locked && this.selectedObject.baseboardEnabled,
				enabled: true,
				min: 0.01,
				step: 0.01,
			},
			{
				label: this.locale.get("baseboardDepth"),
				attribute: "baseboardDepth",
				type: "number",
				tooltip: this.locale.get("baseboardDepthTooltip"),
				editable: !locked && this.selectedObject.baseboardEnabled,
				enabled: true,
				min: 0,
				step: 0.005,
			},
			{
				label: this.locale.get("baseboardColor"),
				attribute: "baseboardColor",
				type: "color",
				tooltip: this.locale.get("baseboardColorTooltip"),
				editable: !locked && this.selectedObject.baseboardEnabled,
				enabled: true,
			},
		];
	}

	private getWallGeometryFields(locked: boolean): DynamicFormField[] {
		if (!(this.selectedObject instanceof WallObject)) {
			return [];
		}

		return [
			{
				label: this.locale.get("wallStartPoint"),
				attribute: "startPoint",
				type: "Vector3",
				tooltip: this.locale.get("wallStartPointTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("wallEndPoint"),
				attribute: "endPoint",
				type: "Vector3",
				tooltip: this.locale.get("wallEndPointTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("wallLength"),
				attribute: "length",
				type: "number",
				tooltip: this.locale.get("wallLengthTooltip"),
				editable: !locked,
				enabled: true,
				min: 0.001,
				step: 0.01,
			},
		];
	}

	private getWallGeometryData(): {
		startPoint: Vector3;
		endPoint: Vector3;
		length: number;
	} | null {
		const wall = this.selectedObject;
		const root = this.coordinateRoot;
		if (!(wall instanceof WallObject) || !root || !wall.parent) {
			return null;
		}

		root.updateWorldMatrix(true, false);
		wall.updateWorldMatrix(true, false);
		return {
			startPoint: root.worldToLocal(
				wall.localToWorld(new Vector3(-wall.length / 2, 0, 0)),
			),
			endPoint: root.worldToLocal(
				wall.localToWorld(new Vector3(wall.length / 2, 0, 0)),
			),
			length: wall.length,
		};
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
				label: this.locale.get("openingWidth"),
				attribute: "width",
				type: "number",
				tooltip: this.locale.get("openingWidthTooltip"),
				editable: !locked,
				enabled: true,
				min: 0.1,
				step: 0.01,
			},
			{
				label: this.locale.get("openingHeight"),
				attribute: "height",
				type: "number",
				tooltip: this.locale.get("openingHeightTooltip"),
				editable: !locked,
				enabled: true,
				min: 0.1,
				step: 0.01,
			},
			{
				label: this.locale.get("openingThickness"),
				attribute: "thickness",
				type: "number",
				tooltip: this.locale.get("openingThicknessTooltip"),
				editable: !locked,
				enabled: true,
				min: 0.01,
				step: 0.01,
			},
			{
				label: this.locale.get("openingEntityId"),
				attribute: "openEntityId",
				type: "entity",
				tooltip: this.locale.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "cover.living_room",
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("open"),
				attribute: "open",
				type: "boolean",
				tooltip: this.locale.get("openTooltip"),
				editable: !locked && !controlledByEntity,
				enabled: true,
			},
			{
				label: this.locale.get("openingAmount"),
				attribute: "openAmount",
				type: "number",
				tooltip: this.locale.get("openingAmountTooltip"),
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
				label: this.locale.get("doorOperationType"),
				attribute: "operationType",
				type: "select",
				tooltip: this.locale.get("doorOperationTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("hinged"), value: "hinged"},
					{label: this.locale.get("sliding"), value: "sliding"},
				],
			},
			{
				label: this.locale.get("doorPanelCount"),
				attribute: "panelCount",
				type: "select",
				tooltip: this.locale.get("doorPanelCountTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("single"), value: 1},
					{label: this.locale.get("double"), value: 2},
				],
			},
			{
				label:
					this.selectedObject.operationType === "sliding"
						? this.locale.get("slideSide")
						: this.locale.get("doorHingeSide"),
				attribute: "hingeSide",
				type: "select",
				tooltip:
					this.selectedObject.operationType === "sliding"
						? this.locale.get("slideSideTooltip")
						: this.locale.get("doorHingeSideTooltip"),
				editable: !locked && this.selectedObject.panelCount === 1,
				enabled: true,
				options: [
					{label: this.locale.get("left"), value: "left"},
					{label: this.locale.get("right"), value: "right"},
				],
			},
			{
				label: this.locale.get("doorOpeningDirection"),
				attribute: "openingDirection",
				type: "select",
				tooltip: this.locale.get("doorOpeningDirectionTooltip"),
				editable: !locked && this.selectedObject.operationType === "hinged",
				enabled: true,
				options: [
					{label: this.locale.get("inward"), value: "inward"},
					{label: this.locale.get("outward"), value: "outward"},
				],
			},
			{
				label: this.locale.get("doorKnobStyle"),
				attribute: "knobStyle",
				type: "select",
				tooltip: this.locale.get("doorKnobStyleTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("none"), value: "none"},
					{label: this.locale.get("round"), value: "round"},
					{label: this.locale.get("lever"), value: "lever"},
					{label: this.locale.get("bar"), value: "bar"},
				],
			},
			{
				label: this.locale.get("doorKnobColor"),
				attribute: "knobColor",
				type: "color",
				tooltip: this.locale.get("doorKnobColorTooltip"),
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
				label: this.locale.get("gateOperationType"),
				attribute: "operationType",
				type: "select",
				tooltip: this.locale.get("gateOperationTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("gateDoorStyle"), value: "hinged"},
					{label: this.locale.get("sliding"), value: "sliding"},
				],
			},
			{
				label: this.locale.get("gatePanelCount"),
				attribute: "panelCount",
				type: "select",
				tooltip: this.locale.get("gatePanelCountTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("single"), value: 1},
					{label: this.locale.get("double"), value: 2},
				],
			},
			{
				label:
					this.selectedObject.operationType === "sliding"
						? this.locale.get("slideSide")
						: this.locale.get("doorHingeSide"),
				attribute: "hingeSide",
				type: "select",
				tooltip:
					this.selectedObject.operationType === "sliding"
						? this.locale.get("slideSideTooltip")
						: this.locale.get("doorHingeSideTooltip"),
				editable: !locked && this.selectedObject.panelCount === 1,
				enabled: true,
				options: [
					{label: this.locale.get("left"), value: "left"},
					{label: this.locale.get("right"), value: "right"},
				],
			},
			{
				label: this.locale.get("doorOpeningDirection"),
				attribute: "openingDirection",
				type: "select",
				tooltip: this.locale.get("gateOpeningDirectionTooltip"),
				editable: !locked && this.selectedObject.operationType === "hinged",
				enabled: true,
				options: [
					{label: this.locale.get("inward"), value: "inward"},
					{label: this.locale.get("outward"), value: "outward"},
				],
			},
			{
				label: this.locale.get("gateStyle"),
				attribute: "style",
				type: "select",
				tooltip: this.locale.get("gateStyleTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("gateSolid"), value: "solid"},
					{
						label: this.locale.get("gateVerticalBars"),
						value: "verticalBars",
					},
				],
			},
			{
				label: this.locale.get("gateBarWidth"),
				attribute: "barWidth",
				type: "number",
				tooltip: this.locale.get("gateBarWidthTooltip"),
				editable: !locked && verticalBars,
				enabled: true,
				min: 0.01,
				step: 0.01,
			},
			{
				label: this.locale.get("gateBarSpacing"),
				attribute: "barSpacing",
				type: "number",
				tooltip: this.locale.get("gateBarSpacingTooltip"),
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
				label: this.locale.get("windowOpeningType"),
				attribute: "openingType",
				type: "select",
				tooltip: this.locale.get("windowOpeningTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("sliding"), value: "sliding"},
					{label: this.locale.get("hinged"), value: "hinged"},
				],
			},
			{
				label: this.locale.get("windowPanelCount"),
				attribute: "panelCount",
				type: "select",
				tooltip: this.locale.get("windowPanelCountTooltip"),
				editable: !locked && this.selectedObject.openingType === "hinged",
				enabled: true,
				options: [
					{label: this.locale.get("single"), value: 1},
					{label: this.locale.get("double"), value: 2},
				],
			},
			{
				label:
					this.selectedObject.openingType === "sliding"
						? this.locale.get("windowSlidingPanel")
						: this.locale.get("doorHingeSide"),
				attribute: "hingeSide",
				type: "select",
				tooltip:
					this.selectedObject.openingType === "sliding"
						? this.locale.get("windowSlidingPanelTooltip")
						: this.locale.get("doorHingeSideTooltip"),
				editable:
					!locked &&
					(this.selectedObject.openingType === "sliding" ||
						this.selectedObject.panelCount === 1),
				enabled: true,
				options: [
					{label: this.locale.get("left"), value: "left"},
					{label: this.locale.get("right"), value: "right"},
				],
			},
			{
				label: this.locale.get("openingDirection"),
				attribute: "openingDirection",
				type: "select",
				tooltip: this.locale.get("openingDirectionTooltip"),
				editable: !locked && this.selectedObject.openingType === "hinged",
				enabled: true,
				options: [
					{label: this.locale.get("inward"), value: "inward"},
					{label: this.locale.get("outward"), value: "outward"},
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
				label: this.locale.get("borderEnabled"),
				attribute: "borderEnabled",
				type: "boolean",
				tooltip: this.locale.get("borderEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("borderThickness"),
				attribute: widthAttribute,
				type: "number",
				tooltip: this.locale.get("borderThicknessTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 0.005,
				step: 0.005,
			},
			{
				label: this.locale.get("borderDepth"),
				attribute: "borderDepth",
				type: "number",
				tooltip: this.locale.get("borderDepthTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 0,
				step: 0.005,
			},
			{
				label: this.locale.get("borderColor"),
				attribute: "borderColor",
				type: "color",
				tooltip: this.locale.get("borderColorTooltip"),
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
				label: this.locale.get("doorWindowEnabled"),
				attribute: "windowEnabled",
				type: "boolean",
				tooltip: this.locale.get("doorWindowEnabledTooltip"),
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
				label: this.locale.get(label as string),
				attribute: attribute as string,
				type: "number" as const,
				tooltip: this.locale.get(`${label}Tooltip`),
				editable: !locked && enabled,
				enabled: true,
				step: step as number,
				min:
					attribute === "windowPositionX" || attribute === "windowPositionY"
						? undefined
						: 0.01,
			})),
			{
				label: this.locale.get("doorWindowColor"),
				attribute: "windowColor",
				type: "color",
				tooltip: this.locale.get("doorWindowColorTooltip"),
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: this.locale.get("doorWindowOpacity"),
				attribute: "windowOpacity",
				type: "number",
				tooltip: this.locale.get("doorWindowOpacityTooltip"),
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
				label: this.locale.get("glassColor"),
				attribute: "glassColor",
				type: "color",
				tooltip: this.locale.get("glassColorTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("glassOpacity"),
				attribute: "glassOpacity",
				type: "number",
				tooltip: this.locale.get("glassOpacityTooltip"),
				editable: !locked,
				enabled: true,
				min: 0,
				max: 1,
				step: 0.05,
			},
			{
				label: this.locale.get("glassRoughness"),
				attribute: "glassRoughness",
				type: "number",
				tooltip: this.locale.get("glassRoughnessTooltip"),
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
				label: this.locale.get("windowGridEnabled"),
				attribute: "gridEnabled",
				type: "boolean",
				tooltip: this.locale.get("windowGridEnabledTooltip"),
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
				label: this.locale.get(label as string),
				attribute: attribute as string,
				type: "number" as const,
				tooltip: this.locale.get(`${label}Tooltip`),
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
				label: this.locale.get("windowBlindsEnabled"),
				attribute: "blindsEnabled",
				type: "boolean",
				tooltip: this.locale.get("windowBlindsEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("windowBlindEntityId"),
				attribute: "blindOpenEntityId",
				type: "entity",
				tooltip: this.locale.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "cover.living_room_blind",
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: this.locale.get("windowBlindPlacement"),
				attribute: "blindPlacement",
				type: "select",
				tooltip: this.locale.get("windowBlindPlacementTooltip"),
				editable: !locked && enabled,
				enabled: true,
				options: [
					{label: this.locale.get("inside"), value: "inside"},
					{label: this.locale.get("outside"), value: "outside"},
				],
			},
			{
				label: this.locale.get("windowBlindPosition"),
				attribute: "blindPosition",
				type: "number",
				tooltip: this.locale.get("windowBlindPositionTooltip"),
				editable:
					!locked && enabled && !this.selectedObject.blindOpenEntityId,
				enabled: true,
				min: 0,
				max: 100,
				step: 5,
			},
			{
				label: this.locale.get("windowBlindSlatSpacing"),
				attribute: "blindSlatSpacing",
				type: "number",
				tooltip: this.locale.get("windowBlindSlatSpacingTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 0.02,
				step: 0.01,
			},
			{
				label: this.locale.get("windowBlindColor"),
				attribute: "blindColor",
				type: "color",
				tooltip: this.locale.get("windowBlindColorTooltip"),
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
				label: this.locale.get("windowShuttersEnabled"),
				attribute: "shuttersEnabled",
				type: "boolean",
				tooltip: this.locale.get("windowShuttersEnabledTooltip"),
				editable: !locked,
				enabled: true,
			},
			{
				label: this.locale.get("windowShutterEntityId"),
				attribute: "shutterOpenEntityId",
				type: "entity",
				tooltip: this.locale.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "cover.living_room_shutter",
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: this.locale.get("windowShutterPanelCount"),
				attribute: "shutterPanelCount",
				type: "select",
				tooltip: this.locale.get("windowShutterPanelCountTooltip"),
				editable: !locked && enabled,
				enabled: true,
				options: [
					{label: this.locale.get("single"), value: 1},
					{label: this.locale.get("double"), value: 2},
				],
			},
			{
				label: this.locale.get("windowShutterPlacement"),
				attribute: "shutterPlacement",
				type: "select",
				tooltip: this.locale.get("windowShutterPlacementTooltip"),
				editable: !locked && enabled,
				enabled: true,
				options: [
					{label: this.locale.get("outside"), value: "outside"},
					{label: this.locale.get("inside"), value: "inside"},
				],
			},
			{
				label: this.locale.get("windowShutterOpenAmount"),
				attribute: "shutterOpenAmount",
				type: "number",
				tooltip: this.locale.get("windowShutterOpenAmountTooltip"),
				editable:
					!locked && enabled && !this.selectedObject.shutterOpenEntityId,
				enabled: true,
				min: 0,
				max: 100,
				step: 5,
			},
			{
				label: this.locale.get("windowShutterBladeCount"),
				attribute: "shutterBladeCount",
				type: "number",
				tooltip: this.locale.get("windowShutterBladeCountTooltip"),
				editable: !locked && enabled,
				enabled: true,
				min: 1,
				max: 50,
				step: 1,
			},
			{
				label: this.locale.get("windowShutterBladeOpenAmount"),
				attribute: "shutterBladeOpenAmount",
				type: "number",
				tooltip: this.locale.get("windowShutterBladeOpenAmountTooltip"),
				editable:
					!locked && enabled && !this.selectedObject.shutterBladeOpenEntityId,
				enabled: true,
				min: 0,
				max: 100,
				step: 5,
			},
			{
				label: this.locale.get("windowShutterBladeEntityId"),
				attribute: "shutterBladeOpenEntityId",
				type: "entity",
				tooltip: this.locale.get("openingEntityIdTooltip"),
				entityFilter: OPENING_ENTITY_FILTER,
				placeholder: "number.living_room_shutter_blades",
				editable: !locked && enabled,
				enabled: true,
			},
			{
				label: this.locale.get("windowShutterColor"),
				attribute: "shutterColor",
				type: "color",
				tooltip: this.locale.get("windowShutterColorTooltip"),
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
			tooltip: this.locale.get("geometryParameterTooltip"),
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
			label: this.locale.get(definition.labelKey),
			attribute: definition.name,
			type: definition.type === "boolean" ? "boolean" : definition.type === "select" ? "select" : "number",
			options: definition.options?.map((option) => ({label: this.locale.get(option.labelKey), value: option.value})),
			tooltip: this.locale.get(definition.tooltipKey),
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
		const domain = this.selectedObject.entityId.split(".", 1)[0];
		const actionOptions = [
			{label: this.locale.get("cardDefaultAction"), value: "default"},
			{label: this.locale.get("openEntity"), value: "open"},
			...(isToggleable(this.selectedObject)
				? [{label: this.locale.get("toggleEntity"), value: "toggle"}]
				: []),
			{label: this.locale.get("nothing"), value: "nothing"},
		];

		return [
			{
				label: this.locale.get("entityId"),
				attribute: "entityId",
				type: "entity",
				tooltip: this.locale.get("entityIdDescription"),
				editable: !locked,
				enabled: true,
				entityFilter: `^${domain}\\.`,
			},
			{
				label: this.locale.get("entityName"),
				attribute: "entityName",
				type: "info",
				editable: false,
				enabled: true,
			},
			{
				label: this.locale.get("entityState"),
				attribute: "entityState",
				type: "info",
				editable: false,
				enabled: true,
			},
			...attributeFields,
			{
				label: this.locale.get("entityClickAction"),
				attribute: "clickAction",
				type: "select",
				tooltip: this.locale.get("entityClickActionDescription"),
				editable: !locked,
				enabled: true,
				options: actionOptions,
			},
			{
				label: this.locale.get("entityDoubleClickAction"),
				attribute: "doubleClickAction",
				type: "select",
				tooltip: this.locale.get("entityDoubleClickActionDescription"),
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
				label: this.locale.get("defaultViewport"),
				attribute: "defaultViewport",
				type: "boolean",
				tooltip: this.locale.get("defaultViewportTooltip"),
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
				label: this.locale.get("lightSourceType"),
				attribute: "sourceType",
				type: "select",
				tooltip: this.locale.get("lightSourceTypeTooltip"),
				editable: !locked,
				enabled: true,
				options: [
					{label: this.locale.get("ambientLight"), value: "ambient"},
					{label: this.locale.get("directionalLight"), value: "directional"},
					{label: this.locale.get("pointLight"), value: "point"},
					{label: this.locale.get("spotLight"), value: "spot"},
					{label: this.locale.get("rectAreaLight"), value: "rect-area"},
				],
			},
		];

		if (object instanceof StaticLightObject) {
			fields.push({
				label: this.locale.get("lightEnabled"),
				attribute: "enabled",
				type: "boolean",
				tooltip: this.locale.get("lightEnabledTooltip"),
				editable: !locked,
				enabled: true,
			});
			fields.push({
				label: this.locale.get("lightColor"),
				attribute: "color",
				type: "color",
				tooltip: this.locale.get("lightColorTooltip"),
				editable: !locked,
				enabled: true,
			});
		}

		fields.push({
			label: this.locale.get("lightIntensity"),
			attribute: "intensity",
			type: "number",
			tooltip: this.locale.get("lightIntensityTooltip"),
			editable: !locked,
			enabled: true,
			min: 0,
			step: 0.1,
		});

		if (object.sourceType === "point" || object.sourceType === "spot") {
			fields.push({
				label: this.locale.get("lightDistance"),
				attribute: "distance",
				type: "number",
				tooltip: this.locale.get("lightDistanceTooltip"),
				editable: !locked,
				enabled: true,
				min: 0,
				step: 0.1,
			});
			fields.push({
				label: this.locale.get("lightDecay"),
				attribute: "decay",
				type: "number",
				tooltip: this.locale.get("lightDecayTooltip"),
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
				label: this.locale.get("lightCastsShadows"),
				attribute: "castsShadows",
				type: "boolean",
				tooltip: this.locale.get("lightCastsShadowsTooltip"),
				editable: !locked,
				enabled: true,
			});
			fields.push({
				label: this.locale.get("lightShadowBias"),
				attribute: "shadowBias",
				type: "number",
				tooltip: this.locale.get("lightShadowBiasTooltip"),
				editable: !locked,
				enabled: true,
				step: 0.0001,
			});
		}

		if (object.sourceType === "spot") {
			fields.push(
				{
					label: this.locale.get("lightAngle"),
					attribute: "angle",
					type: "number",
					tooltip: this.locale.get("lightAngleTooltip"),
					editable: !locked,
					enabled: true,
					min: 1,
					max: 90,
					step: 1,
				},
				{
					label: this.locale.get("lightPenumbra"),
					attribute: "penumbra",
					type: "number",
					tooltip: this.locale.get("lightPenumbraTooltip"),
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
					label: this.locale.get("lightWidth"),
					attribute: "width",
					type: "number",
					tooltip: this.locale.get("lightWidthTooltip"),
					editable: !locked,
					enabled: true,
					min: 0.01,
					step: 0.1,
				},
				{
					label: this.locale.get("lightHeight"),
					attribute: "height",
					type: "number",
					tooltip: this.locale.get("lightHeightTooltip"),
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
			this.locale.get("configuration"),
			this.getBaseFields(locked),
		);
		this.addSubFormField(
			fields,
			"transform",
			this.locale.get("transform"),
			this.getTransformFields(locked),
		);
		const addAppearanceFields = () => {
			this.addSubFormField(
				fields,
				"shadows",
				this.locale.get("shadows"),
				this.getShadowFields(locked),
			);
			this.addSubFormField(
				fields,
				"material",
				this.locale.get("material"),
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
			this.locale.get("wall"),
			this.getWallFields(locked),
		);
		this.addSubFormField(
			fields,
			"wallGeometry",
			this.locale.get("wallGeometry"),
			this.getWallGeometryFields(locked),
			this.getWallGeometryData(),
		);
		this.addSubFormField(
			fields,
			"opening",
			this.selectedObject instanceof GateObject
				? this.locale.get("gate")
				: this.selectedObject instanceof DoorObject
					? this.locale.get("door")
					: this.locale.get("window"),
			this.getOpeningFields(locked),
		);
		this.addSubFormField(
			fields,
			"gate",
			this.locale.get("gateConfiguration"),
			this.getGateFields(locked),
		);
		this.addSubFormField(
			fields,
			"doorHardware",
			this.locale.get("doorHardware"),
			this.getDoorHardwareFields(locked),
		);
		this.addSubFormField(
			fields,
			"border",
			this.locale.get("border"),
			this.getBorderFields(locked),
		);
		this.addSubFormField(
			fields,
			"doorWindow",
			this.locale.get("doorWindow"),
			this.getDoorWindowFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowGlass",
			this.locale.get("windowGlass"),
			this.getWindowGlassFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowOperation",
			this.locale.get("windowOperation"),
			this.getWindowOperationFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowGrid",
			this.locale.get("windowGrid"),
			this.getWindowGridFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowBlinds",
			this.locale.get("windowBlinds"),
			this.getWindowBlindFields(locked),
		);
		this.addSubFormField(
			fields,
			"windowShutters",
			this.locale.get("windowShutters"),
			this.getWindowShutterFields(locked),
		);
		this.addSubFormField(
			fields,
			"furniture",
			this.selectedObject instanceof FurnitureObject
				? this.locale.get(this.selectedObject.editorLabelKey)
				: this.locale.get("furnitureDimensions"),
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
			this.locale.get("geometry"),
			this.getGeometryFields(locked),
			geometryData,
		);
		this.addSubFormField(
			fields,
			"light",
			this.locale.get("lighting"),
			this.getLightFields(locked),
		);
		this.addSubFormField(
			fields,
			"viewport",
			this.locale.get("viewport"),
			this.getViewportFields(locked),
		);
		this.addSubFormField(
			fields,
			"entity",
			this.locale.get("entity"),
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

		this.addSubFormField(fields, "wall", this.locale.get("wall"), this.getWallFields(locked));
		this.addSubFormField(
			fields,
			"opening",
			this.selectedObject instanceof GateObject
				? this.locale.get("gate")
				: this.selectedObject instanceof DoorObject
					? this.locale.get("door")
					: this.locale.get("window"),
			this.getOpeningFields(locked),
		);
		this.addSubFormField(fields, "gate", this.locale.get("gateConfiguration"), this.getGateFields(locked));
		this.addSubFormField(fields, "doorHardware", this.locale.get("doorHardware"), this.getDoorHardwareFields(locked));
		this.addSubFormField(fields, "border", this.locale.get("border"), this.getBorderFields(locked));
		this.addSubFormField(fields, "doorWindow", this.locale.get("doorWindow"), this.getDoorWindowFields(locked));
		this.addSubFormField(fields, "windowGlass", this.locale.get("windowGlass"), this.getWindowGlassFields(locked));
		this.addSubFormField(fields, "windowOperation", this.locale.get("windowOperation"), this.getWindowOperationFields(locked));
		this.addSubFormField(fields, "windowGrid", this.locale.get("windowGrid"), this.getWindowGridFields(locked));
		this.addSubFormField(fields, "windowBlinds", this.locale.get("windowBlinds"), this.getWindowBlindFields(locked));
		this.addSubFormField(fields, "windowShutters", this.locale.get("windowShutters"), this.getWindowShutterFields(locked));
		this.addSubFormField(fields, "material", this.locale.get("material"), colorFields, materialData);

		return this.markMixedFields(fields, objects);
	}

	public render() {
		if (this.selectedMaterial) {
			return html`
				<h4>${this.locale.get("selectedMaterial")}</h4>
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
					<h4>${this.locale.get("multipleObjectsSelected")}</h4>
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
					${this.locale.get("multipleObjectsSelected")}
				</div>
			`;
		}

		const locked = this.isLocked();
		const inspectorFields = this.getInspectorFields(locked);

		return html`
			<h4>${this.locale.get("selectedObject")}</h4>
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
								${this.locale.get("entityRules")}
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
									${this.locale.get("objectLocked")}
								</div>`
							: null}
					`
				: html`<div class="placeholder">
						${this.locale.get("selectObjectPrompt")}
					</div>`}
		`;
	}
}
