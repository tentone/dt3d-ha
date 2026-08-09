import {BoxGeometry, Group, Mesh, MeshStandardMaterial} from "three";

import {markObjectInternal} from "../../utils/internal-object.js";
import {DTObject} from "../dt-object.js";

export type FurnitureType =
	| "table"
	| "chair"
	| "couch"
	| "bathtub"
	| "shelf"
	| "cabinet";

export type FurnitureParameters = Record<string, number | boolean>;

export type FurnitureParameterDefinition = {
	name: string;
	labelKey: string;
	tooltipKey: string;
	type: "number" | "integer" | "boolean";
	defaultValue: number | boolean;
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

function normalizeParameters(
	definitions: FurnitureParameterDefinition[],
	parameters: Partial<FurnitureParameters>,
): FurnitureParameters {
	return Object.fromEntries(
		definitions.map((definition) => {
			const value = parameters[definition.name] ?? definition.defaultValue;
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

	private partsGroup: Group;

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
		if (!this.parameterDefinitions.some((item) => item.name === attribute)) {
			return false;
		}

		this.parameters = normalizeParameters(this.parameterDefinitions, {
			...this.parameters,
			[attribute]: value as number | boolean,
		});
		this.rebuild(this.furnitureMesh.material);
		return true;
	}

	public override update(_time: number): void {
		const material = this.furnitureMesh?.material;
		if (!material) return;
		this.partsGroup.traverse((object) => {
			if (object instanceof Mesh && object.material !== material) {
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
	}

	protected abstract buildFurniture(material: Mesh["material"]): void;

	protected addBox(
		name: string,
		size: [number, number, number],
		position: [number, number, number],
		material: Mesh["material"],
	): Mesh {
		const mesh = markObjectInternal(
			new Mesh(new BoxGeometry(...size), material),
		);
		mesh.name = name;
		mesh.position.set(...position);
		this.partsGroup.add(mesh);
		this.furnitureMesh ??= mesh;
		return mesh;
	}

	private rebuild(material: Mesh["material"]): void {
		disposeGroupGeometry(this.partsGroup);
		this.furnitureMesh = null;
		this.buildFurniture(material);
		markObjectInternal(this.partsGroup, true);
		this.furnitureMesh.userData.ownerMaterialTarget = true;
	}
}
