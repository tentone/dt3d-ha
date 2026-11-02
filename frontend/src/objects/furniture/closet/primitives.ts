import type {Mesh} from "three";
import {TorusGeometry} from "three";

import {BedroomObject} from "../bedroom/primitives.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	furnitureSelect,
} from "../furniture.js";

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
		`closet${label}`,
		`closet${label}Hint`,
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
		`closet${label}`,
		`closet${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `closet${label}`, `closet${label}Hint`, value);
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
		`closet${label}`,
		`closet${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `closetOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class ClosetObject extends BedroomObject {
	protected hangingClothes(
		x: number,
		y: number,
		z: number,
		width: number,
		drop: number,
		count: number,
	): void {
		const r = Math.min(width, drop) * 0.016,
			metal = this.accent(0x8a8c7d, 0.3, 0.7),
			hw = (width / Math.max(2, count + 1)) * 0.42;
		for (let i = 0; i < count; i++) {
			const cx = x + ((i + 0.5) / count - 0.5) * width * 0.85;
			this.addGeometry(
				"Closet Hanger Hook",
				new TorusGeometry(hw * 0.16, r * 0.25, 6, 20, Math.PI * 1.6),
				[cx, y - hw * 0.08, z],
				metal,
			);
			this.rail(
				"Closet Hanger",
				[cx - hw, y - hw * 0.5, z],
				[cx, y - hw * 0.18, z],
				r * 0.25,
				metal,
			);
			this.rail(
				"Closet Hanger",
				[cx, y - hw * 0.18, z],
				[cx + hw, y - hw * 0.5, z],
				r * 0.25,
				metal,
			);
			this.rail(
				"Closet Hanger",
				[cx - hw, y - hw * 0.5, z],
				[cx + hw, y - hw * 0.5, z],
				r * 0.25,
				metal,
			);
			this.rounded(
				"Closet Garment",
				[hw * 1.7, drop, Math.max(0.002, hw * 0.22)],
				[cx, y - hw * 0.5 - drop / 2, z],
				this.accent([0xb5c2ba, 0xd0bda1, 0x9aaec0, 0xb7a4a4][i % 4], 0.98),
				0.012,
			);
		}
	}
	protected drawer(
		name: string,
		x: number,
		y: number,
		z: number,
		width: number,
		height: number,
		depth: number,
		thickness: number,
		extension: number,
		material: Mesh["material"],
	): void {
		const front = z + extension * depth * 0.65;
		this.rounded(
			`${name} Front`,
			[width * 0.97, height * 0.95, thickness],
			[x, y, front],
			material,
			0.004,
		);
		this.rounded(
			`${name} Handle`,
			[width * 0.34, thickness * 0.45, thickness],
			[x, y, front + thickness],
			this.accent(0x777b70, 0.3, 0.6),
			0.003,
		);
		if (extension > 0) {
			this.addBox(
				`${name} Bottom`,
				[width * 0.91, thickness * 0.4, depth * 0.7],
				[x, y - height * 0.35, front - depth * 0.35],
				material,
			);
			for (const side of [-1, 1])
				this.addBox(
					`${name} Side`,
					[thickness * 0.5, height * 0.6, depth * 0.7],
					[x + side * width * 0.455, y - height * 0.05, front - depth * 0.35],
					material,
				);
		}
	}
}
