import type {Mesh} from "three";
import {CircleGeometry} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	furnitureSelect,
} from "../furniture.js";
import {PatioObject} from "../patio/primitives.js";

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
		`garden${label}`,
		`garden${label}Hint`,
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
		`garden${label}`,
		`garden${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `garden${label}`, `garden${label}Hint`, value);
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
		`garden${label}`,
		`garden${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `gardenOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class GardenObject extends PatioObject {
	protected water(
		name: string,
		width: number,
		depth: number,
		y: number,
		round: boolean,
	): void {
		const material = this.accent(0x6babb6, 0.18, 0.1, 0.65),
			mesh = round
				? this.addGeometry(name, new CircleGeometry(1, 64), [0, y, 0], material)
				: this.addBox(name, [width, 0.002, depth], [0, y, 0], material);
		if (round) {
			mesh.rotation.x = -Math.PI / 2;
			mesh.scale.set(width / 2, depth / 2, 1);
		}
		initializeMeshShadowSettings(mesh, {
			castShadow: false,
			receiveShadow: false,
		});
	}
	protected roof(
		w: number,
		d: number,
		eave: number,
		rise: number,
		t: number,
		material: Mesh["material"],
		name = "Garden Roof",
	): void {
		for (const side of [-1, 1])
			this.rounded(
				name,
				[Math.hypot(w / 2, rise) * 1.04, t, d * 1.06],
				[(side * w) / 4, eave + rise / 2, 0],
				material,
				0.003,
			).rotation.z = -side * Math.atan2(rise, w / 2);
	}
	protected seat(
		x: number,
		z: number,
		width: number,
		depth: number,
		height: number,
		back: boolean,
		material: Mesh["material"],
	): void {
		const t = Math.min(width, depth, height) * 0.07;
		for (let i = 0; i < 4; i++)
			this.rounded(
				"Garden Seat Slat",
				[width, t, (depth / 4) * 0.88],
				[x, height - t / 2, z + ((i + 0.5) / 4 - 0.5) * depth],
				material,
				0.003,
			);
		for (const dx of [-1, 1])
			for (const dz of [-1, 1])
				this.rounded(
					"Garden Seat Leg",
					[t, height - t, t],
					[
						x + dx * (width / 2 - t),
						(height - t) / 2,
						z + dz * (depth / 2 - t),
					],
					material,
					0.003,
				);
		if (back) {
			for (let i = 0; i < 3; i++)
				this.rounded(
					"Garden Seat Back Slat",
					[width, height * 0.15, t],
					[x, height + height * (i + 0.5) * 0.2, z - depth / 2],
					material,
					0.003,
				);
			for (const side of [-1, 1])
				this.rounded(
					"Garden Seat Back Post",
					[t, height * 0.68, t],
					[x + side * (width / 2 - t), height * 1.3, z - depth / 2],
					material,
					0.003,
				);
		}
	}
}
