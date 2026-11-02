import type {Mesh, Object3D} from "three";
import {Group, Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	furnitureSelect,
} from "../furniture.js";
import {ProceduralFurnitureObject} from "../procedural-furniture.js";

export {furnitureDimensions as dimensions} from "../procedural-furniture.js";
export const number = (
	name: string,
	label: string,
	value: number,
	min: number,
	max: number,
	step = 0.01,
) =>
	furnitureNumber(
		name,
		`bedroom${label}`,
		`bedroom${label}Hint`,
		value,
		min,
		max,
		step,
	);
export const integer = (
	name: string,
	label: string,
	value: number,
	min: number,
	max: number,
) =>
	furnitureInteger(
		name,
		`bedroom${label}`,
		`bedroom${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `bedroom${label}`, `bedroom${label}Hint`, value);
export const choice = (
	name: string,
	label: string,
	value: string,
	options: (
		| string
		| { value: string; parameters: Partial<FurnitureParameters> }
	)[],
) =>
	furnitureSelect(
		name,
		`bedroom${label}`,
		`bedroom${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `bedroomOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class BedroomObject extends ProceduralFurnitureObject {
	protected hingeParts(
		name: string,
		meshes: Object3D[],
		position: [number, number, number],
		angle: number,
		axis: "x" | "y" | "z" = "y",
	): Group {
		const group = new Group();
		group.name = name;
		group.position.set(...position);
		this.partsGroup.add(group);
		for (const mesh of meshes) {
			mesh.position.sub(group.position);
			group.add(mesh);
		}
		group.rotation[axis] = angle;
		return group;
	}
	protected rail(
		name: string,
		from: [number, number, number],
		to: [number, number, number],
		radius: number,
		material: Mesh["material"],
	): Mesh {
		const start = new Vector3(...from),
			end = new Vector3(...to),
			direction = end.clone().sub(start);
		const mesh = this.cylinder(
			name,
			radius,
			radius,
			Math.max(0.001, direction.length()),
			start.clone().add(end).multiplyScalar(0.5).toArray(),
			material,
			16,
		);
		if (direction.lengthSq() > 0)
			mesh.quaternion.setFromUnitVectors(
				new Vector3(0, 1, 0),
				direction.normalize(),
			);
		return mesh;
	}
}
