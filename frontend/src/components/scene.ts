import {
	AmbientLight,
	BoxGeometry,
	DirectionalLight,
	Group,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
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
	/**
	 * Main scene with all content.
	 */
	public scene: Scene;

	/**
	 * Camera used to visualize content.
	 */
	public camera: PerspectiveCamera;

	/**
	 * Space being visualized currently.
	 * 
	 * Spaces are like end-user scenes.
	 */
	public space: Group;

	/**
	 * Group to display measurements.
	 */
	public measurements: Group;

	/**
	 * Orbit controls to navigate the scene.
	 */
	public controls: OrbitControls;

	/**
	 * Transform controls for object manipulation.
	 */
	public transform: TransformControls;

	constructor(canvas: HTMLCanvasElement, height: number, width: number,) {
		this.scene = new Scene();

		this.camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
		this.camera.position.z = 3;

		this.measurements = new Group();
		this.scene.add(this.measurements);

		this.space = new Group();
		this.scene.add(this.space);

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

	public createDefaultScene(): void {
		// Add a cube
		const geometry = new BoxGeometry();
		const material = new MeshStandardMaterial({ color: 0xffff00 });
		const cube = new Mesh(geometry, material);
		this.transform.attach(cube);
		this.space.add(cube);

		const planeGeometry = new BoxGeometry(5, 5, 0.1);
		const planeMaterial = new MeshStandardMaterial({ color: 0xffffff });

		const plane = new Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
		plane.position.y = -1; // Position it below the cube
		this.space.add(plane);

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
