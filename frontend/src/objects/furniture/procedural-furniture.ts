import type {Mesh} from "three";
import {
	CylinderGeometry,
	ExtrudeGeometry,
	LatheGeometry,
	Shape,
	SphereGeometry,
	Vector2,
} from "three";
import {RoundedBoxGeometry} from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import type {FurnitureParameterDefinition} from "./furniture.js";
import {furnitureNumber, FurnitureObject} from "./furniture.js";

export const furnitureDimensions = (
	width: number,
	depth: number,
	height: number,
): FurnitureParameterDefinition[] => [
	furnitureNumber(
		"width",
		"furnitureWidth",
		"furnitureWidthTooltip",
		width,
		0.1,
		8,
	),
	furnitureNumber(
		"depth",
		"furnitureDepth",
		"furnitureDepthTooltip",
		depth,
		0.03,
		4,
	),
	furnitureNumber(
		"height",
		"furnitureHeight",
		"furnitureHeightTooltip",
		height,
		0.03,
		4,
	),
];

/** Shared procedural primitives. Every mesh and finish is owned by its furniture instance. */
export abstract class ProceduralFurnitureObject extends FurnitureObject {
	/** Rounded plan corners independent of a thin tabletop's thickness. */
	protected plate(
		name: string,
		size: [number, number, number],
		position: [number, number, number],
		material: Mesh["material"],
		radius: number,
	): Mesh {
		const [w, h, d] = size,
			x = w / 2,
			z = d / 2,
			r = Math.min(radius, x * 0.9, z * 0.9);
		const shape = new Shape();
		shape.moveTo(-x + r, -z);
		shape.lineTo(x - r, -z);
		shape.quadraticCurveTo(x, -z, x, -z + r);
		shape.lineTo(x, z - r);
		shape.quadraticCurveTo(x, z, x - r, z);
		shape.lineTo(-x + r, z);
		shape.quadraticCurveTo(-x, z, -x, z - r);
		shape.lineTo(-x, -z + r);
		shape.quadraticCurveTo(-x, -z, -x + r, -z);
		const geometry = new ExtrudeGeometry(shape, {
			depth: h,
			bevelEnabled: false,
			curveSegments: 8,
		});
		geometry.rotateX(-Math.PI / 2);
		geometry.translate(0, -h / 2, 0);
		return this.addGeometry(name, geometry, position, material);
	}

	protected rounded(
		name: string,
		size: [number, number, number],
		position: [number, number, number],
		material: Mesh["material"],
		radius = 0.035,
	): Mesh {
		const safe = size.map((value) => Math.max(0.001, value)) as [
			number,
			number,
			number,
		];
		return this.addGeometry(
			name,
			new RoundedBoxGeometry(
				...safe,
				2,
				Math.min(radius, ...safe.map((value) => value * 0.24)),
			),
			position,
			material,
		);
	}

	protected cylinder(
		name: string,
		top: number,
		bottom: number,
		height: number,
		position: [number, number, number],
		material: Mesh["material"],
		segments = 32,
		open = false,
	): Mesh {
		return this.addGeometry(
			name,
			new CylinderGeometry(
				Math.max(top, 0.001),
				Math.max(bottom, 0.001),
				Math.max(height, 0.001),
				segments,
				1,
				open,
			),
			position,
			material,
		);
	}

	protected ellipsoid(
		name: string,
		size: [number, number, number],
		position: [number, number, number],
		material: Mesh["material"],
	): Mesh {
		const mesh = this.addGeometry(
			name,
			new SphereGeometry(1, 24, 16),
			position,
			material,
		);
		mesh.scale.set(...size);
		return mesh;
	}

	protected lathe(
		name: string,
		profile: [number, number][],
		position: [number, number, number],
		material: Mesh["material"],
	): Mesh {
		return this.addGeometry(
			name,
			new LatheGeometry(
				profile.map((point) => new Vector2(...point)),
				32,
			),
			position,
			material,
		);
	}

	protected legs(
		width: number,
		depth: number,
		height: number,
		thickness: number,
		material: Mesh["material"],
	): void {
		for (const x of [-1, 1])
			for (const z of [-1, 1]) {
				this.cylinder(
					"Furniture Leg",
					thickness * 0.38,
					thickness * 0.5,
					height,
					[
						x * Math.max(0, width / 2 - thickness),
						height / 2,
						z * Math.max(0, depth / 2 - thickness),
					],
					material,
					16,
				);
			}
	}
}
