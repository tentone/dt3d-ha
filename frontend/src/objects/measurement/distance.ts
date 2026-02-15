import type {
	Vector3} from "three";
import {
	BufferGeometry,
	Color,
	Group,
	Line,
	LineBasicMaterial,
} from "three";

import {getCSSVar} from "../../utils/css-utils";
import {CSSText} from "../helpers/css-text";
import {Marker} from "./marker";

/**
 * Display the distance measurement between two points.
 */
export class DistanceMeasurement extends Group {
	public constructor(points: Vector3[]) {
		if (points.length !== 2) {
			throw new Error("Points must have length 2");
		}

		super();

		const color = new Color(getCSSVar("--ha-color-primary-60"));

		const [start, end] = points;
		this.add(new Marker(start));
		this.add(new Marker(end));

		const geometry = new BufferGeometry().setFromPoints([start, end]);
		const line = new Line(
			geometry,
			new LineBasicMaterial({color: color, linewidth: 10}),
		);
		this.add(line);

		const distance = start.distanceTo(end);

		const label = new CSSText(`${distance.toFixed(2)}m`, {
			style: {
				color: getCSSVar("--ha-color-primary-95")
			},
		});
		label.scale.setScalar(0.2);
		label.position.copy(start.clone().add(end).multiplyScalar(0.5));
		label.position.y += 0.2;

		this.add(label);
	}
}
