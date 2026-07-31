import type {Object3D} from "three";

/** Mark a scene object as a system-managed implementation detail. */
export function markObjectInternal<T extends Object3D>(
	object: T,
	recursive = false,
): T {
	if (recursive) {
		object.traverse((child) => {
			child.internal = true;
		});
	} else {
		object.internal = true;
	}
	return object;
}

/** Return whether an object is hidden from user-facing editor operations. */
export function isInternalObject(object: Object3D | null | undefined): boolean {
	return object?.internal === true;
}

/**
 * Resolve a raycast hit to the user-managed object that owns it.
 *
 * A rendered mesh can sit below one or more internal groups. The highest
 * internal object in that branch defines the system-managed subtree, so the
 * object directly above it is the one the user may select.
 */
export function resolveUserObject(
	object: Object3D | null | undefined,
	boundary?: Object3D | null,
): Object3D | null {
	if (!object || object === boundary) {
		return null;
	}

	let current: Object3D | null = object;
	while (current && current !== boundary && !isInternalObject(current)) {
		current = current.parent;
	}
	if (!current || current === boundary) {
		return object;
	}

	while (current && current !== boundary && isInternalObject(current)) {
		current = current.parent;
	}

	return current && current !== boundary ? current : null;
}
