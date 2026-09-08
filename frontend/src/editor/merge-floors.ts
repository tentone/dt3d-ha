import type {MultiPolygon} from "polygon-clipping";
import polygonClipping from "polygon-clipping";
import type {Object3D} from "three";
import {Matrix4, Vector3} from "three";

import {FloorObject} from "../objects/house/floor.js";
import {isInternalObject} from "../utils/internal-object.js";

/** Convert coplanar, editable floors to the first floor's coordinate system. */
function mergeInput(objects: readonly Object3D[]): MultiPolygon[] | null {
	if (objects.length < 2 || new Set(objects).size !== objects.length)
		return null;
	const first = objects[0];
	first.updateWorldMatrix(true, false);
	if (Math.abs(first.matrixWorld.determinant()) < 1e-12) return null;
	const inverse = first.matrixWorld.clone().invert();
	const polygons: MultiPolygon[] = [];
	for (const object of objects) {
		if (!(object instanceof FloorObject) || !object.parent) return null;
		for (
			let ancestor: Object3D | null = object;
			ancestor;
			ancestor = ancestor.parent
		) {
			if (
				isInternalObject(ancestor) ||
				(ancestor as Object3D & { locked?: boolean }).locked
			)
				return null;
		}
		// Removing an owner must never discard its user-created descendants.
		if (
			object !== first &&
			object.children.some((child) => !isInternalObject(child))
		)
			return null;
		object.updateWorldMatrix(true, false);
		if (Math.abs(object.matrixWorld.determinant()) < 1e-12) return null;
		const transform = new Matrix4().multiplyMatrices(
			inverse,
			object.matrixWorld,
		);
		let coplanar = true;
		polygons.push(
			object.polygons.map(({points, holes}) =>
				[points, ...holes].map((ring) =>
					ring.map((point): [number, number] => {
						const local = new Vector3(point.x, 0, point.z).applyMatrix4(
							transform,
						);
						if (
							![local.x, local.y, local.z].every(Number.isFinite) ||
							Math.abs(local.y) > 1e-5
						)
							coplanar = false;
						return [local.x, local.z];
					}),
				),
			),
		);
		if (!coplanar) return null;
	}
	return polygons;
}

export function canMergeFloors(objects: readonly Object3D[]): boolean {
	return mergeInput(objects) !== null;
}

/** Union floor surfaces, retaining the first floor's identity, transform and material. */
export function mergeFloors(objects: readonly Object3D[]) {
	const input = mergeInput(objects);
	if (!input) return null;
	const union = polygonClipping.union(input[0], ...input.slice(1));
	if (!union.length) return null;
	const floor = objects[0] as FloorObject;
	const before = structuredClone(floor.polygons);
	const automatic = floor.automatic;
	const after = union.map(([outline, ...holes]) => ({
		points: outline.map(([x, z]) => ({x, z})),
		holes: holes.map((ring) => ring.map(([x, z]) => ({x, z}))),
	}));
	const removed = objects.slice(1).map((object) => ({
		object,
		parent: object.parent!,
		index: object.parent!.children.indexOf(object),
	}));
	const redo = () => {
		floor.setPolygons(after);
		floor.automatic = false;
		removed.forEach(({object}) => object.removeFromParent());
	};
	const undo = () => {
		floor.setPolygons(before);
		floor.automatic = automatic;
		for (const {object, parent, index} of [...removed].sort(
			(a, b) => a.index - b.index,
		)) {
			parent.add(object);
			parent.children.splice(parent.children.indexOf(object), 1);
			parent.children.splice(index, 0, object);
		}
	};
	redo();
	return {floor, removed: removed.map(({object}) => object), undo, redo};
}
