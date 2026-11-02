import type {Mesh} from "three";
import {ExtrudeGeometry, Path, Shape, Vector2} from "three";

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
		`office${label}`,
		`office${label}Hint`,
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
		`office${label}`,
		`office${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `office${label}`, `office${label}Hint`, value);
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
		`office${label}`,
		`office${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `officeOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class OfficeObject extends BedroomObject {
	protected planTop(
		name: string,
		points: [number, number][],
		thickness: number,
		y: number,
		material: Mesh["material"],
		grommet?: { x: number; z: number; radius: number },
	): void {
		const shape = new Shape(points.map(([x, z]) => new Vector2(x, -z)));
		if (grommet) {
			const hole = new Path();
			hole.absarc(grommet.x, -grommet.z, grommet.radius, 0, Math.PI * 2, false);
			shape.holes.push(hole);
		}
		const geometry = new ExtrudeGeometry(shape, {
			depth: thickness,
			bevelEnabled: false,
			curveSegments: 24,
		});
		geometry.rotateX(-Math.PI / 2);
		this.addGeometry(name, geometry, [0, y, 0], material);
	}
	protected screen(
		name: string,
		w: number,
		h: number,
		t: number,
		position: [number, number, number],
		material: Mesh["material"],
		enabled: boolean,
	): void {
		this.rounded(`${name} Bezel`, [w, h, t], position, material, 0.008);
		this.rounded(
			`${name} Screen`,
			[w * 0.93, h * 0.89, t * 0.12],
			[position[0], position[1] + h * 0.015, position[2] + t * 0.56],
			this.accent(enabled ? 0x345d76 : 0x18242c, 0.55, 0, 1, enabled),
			0.003,
		);
		if (enabled)
			for (let i = 0; i < 3; i++)
				this.rounded(
					`${name} Window`,
					[w * (i === 0 ? 0.36 : 0.3), h * 0.08, t * 0.04],
					[
						position[0] + (i === 0 ? -0.2 : 0.18) * w,
						position[1] + h * (0.24 - i * 0.16),
						position[2] + t * 0.65,
					],
					this.accent(i === 0 ? 0x86aabb : 0x698b99, 0.65),
					0.001,
				);
	}
}
