import type {Vector3} from "three";
import {Color, Mesh, MeshBasicMaterial, SphereGeometry} from "three";

import {getCSSVar} from "../../utils/css-utils";

export class Marker extends Mesh {
	/**
	 * Create a marker for measurement.
	 *
	 * @param position - Position of the marker.
	 * @returns - The marker mesh.
	 */
	constructor(position: Vector3) {
		const color = new Color(getCSSVar("--primary-color") || "#03a9f4");

		const geometry = new SphereGeometry(0.02, 16, 16);
		const material = new MeshBasicMaterial({color: color});

		super(geometry, material);

		this.position.copy(position);
	}
}
