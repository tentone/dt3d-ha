import type {Camera, Object3D} from "three";
import {
	BufferGeometry,
	Color,
	Group,
	Line,
	LineBasicMaterial,
	Raycaster,
	Vector2,
	Vector3,
} from "three";

import {FloorObject} from "../objects/house/floor.js";
import {WallObject} from "../objects/house/wall.js";
import {Marker} from "../objects/measurement/marker.js";
import {getCSSVar} from "../utils/css-utils.js";
import {markObjectInternal} from "../utils/internal-object.js";
import {snapPointToClosestAxis} from "./axis-snap.js";

type FloorContext = {
	canvas: HTMLCanvasElement | null;
	camera: Camera | null;
	space: Group | null;
	gridSnapEnabled: boolean;
	gridSnapSize: number;
};

type FloorCallbacks = {
	addToScene: (object: FloorObject) => void;
	updateHintMessage: () => void;
};

type WallSegment = {
	a: Vector3;
	b: Vector3;
	splits: number[];
};

type GraphNode = {
	point: Vector3;
	neighbors: Set<number>;
};

type AutomaticFloorSnapshot = {
	floor: FloorObject;
	parent: Object3D;
	index: number;
	present: boolean;
	points: Array<{x: number; z: number}>;
};

export type AutomaticFloorEdit = {
	createdFloors: FloorObject[];
	existingFloors: FloorObject[];
	undo: () => void;
	redo: () => void;
};

const POINT_EPSILON = 1e-5;
const FLOOR_MINIMUM_AREA = 1e-4;

/** Draws planar floors and derives floor polygons from closed wall networks. */
export class FloorManager {
	private active = false;

	private points: Vector3[] = [];

	private hoverPoint: Vector3 | null = null;

	private draftHelpers = markObjectInternal(new Group(), true);

	private raycaster = new Raycaster();

	private pointer = new Vector2();

	private helpers: Group;

	private getContext: () => FloorContext;

	private callbacks: FloorCallbacks;

	public constructor(
		helpers: Group,
		getContext: () => FloorContext,
		callbacks: FloorCallbacks,
	) {
		this.helpers = helpers;
		this.getContext = getContext;
		this.callbacks = callbacks;
		this.draftHelpers.name = "Floor Draft";
		this.helpers.add(this.draftHelpers);
	}

	public isActive(): boolean {
		return this.active;
	}

	public hasDraft(): boolean {
		return this.points.length > 0;
	}

	public setActive(active: boolean): void {
		this.active = active;
		if (!active) {
			this.clearDraft();
		}
	}

	public clearDraft(): void {
		this.points = [];
		this.hoverPoint = null;
		this.clearDraftHelpers();
		this.callbacks.updateHintMessage();
	}

	public handleClick(event: MouseEvent): boolean {
		if (!this.active) {
			return false;
		}

		let point = this.pickPointFromEvent(event);
		if (!point) {
			return true;
		}

		if (this.points.length === 0) {
			this.points.push(point);
			this.updateDraftHelpers();
			this.callbacks.updateHintMessage();
			return true;
		}

		point.y = this.points[0].y;
		if (event.ctrlKey) {
			point = snapPointToClosestAxis(point, this.points.at(-1)!);
		}
		const {gridSnapEnabled, gridSnapSize} = this.getContext();
		const closeDistance = gridSnapEnabled
			? Math.max(0.1, gridSnapSize * 0.25)
			: 0.1;
		if (
			this.points.length >= 3 &&
			this.distance2D(point, this.points[0]) <= closeDistance
		) {
			this.finalizeFloor();
			return true;
		}

		if (this.distance2D(point, this.points.at(-1)!) <= POINT_EPSILON) {
			return true;
		}

		this.points.push(point);
		this.updateDraftHelpers();
		this.callbacks.updateHintMessage();
		return true;
	}

	public handlePointerMove(event: MouseEvent): void {
		if (!this.active || this.points.length === 0) {
			return;
		}

		this.hoverPoint = this.pickPointFromEvent(event);
		if (this.hoverPoint) {
			this.hoverPoint.y = this.points[0].y;
			if (event.ctrlKey) {
				this.hoverPoint = snapPointToClosestAxis(
					this.hoverPoint,
					this.points.at(-1)!,
				);
			}
		}
		this.updateDraftHelpers();
	}

	/**
	 * Reconcile automatic floors with every bounded face in the wall network.
	 * Manual floors are never changed and suppress an automatic floor where
	 * they already cover the same room.
	 */
	public reconcileFloorsFromClosedWalls(): AutomaticFloorEdit | null {
		const {space} = this.getContext();
		if (!space) {
			return null;
		}

		const manualPolygons: Vector3[][] = [];
		const automaticFloors: FloorObject[] = [];
		space.traverse((object) => {
			if (object instanceof FloorObject && !object.internal) {
				if (object.automatic) {
					automaticFloors.push(object);
				} else {
					manualPolygons.push(this.floorSpacePoints(object, space));
				}
			}
		});
		const faces = this.findClosedWallFaces(space).filter(
			(face) =>
				!manualPolygons.some((polygon) =>
					this.polygonCoversFace(polygon, face),
				),
		);
		const beforeExisting = new Map(
			automaticFloors.map((floor) => [
				floor,
				this.captureFloorSnapshot(floor),
			]),
		);
		const unmatchedFloors = new Set(automaticFloors);
		const matches = new Map<number, FloorObject>();

		// Preserve exact matches first, then pair changed rooms with the most
		// closely overlapping previous automatic floor.
		for (let index = 0; index < faces.length; index++) {
			const signature = this.pointsSignature(faces[index]);
			const match = [...unmatchedFloors].find(
				(floor) =>
					this.pointsSignature(this.floorSpacePoints(floor, space)) ===
					signature,
			);
			if (match) {
				matches.set(index, match);
				unmatchedFloors.delete(match);
			}
		}
		for (let index = 0; index < faces.length; index++) {
			if (matches.has(index)) {
				continue;
			}
			let best: FloorObject | null = null;
			let bestScore = Number.NEGATIVE_INFINITY;
			for (const floor of unmatchedFloors) {
				const score = this.floorMatchScore(
					this.floorSpacePoints(floor, space),
					faces[index],
				);
				if (score > bestScore) {
					best = floor;
					bestScore = score;
				}
			}
			if (best && Number.isFinite(bestScore)) {
				matches.set(index, best);
				unmatchedFloors.delete(best);
			}
		}

		const created: FloorObject[] = [];
		const updated: FloorObject[] = [];
		for (let index = 0; index < faces.length; index++) {
			const face = faces[index];
			const floor = matches.get(index);
			if (!floor) {
				const newFloor = this.createFloorFromSpacePoints(face, true);
				newFloor.init();
				space.add(newFloor);
				created.push(newFloor);
				continue;
			}
			if (
				this.pointsSignature(this.floorSpacePoints(floor, space)) !==
				this.pointsSignature(face)
			) {
				this.setFloorSpacePoints(floor, face, space);
				updated.push(floor);
			}
		}
		const removed = [...unmatchedFloors];
		for (const floor of removed) {
			floor.removeFromParent();
		}
		if (created.length === 0 && updated.length === 0 && removed.length === 0) {
			return null;
		}

		const existingFloors = [...new Set([...updated, ...removed])];
		const before: AutomaticFloorSnapshot[] = existingFloors.map(
			(floor) => beforeExisting.get(floor)!,
		);
		for (const floor of created) {
			const state = this.captureFloorSnapshot(floor);
			before.push({...state, present: false});
		}
		const after = [...existingFloors, ...created].map((floor) => {
			if (floor.parent) {
				return this.captureFloorSnapshot(floor);
			}
			return {...beforeExisting.get(floor)!, present: false};
		});

		return {
			createdFloors: created,
			existingFloors,
			undo: () => this.applyFloorSnapshot(before),
			redo: () => this.applyFloorSnapshot(after),
		};
	}

	private finalizeFloor(): void {
		if (this.points.length < 3 || !this.isSimplePolygon(this.points)) {
			return;
		}

		const floor = this.createFloorFromSpacePoints(this.points, false);
		this.clearDraft();
		this.callbacks.addToScene(floor);
	}

	private createFloorFromSpacePoints(
		points: Vector3[],
		automatic: boolean,
	): FloorObject {
		const normalized = this.removeCollinearPoints(points);
		const origin = normalized[0];
		const localPoints = normalized.map((point) => ({
			x: point.x - origin.x,
			z: point.z - origin.z,
		}));
		const floor = new FloorObject(localPoints, undefined, automatic);
		floor.position.copy(origin);
		return floor;
	}

	private pickPointFromEvent(event: MouseEvent): Vector3 | null {
		const {canvas, camera, space, gridSnapEnabled, gridSnapSize} =
			this.getContext();
		if (!canvas || !camera || !space) {
			return null;
		}

		const rect = canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, camera);
		const intersection = this.raycaster.intersectObjects(space.children, true)[0];
		if (!intersection) {
			return null;
		}

		const point = space.worldToLocal(intersection.point.clone());
		if (gridSnapEnabled && gridSnapSize > 0) {
			point.x = Math.round(point.x / gridSnapSize) * gridSnapSize;
			point.z = Math.round(point.z / gridSnapSize) * gridSnapSize;
		}
		return point;
	}

	private updateDraftHelpers(): void {
		this.clearDraftHelpers();
		for (const point of this.points) {
			this.draftHelpers.add(markObjectInternal(new Marker(point)));
		}

		const outline = [...this.points];
		if (this.hoverPoint) {
			outline.push(this.hoverPoint);
		}
		if (outline.length >= 3) {
			outline.push(outline[0]);
		}
		if (outline.length >= 2) {
			const color = new Color(getCSSVar("--primary-color") || "#03a9f4");
			const line = new Line(
				new BufferGeometry().setFromPoints(outline),
				new LineBasicMaterial({color}),
			);
			this.draftHelpers.add(markObjectInternal(line));
		}
	}

	private clearDraftHelpers(): void {
		for (const child of [...this.draftHelpers.children]) {
			this.draftHelpers.remove(child);
			if (child instanceof Line || child instanceof Marker) {
				child.geometry.dispose();
				const materials = Array.isArray(child.material)
					? child.material
					: [child.material];
				materials.forEach((material) => material.dispose());
			}
		}
	}

	private findClosedWallFaces(space: Group): Vector3[][] {
		const segments: WallSegment[] = [];
		space.traverse((object) => {
			if (!(object instanceof WallObject) || object.internal) {
				return;
			}

			const start = space.worldToLocal(
				object.localToWorld(new Vector3(-object.length / 2, 0, 0)),
			);
			const end = space.worldToLocal(
				object.localToWorld(new Vector3(object.length / 2, 0, 0)),
			);
			if (
				Math.abs(start.y - end.y) <= POINT_EPSILON &&
				this.distance2D(start, end) > POINT_EPSILON
			) {
				segments.push({a: start, b: end, splits: [0, 1]});
			}
		});

		for (let i = 0; i < segments.length; i++) {
			for (let j = i + 1; j < segments.length; j++) {
				this.addSegmentIntersections(segments[i], segments[j]);
			}
		}

		const nodes: GraphNode[] = [];
		const getNode = (point: Vector3): number => {
			const existing = nodes.findIndex(
				(node) =>
					Math.abs(node.point.y - point.y) <= POINT_EPSILON &&
					this.distance2D(node.point, point) <= POINT_EPSILON,
			);
			if (existing >= 0) {
				return existing;
			}
			nodes.push({point: point.clone(), neighbors: new Set()});
			return nodes.length - 1;
		};

		for (const segment of segments) {
			const splits = [...new Set(segment.splits.map((value) => this.round(value)))]
				.filter((value) => value >= 0 && value <= 1)
				.sort((a, b) => a - b);
			for (let index = 1; index < splits.length; index++) {
				const a = getNode(segment.a.clone().lerp(segment.b, splits[index - 1]));
				const b = getNode(segment.a.clone().lerp(segment.b, splits[index]));
				if (a !== b) {
					nodes[a].neighbors.add(b);
					nodes[b].neighbors.add(a);
				}
			}
		}

		const visited = new Set<string>();
		const faces: Vector3[][] = [];
		for (let from = 0; from < nodes.length; from++) {
			for (const to of nodes[from].neighbors) {
				const edgeKey = `${from}:${to}`;
				if (visited.has(edgeKey)) {
					continue;
				}

				const face: number[] = [];
				let previous = from;
				let current = to;
				while (!visited.has(`${previous}:${current}`)) {
					visited.add(`${previous}:${current}`);
					face.push(previous);
					const neighbors = [...nodes[current].neighbors].sort((a, b) =>
						this.edgeAngle(nodes[current].point, nodes[a].point) -
						this.edgeAngle(nodes[current].point, nodes[b].point),
					);
					const reverseIndex = neighbors.indexOf(previous);
					const next = neighbors[(reverseIndex - 1 + neighbors.length) % neighbors.length];
					previous = current;
					current = next;
				}

				if (previous !== from || current !== to) {
					continue;
				}
				const simpleFace = this.extractSimpleFace(face, nodes);
				if (simpleFace.length < 3) {
					continue;
				}
				const points = simpleFace.map((node) => nodes[node].point.clone());
				if (this.signedArea(points) > FLOOR_MINIMUM_AREA) {
					faces.push(points);
				}
			}
		}
		return faces;
	}

	private addSegmentIntersections(a: WallSegment, b: WallSegment): void {
		if (Math.abs(a.a.y - b.a.y) > POINT_EPSILON) {
			return;
		}

		const rx = a.b.x - a.a.x;
		const rz = a.b.z - a.a.z;
		const sx = b.b.x - b.a.x;
		const sz = b.b.z - b.a.z;
		const cross = rx * sz - rz * sx;
		const qx = b.a.x - a.a.x;
		const qz = b.a.z - a.a.z;
		if (Math.abs(cross) > POINT_EPSILON) {
			const t = (qx * sz - qz * sx) / cross;
			const u = (qx * rz - qz * rx) / cross;
			if (
				t >= -POINT_EPSILON &&
				t <= 1 + POINT_EPSILON &&
				u >= -POINT_EPSILON &&
				u <= 1 + POINT_EPSILON
			) {
				a.splits.push(Math.min(1, Math.max(0, t)));
				b.splits.push(Math.min(1, Math.max(0, u)));
			}
			return;
		}

		if (Math.abs(qx * rz - qz * rx) > POINT_EPSILON) {
			return;
		}
		this.addCollinearPoint(a, b.a, b, 0);
		this.addCollinearPoint(a, b.b, b, 1);
		this.addCollinearPoint(b, a.a, a, 0);
		this.addCollinearPoint(b, a.b, a, 1);
	}

	private addCollinearPoint(
		target: WallSegment,
		point: Vector3,
		source: WallSegment,
		sourceT: number,
	): void {
		const dx = target.b.x - target.a.x;
		const dz = target.b.z - target.a.z;
		const lengthSquared = dx * dx + dz * dz;
		const t =
			((point.x - target.a.x) * dx + (point.z - target.a.z) * dz) /
			lengthSquared;
		if (t >= -POINT_EPSILON && t <= 1 + POINT_EPSILON) {
			target.splits.push(Math.min(1, Math.max(0, t)));
			source.splits.push(sourceT);
		}
	}

	private floorSpacePoints(floor: FloorObject, space: Group): Vector3[] {
		return floor.points.map((point) =>
			space.worldToLocal(
				floor.localToWorld(new Vector3(point.x, 0, point.z)),
			),
		);
	}

	private setFloorSpacePoints(
		floor: FloorObject,
		points: Vector3[],
		space: Group,
	): void {
		space.updateWorldMatrix(true, false);
		floor.updateWorldMatrix(true, false);
		floor.setPoints(
			this.removeCollinearPoints(points).map((point) => {
				const local = floor.worldToLocal(space.localToWorld(point.clone()));
				return {x: local.x, z: local.z};
			}),
		);
	}

	private captureFloorSnapshot(floor: FloorObject): AutomaticFloorSnapshot {
		const parent = floor.parent;
		if (!parent) {
			throw new Error("Cannot capture an automatic floor without a parent");
		}
		return {
			floor,
			parent,
			index: parent.children.indexOf(floor),
			present: true,
			points: floor.points.map((point) => ({...point})),
		};
	}

	private applyFloorSnapshot(snapshot: AutomaticFloorSnapshot[]): void {
		for (const state of snapshot
			.filter(({present}) => present)
			.sort((left, right) => left.index - right.index)) {
			if (state.floor.parent !== state.parent) {
				state.parent.add(state.floor);
			}
			const currentIndex = state.parent.children.indexOf(state.floor);
			if (currentIndex !== state.index) {
				state.parent.children.splice(currentIndex, 1);
				state.parent.children.splice(
					Math.max(0, Math.min(state.index, state.parent.children.length)),
					0,
					state.floor,
				);
			}
			state.floor.setPoints(state.points);
		}
		for (const state of snapshot.filter(({present}) => !present)) {
			state.floor.removeFromParent();
		}
	}

	private floorMatchScore(polygon: Vector3[], face: Vector3[]): number {
		if (
			polygon.length < 3 ||
			face.length < 3 ||
			Math.abs(polygon[0].y - face[0].y) > POINT_EPSILON
		) {
			return Number.NEGATIVE_INFINITY;
		}
		const polygonCenter = this.polygonCenter(polygon);
		const faceCenter = this.polygonCenter(face);
		const polygonContainsFaceCenter = this.pointInPolygon(faceCenter, polygon);
		const faceContainsPolygonCenter = this.pointInPolygon(polygonCenter, face);
		const sharedPoints = face.filter((point) =>
			polygon.some(
				(candidate) => this.distance2D(candidate, point) <= POINT_EPSILON,
			),
		).length;
		if (
			sharedPoints === 0 &&
			!polygonContainsFaceCenter &&
			!faceContainsPolygonCenter
		) {
			return Number.NEGATIVE_INFINITY;
		}
		return (
			sharedPoints * 100 +
			Number(polygonContainsFaceCenter) * 25 +
			Number(faceContainsPolygonCenter) * 25 -
			this.distance2D(polygonCenter, faceCenter)
		);
	}

	private polygonCenter(points: Vector3[]): Vector3 {
		return points
			.reduce((center, point) => center.add(point), new Vector3())
			.multiplyScalar(1 / points.length);
	}

	private pointsSignature(points: Vector3[]): string {
		const values = this.removeCollinearPoints(points).map(
			(point) =>
				`${this.round(point.x)},${this.round(point.y)},${this.round(point.z)}`,
		);
		const variants: string[] = [];
		for (const direction of [values, [...values].reverse()]) {
			for (let index = 0; index < direction.length; index++) {
				variants.push([...direction.slice(index), ...direction.slice(0, index)].join(";"));
			}
		}
		return variants.sort()[0];
	}

	private polygonCoversFace(polygon: Vector3[], face: Vector3[]): boolean {
		if (
			polygon.length < 3 ||
			face.length < 3 ||
			Math.abs(polygon[0].y - face[0].y) > POINT_EPSILON ||
			Math.abs(this.signedArea(polygon)) + FLOOR_MINIMUM_AREA <
				Math.abs(this.signedArea(face))
		) {
			return false;
		}

		const samples = face.flatMap((point, index) => {
			const next = face[(index + 1) % face.length];
			return [point, point.clone().add(next).multiplyScalar(0.5)];
		});
		return samples.every((point) => this.pointInPolygon(point, polygon));
	}

	private pointInPolygon(point: Vector3, polygon: Vector3[]): boolean {
		let inside = false;
		for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			const a = polygon[j];
			const b = polygon[i];
			const cross =
				(b.x - a.x) * (point.z - a.z) -
				(b.z - a.z) * (point.x - a.x);
			if (
				Math.abs(cross) <= POINT_EPSILON &&
				point.x >= Math.min(a.x, b.x) - POINT_EPSILON &&
				point.x <= Math.max(a.x, b.x) + POINT_EPSILON &&
				point.z >= Math.min(a.z, b.z) - POINT_EPSILON &&
				point.z <= Math.max(a.z, b.z) + POINT_EPSILON
			) {
				return true;
			}

			const crosses =
				(a.z > point.z) !== (b.z > point.z) &&
				point.x <
					a.x + ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z);
			if (crosses) {
				inside = !inside;
			}
		}
		return inside;
	}

	private extractSimpleFace(face: number[], nodes: GraphNode[]): number[] {
		if (new Set(face).size === face.length) {
			return face;
		}

		const candidates: number[][] = [];
		for (let start = 0; start < face.length; start++) {
			for (let end = start + 1; end < face.length; end++) {
				if (face[start] !== face[end]) {
					continue;
				}
				const between = face.slice(start, end);
				const around = [...face.slice(end), ...face.slice(0, start)];
				for (const candidate of [between, around]) {
					if (
						candidate.length >= 3 &&
						new Set(candidate).size === candidate.length
					) {
						candidates.push(candidate);
					}
				}
			}
		}

		return (
			candidates.sort(
				(a, b) =>
					Math.abs(
						this.signedArea(b.map((node) => nodes[node].point)),
					) -
					Math.abs(
						this.signedArea(a.map((node) => nodes[node].point)),
					),
			)[0] ?? []
		);
	}

	private removeCollinearPoints(points: Vector3[]): Vector3[] {
		const result = points.map((point) => point.clone());
		let changed = true;
		while (changed && result.length > 3) {
			changed = false;
			for (let index = 0; index < result.length; index++) {
				const previous = result[(index - 1 + result.length) % result.length];
				const point = result[index];
				const next = result[(index + 1) % result.length];
				const cross =
					(point.x - previous.x) * (next.z - point.z) -
					(point.z - previous.z) * (next.x - point.x);
				if (Math.abs(cross) <= POINT_EPSILON) {
					result.splice(index, 1);
					changed = true;
					break;
				}
			}
		}
		return result;
	}

	private isSimplePolygon(points: Vector3[]): boolean {
		if (Math.abs(this.signedArea(points)) <= FLOOR_MINIMUM_AREA) {
			return false;
		}
		for (let i = 0; i < points.length; i++) {
			const a1 = points[i];
			const a2 = points[(i + 1) % points.length];
			for (let j = i + 1; j < points.length; j++) {
				if (j === i || j === i + 1 || (i === 0 && j === points.length - 1)) {
					continue;
				}
				const b1 = points[j];
				const b2 = points[(j + 1) % points.length];
				if (this.segmentsIntersect(a1, a2, b1, b2)) {
					return false;
				}
			}
		}
		return true;
	}

	private segmentsIntersect(a: Vector3, b: Vector3, c: Vector3, d: Vector3): boolean {
		const orientation = (p: Vector3, q: Vector3, r: Vector3) =>
			(q.x - p.x) * (r.z - p.z) - (q.z - p.z) * (r.x - p.x);
		const abC = orientation(a, b, c);
		const abD = orientation(a, b, d);
		const cdA = orientation(c, d, a);
		const cdB = orientation(c, d, b);
		return abC * abD < -POINT_EPSILON && cdA * cdB < -POINT_EPSILON;
	}

	private signedArea(points: Vector3[]): number {
		return (
			points.reduce((area, point, index) => {
				const next = points[(index + 1) % points.length];
				return area + point.x * next.z - next.x * point.z;
			}, 0) / 2
		);
	}

	private edgeAngle(from: Vector3, to: Vector3): number {
		return Math.atan2(to.z - from.z, to.x - from.x);
	}

	private distance2D(a: Vector3, b: Vector3): number {
		return Math.hypot(a.x - b.x, a.z - b.z);
	}

	private round(value: number): number {
		return Math.round(value / POINT_EPSILON) * POINT_EPSILON;
	}
}
