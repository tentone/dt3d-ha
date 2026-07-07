import { Object3D, Mesh } from "three";

/**
 * Find the first Mesh object in the hierarchy of an Object3D.
 * 
 * If the provided object is a Mesh, it will be returned directly. Otherwise, the function will traverse the object's children to find a Mesh.
 * 
 * @param object - The Object3D to search for a Mesh
 * @returns The first Mesh found in the hierarchy, or null if none is found
 */
export function findMesh(object: Object3D | null): Mesh | null {
	if (!object) {
		return null;
	}
	if (object instanceof Mesh) {
		return object;
	}
	let mesh: Mesh | null = null;
	object.traverse((child) => {
		if (!mesh && child instanceof Mesh) {
			mesh = child;
		}
	});
	return mesh;
}
