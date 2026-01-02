import { Mesh, Color, SphereGeometry, MeshBasicMaterial, Vector3 } from "three";
import { getCSSVar } from "../../utils/css-utils";

export class Marker extends Mesh {
    /**
	 * Create a marker for measurement.
	 *
	 * @param position - Position of the marker.
	 * @returns - The marker mesh.
	 */
    constructor(position: Vector3) {
        const color = new Color(getCSSVar("--ha-color-primary-60"));

        const geometry = new SphereGeometry(0.02, 16, 16);
        const material = new MeshBasicMaterial({ color: color });
        super (geometry, material);
        this.position.copy(position);
    }
}