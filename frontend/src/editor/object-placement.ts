import type {BufferGeometry, Material, Object3D, Raycaster} from "three";
import {
	BackSide,
	BoxHelper,
	EdgesGeometry,
	Group,
	Light,
	Line,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	Plane,
	Sprite,
	Texture,
	Vector3,
} from "three";

import {
	markObjectInternal,
	resolveUserObject,
} from "../utils/internal-object.js";
import {getObjectBounds} from "./collision.js";

const PLACEMENT_COLOR = 0x63d8ff;
const GROUND = new Plane(new Vector3(0, 1, 0), 0);

/** Pick visible model surfaces, including furniture's internal parts, then the ground. */
export function pickObjectPlacementPoint(
	raycaster: Raycaster,
	space: Object3D,
): Vector3 | null {
	space.updateWorldMatrix(true, true);
	const hit = raycaster
		.intersectObjects(space.children, true)
		.find((candidate) => {
			if (
				!(candidate.object instanceof Mesh) ||
				!resolveUserObject(candidate.object, space)
			)
				return false;
			for (
				let parent: Object3D | null = candidate.object;
				parent;
				parent = parent.parent
			) {
				if (!parent.visible) return false;
			}
			return true;
		});
	if (hit) return hit.point.clone();
	const point = raycaster.ray.intersectPlane(GROUND, new Vector3());
	return point && point.distanceToSquared(raycaster.ray.origin) > 1e-10
		? point
		: null;
}

/** An unsaved object and its temporary outline, kept outside the space hierarchy. */
export class ObjectPlacementPreview {
	public readonly object: Object3D;
	public readonly root = markObjectInternal(new Group());
	private readonly anchorOffset = new Vector3();
	private readonly helpers: Object3D[] = [];
	private readonly edgeGeometries = new Map<BufferGeometry, EdgesGeometry>();
	private readonly lightVisibility = new Map<Light, boolean>();
	private readonly shadowSettings = new Map<Mesh, boolean>();
	private readonly edgeMaterial = new LineBasicMaterial({
		color: PLACEMENT_COLOR,
		depthTest: false,
		depthWrite: false,
		toneMapped: false,
	});
	private readonly silhouetteMaterial = new MeshBasicMaterial({
		color: PLACEMENT_COLOR,
		side: BackSide,
		depthWrite: false,
		toneMapped: false,
	});
	private boundsHelper: BoxHelper | null = null;
	private released = false;

	constructor(object: Object3D) {
		this.object = object;
		this.root.name = "Object placement preview";
		this.root.add(object);
		const bounds = getObjectBounds([object]);
		if (!bounds.isEmpty()) {
			const center = bounds.getCenter(new Vector3());
			this.anchorOffset
				.copy(object.position)
				.sub(new Vector3(center.x, bounds.min.y, center.z));
		}
		const meshes: Mesh[] = [];
		object.traverse((child) => {
			if (child instanceof Mesh) meshes.push(child);
			if (child instanceof Light) {
				this.lightVisibility.set(child, child.visible);
				child.visible = false;
			}
		});
		for (const mesh of meshes) {
			this.shadowSettings.set(mesh, mesh.castShadow);
			mesh.castShadow = false;
			let edges = this.edgeGeometries.get(mesh.geometry);
			if (!edges) {
				edges = new EdgesGeometry(mesh.geometry, 30);
				this.edgeGeometries.set(mesh.geometry, edges);
			}
			const wire = markObjectInternal(
				new LineSegments(edges, this.edgeMaterial),
			);
			wire.renderOrder = 1000;
			// An expanded back face also outlines curved models with no sharp edges.
			const silhouette = markObjectInternal(
				new Mesh(mesh.geometry, this.silhouetteMaterial),
			);
			silhouette.scale.setScalar(1.025);
			silhouette.renderOrder = -1;
			mesh.add(wire, silhouette);
			this.helpers.push(wire, silhouette);
		}
		if (meshes.length === 0) {
			this.boundsHelper = markObjectInternal(
				new BoxHelper(object, PLACEMENT_COLOR),
			);
			this.root.add(this.boundsHelper);
		}
		this.root.visible = false;
	}

	/** Anchor the bottom center of geometry on a surface. Markers use their origin. */
	public move(point: Vector3 | null, snapSize = 0): void {
		if (this.released) return;
		this.root.visible = point !== null;
		if (!point) return;
		const target = point.clone();
		if (Number.isFinite(snapSize) && snapSize > 0) {
			target.x = Math.round(target.x / snapSize) * snapSize;
			target.z = Math.round(target.z / snapSize) * snapSize;
		}
		this.object.position.copy(target.add(this.anchorOffset));
		this.object.updateWorldMatrix(true, true);
		this.boundsHelper?.update();
	}

	/** Remove preview-only resources and return the actual object for a single create action. */
	public release(): Object3D {
		if (this.released) return this.object;
		this.released = true;
		this.helpers.forEach((helper) => helper.removeFromParent());
		this.edgeGeometries.forEach((geometry) => geometry.dispose());
		this.edgeMaterial.dispose();
		this.silhouetteMaterial.dispose();
		if (this.boundsHelper) {
			this.boundsHelper.geometry.dispose();
			this.boundsHelper.material.dispose();
		}
		this.lightVisibility.forEach((visible, light) => {
			light.visible = visible;
		});
		this.shadowSettings.forEach((castShadow, mesh) => {
			mesh.castShadow = castShadow;
		});
		this.object.removeFromParent();
		this.root.removeFromParent();
		return this.object;
	}

	public cancel(): void {
		if (this.released) return;
		disposeUnplacedObject(this.release());
	}
}

/** Release resources of a new object that was never registered with the material library. */
export function disposeUnplacedObject(object: Object3D): void {
	const geometries = new Set<BufferGeometry>();
	const materials = new Set<Material>();
	const textures = new Set<Texture>();
	object.traverse((child) => {
		if (child instanceof Mesh || child instanceof Line)
			geometries.add(child.geometry);
		if (
			child instanceof Mesh ||
			child instanceof Sprite ||
			child instanceof Line
		) {
			for (const material of Array.isArray(child.material)
				? child.material
				: [child.material])
				materials.add(material);
		}
		if (child instanceof Light) child.dispose();
		const element = (child as Object3D & { element?: HTMLElement }).element;
		element?.remove();
	});
	materials.forEach((material) => {
		Object.values(material).forEach((value: unknown) => {
			if (value instanceof Texture) textures.add(value);
		});
		material.dispose();
	});
	geometries.forEach((geometry) => geometry.dispose());
	textures.forEach((texture) => texture.dispose());
	object.removeFromParent();
}
