import type {Camera, Group, Object3D} from "three";
import {Raycaster, Vector2, Vector3} from "three";

import {WallObject} from "../objects/house/wall.js";

/**
 * Wall tool modes possible in the WallManager.
 */
export type WallMode = "none" | "wall" | "door" | "window";

type WallContext = {
	canvas: HTMLCanvasElement | null;
	camera: Camera | null;
	space: Group | null;
	lastSelectedObject: Object3D | null;
	gridSnapEnabled: boolean;
	gridSnapSize: number;
};

type WallCallbacks = {
	addToScene: (object: Object3D) => void;
	attachTransform: (object: Object3D) => void;
	updateTree: () => void;
	syncCreate: (object: Object3D) => void;
	updateHintMessage: () => void;
	setLastSelectedObject: (object: Object3D | null) => void;
	selectObject: (object: Object3D) => void;
};

type WallPlacement = {
	point: Vector3;
	connectedWall: WallObject | null;
	wallOffset: number | null;
};

export class WallManager {
	private _mode: WallMode = "none";

	private draftStart: Vector3 | null = null;

	private draft: WallObject | null = null;

	private measurements: Group;

	private raycaster = new Raycaster();

	private pointer = new Vector2();

	private getContext: () => WallContext;

	private callbacks: WallCallbacks;

	public constructor(measurements: Group, getContext: () => WallContext, callbacks: WallCallbacks) {
		this.measurements = measurements;
		this.getContext = getContext;
		this.callbacks = callbacks;
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
	}

	/**
	 * Handle click events on the canvas for wall/door/window placement.
	 *
	 * @param event - Mouse event from the canvas.
	 * @returns True if the event was handled, false otherwise.
	 */
	public handleClick(event: MouseEvent): boolean {
		if (this._mode === "door" || this._mode === "window") {
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

			const added = this._mode === "door"
				? selectedWall.addDoor(placement?.wallOffset ?? 0)
				: selectedWall.addWindow(placement?.wallOffset ?? 0);
			this.callbacks.attachTransform(added);
			this.callbacks.updateTree();
			this.callbacks.syncCreate(added);
			return true;
		}

		if (this._mode !== "wall") {
			return false;
		}

		const placement = this.pickPlacementFromEvent(event);
		if (!placement) {
			return true;
		}

		if (!this.draftStart) {
			this.draftStart = placement.point.clone();
			this.createDraft(this.draftStart);
			return true;
		}

		const segmentLength = Math.hypot(
			placement.point.x - this.draftStart.x,
			placement.point.z - this.draftStart.z,
		);
		if (segmentLength <= 1e-6 || !this.draft) {
			return true;
		}

		this.draft.setFromPoints(this.draftStart, placement.point);
		this.finalizeWall();

		// Reaching any point along an existing wall closes the current run.
		// Otherwise, the end point immediately becomes the next wall's start.
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
			return;
		}

		this.draft.setFromPoints(this.draftStart, placement.point);
		this.draft.updateLabel();
	}

	private createDraft(start: Vector3): void {
		this.draft = new WallObject();
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

		const wall = new WallObject({
			length: this.draft.length,
			height: this.draft.height,
			thickness: this.draft.thickness,
		});
		wall.position.copy(this.draft.position);
		wall.rotation.copy(this.draft.rotation);

		this.measurements.remove(this.draft);
		this.clearDraft();

		this.callbacks.addToScene(wall);
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
		const {canvas, camera, space, gridSnapEnabled, gridSnapSize} = this.getContext();
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

		const connectedWall = this.resolveWallFromObject(intersection.object, space);
		let point: Vector3;
		let wallOffset: number | null = null;

		if (connectedWall) {
			// Join the new segment to the existing wall's center line, whether the
			// user clicked its face, one of its ends, or anywhere in the middle.
			const wallPoint = connectedWall.worldToLocal(intersection.point.clone());
			wallOffset = Math.min(
				connectedWall.length / 2,
				Math.max(-connectedWall.length / 2, wallPoint.x),
			);
			wallPoint.set(wallOffset, 0, 0);
			point = space.worldToLocal(connectedWall.localToWorld(wallPoint));
		} else {
			point = space.worldToLocal(intersection.point.clone());
			if (gridSnapEnabled) {
				point = this.snapPointToGrid(point, gridSnapSize);
			}
		}

		return {point, connectedWall, wallOffset};
	}

	private resolveWallFromObject(object: Object3D, space: Group): WallObject | null {
		let current: Object3D | null = object;
		while (current && current !== space) {
			if (current instanceof WallObject) {
				return current;
			}
			current = current.parent;
		}
		return null;
	}

	private snapPointToGrid(point: Vector3, snapSize: number): Vector3 {
		if (snapSize <= 0) {
			return point;
		}

		return point.clone().set(
			Math.round(point.x / snapSize) * snapSize,
			point.y,
			Math.round(point.z / snapSize) * snapSize,
		);
	}
}
