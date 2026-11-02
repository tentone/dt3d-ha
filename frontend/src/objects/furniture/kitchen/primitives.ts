import type {Mesh, Object3D} from "three";
import {
	CatmullRomCurve3,
	ExtrudeGeometry,
	Group,
	Path,
	Shape,
	TubeGeometry,
	Vector2,
	Vector3,
} from "three";

import {BathroomObject} from "../bathroom/primitives.js";
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
		`kitchen${label}`,
		`kitchen${label}Hint`,
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
		`kitchen${label}`,
		`kitchen${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `kitchen${label}`, `kitchen${label}Hint`, value);
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
		`kitchen${label}`,
		`kitchen${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `kitchenOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export type PlanPoint = [number, number];
export function rectangle(width: number, depth: number): PlanPoint[] {
	return [
		[-width / 2, -depth / 2],
		[width / 2, -depth / 2],
		[width / 2, depth / 2],
		[-width / 2, depth / 2],
	];
}
export function cornerPlan(width: number, depth: number): PlanPoint[] {
	return [
		[-width / 2, -depth / 2],
		[width / 2, -depth / 2],
		[width / 2, depth * 0.05],
		[width * 0.05, depth / 2],
		[-width / 2, depth / 2],
	];
}

/** Kitchen models share owned geometry, plumbing and appliance details. */
export abstract class KitchenObject extends BathroomObject {
	protected slab(
		name: string,
		points: PlanPoint[],
		thickness: number,
		y: number,
		material: Mesh["material"],
		holes: {
			x: number;
			z: number;
			width: number;
			depth: number;
			rectangular?: boolean;
		}[] = [],
	): Mesh {
		const shape = new Shape(points.map(([x, z]) => new Vector2(x, -z)));
		for (const hole of holes) {
			const path = new Path();
			if (hole.rectangular) {
				const x = hole.x - hole.width / 2,
					y = -hole.z - hole.depth / 2;
				path.moveTo(x, y);
				path.lineTo(x + hole.width, y);
				path.lineTo(x + hole.width, y + hole.depth);
				path.lineTo(x, y + hole.depth);
				path.closePath();
			} else
				path.absellipse(
					hole.x,
					-hole.z,
					hole.width / 2,
					hole.depth / 2,
					0,
					Math.PI * 2,
					false,
					0,
				);
			shape.holes.push(path);
		}
		const geometry = new ExtrudeGeometry(shape, {
			depth: Math.max(0.001, thickness),
			bevelEnabled: false,
			curveSegments: 32,
		});
		geometry.rotateX(-Math.PI / 2);
		return this.addGeometry(name, geometry, [0, y, 0], material);
	}
	protected hinge(
		name: string,
		meshes: Object3D[],
		position: [number, number, number],
		angle: number,
		axis: "x" | "y" = "y",
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
	protected faucet(
		x: number,
		y: number,
		z: number,
		height: number,
		reach: number,
		material: Mesh["material"],
		curved = true,
	): void {
		const r = height * 0.045;
		this.cylinder(
			"Faucet Base",
			r * 1.8,
			r * 2,
			height * 0.06,
			[x, y + height * 0.03, z],
			material,
		);
		const points = curved
			? [
				[x, y, z],
				[x, y + height * 0.65, z],
				[x, y + height, z + reach * 0.35],
				[x, y + height * 0.9, z + reach],
				[x, y + height * 0.65, z + reach],
			]
			: [
				[x, y, z],
				[x, y + height * 0.72, z],
				[x, y + height * 0.8, z + reach * 0.25],
				[x, y + height * 0.8, z + reach],
			];
		this.addGeometry(
			"Kitchen Faucet Spout",
			new TubeGeometry(
				new CatmullRomCurve3(
					points.map(
						(point) => new Vector3(...(point as [number, number, number])),
					),
				),
				32,
				r,
				12,
				false,
			),
			[0, 0, 0],
			material,
		);
		this.rounded(
			"Faucet Lever",
			[r * 1.4, height * 0.35, r * 1.4],
			[x + r * 2.2, y + height * 0.22, z],
			material,
			r * 0.4,
		);
	}
	protected ovenFront(
		x: number,
		y: number,
		z: number,
		w: number,
		h: number,
		material: Mesh["material"],
		open = false,
		microwave = false,
	): void {
		const t = Math.min(w, h) * 0.04,
			dark = this.accent(0x1b252c, 0.25, 0.25);
		if (microwave) {
			this.rounded(
				"Microwave Controls",
				[w * 0.2, h * 0.96, t],
				[x + w * 0.39, y, z],
				material,
				0.003,
			);
			this.rounded(
				"Appliance Display",
				[w * 0.14, h * 0.15, t * 0.3],
				[x + w * 0.39, y + h * 0.27, z + t],
				this.accent(0x253c43, 0.3),
			);
			for (let i = 0; i < 3; i++)
				this.rounded(
					"Microwave Button",
					[w * 0.1, h * 0.045, t * 0.5],
					[x + w * 0.39, y + h * (0.02 - i * 0.13), z + t],
					dark,
					0.002,
				);
			const before = this.partsGroup.children.length;
			this.rounded(
				"Oven Door",
				[w * 0.77, h * 0.96, t],
				[x - w * 0.105, y, z],
				material,
				0.006,
			);
			this.rounded(
				"Oven Window",
				[w * 0.57, h * 0.72, t * 0.35],
				[x - w * 0.15, y, z + t * 0.6],
				dark,
				0.01,
			);
			this.rounded(
				"Oven Handle",
				[w * 0.025, h * 0.6, t * 1.6],
				[x + w * 0.22, y, z + t * 1.5],
				this.accent(0xb9c2c8, 0.22, 0.75),
			);
			this.hinge(
				"Oven Door Hinge",
				this.partsGroup.children.slice(before),
				[x - w / 2, y, z],
				open ? -Math.PI * 0.48 : 0,
			);
			return;
		}
		this.rounded(
			"Appliance Control Strip",
			[w, h * 0.18, t],
			[x, y + h * 0.41, z],
			material,
			0.003,
		);
		this.rounded(
			"Appliance Display",
			[w * 0.3, h * 0.08, t * 0.3],
			[x, y + h * 0.41, z + t],
			this.accent(0x253c43, 0.3),
		);
		for (const side of [-1, 1])
			this.cylinder(
				"Appliance Dial",
				h * 0.035,
				h * 0.035,
				t,
				[x + side * w * 0.35, y + h * 0.41, z + t],
				this.accent(0x343b40, 0.3, 0.5),
			).rotation.x = Math.PI / 2;
		const before = this.partsGroup.children.length,
			doorH = h * 0.79;
		this.rounded(
			"Oven Door",
			[w, doorH, t],
			[x, y - h * 0.1, z],
			material,
			0.004,
		);
		this.rounded(
			"Oven Window",
			[w * 0.79, doorH * 0.72, t * 0.35],
			[x, y - h * 0.12, z + t * 0.6],
			dark,
			0.008,
		);
		this.rounded(
			"Oven Handle",
			[w * 0.7, h * 0.035, t * 1.6],
			[x, y + h * 0.21, z + t * 1.5],
			this.accent(0xb9c2c8, 0.22, 0.75),
		);
		const meshes = this.partsGroup.children.slice(before);
		this.hinge(
			"Oven Door Hinge",
			meshes,
			[x, y - h * 0.495, z],
			open ? Math.PI * 0.45 : 0,
			"x",
		);
	}
}
