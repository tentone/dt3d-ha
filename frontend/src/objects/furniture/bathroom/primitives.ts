import type {Mesh} from "three";
import {
	CylinderGeometry,
	ExtrudeGeometry,
	Path,
	Shape,
	Vector2,
	Vector3,
} from "three";

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
		`bath${label}`,
		`bath${label}Hint`,
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
	furnitureInteger(name, `bath${label}`, `bath${label}Hint`, value, min, max);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `bath${label}`, `bath${label}Hint`, value);
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
		`bath${label}`,
		`bath${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `bathOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export function quarterFootprint(
	width: number,
	depth: number,
	inset = 0,
): Shape {
	const shape = new Shape(),
		x = -width / 2 + inset,
		z = -depth / 2 + inset;
	shape.moveTo(x, z);
	shape.lineTo(x + width - inset * 2, z);
	for (let i = 1; i <= 32; i++) {
		const angle = ((i / 32) * Math.PI) / 2;
		shape.lineTo(
			x + Math.cos(angle) * (width - inset * 2),
			z + Math.sin(angle) * (depth - inset * 2),
		);
	}
	shape.closePath();
	return shape;
}

/** Plumbing and sanitary geometry shared by the bathroom families. */
export abstract class BathroomObject extends ProceduralFurnitureObject {
	protected bowl(
		name: string,
		width: number,
		depth: number,
		height: number,
		thickness: number,
		position: [number, number, number],
		material: Mesh["material"],
		baseThickness = thickness,
		rimThickness = thickness,
	): Mesh {
		const r = width / 2,
			t = Math.min(thickness, width * 0.18, depth * 0.18, height * 0.25);
		const base = Math.min(baseThickness, height * 0.45),
			rim = Math.min(rimThickness, width * 0.18, depth * 0.18);
		const mesh = this.lathe(
			name,
			[
				[0, 0],
				[r * 0.42, 0],
				[r * 0.8, height * 0.2],
				[r, height * 0.9],
				[r, height],
				[r - rim, height],
				[(r - t) * 0.72, Math.max(base, height * 0.35)],
				[r * 0.12, base],
				[0, base],
			],
			position,
			material,
		);
		mesh.scale.z = depth / width;
		mesh.userData.bowlFloor = base;
		return mesh;
	}

	protected drain(x: number, y: number, z: number, radius: number): void {
		this.cylinder(
			"Drain",
			radius,
			radius,
			Math.min(0.004, radius * 0.15),
			[x, y, z],
			this.accent(0x777e83, 0.22, 0.8),
			24,
		);
		this.cylinder(
			"Drain Opening",
			radius * 0.45,
			radius * 0.45,
			0.001,
			[x, y + Math.min(0.0025, radius * 0.08), z],
			this.accent(0x3d454b),
			20,
		);
	}

	protected pipe(
		name: string,
		from: Vector3,
		to: Vector3,
		radius: number,
		material: Mesh["material"],
	): Mesh {
		const direction = to.clone().sub(from),
			length = Math.max(0.001, direction.length());
		const mesh = this.addGeometry(
			name,
			new CylinderGeometry(radius, radius, length, 16),
			from.clone().add(to).multiplyScalar(0.5).toArray() as [
				number,
				number,
				number,
			],
			material,
		);
		mesh.quaternion.setFromUnitVectors(
			new Vector3(0, 1, 0),
			direction.normalize(),
		);
		return mesh;
	}

	protected tap(x: number, baseY: number, z: number, size: number): void {
		const chrome = this.accent(0xb8c2c8, 0.18, 0.85),
			radius = Math.max(0.002, size * 0.065);
		this.cylinder(
			"Tap Stem",
			radius,
			radius * 1.2,
			size,
			[x, baseY + size / 2, z],
			chrome,
			20,
		);
		this.pipe(
			"Tap Spout",
			new Vector3(x, baseY + size * 0.9, z),
			new Vector3(x, baseY + size * 0.9, z + size * 0.65),
			radius,
			chrome,
		);
		this.rounded(
			"Tap Lever",
			[size * 0.12, size * 0.08, size * 0.5],
			[x, baseY + size * 1.07, z + size * 0.12],
			chrome,
			0.003,
		);
	}

	protected glass(
		name: string,
		size: [number, number, number],
		position: [number, number, number],
		opacity: number,
	): Mesh {
		const mesh = this.addBox(
			name,
			size,
			position,
			this.accent(0xb4d5dc, 0.1, 0.05, opacity),
		);
		initializeMeshShadowSettings(mesh, {
			castShadow: false,
			receiveShadow: false,
		});
		return mesh;
	}

	protected cornerBath(
		width: number,
		depth: number,
		height: number,
		base: number,
		wall: number,
		material: Mesh["material"],
	): void {
		const outer = quarterFootprint(width, depth),
			inner = quarterFootprint(width, depth, wall);
		const floor = new ExtrudeGeometry(outer, {
			depth: base,
			bevelEnabled: false,
			curveSegments: 24,
		});
		floor.rotateX(-Math.PI / 2);
		this.addGeometry("Corner Bathtub Floor", floor, [0, 0, 0], material);
		outer.holes.push(
			new Path(
				inner
					.getPoints()
					.reverse()
					.map((point) => new Vector2(point.x, point.y)),
			),
		);
		const sides = new ExtrudeGeometry(outer, {
			depth: height - base,
			bevelEnabled: false,
			curveSegments: 24,
		});
		sides.rotateX(-Math.PI / 2);
		this.addGeometry("Corner Bathtub Shell", sides, [0, base, 0], material);
	}
}
