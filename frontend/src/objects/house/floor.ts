import type {Material} from "three";
import {
	DoubleSide,
	Float32BufferAttribute,
	Mesh,
	MeshStandardMaterial,
	Shape,
	ShapeGeometry,
	Vector3,
} from "three";

import {initializeMeshShadowSettings} from "../../editor/mesh-shadows.js";
import {markObjectInternal} from "../../utils/internal-object.js";
import type {DTInteractionEvent} from "../dt-object.js";
import {DTObject} from "../dt-object.js";
import {CSSText} from "../helpers/css-text.js";

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

	/**
	 * Area label displayed while the floor is hovered.
	 */
	private areaLabel: CSSText | null = null;

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
		this.castShadow = false;

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
		initializeMeshShadowSettings(this.floorMesh, {
			castShadow: false,
			receiveShadow: true,
		});
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
				if (child !== source.floorMesh && child.internal !== true) {
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

	/** Show the floor's world-space area while the pointer is over it. */
	public override onInteraction(event: DTInteractionEvent): void {
		if (event.type === "pointerenter") {
			this.updateAreaLabel();
		} else if (event.type === "pointerleave" && this.areaLabel) {
			this.areaLabel.visible = false;
		}
	}

	private updateAreaLabel(): void {
		this.updateWorldMatrix(true, false);
		const worldPoints = this.points.map((point) =>
			this.localToWorld(new Vector3(point.x, 0, point.z)),
		);
		const area = Math.abs(
			worldPoints.reduce((sum, point, index) => {
				const next = worldPoints[(index + 1) % worldPoints.length];
				return sum + point.x * next.z - next.x * point.z;
			}, 0) / 2,
		);
		const labelText = `${area.toFixed(2)}m²`;
		if (!this.areaLabel) {
			this.areaLabel = markObjectInternal(new CSSText(labelText));
			this.add(this.areaLabel);
		} else {
			this.areaLabel.setText(labelText);
		}

		const center = this.points.reduce<Vector3>(
			(sum, point) => sum.add(new Vector3(point.x, 0, point.z)),
			new Vector3(),
		).multiplyScalar(1 / this.points.length);
		this.areaLabel.position.copy(center);
		this.areaLabel.position.y = 0.15;
		this.areaLabel.visible = true;
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
		this.createPlanarUv(geometry);
		return geometry;
	}

	/** Map the complete floor polygon into normalized texture space. */
	private createPlanarUv(geometry: ShapeGeometry): void {
		const positions = geometry.getAttribute("position");
		let minX = Number.POSITIVE_INFINITY;
		let maxX = Number.NEGATIVE_INFINITY;
		let minZ = Number.POSITIVE_INFINITY;
		let maxZ = Number.NEGATIVE_INFINITY;

		for (let index = 0; index < positions.count; index++) {
			const x = positions.getX(index);
			const z = positions.getZ(index);
			minX = Math.min(minX, x);
			maxX = Math.max(maxX, x);
			minZ = Math.min(minZ, z);
			maxZ = Math.max(maxZ, z);
		}

		const width = maxX - minX || 1;
		const depth = maxZ - minZ || 1;
		const uvs: number[] = [];
		for (let index = 0; index < positions.count; index++) {
			uvs.push(
				(positions.getX(index) - minX) / width,
				(positions.getZ(index) - minZ) / depth,
			);
		}
		geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
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
