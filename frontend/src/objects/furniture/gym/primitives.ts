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
import {furnitureDimensions} from "../procedural-furniture.js";

export const dimensions = (
	w: number,
	d: number,
	h: number,
	minimum: [number, number, number] = [0.3, 0.3, 0.3],
) =>
	furnitureDimensions(w, d, h).map((definition, index) => ({
		...definition,
		min: minimum[index],
	}));
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
		`gym${label}`,
		`gym${label}Hint`,
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
) => furnitureInteger(name, `gym${label}`, `gym${label}Hint`, value, min, max);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `gym${label}`, `gym${label}Hint`, value);
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
		`gym${label}`,
		`gym${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `gymOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

/** Gym frames, pads, and equipment share the furniture ownership and disposal lifecycle. */
export abstract class GymObject extends BedroomObject {
	protected steel() {
		return this.accent(0x727f86, 0.4, 0.65);
	}
	protected rubber() {
		return this.accent(0x303c43, 0.92);
	}
	protected trim() {
		return this.accent(0x79aaa7, 0.72);
	}
	protected axle(
		name: string,
		radius: number,
		length: number,
		position: [number, number, number],
		material: Mesh["material"],
	): Mesh {
		const mesh = this.cylinder(
			name,
			radius,
			radius,
			length,
			position,
			material,
			32,
		);
		mesh.rotation.z = Math.PI / 2;
		return mesh;
	}
	protected ring(
		name: string,
		radius: number,
		tube: number,
		position: [number, number, number],
		material: Mesh["material"],
	): Mesh {
		return this.addGeometry(
			name,
			new TorusGeometry(Math.max(0.001, radius), Math.max(0.0005, tube), 8, 32),
			position,
			material,
		);
	}
	protected foot(x: number, z: number, w: number, d: number, t: number): void {
		this.rounded(
			"Gym Floor Foot",
			[w, t, d],
			[x, t / 2, z],
			this.rubber(),
			0.008,
		);
	}
	protected console(
		w: number,
		h: number,
		x: number,
		y: number,
		z: number,
		on: boolean,
	): void {
		const before = this.partsGroup.children.length,
			t = Math.min(w, h) * 0.12;
		this.rounded("Fitness Console", [w, h, t], [x, y, z], this.rubber(), 0.01);
		this.rounded(
			"Fitness Display",
			[w * 0.76, h * 0.68, t * 0.12],
			[x, y + h * 0.05, z + t * 0.57],
			this.accent(on ? 0x80afbd : 0x3d4c53, 0.4, 0, 1, on),
			0.003,
		);
		if (on)
			for (let i = 0; i < 3; i++)
				this.rounded(
					"Fitness Display Reading",
					[w * 0.14, h * 0.07, t * 0.04],
					[x + (i - 1) * w * 0.23, y, z + t * 0.65],
					this.accent(0xc8ded2, 0.6, 0, 1, true),
					0.001,
				);
		this.hingeParts(
			"Fitness Console Tilt",
			this.partsGroup.children.slice(before),
			[x, y, z],
			-0.25,
			"x",
		);
	}
	protected dumbbell(
		x: number,
		y: number,
		z: number,
		width: number,
		radius: number,
	): void {
		this.axle(
			"Dumbbell Handle",
			radius * 0.18,
			width,
			[x, y + radius, z],
			this.steel(),
		);
		for (const side of [-1, 1]) {
			this.axle(
				"Dumbbell Weight",
				radius,
				width * 0.23,
				[x + side * width * 0.34, y + radius, z],
				this.rubber(),
			);
			this.axle(
				"Dumbbell End Cap",
				radius * 0.42,
				width * 0.015,
				[x + side * width * 0.46, y + radius, z],
				this.trim(),
			);
		}
	}
	protected kettlebell(x: number, y: number, z: number, radius: number): void {
		this.ellipsoid(
			"Kettlebell Body",
			[radius, radius, radius * 0.86],
			[x, y + radius, z],
			this.rubber(),
		);
		this.ring(
			"Kettlebell Handle",
			radius * 0.65,
			radius * 0.15,
			[x, y + radius * 2, z],
			this.steel(),
		);
		this.rounded(
			"Kettlebell Marker",
			[radius * 0.6, radius * 0.35, radius * 0.06],
			[x, y + radius, z + radius * 0.85],
			this.trim(),
			0.004,
		);
	}
}
