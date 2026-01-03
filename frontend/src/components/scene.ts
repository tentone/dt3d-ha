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
	canvas: HTMLCanvasElement;
	height: number;
	onTransformChange?: () => void;
	width: number;
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

	constructor({
		canvas,
		height,
		onTransformChange,
		width,
	}: SceneManagerOptions) {
		this.scene = new Scene();

		this.camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
		this.camera.position.z = 3;

		this.measurementHelpers = new Group();
		this.scene.add(this.measurementHelpers);

		this.scene.add(new AmbientLight(0xbbbbbb));

		const directional = new DirectionalLight(0xeeeeee);
		directional.position.set(200, 1000, 300);
		this.scene.add(directional);

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
		this.transform.addEventListener("objectChange", () => {
			onTransformChange?.();
		});
		this.scene.add(this.transform.getHelper());
	}

	public updateSize(width: number, height: number): void {
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
	}

	private addSky(): void {
		const sky = new Sky();
		sky.scale.setScalar(1e4);

		const phi = MathUtils.degToRad(90);
		const theta = MathUtils.degToRad(180);
		const sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta);

		sky.material.uniforms.sunPosition.value = sunPosition;
		this.scene.add(sky);
	}
}
