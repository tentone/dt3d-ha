import type {Mesh} from "three";
import {Vector3} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
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
		`dining${label}`,
		`dining${label}Hint`,
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
		`dining${label}`,
		`dining${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `dining${label}`, `dining${label}Hint`, value);
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
		`dining${label}`,
		`dining${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `diningOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class DiningObject extends ProceduralFurnitureObject {
	protected rod(
		name: string,
		start: [number, number, number],
		end: [number, number, number],
		radius: number,
		material: Mesh["material"],
	): Mesh {
		const a = new Vector3(...start),
			b = new Vector3(...end),
			delta = b.clone().sub(a);
		const mesh = this.cylinder(
			name,
			radius,
			radius,
			delta.length(),
			a.clone().add(b).multiplyScalar(0.5).toArray(),
			material,
			16,
		);
		mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize());
		return mesh;
	}
	protected glass(
		name: string,
		size: [number, number, number],
		position: [number, number, number],
		opacity: number,
	): Mesh {
		const mesh = this.rounded(
			name,
			size,
			position,
			this.accent(0xb6d4da, 0.12, 0.08, opacity),
			0.001,
		);
		initializeMeshShadowSettings(mesh, {
			castShadow: false,
			receiveShadow: false,
		});
		return mesh;
	}
}
