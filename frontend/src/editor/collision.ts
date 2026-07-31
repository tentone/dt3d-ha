import {Box3, Mesh, type Object3D, Vector3} from "three";

import {isInternalObject} from "../utils/internal-object.js";

const COLLISION_EPSILON = 1e-6;
const AXES = ["x", "y", "z"] as const;

export type CollisionObstacle = {
	bounds: Box3;
};

export type CollisionMovementResult = {
	bounds: Box3;
	movement: Vector3;
};

/**
 * Calculate an axis-aligned world-space box around the visible mesh geometry
 * belonging to a set of object roots.
 */
export function getObjectBounds(objects: Object3D[]): Box3 {
	const bounds = new Box3();

	for (const object of objects) {
		object.updateWorldMatrix(true, true);
		expandBoundsFromObject(bounds, object);
	}

	return bounds;
}

/**
 * Build world-space collision boxes for every visible mesh outside the moving
 * object hierarchy.
 */
export function collectCollisionObstacles(
	space: Object3D,
	movingObjects: Object3D[],
): CollisionObstacle[] {
	const obstacles: CollisionObstacle[] = [];
	const movingRoots = new Set(movingObjects);

	space.updateWorldMatrix(true, true);

	const visit = (object: Object3D, insideMovingObject: boolean): void => {
		const isMovingObject = insideMovingObject || movingRoots.has(object);
		if (isMovingObject || object.visible === false) {
			return;
		}

		if (object instanceof Mesh) {
			const bounds = getMeshBounds(object);
			if (bounds && !bounds.isEmpty()) {
				obstacles.push({bounds});
			}
		}

		for (const child of object.children) {
			visit(child, isMovingObject);
		}
	};

	for (const child of space.children) {
		if (isInternalObject(child)) {
			continue;
		}
		visit(child, false);
	}

	return obstacles;
}

/**
 * Clamp a requested translation against static axis-aligned obstacle boxes.
 *
 * Swept bounds prevent tunnelling during fast or diagonal movement. After a
 * hit, the remaining movement is projected along the obstacle face so the
 * object can slide naturally.
 */
export function resolveCollisionMovement(
	startBounds: Box3,
	requestedMovement: Vector3,
	obstacles: CollisionObstacle[],
	ignoredObstacles: Set<CollisionObstacle>,
): CollisionMovementResult {
	const bounds = startBounds.clone();
	const movement = new Vector3();
	const remainingMovement = requestedMovement.clone();

	for (let iteration = 0; iteration < AXES.length; iteration += 1) {
		let hitAxis: (typeof AXES)[number] | null = null;
		let hitTime = 1;
		for (const obstacle of obstacles) {
			if (ignoredObstacles.has(obstacle)) {
				continue;
			}

			const hit = sweepBounds(bounds, remainingMovement, obstacle.bounds);
			if (hit && hit.time < hitTime) {
				hitAxis = hit.axis;
				hitTime = hit.time;
			}
		}

		const step = remainingMovement.clone().multiplyScalar(hitTime);
		bounds.translate(step);
		movement.add(step);

		if (!hitAxis) {
			break;
		}

		remainingMovement.multiplyScalar(1 - hitTime);
		remainingMovement[hitAxis] = 0;
		if (remainingMovement.lengthSq() <= COLLISION_EPSILON ** 2) {
			break;
		}
	}

	for (const obstacle of ignoredObstacles) {
		if (!strictlyIntersects(bounds, obstacle.bounds)) {
			ignoredObstacles.delete(obstacle);
		}
	}

	return {bounds, movement};
}

/**
 * Return obstacles that already overlap the moving object. They are ignored
 * until the object leaves them so enabling collision avoidance never traps an
 * object that was previously placed inside another one.
 */
export function getInitiallyOverlappingObstacles(
	bounds: Box3,
	obstacles: CollisionObstacle[],
): Set<CollisionObstacle> {
	return new Set(
		obstacles.filter((obstacle) => strictlyIntersects(bounds, obstacle.bounds)),
	);
}

function expandBoundsFromObject(bounds: Box3, object: Object3D): void {
	if (object.visible === false) {
		return;
	}

	if (object instanceof Mesh) {
		const meshBounds = getMeshBounds(object);
		if (meshBounds) {
			bounds.union(meshBounds);
		}
	}

	for (const child of object.children) {
		expandBoundsFromObject(bounds, child);
	}
}

function getMeshBounds(mesh: Mesh): Box3 | null {
	if (!mesh.geometry.boundingBox) {
		mesh.geometry.computeBoundingBox();
	}

	const geometryBounds = mesh.geometry.boundingBox;
	return geometryBounds
		? geometryBounds.clone().applyMatrix4(mesh.matrixWorld)
		: null;
}

function strictlyIntersects(first: Box3, second: Box3): boolean {
	return AXES.every(
		(axis) =>
			first.max[axis] > second.min[axis] + COLLISION_EPSILON &&
			first.min[axis] < second.max[axis] - COLLISION_EPSILON,
	);
}

function sweepBounds(
	movingBounds: Box3,
	movement: Vector3,
	obstacleBounds: Box3,
): { axis: (typeof AXES)[number]; time: number } | null {
	let entryTime = Number.NEGATIVE_INFINITY;
	let exitTime = Number.POSITIVE_INFINITY;
	let entryAxis: (typeof AXES)[number] = "x";

	for (const axis of AXES) {
		const distance = movement[axis];
		if (Math.abs(distance) <= COLLISION_EPSILON) {
			if (
				movingBounds.max[axis] <=
					obstacleBounds.min[axis] + COLLISION_EPSILON ||
				movingBounds.min[axis] >=
					obstacleBounds.max[axis] - COLLISION_EPSILON
			) {
				return null;
			}
			continue;
		}

		const firstDistance =
			distance > 0
				? obstacleBounds.min[axis] - movingBounds.max[axis]
				: obstacleBounds.max[axis] - movingBounds.min[axis];
		const secondDistance =
			distance > 0
				? obstacleBounds.max[axis] - movingBounds.min[axis]
				: obstacleBounds.min[axis] - movingBounds.max[axis];
		const axisEntryTime = firstDistance / distance;
		const axisExitTime = secondDistance / distance;

		if (axisEntryTime > entryTime) {
			entryTime = axisEntryTime;
			entryAxis = axis;
		}
		exitTime = Math.min(exitTime, axisExitTime);
	}

	if (
		entryTime > exitTime + COLLISION_EPSILON ||
		exitTime < -COLLISION_EPSILON ||
		entryTime < -COLLISION_EPSILON ||
		entryTime > 1
	) {
		return null;
	}

	return {
		axis: entryAxis,
		time: Math.max(0, entryTime),
	};
}
