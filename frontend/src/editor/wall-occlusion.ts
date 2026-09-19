import type {Camera, Group, Material} from "three";
import {Frustum, Matrix4, Mesh, Vector3} from "three";

import {WallObject} from "../objects/house/wall.js";

const ENTER_LATERAL_VIEW_ANGLE = (35 * Math.PI) / 180;
const EXIT_LATERAL_VIEW_ANGLE = (40 * Math.PI) / 180;
const MINIMUM_FACING_FACTOR = 0.25;
const MINIMUM_ORIENTATION_DIFFERENCE = (15 * Math.PI) / 180;
const CONNECTED_ENDPOINT_DISTANCE = 0.2;
const OCCLUDING_WALL_OPACITY = 0.2;
const SOURCE_MATERIAL_UUID_KEY = "wallOcclusionSourceMaterialUuid";

/** Keep derived wall junctions stable while a temporary cutaway material is active. */
export function resolveWallOcclusionMaterialUuid(material: Material): string {
	const sourceUuid = material.userData[SOURCE_MATERIAL_UUID_KEY];
	return typeof sourceUuid === "string" ? sourceUuid : material.uuid;
}

type WallCandidate = {
	wall: WallObject;
	distanceSquared: number;
	facing: number;
	tangent: Vector3;
	endpoints: [Vector3, Vector3];
};

export type WallOcclusionContext = {
	active: boolean;
	camera: Camera | null;
	space: Group | null;
};

type TransparentMeshState = {
	wall: WallObject;
	material: Material | Material[];
	transparentMaterial: Material | Material[];
	castShadow: boolean;
};

/**
 * Creates a visualization-only cutaway by making the closest camera-facing
 * wall translucent and, at a corner, one connected wall with a different
 * orientation.
 */
export class WallOcclusionManager {
	private transparentMeshes = new Map<Mesh, TransparentMeshState>();

	private lateralViewActive = false;

	private frustum = new Frustum();

	private projectionViewMatrix = new Matrix4();

	private cameraPosition = new Vector3();

	private viewDirection = new Vector3();

	private horizontalViewDirection = new Vector3();

	public update({active, camera, space}: WallOcclusionContext): void {
		if (!active || !camera || !space) {
			this.restore();
			return;
		}

		camera.updateMatrixWorld();
		camera.getWorldDirection(this.viewDirection);
		const horizontalMagnitude = Math.hypot(
			this.viewDirection.x,
			this.viewDirection.z,
		);
		const elevation = Math.atan2(
			Math.abs(this.viewDirection.y),
			horizontalMagnitude,
		);
		const threshold = this.lateralViewActive
			? EXIT_LATERAL_VIEW_ANGLE
			: ENTER_LATERAL_VIEW_ANGLE;
		this.lateralViewActive = elevation <= threshold;
		if (!this.lateralViewActive || horizontalMagnitude < 1e-6) {
			this.restoreTransparentWalls();
			return;
		}

		this.horizontalViewDirection
			.set(this.viewDirection.x, 0, this.viewDirection.z)
			.normalize();
		camera.getWorldPosition(this.cameraPosition);
		this.projectionViewMatrix.multiplyMatrices(
			camera.projectionMatrix,
			camera.matrixWorldInverse,
		);
		this.frustum.setFromProjectionMatrix(this.projectionViewMatrix);

		const candidates = this.collectCandidates(space);
		const selected = new Set<WallObject>();
		const nearest = candidates[0];
		if (nearest) {
			selected.add(nearest.wall);
			const connected = candidates.find(
				(candidate) =>
					candidate !== nearest &&
					this.hasDifferentOrientation(nearest, candidate) &&
					this.sharesEndpoint(nearest, candidate),
			);
			if (connected) {
				selected.add(connected.wall);
			}
		}

		this.applySelection(selected);
	}

	public restore(): void {
		this.lateralViewActive = false;
		this.restoreTransparentWalls();
	}

	private collectCandidates(space: Group): WallCandidate[] {
		const candidates: WallCandidate[] = [];
		space.updateMatrixWorld(true);
		space.traverse((object) => {
			if (!(object instanceof WallObject) || !this.isAvailable(object, space)) {
				return;
			}

			const tangent = new Vector3(1, 0, 0).transformDirection(
				object.matrixWorld,
			);
			tangent.y = 0;
			if (tangent.lengthSq() < 1e-8) {
				return;
			}
			tangent.normalize();
			const facing = Math.abs(
				tangent.x * this.horizontalViewDirection.z -
					tangent.z * this.horizontalViewDirection.x,
			);
			if (
				facing < MINIMUM_FACING_FACTOR ||
				!this.frustum.intersectsObject(object.wallMesh)
			) {
				return;
			}

			const endpoints: [Vector3, Vector3] = [
				object.localToWorld(new Vector3(-object.length / 2, 0, 0)),
				object.localToWorld(new Vector3(object.length / 2, 0, 0)),
			];
			candidates.push({
				wall: object,
				distanceSquared: this.horizontalDistanceToSegmentSquared(
					this.cameraPosition,
					endpoints[0],
					endpoints[1],
				),
				facing,
				tangent,
				endpoints,
			});
		});

		return candidates.sort(
			(left, right) =>
				left.distanceSquared - right.distanceSquared ||
				right.facing - left.facing,
		);
	}

	private isAvailable(wall: WallObject, space: Group): boolean {
		if (!wall.visible) {
			return false;
		}

		for (let parent = wall.parent; parent; parent = parent.parent) {
			if (!parent.visible) {
				return false;
			}
			if (parent === space) {
				break;
			}
		}
		return true;
	}

	private hasDifferentOrientation(
		first: WallCandidate,
		second: WallCandidate,
	): boolean {
		return (
			Math.abs(first.tangent.dot(second.tangent)) <
			Math.cos(MINIMUM_ORIENTATION_DIFFERENCE)
		);
	}

	private sharesEndpoint(first: WallCandidate, second: WallCandidate): boolean {
		const maximumDistanceSquared = CONNECTED_ENDPOINT_DISTANCE ** 2;
		return first.endpoints.some((firstEndpoint) =>
			second.endpoints.some(
				(secondEndpoint) =>
					this.horizontalDistanceSquared(firstEndpoint, secondEndpoint) <=
					maximumDistanceSquared,
			),
		);
	}

	private applySelection(selected: Set<WallObject>): void {
		const selectedMeshes = new Map<Mesh, WallObject>();
		for (const wall of selected) {
			for (const mesh of this.getWallMeshes(wall)) {
				selectedMeshes.set(mesh, wall);
			}
		}

		for (const [mesh, state] of this.transparentMeshes) {
			if (selectedMeshes.get(mesh) === state.wall) {
				continue;
			}
			this.restoreMesh(mesh, state);
			this.transparentMeshes.delete(mesh);
		}

		for (const [mesh, wall] of selectedMeshes) {
			if (this.transparentMeshes.has(mesh)) {
				continue;
			}
			const state: TransparentMeshState = {
				wall,
				material: mesh.material,
				transparentMaterial: this.createTransparentMaterial(mesh.material),
				castShadow: mesh.castShadow,
			};
			this.transparentMeshes.set(mesh, state);
			mesh.material = state.transparentMaterial;
			mesh.castShadow = false;
		}
	}

	private createTransparentMaterial(
		material: Material | Material[],
	): Material | Material[] {
		const create = (source: Material): Material => {
			const transparent = source.clone();
			transparent.depthWrite = false;
			transparent.opacity = Math.min(source.opacity, OCCLUDING_WALL_OPACITY);
			transparent.transparent = true;
			transparent.userData[SOURCE_MATERIAL_UUID_KEY] =
				resolveWallOcclusionMaterialUuid(source);
			transparent.needsUpdate = true;
			return transparent;
		};
		return Array.isArray(material) ? material.map(create) : create(material);
	}

	/** Include the wall structure and every attached opening or accessory. */
	private getWallMeshes(wall: WallObject): Mesh[] {
		const meshes: Mesh[] = [];
		wall.traverse((object) => {
			if (object instanceof Mesh) {
				meshes.push(object);
			}
		});
		return meshes;
	}

	private restoreTransparentWalls(): void {
		for (const [mesh, state] of this.transparentMeshes) {
			this.restoreMesh(mesh, state);
		}
		this.transparentMeshes.clear();
	}

	private restoreMesh(mesh: Mesh, state: TransparentMeshState): void {
		mesh.material = state.material;
		mesh.castShadow = state.castShadow;
		const materials = Array.isArray(state.transparentMaterial)
			? state.transparentMaterial
			: [state.transparentMaterial];
		for (const material of materials) {
			material.dispose();
		}
	}

	private horizontalDistanceToSegmentSquared(
		point: Vector3,
		start: Vector3,
		end: Vector3,
	): number {
		const segmentX = end.x - start.x;
		const segmentZ = end.z - start.z;
		const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
		if (lengthSquared < 1e-8) {
			return this.horizontalDistanceSquared(point, start);
		}

		const amount = Math.max(
			0,
			Math.min(
				1,
				((point.x - start.x) * segmentX + (point.z - start.z) * segmentZ) /
					lengthSquared,
			),
		);
		const differenceX = point.x - (start.x + segmentX * amount);
		const differenceZ = point.z - (start.z + segmentZ * amount);
		return differenceX * differenceX + differenceZ * differenceZ;
	}

	private horizontalDistanceSquared(first: Vector3, second: Vector3): number {
		const differenceX = first.x - second.x;
		const differenceZ = first.z - second.z;
		return differenceX * differenceX + differenceZ * differenceZ;
	}
}
