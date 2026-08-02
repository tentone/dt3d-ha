import type {Object3D} from "three";
import {Vector3} from "three";

import {DoorObject} from "../objects/house/door.js";
import {WallObject} from "../objects/house/wall.js";
import {WindowObject} from "../objects/house/window.js";

export type WallOpeningObject = DoorObject | WindowObject;

type WallSnapCandidate = {
	wall: WallObject;
	localPosition: Vector3;
	distanceSquared: number;
};

export function isWallOpeningObject(
	object: Object3D,
): object is WallOpeningObject {
	return object instanceof DoorObject || object instanceof WindowObject;
}

/**
 * Attach an opening to the closest finite wall segment.
 *
 * The opening is centered through the wall depth, aligned with the wall, and kept within the wall's horizontal and vertical bounds. Its visible panel thickness does not participate in placement or in the wall cut.
 */
export function snapOpeningToNearestWall(
	opening: WallOpeningObject,
	root: Object3D,
): WallObject | null {
	opening.updateWorldMatrix(true, false);
	const worldPosition = opening.getWorldPosition(new Vector3());
	let nearest: WallSnapCandidate | null = null;

	root.traverse((object) => {
		if (!(object instanceof WallObject) || object.internal) {
			return;
		}

		object.updateWorldMatrix(true, false);
		const wallPosition = object.worldToLocal(worldPosition.clone());
		const maximumOffset = Math.max(0, (object.length - opening.width) / 2);
		const maximumHeight = Math.max(0, object.height - opening.height);
		const localPosition = new Vector3(
			Math.min(maximumOffset, Math.max(-maximumOffset, wallPosition.x)),
			Math.min(maximumHeight, Math.max(0, wallPosition.y)),
			0,
		);
		const snappedWorldPosition = object.localToWorld(localPosition.clone());
		const distanceSquared = snappedWorldPosition.distanceToSquared(worldPosition);

		if (!nearest || distanceSquared < nearest.distanceSquared) {
			nearest = {wall: object, localPosition, distanceSquared};
		}
	});

	if (!nearest) {
		return null;
	}

	if (opening.parent !== nearest.wall) {
		nearest.wall.add(opening);
	}
	opening.position.copy(nearest.localPosition);
	opening.quaternion.identity();
	opening.updateMatrix();
	opening.updateWorldMatrix(false, true);
	return nearest.wall;
}
