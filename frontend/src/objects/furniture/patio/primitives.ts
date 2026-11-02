import type {Mesh} from "three";
import {
	BufferGeometry,
	CatmullRomCurve3,
	DoubleSide,
	Float32BufferAttribute,
	TubeGeometry,
	Vector3,
} from "three";

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
		`patio${label}`,
		`patio${label}Hint`,
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
	furnitureInteger(name, `patio${label}`, `patio${label}Hint`, value, min, max);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `patio${label}`, `patio${label}Hint`, value);
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
		`patio${label}`,
		`patio${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `patioOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class PatioObject extends BedroomObject {
	protected curve(
		name: string,
		points: [number, number, number][],
		radius: number,
		material: Mesh["material"],
	): Mesh {
		return this.addGeometry(
			name,
			new TubeGeometry(
				new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
				48,
				Math.max(0.0005, radius),
				6,
				false,
			),
			[0, 0, 0],
			material,
		);
	}
	protected fabric(
		name: string,
		columns: number,
		rows: number,
		point: (u: number, v: number) => [number, number, number],
		material: Mesh["material"],
	): Mesh {
		const vertices: number[] = [],
			indices: number[] = [];
		for (let y = 0; y <= rows; y++)
			for (let x = 0; x <= columns; x++)
				vertices.push(...point(x / columns, y / rows));
		for (let y = 0; y < rows; y++)
			for (let x = 0; x < columns; x++) {
				const a = y * (columns + 1) + x,
					b = a + columns + 1;
				indices.push(a, b, a + 1, a + 1, b, b + 1);
			}
		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();
		for (const finish of Array.isArray(material) ? material : [material])
			finish.side = DoubleSide;
		return this.addGeometry(name, geometry, [0, 0, 0], material);
	}
	protected fire(
		x: number,
		y: number,
		z: number,
		width: number,
		height: number,
		lit: boolean,
	): void {
		const logs = this.accent(0x67503b, 0.95);
		for (const side of [-1, 1])
			this.rail(
				"Patio Fire Log",
				[x - width * 0.32, y, z + side * width * 0.13],
				[x + width * 0.32, y + height * 0.08, z - side * width * 0.13],
				height * 0.09,
				logs,
			);
		if (!lit) return;
		const flame = this.accent(0xf5b76b, 0.8, 0, 0.8, true);
		for (let i = 0; i < 5; i++)
			this.ellipsoid(
				"Patio Flame",
				[width * 0.09, height * (i % 2 ? 0.48 : 0.65), width * 0.1],
				[
					x + (i - 2) * width * 0.12,
					y + height * 0.38,
					z + (i % 2 ? -0.08 : 0.08) * width,
				],
				flame,
			);
	}
}
