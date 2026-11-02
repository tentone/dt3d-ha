import type {BufferGeometry} from "three";
import {BoxGeometry, Group, Light, Mesh, MeshStandardMaterial} from "three";

import {markObjectInternal} from "../../utils/internal-object.js";
import {DTObject} from "../dt-object.js";

export type FurnitureType =
	| "table"
	| "chair"
	| "couch"
	| "bathtub"
	| "shelf"
	| "cabinet"
	| "standing-desk"
	| "wardrobe"
	| "bed"
	| "kitchen-cabinet-top"
	| "kitchen-cabinet-bottom"
	| "living-table"
	| "accent-chair"
	| "ottoman"
	| "living-storage"
	| "television"
	| "projector"
	| "projection-screen"
	| "speaker-system"
	| "lamp"
	| "rug"
	| "mirror"
	| "indoor-plant"
	| "vase"
	| "artwork"
	| "wall-clock"
	| "fireplace"
	| "curtains"
	| "sanitary-fixture"
	| "washbasin"
	| "shower"
	| "bathroom-storage"
	| "towel-rail"
	| "bathroom-accessory"
	| "laundry-basket"
	| "bathroom-stool"
	| "bath-mat"
	| "dining-table"
	| "dining-seating"
	| "dining-storage"
	| "dining-light"
	| "centerpiece"
	| "kitchen-tall-cabinet"
	| "kitchen-countertop"
	| "kitchen-refrigerator"
	| "kitchen-oven"
	| "kitchen-hob"
	| "kitchen-hood"
	| "kitchen-cleaning-appliance"
	| "kitchen-coffee-machine"
	| "kitchen-sink"
	| "kitchen-faucet"
	| "kitchen-bin"
	| "kitchen-trolley"
	| "kitchen-accessories"
	| "bedside"
	| "bedside-lamp"
	| "bedroom-storage"
	| "bedroom-bench"
	| "bedroom-vanity"
	| "nursery-bed"
	| "nursery-storage"
	| "changing-table"
	| "nursery-chair"
	| "kids-table"
	| "kids-chair"
	| "play-mat"
	| "playpen"
	| "indoor-tent"
	| "toy-kitchen"
	| "climbing-frame"
	| "night-light"
	| "nursery-wall-shelves"
	| "office-desk"
	| "office-chair"
	| "office-storage"
	| "desktop-computer"
	| "office-monitor"
	| "office-laptop"
	| "office-printer"
	| "office-desk-lamp"
	| "monitor-stand"
	| "office-board"
	| "meeting-table"
	| "laundry-appliance"
	| "utility-sink"
	| "laundry-storage"
	| "laundry-worktable"
	| "laundry-sorting-station"
	| "clothes-drying-rack"
	| "cleaning-trolley"
	| "closet-wardrobe"
	| "closet-storage"
	| "dressing-island"
	| "dressing-mirror"
	| "clothes-stand"
	| "garage-car"
	| "garage-cycle"
	| "garage-storage"
	| "garage-workbench"
	| "tool-pegboard"
	| "ev-charger"
	| "garage-equipment"
	| "garage-bins"
	| "garage-boxes"
	| "outdoor-chair"
	| "outdoor-sofa"
	| "suspended-seat"
	| "outdoor-table"
	| "outdoor-grill"
	| "outdoor-kitchen"
	| "pizza-oven"
	| "parasol"
	| "pergola"
	| "retractable-awning"
	| "outdoor-planter"
	| "hot-tub"
	| "fire-pit"
	| "outdoor-heater";

export type FurnitureParameters = Record<string, number | boolean | string>;

export type FurnitureParameterDefinition = {
	name: string;
	labelKey: string;
	tooltipKey: string;
	type: "number" | "integer" | "boolean" | "select";
	defaultValue: number | boolean | string;
	options?: {
		value: string;
		labelKey: string;
		parameters?: Partial<FurnitureParameters>;
	}[];
	min?: number;
	max?: number;
	step?: number;
};

export const furnitureNumber = (
	name: string,
	labelKey: string,
	tooltipKey: string,
	defaultValue: number,
	min: number,
	max?: number,
	step = 0.01,
): FurnitureParameterDefinition => ({
	name,
	labelKey,
	tooltipKey,
	type: "number",
	defaultValue,
	min,
	max,
	step,
});

export const furnitureInteger = (
	name: string,
	labelKey: string,
	tooltipKey: string,
	defaultValue: number,
	min: number,
	max: number,
): FurnitureParameterDefinition => ({
	name,
	labelKey,
	tooltipKey,
	type: "integer",
	defaultValue,
	min,
	max,
	step: 1,
});

export const furnitureBoolean = (
	name: string,
	labelKey: string,
	tooltipKey: string,
	defaultValue: boolean,
): FurnitureParameterDefinition => ({
	name,
	labelKey,
	tooltipKey,
	type: "boolean",
	defaultValue,
});

export const furnitureSelect = (
	name: string,
	labelKey: string,
	tooltipKey: string,
	defaultValue: string,
	options: NonNullable<FurnitureParameterDefinition["options"]>,
): FurnitureParameterDefinition => ({
	name,
	labelKey,
	tooltipKey,
	type: "select",
	defaultValue,
	options,
});

function normalizeParameters(
	definitions: FurnitureParameterDefinition[],
	parameters: Partial<FurnitureParameters>,
): FurnitureParameters {
	const presets = Object.assign(
		{},
		...definitions
			.filter((item) => item.type === "select")
			.map(
				(definition) =>
					definition.options?.find(
						(option) =>
							option.value ===
							(parameters[definition.name] ?? definition.defaultValue),
					)?.parameters ?? {},
			),
	);
	const values = {...presets, ...parameters};
	return Object.fromEntries(
		definitions.map((definition) => {
			const value = values[definition.name] ?? definition.defaultValue;
			if (definition.type === "select") {
				return [
					definition.name,
					definition.options?.some((option) => option.value === value)
						? value
						: definition.defaultValue,
				];
			}
			if (definition.type === "boolean") {
				return [definition.name, Boolean(value)];
			}

			const numericValue = Number(value);
			const fallback = Number(definition.defaultValue);
			let normalized = Number.isFinite(numericValue) ? numericValue : fallback;
			if (definition.min !== undefined) {
				normalized = Math.max(definition.min, normalized);
			}
			if (definition.max !== undefined) {
				normalized = Math.min(definition.max, normalized);
			}
			if (definition.type === "integer") {
				normalized = Math.round(normalized);
			}
			return [definition.name, normalized];
		}),
	);
}

function disposeGroupGeometry(group: Group): void {
	for (const child of [...group.children]) {
		child.traverse((object) => {
			if (object instanceof Mesh) {
				object.geometry.dispose();
			}
			if (object instanceof Light) object.dispose();
		});
		group.remove(child);
	}
}

/** Shared lifecycle, material, cloning, and parameter behavior for furniture. */
export abstract class FurnitureObject extends DTObject {
	public readonly furnitureType: FurnitureType;

	public readonly editorLabelKey: string;

	public readonly parameterDefinitions: FurnitureParameterDefinition[];

	public parameters: FurnitureParameters;

	public furnitureMesh: Mesh;

	protected partsGroup: Group;
	private bodyMaterial: Mesh["material"];
	private accentMaterials = new Map<string, MeshStandardMaterial>();

	protected constructor(
		type: FurnitureType,
		name: string,
		editorLabelKey: string,
		definitions: FurnitureParameterDefinition[],
		parameters: Partial<FurnitureParameters>,
		color: number,
		roughness = 0.72,
	) {
		super();
		this.furnitureType = type;
		this.editorLabelKey = editorLabelKey;
		this.parameterDefinitions = definitions;
		this.parameters = normalizeParameters(definitions, parameters);
		this.name = name;
		this.userData.meshType = `furniture-${type}`;

		this.partsGroup = markObjectInternal(new Group());
		this.partsGroup.name = `${name} Parts`;
		this.add(this.partsGroup);

		this.rebuild(
			new MeshStandardMaterial({
				color,
				metalness: 0,
				roughness,
			}),
		);
	}

	public getParameters(): FurnitureParameters {
		return {...this.parameters};
	}

	public setConfiguration(attribute: string, value: unknown): boolean {
		const definition = this.parameterDefinitions.find(
			(item) => item.name === attribute,
		);
		if (!definition) {
			return false;
		}

		this.parameters = normalizeParameters(this.parameterDefinitions, {
			...this.parameters,
			...(this.parameters[attribute] !== value
				? definition.options?.find((option) => option.value === value)
					?.parameters
				: {}),
			[attribute]: value as number | boolean | string,
		});
		this.rebuild(this.furnitureMesh.material);
		return true;
	}

	/** Restore a full configuration, including dimensions changed by a variant preset. */
	public setParameters(parameters: Partial<FurnitureParameters>): void {
		this.parameters = normalizeParameters(
			this.parameterDefinitions,
			parameters,
		);
		this.rebuild(this.furnitureMesh.material);
	}

	public override update(_time: number): void {
		const material = this.furnitureMesh?.material;
		if (!material) return;
		this.partsGroup.traverse((object) => {
			if (
				object instanceof Mesh &&
				!object.userData.furnitureAccent &&
				object.material !== material
			) {
				object.material = material;
			}
		});
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		if (source instanceof FurnitureObject) {
			this.parameters = normalizeParameters(
				this.parameterDefinitions,
				source.getParameters(),
			);
			this.name = source.name;
			this.userData.meshType = `furniture-${this.furnitureType}`;
			const material = Array.isArray(source.furnitureMesh.material)
				? source.furnitureMesh.material.map((item) => item.clone())
				: source.furnitureMesh.material.clone();
			this.rebuild(material);
		}

		if (recursive) {
			for (const child of source.children) {
				if (child === source.partsGroup || child.internal === true) {
					continue;
				}
				this.add(child.clone(true));
			}
		}
		return this;
	}

	public override dispose(): void {
		disposeGroupGeometry(this.partsGroup);
		this.disposeAccents();
	}

	protected abstract buildFurniture(material: Mesh["material"]): void;

	protected addBox(
		name: string,
		size: [number, number, number],
		position: [number, number, number],
		material: Mesh["material"],
	): Mesh {
		return this.addGeometry(name, new BoxGeometry(...size), position, material);
	}

	protected addGeometry(
		name: string,
		geometry: BufferGeometry,
		position: [number, number, number],
		material: Mesh["material"],
	): Mesh {
		const mesh = markObjectInternal(new Mesh(geometry, material));
		mesh.name = name;
		mesh.position.set(...position);
		this.partsGroup.add(mesh);
		mesh.userData.furnitureAccent = material !== this.bodyMaterial;
		if (!mesh.userData.furnitureAccent) this.furnitureMesh ??= mesh;
		return mesh;
	}

	/** Detail finishes belong to this model and survive primary material edits. */
	protected accent(
		color: number,
		roughness = 0.65,
		metalness = 0,
		opacity = 1,
		emissive = false,
	): MeshStandardMaterial {
		const key = `${color}:${roughness}:${metalness}:${opacity}:${emissive}`;
		let material = this.accentMaterials.get(key);
		if (!material) {
			material = new MeshStandardMaterial({
				color,
				roughness,
				metalness,
				opacity,
				transparent: opacity < 1,
				depthWrite: opacity >= 1,
			});
			if (emissive) {
				material.emissive.setHex(color);
				material.emissiveIntensity = 0.7;
			}
			this.accentMaterials.set(key, material);
		}
		return material;
	}

	private disposeAccents(): void {
		this.accentMaterials.forEach((material) => material.dispose());
		this.accentMaterials.clear();
	}

	private rebuild(material: Mesh["material"]): void {
		disposeGroupGeometry(this.partsGroup);
		this.disposeAccents();
		this.bodyMaterial = material;
		this.furnitureMesh = null;
		this.buildFurniture(material);
		markObjectInternal(this.partsGroup, true);
		this.furnitureMesh.userData.ownerMaterialTarget = true;
	}
}
