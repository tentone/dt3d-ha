import type {Vector3} from "three";
import {
	BufferGeometry,
	Color,
	Group,
	Line,
	LineBasicMaterial,
	MathUtils,
} from "three";

import {getCSSVar} from "../../utils/css-utils";
import {TextSprite} from "../helpers/text-sprite";
import {Marker} from "./marker";

/**
 * Create and display the angle measurement between three points.
 */
export class AngleMeasurement extends Group {
	public constructor(points: Vector3[]) {
		if (points.length !== 3) {
			throw new Error("Points must have length 3");
		}

		super();

		const [first, vertex, last] = points;

		// Points
		this.add(new Marker(first));
		this.add(new Marker(vertex));
		this.add(new Marker(last));

		const color = new Color(getCSSVar("--primary-color") || "#03a9f4");

		// Lines
		const line1 = new Line(
			new BufferGeometry().setFromPoints([vertex, first]),
			new LineBasicMaterial({color: color}),
		);
		const line2 = new Line(
			new BufferGeometry().setFromPoints([vertex, last]),
			new LineBasicMaterial({color: color}),
		);

		this.add(line1);
		this.add(line2);

		const v1 = first.clone().sub(vertex).normalize();
		const v2 = last.clone().sub(vertex).normalize();
		const angle = Math.acos(MathUtils.clamp(v1.dot(v2), -1, 1));
		const degrees = MathUtils.radToDeg(angle);

		const label = new TextSprite(`${degrees.toFixed(2)}°`);
		label.position.copy(vertex);
		label.position.y += 0.2;
		this.add(label);
	}
}
