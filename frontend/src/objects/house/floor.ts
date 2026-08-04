import type {Material} from "three";
import {
	DoubleSide,
	Mesh,
	MeshStandardMaterial,
	Shape,
	ShapeGeometry,
} from "three";

import {markObjectInternal} from "../../utils/internal-object.js";
import {DTObject} from "../dt-object.js";

export type FloorPoint = {
	x: number;
	z: number;
};

const DEFAULT_FLOOR_COLOR = 0xb8b5aa;

const DEFAULT_FLOOR_POINTS: FloorPoint[] = [
	{x: 0, z: 0},
	{x: 1, z: 0},
	{x: 0, z: 1},
];

/** A horizontal polygon surface whose local Y coordinate is always zero. */
export class FloorObject extends DTObject {
	public points: FloorPoint[];

	public automatic: boolean;

	public floorMesh: Mesh;

	public constructor(
		points: FloorPoint[] = DEFAULT_FLOOR_POINTS,
		color = DEFAULT_FLOOR_COLOR,
		automatic = false,
	) {
		super();

		this.points = this.normalizePoints(points);
		this.automatic = automatic;
		this.name = "Floor";
		this.userData.meshType = "floor";

		const material = new MeshStandardMaterial({
			color,
			roughness: 0.9,
			side: DoubleSide,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -1,
		});
		this.floorMesh = markObjectInternal(
			new Mesh(this.createGeometry(), material),
		);
		this.floorMesh.name = "Floor Surface";
		this.floorMesh.userData.ownerMaterialTarget = true;
		this.add(this.floorMesh);
	}

	public setPoints(points: FloorPoint[]): void {
		const normalized = this.normalizePoints(points);
		if (normalized.length < 3) {
			return;
		}

		this.points = normalized;
		const geometry = this.createGeometry();
		this.floorMesh.geometry.dispose();
		this.floorMesh.geometry = geometry;
	}

	public override copy(source: this, recursive = true): this {
		super.copy(source, false);
		this.points = source.points.map((point) => ({...point}));
		this.automatic = source.automatic;
		this.floorMesh.geometry.dispose();
		this.floorMesh.geometry = this.createGeometry();
		this.floorMesh.material = Array.isArray(source.floorMesh.material)
			? source.floorMesh.material.map((material) => material.clone())
			: source.floorMesh.material.clone();

		if (recursive) {
			for (const child of source.children) {
				if (child !== source.floorMesh) {
					this.add(child.clone());
				}
			}
		}
		return this;
	}

	public override dispose(): void {
		this.floorMesh.geometry.dispose();
		const materials = Array.isArray(this.floorMesh.material)
			? this.floorMesh.material
			: [this.floorMesh.material];
		materials.forEach((material: Material) => material.dispose());
	}

	private createGeometry(): ShapeGeometry {
		const points = this.points.length >= 3 ? this.points : DEFAULT_FLOOR_POINTS;
		const shape = new Shape();
		shape.moveTo(points[0].x, -points[0].z);
		for (const point of points.slice(1)) {
			shape.lineTo(point.x, -point.z);
		}
		shape.closePath();

		const geometry = new ShapeGeometry(shape);
		geometry.rotateX(-Math.PI / 2);
		geometry.computeVertexNormals();
		return geometry;
	}

	private normalizePoints(points: FloorPoint[]): FloorPoint[] {
		const normalized: FloorPoint[] = [];
		for (const point of points) {
			if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) {
				continue;
			}
			const previous = normalized.at(-1);
			if (
				previous &&
				Math.hypot(previous.x - point.x, previous.z - point.z) <= 1e-8
			) {
				continue;
			}
			normalized.push({x: point.x, z: point.z});
		}

		if (
			normalized.length > 1 &&
			Math.hypot(
				normalized[0].x - normalized.at(-1)!.x,
				normalized[0].z - normalized.at(-1)!.z,
			) <= 1e-8
		) {
			normalized.pop();
		}

		return normalized.length >= 3
			? normalized
			: DEFAULT_FLOOR_POINTS.map((point) => ({...point}));
	}
}
