import {
	AmbientLight,
	BoxGeometry,
	DirectionalLight,
	GridHelper,
	Group,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	OrthographicCamera,
	PerspectiveCamera,
	Scene,
	Vector3,
} from "three";
import {Sky} from "three/examples/jsm/Addons.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {TransformControls} from "three/examples/jsm/controls/TransformControls";

/**
 * Editor camera mode (2D or 3D)
 */
export type CameraMode = "perspective" | "orthographic";

/**
 * Daylight settings for the active space.
 */
export type DaylightConfig = {
	ambientColor: string;
	ambientIntensity: number;
	sunlightColor: string;
	sunlightIntensity: number;
	sunElevation: number;
	sunAzimuth: number;
};

/**
 * General configuration for the active space.
 */
export type SpaceSceneConfig = {
	daylight: DaylightConfig;
};

export const DEFAULT_DAYLIGHT_CONFIG: DaylightConfig = {
	ambientColor: "#bbbbbb",
	ambientIntensity: 1,
	sunlightColor: "#eeeeee",
	sunlightIntensity: 1,
	sunElevation: 90,
	sunAzimuth: 180,
};

export const DEFAULT_SPACE_SCENE_CONFIG: SpaceSceneConfig = {
	daylight: DEFAULT_DAYLIGHT_CONFIG,
};

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), max);

const numberOrDefault = (value: unknown, fallback: number): number => {
	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeColor = (value: unknown, fallback: string): string => {
	if (typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)) {
		return value;
	}

	return fallback;
};

/**
 * Merge partial daylight settings with defaults and constrain numeric values.
 *
 * @param config - Daylight settings patch.
 * @returns Normalized daylight config.
 */
export const normalizeDaylightConfig = (
	config: Partial<DaylightConfig> = {},
): DaylightConfig => ({
	ambientColor: normalizeColor(
		config.ambientColor,
		DEFAULT_DAYLIGHT_CONFIG.ambientColor,
	),
	ambientIntensity: clamp(
		numberOrDefault(
			config.ambientIntensity,
			DEFAULT_DAYLIGHT_CONFIG.ambientIntensity,
		),
		0,
		5,
	),
	sunlightColor: normalizeColor(
		config.sunlightColor,
		DEFAULT_DAYLIGHT_CONFIG.sunlightColor,
	),
	sunlightIntensity: clamp(
		numberOrDefault(
			config.sunlightIntensity,
			DEFAULT_DAYLIGHT_CONFIG.sunlightIntensity,
		),
		0,
		10,
	),
	sunElevation: clamp(
		numberOrDefault(config.sunElevation, DEFAULT_DAYLIGHT_CONFIG.sunElevation),
		-10,
		90,
	),
	sunAzimuth: clamp(
		numberOrDefault(config.sunAzimuth, DEFAULT_DAYLIGHT_CONFIG.sunAzimuth),
		0,
		360,
	),
});

/**
 * Merge partial scene settings with defaults.
 *
 * @param config - Scene settings patch.
 * @returns Normalized scene config.
 */
export const normalizeSpaceSceneConfig = (
	config: Partial<SpaceSceneConfig> = {},
): SpaceSceneConfig => ({
	daylight: normalizeDaylightConfig(config.daylight),
});

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

	/**
	 * Helper grid for alignment.
	 */
	private grid: GridHelper | null = null;

	/**
	 * Snap size for grid-aligned transforms.
	 */
	private gridSnapSize = 0.5;

	/**
	 * Grid visibility toggle.
	 */
	private gridEnabled = true;

	/**
	 * Ambient light used by daylight configuration.
	 */
	private ambientLight: AmbientLight | null = null;

	/**
	 * Directional sunlight used by daylight configuration.
	 */
	private sunlight: DirectionalLight | null = null;

	/**
	 * Sky dome used by daylight configuration.
	 */
	private sky: Sky | null = null;

	/**
	 * Current space-level scene configuration.
	 */
	private spaceSceneConfig: SpaceSceneConfig = normalizeSpaceSceneConfig();

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
		this.controls.addEventListener("change", () => {
			this.updateGridPosition();
		});

		this.transform = new TransformControls(this.camera, canvas);
		this.transform.addEventListener("dragging-changed", (event: any) => {
			this.controls.enabled = !event.value;
		});
		this.scene.add(this.transform.getHelper());

		this.createGrid();
	}

	/**
	 * Apply space-level scene configuration.
	 *
	 * @param config - Scene config patch.
	 */
	public setSpaceSceneConfig(config: Partial<SpaceSceneConfig>): SpaceSceneConfig {
		this.spaceSceneConfig = normalizeSpaceSceneConfig({
			...this.spaceSceneConfig,
			...config,
			daylight: {
				...this.spaceSceneConfig.daylight,
				...config.daylight,
			},
		});

		this.applyDaylightConfig(this.spaceSceneConfig.daylight);

		return this.getSpaceSceneConfig();
	}

	/**
	 * Get the current space-level scene configuration.
	 */
	public getSpaceSceneConfig(): SpaceSceneConfig {
		return {
			daylight: {...this.spaceSceneConfig.daylight},
		};
	}

	/**
	 * Enable or disable the grid helper.
	 */
	public setGridEnabled(enabled: boolean): void {
		this.gridEnabled = enabled;
		if (this.grid) {
			this.grid.visible = enabled;
			if (enabled) {
				this.updateGridPosition();
			}
		}
	}

	/**
	 * Enable or disable snapping for transform controls.
	 */
	public setTransformSnapEnabled(enabled: boolean): void {
		if (enabled) {
			this.transform.setTranslationSnap(this.gridSnapSize);
			this.transform.setRotationSnap(MathUtils.degToRad(15));
			this.transform.setScaleSnap(0.1);
		} else {
			this.transform.setTranslationSnap(null);
			this.transform.setRotationSnap(null);
			this.transform.setScaleSnap(null);
		}
	}

	/**
	 * Get the size used for grid snapping.
	 */
	public getGridSnapSize(): number {
		return this.gridSnapSize;
	}

	/**
	 * Create the grid helper and add it to the scene.
	 */
	private createGrid(): void {
		if (this.grid) {
			return;
		}

		this.grid = new GridHelper(200, 200, 0x7d7d7d, 0x7d7d7d);
		this.grid.material.opacity = 0.5;
		this.grid.material.transparent = true;
		this.grid.visible = this.gridEnabled;
		this.scene.add(this.grid);
		this.updateGridPosition();
	}

	/**
	 * Keep the grid centered on the camera to simulate infinite plane.
	 */
	private updateGridPosition(): void {
		if (!this.grid || !this.gridEnabled) {
			return;
		}

		this.grid.position.set(Math.round(this.camera.position.x), 0, Math.round(this.camera.position.z));
	}

	public createDefaultScene(): void {
		// Add a cube
		const geometry = new BoxGeometry();
		const material = new MeshStandardMaterial({color: 0xffff00});
		const cube = new Mesh(geometry, material);
		cube.name = "Cube";
		cube.userData.meshType = "cube";
		this.transform.attach(cube);
		this.space.add(cube);

		const planeGeometry = new BoxGeometry(5, 5, 0.1);
		const planeMaterial = new MeshStandardMaterial({color: 0xffffff});

		const plane = new Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
		plane.position.y = -1; // Position it below the cube
		plane.name = "Plane";
		plane.userData.meshType = "plane";
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
			throw new Error("Camera type is unknown");
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
		this.updateGridPosition();

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
		this.ambientLight = new AmbientLight(0xbbbbbb);
		this.scene.add(this.ambientLight);

		this.sunlight = new DirectionalLight(0xeeeeee);
		this.sunlight.position.set(200, 1000, 300);
		this.scene.add(this.sunlight);

		this.sky = new Sky();
		this.sky.scale.setScalar(1e4);

		this.scene.add(this.sky);
		this.applyDaylightConfig(this.spaceSceneConfig.daylight);
	}

	/**
	 * Apply daylight config to ambient light, sun, and sky dome.
	 *
	 * @param config - Daylight config to apply.
	 */
	private applyDaylightConfig(config: DaylightConfig): void {
		if (this.ambientLight) {
			this.ambientLight.color.set(config.ambientColor);
			this.ambientLight.intensity = config.ambientIntensity;
		}

		const phi = MathUtils.degToRad(90 - config.sunElevation);
		const theta = MathUtils.degToRad(config.sunAzimuth);
		const sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta);

		if (this.sunlight) {
			this.sunlight.color.set(config.sunlightColor);
			this.sunlight.intensity = config.sunlightIntensity;
			this.sunlight.position.copy(sunPosition).multiplyScalar(1000);
		}

		if (this.sky) {
			this.sky.material.uniforms.sunPosition.value.copy(sunPosition);
		}
	}
}
