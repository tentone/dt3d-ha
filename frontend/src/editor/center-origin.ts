import type {Object3D} from "three";
import {BufferGeometry, Matrix4, Mesh, Vector3} from "three";

import {isInternalObject} from "../utils/internal-object.js";

/** Center editable mesh origins without moving their vertices or descendants in world space. */
export function centerOrigins(root: Object3D) {
	const changed = new Set<Object3D>();
	const snapshots = new Map<Object3D, ReturnType<typeof snapshot>>();
	function snapshot(object: Object3D) {
		return {
			position: object.position.clone(),
			matrix: object.matrix.clone(),
			geometry: object instanceof Mesh ? object.geometry : undefined,
			meshType: object.userData.meshType,
		};
	}
	function remember(object: Object3D) {
		if (!snapshots.has(object)) snapshots.set(object, snapshot(object));
		changed.add(object);
	}
	function visit(object: Object3D) {
		// Generated internals are rebuilt from their owner's parameters, not saved as meshes.
		if (
			isInternalObject(object) ||
			(object as Object3D & { locked?: boolean }).locked
		)
			return;
		if (
			object instanceof Mesh &&
			!object.userData.resourcePlaceholder &&
			!(object as Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh &&
			!(object as Mesh & { isInstancedMesh?: boolean }).isInstancedMesh
		) {
			const source = object.geometry;
			if (source.getAttribute("position")?.count) {
				source.computeBoundingBox();
				const center = source.boundingBox!.getCenter(new Vector3());
				if (
					[center.x, center.y, center.z].every(Number.isFinite) &&
					center.lengthSq() > 1e-20
				) {
					remember(object);
					// A plain buffer geometry preserves the edited vertices when saving primitives.
					const geometry = new BufferGeometry().copy(source);
					geometry.translate(-center.x, -center.y, -center.z);
					if (!geometry.morphTargetsRelative) {
						for (const attribute of geometry.morphAttributes.position ?? []) {
							for (let i = 0; i < attribute.count; i++) {
								attribute.setXYZ(
									i,
									attribute.getX(i) - center.x,
									attribute.getY(i) - center.y,
									attribute.getZ(i) - center.z,
								);
							}
						}
					}
					geometry.computeBoundingBox();
					geometry.computeBoundingSphere();
					object.geometry = geometry;
					delete object.userData.meshType;
					if (object.matrixAutoUpdate) object.updateMatrix();
					object.matrix.multiply(
						new Matrix4().makeTranslation(center.x, center.y, center.z),
					);
					object.position.setFromMatrixPosition(object.matrix);
					for (const child of object.children) {
						remember(child);
						if (child.matrixAutoUpdate) child.updateMatrix();
						child.matrix.premultiply(
							new Matrix4().makeTranslation(-center.x, -center.y, -center.z),
						);
						child.position.setFromMatrixPosition(child.matrix);
					}
				}
			}
		}
		object.children.forEach(visit);
	}
	visit(root);
	const after = new Map(
		[...changed].map((object) => [object, snapshot(object)]),
	);
	function restore(states: typeof snapshots) {
		for (const [object, state] of states) {
			object.position.copy(state.position);
			object.matrix.copy(state.matrix);
			if (object instanceof Mesh) object.geometry = state.geometry!;
			if (state.meshType === undefined) delete object.userData.meshType;
			else object.userData.meshType = state.meshType;
		}
		root.updateWorldMatrix(true, true);
	}
	root.updateWorldMatrix(true, true);
	return {
		objects: [...changed],
		undo: () => restore(snapshots),
		redo: () => restore(after),
	};
}
