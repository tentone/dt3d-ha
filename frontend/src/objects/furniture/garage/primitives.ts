import type {Mesh} from "three";
import {
	CatmullRomCurve3,
	ExtrudeGeometry,
	Path,
	Shape,
	TorusGeometry,
	TubeGeometry,
	Vector3,
} from "three";

import {ClosetObject} from "../closet/primitives.js";
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
		`garage${label}`,
		`garage${label}Hint`,
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
		`garage${label}`,
		`garage${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `garage${label}`, `garage${label}Hint`, value);
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
		`garage${label}`,
		`garage${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `garageOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class GarageObject extends ClosetObject {
	protected wheel(
		name: string,
		position: [number, number, number],
		radius: number,
		width: number,
		spokes = 0,
	): void {
		const tire = this.accent(0x272c30, 0.9),
			metal = this.accent(0xa6adb0, 0.3, 0.7);
		if (spokes) {
			const mesh = this.addGeometry(
				name,
				new TorusGeometry(radius * 0.94, radius * 0.06, 8, 32),
				position,
				tire,
			);
			mesh.scale.z = width / (radius * 0.12);
			mesh.rotation.y = Math.PI / 2;
			for (let i = 0; i < spokes; i++) {
				const a = (i / spokes) * Math.PI * 2;
				this.rail(
					`${name} Spoke`,
					position,
					[
						position[0],
						position[1] + Math.sin(a) * radius * 0.88,
						position[2] + Math.cos(a) * radius * 0.88,
					],
					radius * 0.012,
					metal,
				);
			}
		} else
			this.cylinder(
				name,
				radius,
				radius,
				width,
				position,
				tire,
				32,
			).rotation.z = Math.PI / 2;
		this.cylinder(
			`${name} Hub`,
			radius * (spokes ? 0.12 : 0.58),
			radius * (spokes ? 0.12 : 0.58),
			width * 1.04,
			position,
			metal,
			24,
		).rotation.z = Math.PI / 2;
	}
	protected cable(
		name: string,
		points: [number, number, number][],
		radius: number,
		material: Mesh["material"],
	): Mesh {
		return this.addGeometry(
			name,
			new TubeGeometry(
				new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
				64,
				Math.max(0.0005, radius),
				6,
				false,
			),
			[0, 0, 0],
			material,
		);
	}
	protected pegboard(
		w: number,
		d: number,
		h: number,
		columns: number,
		rows: number,
		tools: number,
		material: Mesh["material"],
	): void {
		const shape = new Shape(),
			r = Math.min(w / (columns + 1), h / (rows + 1)) * 0.15;
		shape.moveTo(-w / 2, 0);
		shape.lineTo(w / 2, 0);
		shape.lineTo(w / 2, h);
		shape.lineTo(-w / 2, h);
		shape.closePath();
		for (let c = 1; c <= columns; c++)
			for (let row = 1; row <= rows; row++) {
				const hole = new Path();
				hole.absarc(
					-w / 2 + (c * w) / (columns + 1),
					(row * h) / (rows + 1),
					r,
					0,
					Math.PI * 2,
					true,
				);
				shape.holes.push(hole);
			}
		const geometry = new ExtrudeGeometry(shape, {
			depth: d,
			bevelEnabled: false,
			curveSegments: 8,
		});
		geometry.translate(0, 0, -d / 2);
		this.addGeometry("Tool Pegboard", geometry, [0, 0, 0], material);
		const metal = this.accent(0x9fa8ab, 0.3, 0.7),
			handle = this.accent(0xc2674e, 0.65),
			n = Math.min(tools, 12),
			size = Math.min(w / Math.min(n + 1, 7), h * 0.38);
		for (let i = 0; i < n; i++) {
			const x = (((i % 6) + 0.5) / Math.min(n, 6) - 0.5) * w * 0.85,
				y = h * (i < 6 ? 0.74 : 0.32),
				z = d / 2 + size * 0.11;
			this.rail("Pegboard Hook", [x, y, d / 2], [x, y, z], size * 0.035, metal);
			if (i % 3 === 0) {
				this.rounded(
					"Pegboard Hammer Handle",
					[size * 0.11, size * 0.62, size * 0.12],
					[x, y - size * 0.12, z],
					handle,
					0.004,
				);
				this.rounded(
					"Pegboard Hammer Head",
					[size * 0.48, size * 0.17, size * 0.2],
					[x, y + size * 0.23, z],
					metal,
					0.005,
				);
			} else if (i % 3 === 1) {
				this.rail(
					"Pegboard Wrench Shaft",
					[x, y - size * 0.4, z],
					[x, y + size * 0.08, z],
					size * 0.055,
					metal,
				);
				this.addGeometry(
					"Pegboard Wrench Jaw",
					new TorusGeometry(size * 0.12, size * 0.045, 6, 16, Math.PI * 1.6),
					[x, y + size * 0.17, z],
					metal,
				).rotation.z = Math.PI * 0.2;
			} else {
				this.cylinder(
					"Pegboard Screwdriver Handle",
					size * 0.07,
					size * 0.06,
					size * 0.32,
					[x, y - size * 0.22, z],
					handle,
					12,
				);
				this.rail(
					"Pegboard Screwdriver Shaft",
					[x, y - size * 0.06, z],
					[x, y + size * 0.3, z],
					size * 0.018,
					metal,
				);
			}
		}
	}
}
