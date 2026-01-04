import {
	AmbientLight,
	DirectionalLight,
	Group,
	MathUtils,
	PerspectiveCamera,
	Scene,
	Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { Sky } from "three/examples/jsm/Addons.js";

interface SceneManagerOptions {

}

/**
 * SceneManager handles scene creation and camera/controls setup.
 */
export class SceneManager {
	public scene: Scene;
	public camera: PerspectiveCamera;
	public home: Group;
	public measurementHelpers: Group;
	public controls: OrbitControls;
	public transform: TransformControls;

	constructor(canvas: HTMLCanvasElement,
	height: number,
	width: number,) {
		this.scene = new Scene();

		this.camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
		this.camera.position.z = 3;

		this.measurementHelpers = new Group();
		this.scene.add(this.measurementHelpers);

		this.home = new Group();
		this.scene.add(this.home);

		this.addSky();

		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;

		this.transform = new TransformControls(this.camera, canvas);
		this.transform.addEventListener("dragging-changed", (event: any) => {
			this.controls.enabled = !event.value;
		});

		this.scene.add(this.transform.getHelper());
	}

	/**
	 * Update the size of the camera.
	 * 
	 * @param width - Width in px
	 * @param height - Height in px
	 */
	public updateSize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	/**
	 * Create and add the sky to the scene.
	 */
	private addSky(): void {
		this.scene.add(new AmbientLight(0xbbbbbb));

		const directional = new DirectionalLight(0xeeeeee);
		directional.position.set(200, 1000, 300);
		this.scene.add(directional);

		const sky = new Sky();
		sky.scale.setScalar(1e4);

		const phi = MathUtils.degToRad(90);
		const theta = MathUtils.degToRad(180);
		const sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta);

		sky.material.uniforms.sunPosition.value = sunPosition;
		this.scene.add(sky);
	}
}
