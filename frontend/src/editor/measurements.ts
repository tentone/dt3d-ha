import type {Camera,Group, Vector3} from "three";
import {Raycaster, Vector2} from "three";

import {AngleMeasurement} from "../objects/measurement/angle.js";
import {DistanceMeasurement} from "../objects/measurement/distance.js";
import {Marker} from "../objects/measurement/marker.js";

/**
 * Measurement modes possible in the MeasurementManager.
 */
type MeasurementMode = "none" | "distance" | "angle";

type MeasurementContext = {
	canvas: HTMLCanvasElement | null;
	camera: Camera | null;
	space: Group | null;
};

export class MeasurementManager {
	private mode: MeasurementMode = "none";

	private points: Vector3[] = [];

	private helpers: Group;

	private raycaster = new Raycaster();

	private pointer = new Vector2();

	private getContext: () => MeasurementContext;

	public constructor(helpers: Group, getContext: () => MeasurementContext) {
		this.helpers = helpers;
		this.getContext = getContext;
	}

	/**
	 * Set the current measurement mode.
	 */
	public setMode(mode: MeasurementMode): void {
		this.mode = mode;
		this.clear();
	}

	/**
	 * Check if a measurement mode is currently active.
	 */
	public isActive(): boolean {
		return this.mode !== "none";
	}

	/**
	 * Clear the current measurement points and helpers.
	 */
	public clear(): void {
		this.points = [];
		this.helpers.clear();
	}

	/**
	 * Handle click events on the canvas to add measurement points.
	 *
	 * Depending on the current mode and the number of points, this can create distance or angle measurements, or just add marker points.
	 *
	 * @param event - Mouse event from the canvas double-click.
	 * @returns True if the event was handled, false otherwise.
	 */
	public handleClick(event: MouseEvent): boolean {
		if (this.mode === "none") {
			return false;
		}

		const {canvas, camera, space} = this.getContext();
		if (!canvas || !camera || !space) {
			return true;
		}

		const rect = canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, camera);

		const intersects = this.raycaster.intersectObjects(space.children, true);
		const point = intersects[0]?.point;

		if (!point) {
			return true;
		}

		this.addPoint(point);
		return true;
	}

	/**
	 * Add a point to the current measurement.
	 *
	 * If the required number of points for the current mode is reached, create the corresponding measurement helper and reset the points.
	 *
	 * @param point - The point to add.
	 */
	private addPoint(point: Vector3): void {
		this.points.push(point.clone());

		if (this.mode === "distance" && this.points.length === 2) {
			const points = [...this.points];
			this.helpers.clear();
			this.helpers.add(new DistanceMeasurement(points));
			this.points = [];

			return;
		}

		if (this.mode === "angle" && this.points.length === 3) {
			const points = [...this.points];
			this.helpers.clear();
			this.helpers.add(new AngleMeasurement(points));
			this.points = [];

			return;
		}

		this.helpers.clear();
		this.points.forEach((markerPoint) => {
			this.helpers.add(new Marker(markerPoint));
		});
	}
}
