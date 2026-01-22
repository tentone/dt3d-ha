import type { Camera } from "three";
import { Group, Raycaster, Vector2, Vector3 } from "three";
import { AngleMeasurement } from "../objects/measurement/angle.js";
import { DistanceMeasurement } from "../objects/measurement/distance.js";
import { Marker } from "../objects/measurement/marker.js";

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

	constructor(helpers: Group, getContext: () => MeasurementContext) {
		this.helpers = helpers;
		this.getContext = getContext;
	}

	setMode(mode: MeasurementMode): void {
		this.mode = mode;
		this.clear();
	}

	clear(): void {
		this.points = [];
		this.helpers.clear();
	}

	handleClick(event: MouseEvent): boolean {
		if (this.mode === "none") {
			return false;
		}

		const { canvas, camera, space } = this.getContext();
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
