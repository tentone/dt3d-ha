import type {Vector3} from "three";

/**
 * Constrain a point to the closest X- or Z-aligned position relative to an origin.
 * The candidate requiring the smallest displacement from the pointer wins.
 */
export function snapPointToClosestAxis(point: Vector3, origin: Vector3): Vector3 {
	const snapped = point.clone();
	const xDisplacement = Math.abs(point.x - origin.x);
	const zDisplacement = Math.abs(point.z - origin.z);

	if (xDisplacement <= zDisplacement) {
		snapped.x = origin.x;
	} else {
		snapped.z = origin.z;
	}

	return snapped;
}
