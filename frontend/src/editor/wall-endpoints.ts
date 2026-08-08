import type {Camera, Object3D, Quaternion} from "three";
import {
	Color,
	CylinderGeometry,
	Group,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	Raycaster,
	Vector2,
	Vector3,
} from "three";

import {WallObject} from "../objects/house/wall.js";
import {getCSSVar} from "../utils/css-utils.js";
import {markObjectInternal} from "../utils/internal-object.js";

type WallEndpoint = "start" | "end";

type WallEndpointContext = {
	canvas: HTMLCanvasElement | null;
	camera: Camera | null;
	space: Group | null;
};

type WallEndpointCallbacks = {
	attachTransform: (object: Object3D) => void;
};

type EndpointReference = {
	wall: WallObject;
	endpoint: WallEndpoint;
	fixedPoint: Vector3;
};

type WallSnapshot = {
	wall: WallObject;
	parent: Object3D;
	index: number;
	present: boolean;
	start: Vector3;
	end: Vector3;
};

type ChildSnapshot = {
	object: Object3D;
	parent: Object3D;
	index: number;
	position: Vector3;
	quaternion: Quaternion;
	scale: Vector3;
};

type EndpointSnapshot = {
	walls: WallSnapshot[];
	children: ChildSnapshot[];
};

type EndpointDrag = {
	handle: WallEndpointHandle;
	origin: Vector3;
	references: EndpointReference[];
	before: EndpointSnapshot | null;
	createdWalls: WallObject[];
	existingWalls: WallObject[];
	existingChildren: Object3D[];
	blocked: boolean;
};

export type WallEndpointEdit = {
	createdWalls: WallObject[];
	existingObjects: Object3D[];
	undo: () => void;
	redo: () => void;
};

export type WallEndpointFinish = {
	handled: boolean;
	edit: WallEndpointEdit | null;
};

const POINT_EPSILON = 1e-4;
const MINIMUM_WALL_LENGTH = 1e-3;

class WallEndpointHandle extends Mesh {
	public readonly wall: WallObject;

	public readonly endpoint: WallEndpoint;

	public constructor(
		wall: WallObject,
		endpoint: WallEndpoint,
		geometry: CylinderGeometry,
		material: MeshBasicMaterial,
	) {
		super(geometry, material);
		this.wall = wall;
		this.endpoint = endpoint;
		this.name = endpoint === "start" ? "Wall start point" : "Wall end point";
		this.renderOrder = 1000;
		this.internal = true;
	}
}

/** Displays and edits the two endpoints of the selected wall. */
export class WallEndpointManager {
	private readonly helpers: Group;

	private readonly handleGroup = markObjectInternal(new Group(), true);

	private readonly raycaster = new Raycaster();

	private readonly pointer = new Vector2();

	private readonly getContext: () => WallEndpointContext;

	private readonly callbacks: WallEndpointCallbacks;

	private selectedWall: WallObject | null = null;

	private handles: [WallEndpointHandle, WallEndpointHandle] | null = null;

	private drag: EndpointDrag | null = null;

	public constructor(
		helpers: Group,
		getContext: () => WallEndpointContext,
		callbacks: WallEndpointCallbacks,
	) {
		this.helpers = helpers;
		this.getContext = getContext;
		this.callbacks = callbacks;
		this.handleGroup.name = "Wall endpoint handles";
		this.handleGroup.visible = false;
		this.helpers.add(this.handleGroup);
	}

	/** Show endpoint handles for the selected, editable wall. */
	public setSelectedWall(wall: WallObject | null): void {
		if (this.drag) {
			if (wall) {
				return;
			}
			this.drag = null;
		}

		this.selectedWall = wall && !wall.locked ? wall : null;
		this.rebuildHandles();
	}

	/** Keep the handles aligned after a wall is changed by another editor control. */
	public refreshHandles(): void {
		const {space} = this.getContext();
		if (
			!space ||
			!this.selectedWall ||
			this.selectedWall.locked ||
			!this.selectedWall.parent
		) {
			this.handleGroup.visible = false;
			return;
		}

		if (!this.handles || this.handles[0].wall !== this.selectedWall) {
			this.rebuildHandles();
			return;
		}

		const endpoints = this.getWallSpaceEndpoints(this.selectedWall, space);
		this.setHandleSpacePosition(this.handles[0], endpoints.start, space);
		this.setHandleSpacePosition(this.handles[1], endpoints.end, space);
		this.setHandleHeight(this.handles[0], endpoints.start, space);
		this.setHandleHeight(this.handles[1], endpoints.end, space);
		this.handleGroup.visible = true;
	}

	/** Return whether an object is one of this manager's editor-only handles. */
	public isHandle(object: Object3D | null | undefined): boolean {
		return (
			object instanceof WallEndpointHandle && object.parent === this.handleGroup
		);
	}

	/** Attach transform controls when the user double-clicks a visible endpoint. */
	public handleDoubleClick(event: MouseEvent): boolean {
		const {canvas, camera} = this.getContext();
		if (!canvas || !camera || !this.handleGroup.visible || !this.handles) {
			return false;
		}

		const rect = canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, camera);
		const hit = this.raycaster.intersectObjects(this.handles, false)[0];
		if (!(hit?.object instanceof WallEndpointHandle)) {
			return false;
		}

		this.callbacks.attachTransform(hit.object);
		return true;
	}

	/** Capture the wall junction when TransformControls starts dragging a handle. */
	public beginDrag(object: Object3D | null | undefined): boolean {
		if (!(object instanceof WallEndpointHandle) || !this.isHandle(object)) {
			return false;
		}

		const {space} = this.getContext();
		if (!space) {
			return true;
		}

		const endpoints = this.getWallSpaceEndpoints(object.wall, space);
		this.drag = {
			handle: object,
			origin: endpoints[object.endpoint].clone(),
			references: [],
			before: null,
			createdWalls: [],
			existingWalls: [],
			existingChildren: [],
			blocked: false,
		};
		return true;
	}

	/** Apply a handle's live TransformControls position to every wall at its junction. */
	public handleObjectChange(object: Object3D | null | undefined): boolean {
		if (!(object instanceof WallEndpointHandle) || !this.isHandle(object)) {
			return false;
		}

		const {space} = this.getContext();
		const drag = this.drag;
		if (!space || !drag || drag.handle !== object) {
			return true;
		}

		const point = space.worldToLocal(object.getWorldPosition(new Vector3()));
		point.y = drag.origin.y;
		this.setHandleSpacePosition(object, point, space);

		if (drag.blocked) {
			this.setHandleSpacePosition(object, drag.origin, space);
			return true;
		}

		if (!drag.before) {
			if (this.distance2D(point, drag.origin) <= POINT_EPSILON) {
				return true;
			}
			if (!this.initializeDrag(drag, space)) {
				drag.blocked = true;
				this.setHandleSpacePosition(object, drag.origin, space);
				return true;
			}
		}

		if (
			drag.references.some(
				(reference) =>
					this.distance2D(point, reference.fixedPoint) < MINIMUM_WALL_LENGTH,
			)
		) {
			this.refreshHandles();
			return true;
		}

		for (const reference of drag.references) {
			const start =
				reference.endpoint === "start" ? point : reference.fixedPoint;
			const end = reference.endpoint === "end" ? point : reference.fixedPoint;
			this.setWallSpacePoints(reference.wall, start, end, space);
		}
		this.refreshHandles();
		return true;
	}

	/** Finish a handle drag and return one reversible, persistence-ready edit. */
	public finishDrag(object: Object3D | null | undefined): WallEndpointFinish {
		if (!(object instanceof WallEndpointHandle) || !this.isHandle(object)) {
			return {handled: false, edit: null};
		}

		const drag = this.drag;
		this.drag = null;
		if (!drag?.before || drag.blocked) {
			this.refreshHandles();
			return {handled: true, edit: null};
		}

		const {space} = this.getContext();
		if (!space) {
			this.applySnapshot(drag.before);
			return {handled: true, edit: null};
		}

		const movedPoint = this.getHandleSpacePosition(object, space);
		if (this.distance2D(movedPoint, drag.origin) <= POINT_EPSILON) {
			this.applySnapshot(drag.before);
			return {handled: true, edit: null};
		}

		const allWalls = [...drag.existingWalls, ...drag.createdWalls];
		const allChildren = [
			...new Set([
				...drag.existingChildren,
				...allWalls.flatMap((wall) => this.getWallUserChildren(wall)),
			]),
		];
		const after = this.captureSnapshot(allWalls, allChildren, space);
		const before = drag.before;
		const existingObjects = [
			...new Set<Object3D>([...drag.existingWalls, ...drag.existingChildren]),
		];

		return {
			handled: true,
			edit: {
				createdWalls: drag.createdWalls,
				existingObjects,
				undo: () => this.applySnapshot(before),
				redo: () => this.applySnapshot(after),
			},
		};
	}

	/**
	 * Split walls wherever their center lines join so every T-junction and
	 * crossing has a real, movable endpoint.
	 *
	 * When a preceding endpoint edit is supplied, the split and endpoint move
	 * are returned as one reversible mutation.
	 */
	public analyzeWallJoins(
		precedingEdit: WallEndpointEdit | null = null,
	): WallEndpointEdit | null {
		const {space} = this.getContext();
		if (!space) {
			return precedingEdit;
		}

		const plannedSplits = this.findPlannedWallSplits(space);
		const existingWalls = [...plannedSplits.keys()];
		if (existingWalls.length === 0) {
			return precedingEdit;
		}

		const existingChildren = existingWalls.flatMap((wall) =>
			this.getWallUserChildren(wall),
		);
		const before = this.captureSnapshot(
			existingWalls,
			existingChildren,
			space,
		);
		const createdWalls: WallObject[] = [];

		for (const wall of existingWalls) {
			const endpoints = this.getWallSpaceEndpoints(wall, space);
			const points = plannedSplits.get(wall)!;
			points.sort(
				(left, right) =>
					this.projectPointToSegment(
						right,
						endpoints.start,
						endpoints.end,
					).t -
					this.projectPointToSegment(
						left,
						endpoints.start,
						endpoints.end,
					).t,
			);
			for (const point of points) {
				const splitWall = this.splitWall(wall, point, space);
				createdWalls.push(splitWall);
				const splitEndpoints = this.getWallSpaceEndpoints(splitWall, space);
				before.walls.push({
					wall: splitWall,
					parent: splitWall.parent!,
					index: splitWall.parent!.children.indexOf(splitWall),
					present: false,
					start: splitEndpoints.start,
					end: splitEndpoints.end,
				});
			}
		}

		const allWalls = [...existingWalls, ...createdWalls];
		const allChildren = [
			...new Set([
				...existingChildren,
				...allWalls.flatMap((wall) => this.getWallUserChildren(wall)),
			]),
		];
		const after = this.captureSnapshot(allWalls, allChildren, space);
		const splitEdit: WallEndpointEdit = {
			createdWalls,
			existingObjects: [
				...new Set<Object3D>([...existingWalls, ...existingChildren]),
			],
			undo: () => this.applySnapshot(before),
			redo: () => this.applySnapshot(after),
		};
		this.refreshHandles();
		return precedingEdit
			? this.combineEdits(precedingEdit, splitEdit)
			: splitEdit;
	}

	private combineEdits(
		first: WallEndpointEdit,
		second: WallEndpointEdit,
	): WallEndpointEdit {
		return {
			createdWalls: [...new Set([...first.createdWalls, ...second.createdWalls])],
			existingObjects: [
				...new Set([...first.existingObjects, ...second.existingObjects]),
			],
			undo: () => {
				second.undo();
				first.undo();
			},
			redo: () => {
				first.redo();
				second.redo();
			},
		};
	}

	private findPlannedWallSplits(space: Group): Map<WallObject, Vector3[]> {
		const walls: Array<{
			wall: WallObject;
			start: Vector3;
			end: Vector3;
		}> = [];
		space.traverse((object) => {
			if (
				object instanceof WallObject &&
				!object.internal &&
				object.parent
			) {
				walls.push({wall: object, ...this.getWallSpaceEndpoints(object, space)});
			}
		});

		const result = new Map<WallObject, Vector3[]>();
		const addSplit = (
			candidate: (typeof walls)[number],
			point: Vector3,
		): void => {
			if (candidate.wall.locked) {
				return;
			}
			const projection = this.projectPointToSegment(
				point,
				candidate.start,
				candidate.end,
			);
			if (
				projection.distance > POINT_EPSILON ||
				projection.t <= POINT_EPSILON ||
				projection.t >= 1 - POINT_EPSILON
			) {
				return;
			}
			const splits = result.get(candidate.wall) ?? [];
			if (!splits.some((split) => this.distance2D(split, point) <= POINT_EPSILON)) {
				splits.push(point.clone());
				result.set(candidate.wall, splits);
			}
		};

		for (let leftIndex = 0; leftIndex < walls.length; leftIndex++) {
			for (
				let rightIndex = leftIndex + 1;
				rightIndex < walls.length;
				rightIndex++
			) {
				const left = walls[leftIndex];
				const right = walls[rightIndex];
				if (Math.abs(left.start.y - right.start.y) > POINT_EPSILON) {
					continue;
				}

				const rx = left.end.x - left.start.x;
				const rz = left.end.z - left.start.z;
				const sx = right.end.x - right.start.x;
				const sz = right.end.z - right.start.z;
				const cross = rx * sz - rz * sx;
				const qx = right.start.x - left.start.x;
				const qz = right.start.z - left.start.z;
				if (Math.abs(cross) > POINT_EPSILON) {
					const leftT = (qx * sz - qz * sx) / cross;
					const rightT = (qx * rz - qz * rx) / cross;
					if (
						leftT >= -POINT_EPSILON &&
						leftT <= 1 + POINT_EPSILON &&
						rightT >= -POINT_EPSILON &&
						rightT <= 1 + POINT_EPSILON
					) {
						const point = left.start.clone().lerp(left.end, leftT);
						addSplit(left, point);
						addSplit(right, point);
					}
					continue;
				}

				// Parallel walls can still form a T-junction or meet along the same
				// center line. Project each endpoint to pick up those interior joins.
				for (const point of [left.start, left.end]) {
					addSplit(right, point);
				}
				for (const point of [right.start, right.end]) {
					addSplit(left, point);
				}
			}
		}
		return result;
	}

	private initializeDrag(drag: EndpointDrag, space: Group): boolean {
		const junction = this.findJunction(drag.origin, space);
		const existingWalls = [
			...new Set([
				...junction.endpoints.map(({wall}) => wall),
				...junction.interiorWalls,
			]),
		];
		if (
			existingWalls.length === 0 ||
			existingWalls.some((wall) => wall.locked)
		) {
			return false;
		}

		const existingChildren = existingWalls.flatMap((wall) =>
			this.getWallUserChildren(wall),
		);
		const before = this.captureSnapshot(existingWalls, existingChildren, space);
		const createdWalls = junction.interiorWalls.map((wall) =>
			this.splitWall(wall, drag.origin, space),
		);
		const references = this.findJunction(drag.origin, space).endpoints.map(
			({wall, endpoint}) => {
				const endpoints = this.getWallSpaceEndpoints(wall, space);
				return {
					wall,
					endpoint,
					fixedPoint: endpoints[endpoint === "start" ? "end" : "start"],
				};
			},
		);

		if (references.length === 0) {
			this.applySnapshot(before);
			return false;
		}

		for (const wall of createdWalls) {
			const endpoints = this.getWallSpaceEndpoints(wall, space);
			before.walls.push({
				wall,
				parent: wall.parent!,
				index: wall.parent!.children.indexOf(wall),
				present: false,
				start: endpoints.start,
				end: endpoints.end,
			});
		}

		drag.references = references;
		drag.before = before;
		drag.createdWalls = createdWalls;
		drag.existingWalls = existingWalls;
		drag.existingChildren = existingChildren;
		return true;
	}

	private findJunction(
		point: Vector3,
		space: Group,
	): {
		endpoints: Omit<EndpointReference, "fixedPoint">[];
		interiorWalls: WallObject[];
	} {
		const endpoints: Omit<EndpointReference, "fixedPoint">[] = [];
		const interiorWalls: WallObject[] = [];
		space.traverse((object) => {
			if (
				!(object instanceof WallObject) ||
				object.internal ||
				!object.parent
			) {
				return;
			}

			const wallPoints = this.getWallSpaceEndpoints(object, space);
			if (
				Math.abs(wallPoints.start.y - point.y) <= POINT_EPSILON &&
				this.distance2D(wallPoints.start, point) <= POINT_EPSILON
			) {
				endpoints.push({wall: object, endpoint: "start"});
				return;
			}
			if (
				Math.abs(wallPoints.end.y - point.y) <= POINT_EPSILON &&
				this.distance2D(wallPoints.end, point) <= POINT_EPSILON
			) {
				endpoints.push({wall: object, endpoint: "end"});
				return;
			}

			const projection = this.projectPointToSegment(
				point,
				wallPoints.start,
				wallPoints.end,
			);
			if (
				Math.abs(wallPoints.start.y - point.y) <= POINT_EPSILON &&
				projection.distance <= POINT_EPSILON &&
				projection.t > POINT_EPSILON &&
				projection.t < 1 - POINT_EPSILON
			) {
				interiorWalls.push(object);
			}
		});
		return {endpoints, interiorWalls};
	}

	private splitWall(
		wall: WallObject,
		point: Vector3,
		space: Group,
	): WallObject {
		const parent = wall.parent!;
		const index = parent.children.indexOf(wall);
		const endpoints = this.getWallSpaceEndpoints(wall, space);
		const projection = this.projectPointToSegment(
			point,
			endpoints.start,
			endpoints.end,
		);
		const children = this.getWallUserChildren(wall).map((child) => {
			child.updateWorldMatrix(true, false);
			return {
				child,
				worldMatrix: child.matrixWorld.clone(),
				t: this.projectPointToSegment(
					space.worldToLocal(child.getWorldPosition(new Vector3())),
					endpoints.start,
					endpoints.end,
				).t,
			};
		});

		const splitWall = wall.clone(false);
		delete splitWall.userData.apiId;
		splitWall.name = `${wall.name || "Wall"} (split)`;
		parent.add(splitWall);
		parent.children.splice(parent.children.indexOf(splitWall), 1);
		parent.children.splice(index + 1, 0, splitWall);
		this.setWallSpacePoints(wall, endpoints.start, point, space);
		this.setWallSpacePoints(splitWall, point, endpoints.end, space);

		for (const {child, t, worldMatrix} of children) {
			const target = t > projection.t ? splitWall : wall;
			if (child.parent !== target) {
				target.add(child);
			}
			target.updateWorldMatrix(true, false);
			const localMatrix = new Matrix4()
				.copy(target.matrixWorld)
				.invert()
				.multiply(worldMatrix);
			localMatrix.decompose(child.position, child.quaternion, child.scale);
			child.updateMatrix();
			child.updateWorldMatrix(false, true);
		}
		this.setWallSpacePoints(wall, endpoints.start, point, space);
		this.setWallSpacePoints(splitWall, point, endpoints.end, space);
		splitWall.init();
		return splitWall;
	}

	private captureSnapshot(
		walls: WallObject[],
		children: Object3D[],
		space: Group,
	): EndpointSnapshot {
		return {
			walls: walls
				.filter((wall) => Boolean(wall.parent))
				.map((wall) => {
					const endpoints = this.getWallSpaceEndpoints(wall, space);
					return {
						wall,
						parent: wall.parent!,
						index: wall.parent!.children.indexOf(wall),
						present: true,
						start: endpoints.start,
						end: endpoints.end,
					};
				}),
			children: children
				.filter((child) => Boolean(child.parent))
				.map((child) => ({
					object: child,
					parent: child.parent!,
					index: child.parent!.children.indexOf(child),
					position: child.position.clone(),
					quaternion: child.quaternion.clone(),
					scale: child.scale.clone(),
				})),
		};
	}

	private applySnapshot(snapshot: EndpointSnapshot): void {
		const {space} = this.getContext();
		if (!space) {
			return;
		}

		for (const state of snapshot.walls
			.filter(({present}) => present)
			.sort((left, right) => left.index - right.index)) {
			if (state.wall.parent !== state.parent) {
				state.parent.add(state.wall);
			}
			const currentIndex = state.parent.children.indexOf(state.wall);
			if (currentIndex !== state.index) {
				state.parent.children.splice(currentIndex, 1);
				state.parent.children.splice(
					Math.max(0, Math.min(state.index, state.parent.children.length)),
					0,
					state.wall,
				);
			}
			this.setWallSpacePoints(state.wall, state.start, state.end, space);
			state.wall.init();
		}

		for (const child of snapshot.children) {
			if (child.object.parent !== child.parent) {
				child.parent.add(child.object);
			}
			const currentIndex = child.parent.children.indexOf(child.object);
			if (currentIndex !== child.index) {
				child.parent.children.splice(currentIndex, 1);
				child.parent.children.splice(
					Math.max(0, Math.min(child.index, child.parent.children.length)),
					0,
					child.object,
				);
			}
			child.object.position.copy(child.position);
			child.object.quaternion.copy(child.quaternion);
			child.object.scale.copy(child.scale);
			child.object.updateMatrix();
		}

		for (const state of snapshot.walls.filter(({present}) => !present)) {
			state.wall.removeFromParent();
		}
		for (const state of snapshot.walls.filter(({present}) => present)) {
			this.setWallSpacePoints(state.wall, state.start, state.end, space);
		}
		this.refreshHandles();
	}

	private rebuildHandles(): void {
		for (const child of [...this.handleGroup.children]) {
			this.handleGroup.remove(child);
		}
		if (this.handles) {
			this.handles[0].geometry.dispose();
			const materials = new Set(
				this.handles.flatMap((handle) =>
					Array.isArray(handle.material) ? handle.material : [handle.material],
				),
			);
			materials.forEach((material) => material.dispose());
		}
		this.handles = null;

		if (!this.selectedWall || !this.selectedWall.parent) {
			this.handleGroup.visible = false;
			return;
		}

		const color = new Color(getCSSVar("--primary-color") || "#03a9f4");
		const geometry = new CylinderGeometry(0.065, 0.065, 1, 20);
		geometry.translate(0, 0.5, 0);
		const material = new MeshBasicMaterial({
			color,
			depthTest: false,
			transparent: true,
			opacity: 0.95,
		});
		this.handles = [
			new WallEndpointHandle(this.selectedWall, "start", geometry, material),
			new WallEndpointHandle(this.selectedWall, "end", geometry, material),
		];
		this.handleGroup.add(...this.handles);
		this.refreshHandles();
	}

	private getWallUserChildren(wall: WallObject): Object3D[] {
		return wall.children.filter((child) => child.internal !== true);
	}

	private getWallSpaceEndpoints(
		wall: WallObject,
		space: Group,
	): { start: Vector3; end: Vector3 } {
		wall.updateWorldMatrix(true, false);
		space.updateWorldMatrix(true, false);
		return {
			start: space.worldToLocal(
				wall.localToWorld(new Vector3(-wall.length / 2, 0, 0)),
			),
			end: space.worldToLocal(
				wall.localToWorld(new Vector3(wall.length / 2, 0, 0)),
			),
		};
	}

	private setWallSpacePoints(
		wall: WallObject,
		start: Vector3,
		end: Vector3,
		space: Group,
	): void {
		if (!wall.parent) {
			return;
		}
		wall.setFromPoints(
			this.spacePointToParent(start, wall.parent, space),
			this.spacePointToParent(end, wall.parent, space),
		);
		wall.updateWorldMatrix(false, true);
	}

	private spacePointToParent(
		point: Vector3,
		parent: Object3D,
		space: Group,
	): Vector3 {
		space.updateWorldMatrix(true, false);
		parent.updateWorldMatrix(true, false);
		return parent.worldToLocal(space.localToWorld(point.clone()));
	}

	private getHandleSpacePosition(
		handle: WallEndpointHandle,
		space: Group,
	): Vector3 {
		return space.worldToLocal(handle.getWorldPosition(new Vector3()));
	}

	private setHandleSpacePosition(
		handle: WallEndpointHandle,
		point: Vector3,
		space: Group,
	): void {
		this.helpers.updateWorldMatrix(true, false);
		handle.position.copy(
			this.helpers.worldToLocal(space.localToWorld(point.clone())),
		);
		handle.updateMatrix();
	}

	private setHandleHeight(
		handle: WallEndpointHandle,
		point: Vector3,
		space: Group,
	): void {
		const junction = this.findJunction(point, space);
		const walls = [
			...junction.endpoints.map(({wall}) => wall),
			...junction.interiorWalls,
		];
		const height = Math.max(
			handle.wall.height,
			...walls.map((wall) => wall.height),
		);
		handle.scale.set(1, height, 1);
		handle.updateMatrix();
	}

	private projectPointToSegment(
		point: Vector3,
		start: Vector3,
		end: Vector3,
	): { t: number; distance: number } {
		const dx = end.x - start.x;
		const dz = end.z - start.z;
		const lengthSquared = dx * dx + dz * dz;
		if (lengthSquared <= POINT_EPSILON * POINT_EPSILON) {
			return {t: 0, distance: this.distance2D(point, start)};
		}
		const t =
			((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared;
		const projected = new Vector3(start.x + dx * t, point.y, start.z + dz * t);
		return {t, distance: this.distance2D(point, projected)};
	}

	private distance2D(left: Vector3, right: Vector3): number {
		return Math.hypot(left.x - right.x, left.z - right.z);
	}
}
