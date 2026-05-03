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
};

type WallCallbacks = {
	addToScene: (object: Object3D) => void;
	attachTransform: (object: Object3D) => void;
	updateTree: () => void;
	syncCreate: (object: Object3D) => void;
	updateHintMessage: () => void;
	setLastSelectedObject: (object: Object3D | null) => void;
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
			const selectedWall = this.resolveSelectedWall();
			if (!selectedWall) {
				return false;
			}

			const added = this._mode === "door"
				? selectedWall.addDoor()
				: selectedWall.addWindow();
			this.callbacks.attachTransform(added);
			this.callbacks.updateTree();
			this.callbacks.syncCreate(added);
			return true;
		}

		if (this._mode !== "wall") {
			return false;
		}

		const intersection = this.pickPointFromEvent(event);
		if (!intersection) {
			return true;
		}

		if (!this.draftStart) {
			this.draftStart = intersection.clone();
			this.createDraft(this.draftStart);
			return true;
		}

		this.finalizeWall();
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

		const intersection = this.pickPointFromEvent(event);
		if (!intersection) {
			return;
		}

		this.draft.setFromPoints(this.draftStart, intersection);
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

	private pickPointFromEvent(event: MouseEvent): Vector3 | null {
		const {canvas, camera, space} = this.getContext();
		if (!canvas || !camera || !space) {
			return null;
		}

		const rect = canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, camera);

		const intersects = this.raycaster.intersectObjects(space.children, true);
		return intersects[0]?.point ?? null;
	}
}
