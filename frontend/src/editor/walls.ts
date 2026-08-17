import type {Camera, Object3D} from "three";
import {
	BufferGeometry,
	Group,
	Line,
	LineBasicMaterial,
	MeshStandardMaterial,
	Plane,
	Raycaster,
	Vector2,
	Vector3,
} from "three";

import {WallObject} from "../objects/house/wall.js";
import {snapPointToClosestAxis} from "./axis-snap.js";
import type {FloorplanConfig} from "./general-config.js";

/**
 * Wall tool modes possible in the WallManager.
 */
export type WallMode = "none" | "wall" | "door" | "window" | "gate";

type WallContext = {
	canvas: HTMLCanvasElement | null;
	camera: Camera | null;
	space: Group | null;
	lastSelectedObject: Object3D | null;
	gridSnapEnabled: boolean;
	gridSnapSize: number;
	floorplanConfig: FloorplanConfig;
};

type WallCallbacks = {
	addToScene: (object: Object3D) => void;
	attachTransform: (object: Object3D) => void;
	updateTree: () => void;
	syncCreate: (object: Object3D) => void;
	updateHintMessage: () => void;
	setLastSelectedObject: (object: Object3D | null) => void;
	selectObject: (object: Object3D) => void;
	onWallCreated: (wall: WallObject) => void;
};

type WallPlacement = {
	point: Vector3;
	connectedWall: WallObject | null;
	wallOffset: number | null;
};

type WallReference = {
	start: Vector3;
	end: Vector3;
	midpoint: Vector3;
	direction: Vector3;
};

type GuideType = "parallel" | "point" | "alignment";

type GuideSegment = {
	points: [Vector3, Vector3];
	type: GuideType;
};

type SmartSnap = {
	point: Vector3;
	guides: GuideSegment[];
};

const ALIGNMENT_SNAP_DISTANCE = 0.2;
const PARALLEL_SNAP_ANGLE = Math.PI / 36;
const GUIDE_HEIGHT = 0.035;
const GRID_HELPER_PLANE = new Plane(new Vector3(0, 1, 0), 0);
const GUIDE_COLORS: Record<GuideType, number> = {
	parallel: 0xff3b30,
	point: 0x34c759,
	alignment: 0x0a84ff,
};

export class WallManager {
	private _mode: WallMode = "none";

	private draftStart: Vector3 | null = null;

	private draft: WallObject | null = null;

	private measurements: Group;

	private guides = new Group();

	private guideMaterials = Object.fromEntries(
		(Object.entries(GUIDE_COLORS) as [GuideType, number][]).map(
			([type, color]) => [
				type,
				new LineBasicMaterial({
					color,
					depthTest: false,
					transparent: true,
					opacity: 0.9,
				}),
			],
		),
	) as Record<GuideType, LineBasicMaterial>;

	private raycaster = new Raycaster();

	private pointer = new Vector2();

	private getContext: () => WallContext;

	private callbacks: WallCallbacks;

	public constructor(
		measurements: Group,
		getContext: () => WallContext,
		callbacks: WallCallbacks,
	) {
		this.measurements = measurements;
		this.getContext = getContext;
		this.callbacks = callbacks;
		this.guides.internal = true;
		this.guides.name = "Wall Snap Guides";
		this.measurements.add(this.guides);
	}

	/**
	 * Current wall tool mode.
	 */
	public get mode(): WallMode {
		return this._mode;
	}

	/**
	 * Current wall draft start position, or null if no draft is in progress.
	 */
	public get wallDraftStart(): Vector3 | null {
		return this.draftStart;
	}

	/**
	 * Check if the wall tool is currently active (in any mode other than "none").
	 *
	 * @returns - True if the wall tool is active, false otherwise.
	 */
	public isActive(): boolean {
		return this.mode !== "none";
	}

	/**
	 * Set the wall tool mode.
	 *
	 * Clearing the draft whenever switching away from wall-drawing mode.
	 *
	 * @param mode - New mode to set.
	 */
	public setMode(mode: WallMode): void {
		this._mode = mode;
		if (mode !== "wall") {
			this.clearDraft();
		}
	}

	/**
	 * Clear the current wall draft, removing the draft object from the scene.
	 */
	public clearDraft(): void {
		if (this.draft) {
			this.measurements.remove(this.draft);
		}
		this.draft = null;
		this.draftStart = null;
		this.clearGuides();
	}

	/**
	 * Handle click events on the canvas for wall/opening placement.
	 *
	 * @param event - Mouse event from the canvas.
	 * @returns True if the event was handled, false otherwise.
	 */
	public handleClick(event: MouseEvent): boolean {
		if (
			this._mode === "door" ||
			this._mode === "window" ||
			this._mode === "gate"
		) {
			const placement = this.pickPlacementFromEvent(event);
			const clickedWall = placement?.connectedWall;
			const selectedWall = clickedWall ?? this.resolveSelectedWall();
			if (!selectedWall) {
				return false;
			}

			if (clickedWall) {
				this.callbacks.setLastSelectedObject(clickedWall);
				this.callbacks.selectObject(clickedWall);
			}

			const offset = placement?.wallOffset ?? 0;
			const added =
				this._mode === "door"
					? selectedWall.addDoor(offset)
					: this._mode === "window"
						? selectedWall.addWindow(offset)
						: selectedWall.addGate(offset);
			this.callbacks.attachTransform(added);
			this.callbacks.updateTree();
			this.callbacks.syncCreate(added);
			return true;
		}

		if (this._mode !== "wall") {
			return false;
		}

		let placement = this.pickPlacementFromEvent(event);
		if (!placement) {
			return true;
		}

		if (!this.draftStart) {
			this.draftStart = placement.point.clone();
			this.createDraft(this.draftStart);
			return true;
		}

		placement = this.snapPlacement(placement, event.ctrlKey);

		const segmentLength = Math.hypot(
			placement.point.x - this.draftStart.x,
			placement.point.z - this.draftStart.z,
		);
		if (segmentLength <= 1e-6 || !this.draft) {
			return true;
		}

		this.draft.setFromPoints(this.draftStart, placement.point);
		this.finalizeWall();

		// Reaching any point along an existing wall closes the current run. Otherwise, the end point immediately becomes the next wall's start.
		if (!placement.connectedWall) {
			this.draftStart = placement.point.clone();
			this.createDraft(this.draftStart);
		}
		return true;
	}

	/**
	 * Handle pointer move events for live wall draft preview.
	 *
	 * @param event - Mouse event from the canvas.
	 */
	public handlePointerMove(event: MouseEvent): void {
		if (this._mode !== "wall") {
			return;
		}

		if (!this.draftStart || !this.draft) {
			return;
		}

		const placement = this.pickPlacementFromEvent(event);
		if (!placement) {
			this.clearGuides();
			return;
		}

		const snappedPlacement = this.snapPlacement(placement, event.ctrlKey);
		this.draft.setFromPoints(this.draftStart, snappedPlacement.point);
		this.draft.updateLabel();
	}

	private createDraft(start: Vector3): void {
		const {wall} = this.getContext().floorplanConfig;
		this.draft = new WallObject(
			{height: wall.height},
			wall.color,
			{
				baseboardEnabled: wall.decoration.enabled,
				baseboardHeight: wall.decoration.height,
				baseboardDepth: wall.decoration.depth,
				baseboardColor: wall.decoration.color,
			},
		);
		this.draft.internal = true;
		this.draft.name = "Wall Draft";
		this.draft.setFromPoints(start, start.clone().add(new Vector3(1, 0, 0)));
		this.draft.updateLabel();
		this.measurements.add(this.draft);
		this.callbacks.updateHintMessage();
	}

	private finalizeWall(): void {
		if (!this.draftStart || !this.draft) {
			return;
		}

		const material = Array.isArray(this.draft.wallMesh.material)
			? this.draft.wallMesh.material[0]
			: this.draft.wallMesh.material;
		const wall = new WallObject(
			{
				length: this.draft.length,
				height: this.draft.height,
				thickness: this.draft.thickness,
			},
			material instanceof MeshStandardMaterial ? material.color : undefined,
			this.draft.getCustomization(),
		);
		wall.position.copy(this.draft.position);
		wall.rotation.copy(this.draft.rotation);

		this.measurements.remove(this.draft);
		this.clearDraft();

		this.callbacks.addToScene(wall);
		this.callbacks.onWallCreated(wall);
		this.callbacks.setLastSelectedObject(wall);
		this.callbacks.updateHintMessage();
	}

	private resolveSelectedWall(): WallObject | null {
		const {lastSelectedObject} = this.getContext();

		if (lastSelectedObject instanceof WallObject) {
			return lastSelectedObject;
		}

		if (lastSelectedObject) {
			const parentWall = lastSelectedObject.parent;
			if (parentWall instanceof WallObject) {
				return parentWall;
			}
		}

		return null;
	}

	private pickPlacementFromEvent(event: MouseEvent): WallPlacement | null {
		const {canvas, camera, space, gridSnapEnabled, gridSnapSize} =
			this.getContext();
		if (!canvas || !camera || !space) {
			return null;
		}

		const rect = canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, camera);

		// Scene objects take priority over the grid so walls can still connect to
		// an existing wall or use the exact surface point of another object.
		const objectIntersection = this.raycaster.intersectObjects(
			space.children,
			true,
		)[0];
		const gridPoint = objectIntersection
			? null
			: this.raycaster.ray.intersectPlane(GRID_HELPER_PLANE, new Vector3());
		if (!objectIntersection && !gridPoint) {
			return null;
		}

		const connectedWall = objectIntersection
			? this.resolveWallFromObject(objectIntersection.object, space)
			: null;
		let point: Vector3;
		let wallOffset: number | null = null;

		if (connectedWall && objectIntersection) {
			// Join the new segment to the existing wall's center line, whether the user clicked its face, one of its ends, or anywhere in the middle.
			const wallPoint = connectedWall.worldToLocal(
				objectIntersection.point.clone(),
			);
			wallOffset = Math.min(
				connectedWall.length / 2,
				Math.max(-connectedWall.length / 2, wallPoint.x),
			);
			wallPoint.set(wallOffset, 0, 0);
			point = space.worldToLocal(connectedWall.localToWorld(wallPoint));
		} else {
			point = space.worldToLocal(
				(objectIntersection?.point ?? gridPoint).clone(),
			);
			if (gridSnapEnabled) {
				point = this.snapPointToGrid(point, gridSnapSize);
			}
		}

		return {point, connectedWall, wallOffset};
	}

	private resolveWallFromObject(
		object: Object3D,
		space: Group,
	): WallObject | null {
		let current: Object3D | null = object;
		while (current && current !== space) {
			if (current instanceof WallObject) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	private snapPlacementToAxis(
		placement: WallPlacement,
		origin: Vector3,
	): WallPlacement {
		const point = snapPointToClosestAxis(placement.point, origin);
		const moved =
			Math.hypot(point.x - placement.point.x, point.z - placement.point.z) >
			1e-6;
		if (!moved || !placement.connectedWall) {
			return {...placement, point};
		}

		const {space} = this.getContext();
		if (space) {
			const wallPoint = placement.connectedWall.worldToLocal(
				space.localToWorld(point.clone()),
			);
			if (
				Math.abs(wallPoint.z) <= 1e-5 &&
				wallPoint.x >= -placement.connectedWall.length / 2 - 1e-5 &&
				wallPoint.x <= placement.connectedWall.length / 2 + 1e-5
			) {
				const wallOffset = Math.min(
					placement.connectedWall.length / 2,
					Math.max(-placement.connectedWall.length / 2, wallPoint.x),
				);
				wallPoint.set(wallOffset, 0, 0);
				return {
					point: space.worldToLocal(
						placement.connectedWall.localToWorld(wallPoint),
					),
					connectedWall: placement.connectedWall,
					wallOffset,
				};
			}
		}

		return {point, connectedWall: null, wallOffset: null};
	}

	private snapPlacement(
		placement: WallPlacement,
		axisSnapEnabled: boolean,
	): WallPlacement {
		this.clearGuides();
		if (!this.draftStart) {
			return placement;
		}

		if (axisSnapEnabled) {
			return this.snapPlacementToAxis(placement, this.draftStart);
		}

		// A direct hit on a wall is an explicit connection and takes priority over
		// inferred alignment with another wall.
		if (placement.connectedWall) {
			return placement;
		}

		const smartSnap = this.findSmartSnap(placement.point, this.draftStart);
		if (!smartSnap) {
			return placement;
		}

		this.showGuides(smartSnap.guides);
		return {
			point: smartSnap.point,
			connectedWall: null,
			wallOffset: null,
		};
	}

	private findSmartSnap(point: Vector3, origin: Vector3): SmartSnap | null {
		const wallReferences = this.collectWallReferences();
		const combinedSnap = this.findCombinedAlignment(
			point,
			origin,
			wallReferences,
		);
		if (combinedSnap) {
			return combinedSnap;
		}

		const pointSnap = this.findEndpointPointSnap(
			point,
			origin,
			wallReferences,
		);
		if (pointSnap) {
			return pointSnap;
		}

		const endpointSnap = this.findEndpointAlignment(
			point,
			origin,
			wallReferences,
		);
		const parallelSnap = this.findParallelAlignment(
			point,
			origin,
			wallReferences,
		);

		if (!endpointSnap) {
			return parallelSnap;
		}
		if (!parallelSnap) {
			return endpointSnap;
		}

		return endpointSnap.point.distanceToSquared(point) <=
			parallelSnap.point.distanceToSquared(point)
			? endpointSnap
			: parallelSnap;
	}

	private findEndpointPointSnap(
		point: Vector3,
		origin: Vector3,
		walls: WallReference[],
	): SmartSnap | null {
		let closestEndpoint: Vector3 | null = null;
		let closestDistance = ALIGNMENT_SNAP_DISTANCE;

		for (const wall of walls) {
			for (const endpoint of [wall.start, wall.end]) {
				if (endpoint.distanceToSquared(origin) <= 1e-8) {
					continue;
				}

				const distance = Math.hypot(
					point.x - endpoint.x,
					point.z - endpoint.z,
				);
				if (distance <= closestDistance) {
					closestEndpoint = endpoint;
					closestDistance = distance;
				}
			}
		}

		if (!closestEndpoint) {
			return null;
		}

		return {
			point: closestEndpoint.clone(),
			guides: [
				{
					points: [point.clone(), closestEndpoint.clone()],
					type: "point",
				},
			],
		};
	}

	private findCombinedAlignment(
		point: Vector3,
		origin: Vector3,
		walls: WallReference[],
	): SmartSnap | null {
		const draftDirection = point.clone().sub(origin);
		draftDirection.y = 0;
		if (draftDirection.lengthSq() <= 1e-12) {
			return null;
		}
		draftDirection.normalize();

		let best: SmartSnap | null = null;
		let bestCorrection = Number.POSITIVE_INFINITY;
		for (const parallelWall of walls) {
			const dot = draftDirection.dot(parallelWall.direction);
			const angle = Math.acos(Math.min(1, Math.abs(dot)));
			if (angle > PARALLEL_SNAP_ANGLE) {
				continue;
			}

			const direction = parallelWall.direction
				.clone()
				.multiplyScalar(dot < 0 ? -1 : 1);
			for (const alignmentWall of walls) {
				for (const endpoint of [alignmentWall.start, alignmentWall.end]) {
					if (endpoint.distanceToSquared(origin) <= 1e-8) {
						continue;
					}

					for (const axis of ["x", "z"] as const) {
						if (Math.abs(direction[axis]) <= 1e-6) {
							continue;
						}

						const distanceAlongDirection =
							(endpoint[axis] - origin[axis]) / direction[axis];
						if (distanceAlongDirection <= 1e-6) {
							continue;
						}

						const candidate = origin
							.clone()
							.addScaledVector(direction, distanceAlongDirection);
						const correction = Math.hypot(
							candidate.x - point.x,
							candidate.z - point.z,
						);
						if (
							correction > ALIGNMENT_SNAP_DISTANCE ||
							correction >= bestCorrection
						) {
							continue;
						}

						best = {
							point: candidate,
							guides: [
								...this.createParallelGuidePoints(
									parallelWall,
									origin,
									candidate,
								),
								{
									points: [endpoint.clone(), candidate.clone()],
									type: "alignment",
								},
							],
						};
						bestCorrection = correction;
					}
				}
			}
		}

		return best;
	}

	private findEndpointAlignment(
		point: Vector3,
		origin: Vector3,
		walls: WallReference[],
	): SmartSnap | null {
		let best: SmartSnap | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;

		for (const wall of walls) {
			for (const endpoint of [wall.start, wall.end]) {
				// Do not infer an alignment from the point where the active segment
				// already begins; that would turn every connected run into axis snap.
				if (endpoint.distanceToSquared(origin) <= 1e-8) {
					continue;
				}

				const xDistance = Math.abs(point.x - endpoint.x);
				const zDistance = Math.abs(point.z - endpoint.z);
				const distance = Math.min(xDistance, zDistance);
				if (distance > ALIGNMENT_SNAP_DISTANCE || distance >= bestDistance) {
					continue;
				}

				const snapped = point.clone();
				if (xDistance <= zDistance) {
					snapped.x = endpoint.x;
				} else {
					snapped.z = endpoint.z;
				}
				best = {
					point: snapped,
					guides: [
						{
							points: [endpoint.clone(), snapped.clone()],
							type: "alignment",
						},
					],
				};
				bestDistance = distance;
			}
		}

		return best;
	}

	private findParallelAlignment(
		point: Vector3,
		origin: Vector3,
		walls: WallReference[],
	): SmartSnap | null {
		const draftVector = point.clone().sub(origin);
		const draftLength = Math.hypot(draftVector.x, draftVector.z);
		if (draftLength <= 1e-6) {
			return null;
		}
		draftVector.multiplyScalar(1 / draftLength);

		let reference: WallReference | null = null;
		let bestCorrection = Number.POSITIVE_INFINITY;
		let bestMidpointDistance = Number.POSITIVE_INFINITY;
		let snappedPoint: Vector3 | null = null;

		for (const wall of walls) {
			const dot =
				draftVector.x * wall.direction.x + draftVector.z * wall.direction.z;
			const angle = Math.acos(Math.min(1, Math.abs(dot)));
			if (angle > PARALLEL_SNAP_ANGLE) {
				continue;
			}

			const direction = wall.direction.clone().multiplyScalar(dot < 0 ? -1 : 1);
			const candidate = origin.clone().addScaledVector(direction, draftLength);
			const correction = candidate.distanceTo(point);
			const candidateMidpoint = origin
				.clone()
				.add(candidate)
				.multiplyScalar(0.5);
			const midpointDistance = candidateMidpoint.distanceToSquared(
				wall.midpoint,
			);
			if (
				correction > bestCorrection + 1e-6 ||
				(Math.abs(correction - bestCorrection) <= 1e-6 &&
					midpointDistance >= bestMidpointDistance)
			) {
				continue;
			}

			reference = wall;
			snappedPoint = candidate;
			bestCorrection = correction;
			bestMidpointDistance = midpointDistance;
		}

		if (!reference || !snappedPoint) {
			return null;
		}

		return {
			point: snappedPoint,
			guides: this.createParallelGuidePoints(
				reference,
				origin,
				snappedPoint,
			),
		};
	}

	private createParallelGuidePoints(
		reference: WallReference,
		origin: Vector3,
		snappedPoint: Vector3,
	): GuideSegment[] {
		const draftMidpoint = origin.clone().add(snappedPoint).multiplyScalar(0.5);
		const draftLength = origin.distanceTo(snappedPoint);
		const offset = reference.direction
			.clone()
			.multiplyScalar(
				Math.min(
					0.15,
					draftLength * 0.12,
					reference.start.distanceTo(reference.end) * 0.12,
				),
			);
		return [
			{
				points: [
					reference.midpoint.clone().add(offset),
					draftMidpoint.clone().add(offset),
				],
				type: "parallel",
			},
			{
				points: [
					reference.midpoint.clone().sub(offset),
					draftMidpoint.clone().sub(offset),
				],
				type: "parallel",
			},
		];
	}

	private collectWallReferences(): WallReference[] {
		const {space} = this.getContext();
		if (!space) {
			return [];
		}

		const walls: WallReference[] = [];
		space.updateWorldMatrix(true, true);
		space.traverse((object) => {
			if (!(object instanceof WallObject) || object.internal === true) {
				return;
			}

			const start = space.worldToLocal(
				object.localToWorld(new Vector3(-object.length / 2, 0, 0)),
			);
			const end = space.worldToLocal(
				object.localToWorld(new Vector3(object.length / 2, 0, 0)),
			);
			const direction = end.clone().sub(start);
			direction.y = 0;
			if (direction.lengthSq() <= 1e-12) {
				return;
			}
			direction.normalize();
			walls.push({
				start,
				end,
				midpoint: start.clone().add(end).multiplyScalar(0.5),
				direction,
			});
		});
		return walls;
	}

	private showGuides(segments: GuideSegment[]): void {
		for (const {points: [start, end], type} of segments) {
			const raisedStart = start.clone();
			const raisedEnd = end.clone();
			raisedStart.y += GUIDE_HEIGHT;
			raisedEnd.y += GUIDE_HEIGHT;
			const guide = new Line(
				new BufferGeometry().setFromPoints([raisedStart, raisedEnd]),
				this.guideMaterials[type],
			);
			guide.internal = true;
			guide.renderOrder = 1000;
			this.guides.add(guide);
		}
	}

	private clearGuides(): void {
		for (const guide of this.guides.children) {
			if (guide instanceof Line) {
				guide.geometry.dispose();
			}
		}
		this.guides.clear();
	}

	private snapPointToGrid(point: Vector3, snapSize: number): Vector3 {
		if (snapSize <= 0) {
			return point;
		}

		return point
			.clone()
			.set(
				Math.round(point.x / snapSize) * snapSize,
				point.y,
				Math.round(point.z / snapSize) * snapSize,
			);
	}
}
