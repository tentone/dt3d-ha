import type {
	Object3D} from "three";
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

export type CameraViewportConfig = {
	direction: {
		x: number;
		y: number;
		z: number;
	};
	fov?: number;
	mode: CameraMode;
	position: {
		x: number;
		y: number;
		z: number;
	};
	quaternion?: {
		w: number;
		x: number;
		y: number;
		z: number;
	};
	target?: {
		x: number;
		y: number;
		z: number;
	};
	targetDistance?: number;
	zoom?: number;
};

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

/**
 * Grid display and snapping settings.
 */
export type GridConfig = {
	size: number;
	snapSize: number;
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

export const DEFAULT_GRID_CONFIG: GridConfig = {
	size: 200,
	snapSize: 0.5,
};

const GRID_CAMERA_HEIGHT_MULTIPLIER = 4;
const GRID_VIEWPORT_PADDING = 1.5;
const GRID_MAX_DIVISIONS = 800;

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
 * Merge partial grid settings with defaults and constrain numeric values.
 *
 * @param config - Grid settings patch.
 * @returns Normalized grid config.
 */
export const normalizeGridConfig = (
	config: Partial<GridConfig> = {},
): GridConfig => ({
	size: clamp(numberOrDefault(config.size, DEFAULT_GRID_CONFIG.size), 1, 10000),
	snapSize: clamp(
		numberOrDefault(config.snapSize, DEFAULT_GRID_CONFIG.snapSize),
		0.01,
		1000,
	),
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
	 * Base grid size before camera-height expansion.
	 */
	private gridSize = DEFAULT_GRID_CONFIG.size;

	/**
	 * Snap size for grid-aligned transforms.
	 */
	private gridSnapSize = DEFAULT_GRID_CONFIG.snapSize;

	/**
	 * Last size used to build the visible grid helper.
	 */
	private renderedGridSize = 0;

	/**
	 * Grid visibility toggle.
	 */
	private gridEnabled = true;

	/**
	 * Transform snap toggle.
	 */
	private transformSnapEnabled = false;

	/**
	 * Global shadow flag for renderable scene objects.
	 */
	private shadowsEnabled = false;

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

	constructor(canvas: HTMLCanvasElement, height: number, width: number) {
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
	public setSpaceSceneConfig(
		config: Partial<SpaceSceneConfig>,
	): SpaceSceneConfig {
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
		}

		if (enabled) {
			this.updateGridPosition();
		}
	}

	/**
	 * Apply grid display and snap settings.
	 *
	 * @param config - Grid settings patch.
	 */
	public setGridConfig(config: Partial<GridConfig>): GridConfig {
		const nextConfig = normalizeGridConfig({
			...this.getGridConfig(),
			...config,
		});

		this.gridSize = nextConfig.size;
		this.gridSnapSize = nextConfig.snapSize;
		this.applyTransformSnap();
		this.updateGridPosition();

		return this.getGridConfig();
	}

	/**
	 * Get the current grid display and snap settings.
	 */
	public getGridConfig(): GridConfig {
		return {
			size: this.gridSize,
			snapSize: this.gridSnapSize,
		};
	}

	/**
	 * Enable or disable snapping for transform controls.
	 */
	public setTransformSnapEnabled(enabled: boolean): void {
		this.transformSnapEnabled = enabled;
		this.applyTransformSnap();
	}

	/**
	 * Enable or disable shadows for scene lights and mesh objects.
	 */
	public setShadowsEnabled(enabled: boolean): void {
		this.shadowsEnabled = enabled;

		if (this.sunlight) {
			this.sunlight.castShadow = enabled;
		}

		this.applyShadowSettingsToObject(this.space);
	}

	/**
	 * Apply the current shadow settings to a newly added object subtree.
	 */
	public applyShadowSettingsToObject(object: Object3D): void {
		object.traverse((child) => {
			if ((child as any).internal === true) {
				return;
			}

			if (child instanceof Mesh) {
				child.castShadow = this.shadowsEnabled;
				child.receiveShadow = this.shadowsEnabled;
			}
		});
	}

	/**
	 * Apply the current snap settings to transform controls.
	 */
	private applyTransformSnap(): void {
		if (this.transformSnapEnabled) {
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
		this.ensureGridSize();
		this.updateGridPosition();
	}

	/**
	 * Keep the grid centered on the camera to simulate infinite plane.
	 */
	private updateGridPosition(): void {
		if (!this.gridEnabled) {
			return;
		}

		this.ensureGridSize();
		if (!this.grid) {
			return;
		}

		this.grid.position.set(
			Math.round(this.camera.position.x),
			0,
			Math.round(this.camera.position.z),
		);
	}

	/**
	 * Rebuild the helper when the responsive grid size changes.
	 */
	private ensureGridSize(): void {
		const nextSize = this.getResponsiveGridSize();
		if (this.grid && this.renderedGridSize === nextSize) {
			this.grid.visible = this.gridEnabled;
			return;
		}

		const previousPosition = this.grid?.position.clone() ?? null;
		this.disposeGrid();

		const divisions = Math.round(clamp(nextSize, 1, GRID_MAX_DIVISIONS));
		this.grid = new GridHelper(nextSize, divisions, 0x7d7d7d, 0x7d7d7d);
		const materials = Array.isArray(this.grid.material)
			? this.grid.material
			: [this.grid.material];
		for (const material of materials) {
			material.opacity = 0.5;
			material.transparent = true;
		}

		if (previousPosition) {
			this.grid.position.copy(previousPosition);
		}

		this.grid.visible = this.gridEnabled;
		this.scene.add(this.grid);
		this.renderedGridSize = nextSize;
	}

	/**
	 * Dispose the current grid helper before rebuilding it.
	 */
	private disposeGrid(): void {
		if (!this.grid) {
			return;
		}

		this.scene.remove(this.grid);
		this.grid.geometry.dispose();
		const materials = Array.isArray(this.grid.material)
			? this.grid.material
			: [this.grid.material];
		for (const material of materials) {
			material.dispose();
		}
		this.grid = null;
		this.renderedGridSize = 0;
	}

	/**
	 * Calculate a grid size large enough for the current camera height.
	 */
	private getResponsiveGridSize(): number {
		const cameraHeight = Math.abs(this.camera.position.y);
		const aspect = this.height > 0 ? this.width / this.height : 1;
		const heightBasedSize = cameraHeight * GRID_CAMERA_HEIGHT_MULTIPLIER;
		let viewportSize = heightBasedSize;

		if (this.camera instanceof PerspectiveCamera) {
			const viewportHeight =
				2 * cameraHeight * Math.tan(MathUtils.degToRad(this.camera.fov) / 2);
			viewportSize =
				Math.max(viewportHeight, viewportHeight * aspect) *
				GRID_VIEWPORT_PADDING;
		} else if (this.camera instanceof OrthographicCamera) {
			const viewportHeight = this.orthographicFrustumSize / this.camera.zoom;
			viewportSize =
				Math.max(viewportHeight, viewportHeight * aspect) *
				GRID_VIEWPORT_PADDING;
		}

		const targetSize = Math.max(this.gridSize, heightBasedSize, viewportSize);
		const resizeStep = clamp(this.gridSize / 4, 1, 50);

		return Math.ceil(targetSize / resizeStep) * resizeStep;
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

		this.updateGridPosition();
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
			this.camera = new PerspectiveCamera(
				75,
				this.width / this.height,
				0.1,
				10000,
			);
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
		this.updateGridPosition();
	}

	/**
	 * Toggle camera mode between perspective and orthographic.
	 */
	public toggleCameraMode(): CameraMode {
		const nextMode: CameraMode =
			this.cameraMode === "perspective" ? "orthographic" : "perspective";
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
	 * Capture the current camera position, orientation and projection mode.
	 */
	public captureViewportConfig(): CameraViewportConfig {
		const direction = new Vector3();
		this.camera.getWorldDirection(direction);

		return {
			direction: {
				x: direction.x,
				y: direction.y,
				z: direction.z,
			},
			fov:
				this.camera instanceof PerspectiveCamera ? this.camera.fov : undefined,
			mode: this.cameraMode,
			position: {
				x: this.camera.position.x,
				y: this.camera.position.y,
				z: this.camera.position.z,
			},
			quaternion: {
				w: this.camera.quaternion.w,
				x: this.camera.quaternion.x,
				y: this.camera.quaternion.y,
				z: this.camera.quaternion.z,
			},
			target: {
				x: this.controls.target.x,
				y: this.controls.target.y,
				z: this.controls.target.z,
			},
			targetDistance: this.controls.target.distanceTo(this.camera.position),
			zoom: this.camera.zoom,
		};
	}

	/**
	 * Move the editor camera to a saved viewport.
	 *
	 * @param config - Viewport camera configuration.
	 */
	public applyViewportConfig(config: CameraViewportConfig): void {
		this.setCameraMode(config.mode);

		this.camera.position.set(
			config.position.x,
			config.position.y,
			config.position.z,
		);

		if (config.quaternion) {
			this.camera.quaternion.set(
				config.quaternion.x,
				config.quaternion.y,
				config.quaternion.z,
				config.quaternion.w,
			);
		} else {
			const direction = new Vector3(
				config.direction.x,
				config.direction.y,
				config.direction.z,
			).normalize();
			const distance = config.targetDistance ?? 10;
			const target = this.camera.position
				.clone()
				.add(direction.multiplyScalar(distance));
			this.camera.lookAt(target);
		}

		if (
			this.camera instanceof PerspectiveCamera &&
			typeof config.fov === "number"
		) {
			this.camera.fov = config.fov;
		}

		if (typeof config.zoom === "number") {
			this.camera.zoom = config.zoom;
		}

		if (config.target) {
			this.controls.target.set(
				config.target.x,
				config.target.y,
				config.target.z,
			);
		} else {
			const direction = new Vector3(
				config.direction.x,
				config.direction.y,
				config.direction.z,
			).normalize();
			const distance = config.targetDistance ?? 10;
			this.controls.target
				.copy(this.camera.position)
				.add(direction.multiplyScalar(distance));
		}

		this.camera.updateProjectionMatrix();
		this.camera.updateMatrixWorld();
		this.controls.update();
		this.updateGridPosition();
	}

	/**
	 * Create and add the sky to the scene.
	 */
	private addSky(): void {
		this.ambientLight = new AmbientLight(0xbbbbbb);
		this.scene.add(this.ambientLight);

		this.sunlight = new DirectionalLight(0xeeeeee);
		this.sunlight.position.set(200, 1000, 300);
		this.sunlight.castShadow = this.shadowsEnabled;
		this.sunlight.shadow.mapSize.set(2048, 2048);
		this.sunlight.shadow.camera.near = 0.5;
		this.sunlight.shadow.camera.far = 3000;
		this.sunlight.shadow.camera.left = -200;
		this.sunlight.shadow.camera.right = 200;
		this.sunlight.shadow.camera.top = 200;
		this.sunlight.shadow.camera.bottom = -200;
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
