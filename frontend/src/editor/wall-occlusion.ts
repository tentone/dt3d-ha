import type {Camera, Group} from "three";
import {Frustum, Matrix4, Vector3} from "three";

import {WallObject} from "../objects/house/wall.js";

const ENTER_LATERAL_VIEW_ANGLE = (35 * Math.PI) / 180;
const EXIT_LATERAL_VIEW_ANGLE = (40 * Math.PI) / 180;
const MINIMUM_FACING_FACTOR = 0.25;
const MINIMUM_ORIENTATION_DIFFERENCE = (15 * Math.PI) / 180;
const CONNECTED_ENDPOINT_DISTANCE = 0.2;

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

/**
 * Creates a visualization-only cutaway by hiding the closest camera-facing
 * wall and, at a corner, one connected wall with a different orientation.
 */
export class WallOcclusionManager {
	private hiddenWalls = new Set<WallObject>();

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
			this.restoreHiddenWalls();
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
		this.restoreHiddenWalls();
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
		if (!wall.visible && !this.hiddenWalls.has(wall)) {
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
		for (const wall of this.hiddenWalls) {
			if (!selected.has(wall)) {
				wall.visible = true;
			}
		}
		for (const wall of selected) {
			wall.visible = false;
		}
		this.hiddenWalls = selected;
	}

	private restoreHiddenWalls(): void {
		for (const wall of this.hiddenWalls) {
			wall.visible = true;
		}
		this.hiddenWalls.clear();
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
