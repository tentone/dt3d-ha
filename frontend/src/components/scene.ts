import {
	AmbientLight,
	BoxGeometry,
	DirectionalLight,
	Group,
	MOUSE,
	OrthographicCamera,
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

/**
 * Editor camera mode (2D or 3D)
 */
export type CameraMode = "perspective" | "orthographic";

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
	public camera: PerspectiveCamera | OrthographicCamera;

	/**
	 * Current camera mode.
	 */
	private cameraMode: CameraMode = "perspective";

	/**
	 * Orthographic camera frustum size.
	 */
	private orthographicFrustumSize: number = 6;

	/**
	 * Width of the viewport
	 */
	private width: number = null;

	/**
	 * Height of the viewporrt
	 */
	private height: number = null;

	/**
	 * Canvas where the content is being rendered.
	 */
	public canvas: HTMLCanvasElement = null;

	/**
	 * Space being visualized currently.
	 * 
	 * Spaces are like end-user scenes.
	 */
	public space: Group = null;

	/**
	 * Group to display measurements.
	 */
	public measurements: Group = null;

	/**
	 * Orbit controls to navigate the scene.
	 */
	public controls: OrbitControls = null;

	/**
	 * Transform controls for object manipulation.
	 */
	public transform: TransformControls = null;

	constructor(canvas: HTMLCanvasElement, height: number, width: number,) {
		this.scene = new Scene();

		this.canvas = canvas;
		this.width = width;
		this.height = height;

		this.camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
		this.camera.position.z = 3;
		this.scene.add(this.camera);

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
		this.width = width;
		this.height = height;

		if (this.camera instanceof PerspectiveCamera) {
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
		} else if (this.camera instanceof OrthographicCamera) {
			const aspect = width / height;
			const halfHeight = this.orthographicFrustumSize / 2;
			const halfWidth = halfHeight * aspect;

			this.camera.left = -halfWidth;
			this.camera.right = halfWidth;
			this.camera.top = halfHeight;
			this.camera.bottom = -halfHeight;
			this.camera.updateProjectionMatrix();
		} else {
			throw new Error('Camera type is unknown');
		}
	}

	/**
	 * Camera mode.
	 * 
	 * @param mode - Camera mode to use.
	 */
	public setCameraMode(mode: CameraMode): void {
		if (mode === this.cameraMode) {
			return;
		}

		this.scene.remove(this.camera);

		const previous = this.camera;

		this.cameraMode = mode;

		if (this.cameraMode === "perspective") {
			this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 10000);
			this.camera.position.z = 3;
			this.scene.add(this.camera);
		} else {
			this.camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 1e5);
			this.scene.add(this.camera);
		}


		// Copy camera position
		this.camera.position.copy(previous.position);
		this.camera.quaternion.copy(previous.quaternion);
		this.camera.updateMatrixWorld();

		this.controls.object = this.camera;
		this.controls.update();

		this.transform.camera = this.camera;
		
		this.updateSize(this.width, this.height);
	}

	/**
	 * Toggle camera mode between perspective and orthographic.
	 */
	public toggleCameraMode(): CameraMode {
		const nextMode: CameraMode = this.cameraMode === "perspective" ? "orthographic" : "perspective";
		this.setCameraMode(nextMode);
		return this.cameraMode;
	}

	/**
	 * Get camera mode
	 */
	public getCameraMode(): CameraMode {
		return this.cameraMode;
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
