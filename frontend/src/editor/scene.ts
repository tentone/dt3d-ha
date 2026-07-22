import type {Object3D} from "three";
import {
	AmbientLight,
	BoxGeometry,
	Color,
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
import {FlyControls} from "three/examples/jsm/controls/FlyControls.js";
import {MapControls} from "three/examples/jsm/controls/MapControls.js";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {TransformControls} from "three/examples/jsm/controls/TransformControls";

/**
 * Editor camera mode (2D or 3D)
 */
export type CameraMode = "perspective" | "orthographic";

/**
 * Navigation controller used to move the camera.
 */
export type NavigationControlsType = "fly" | "map" | "orbit";

export type NavigationControls = OrbitControls | FlyControls;

export const DEFAULT_NAVIGATION_CONTROLS: NavigationControlsType = "orbit";

/**
 * Normalize a card navigation control setting.
 */
export const normalizeNavigationControlsType = (
	value: unknown,
): NavigationControlsType => {
	if (typeof value !== "string") {
		return DEFAULT_NAVIGATION_CONTROLS;
	}

	const normalized = value.trim().toLowerCase().replace(/controls?$/, "");
	return normalized === "fly" || normalized === "map" || normalized === "orbit"
		? normalized
		: DEFAULT_NAVIGATION_CONTROLS;
};

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

export type SkyConfig = {
	enabled: boolean;
};

export type BackgroundType = "solid" | "transparent";

export type BackgroundConfig = {
	type: BackgroundType;
	color: string;
};

/**
 * General configuration for the active space.
 */
export type SpaceSceneConfig = {
	background: BackgroundConfig;
	daylight: DaylightConfig;
	sky: SkyConfig;
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

export const DEFAULT_SKY_CONFIG: SkyConfig = {
	enabled: true,
};

export const DEFAULT_BACKGROUND_CONFIG: BackgroundConfig = {
	type: "solid",
	color: "#446644",
};

export const DEFAULT_SPACE_SCENE_CONFIG: SpaceSceneConfig = {
	background: DEFAULT_BACKGROUND_CONFIG,
	daylight: DEFAULT_DAYLIGHT_CONFIG,
	sky: DEFAULT_SKY_CONFIG,
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

const booleanOrDefault = (value: unknown, fallback: boolean): boolean => {
	if (value === true || value === "true" || value === "1" || value === 1) {
		return true;
	}

	if (value === false || value === "false" || value === "0" || value === 0) {
		return false;
	}

	return fallback;
};

const normalizeBackgroundType = (value: unknown): BackgroundType =>
	typeof value === "string" && value.trim().toLowerCase() === "transparent"
		? "transparent"
		: "solid";

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
): SpaceSceneConfig => {
	const background: Partial<BackgroundConfig> = config.background ?? {};
	const sky: Partial<SkyConfig> = config.sky ?? {};

	return {
		background: {
			type: normalizeBackgroundType(background.type),
			color: normalizeColor(background.color, DEFAULT_BACKGROUND_CONFIG.color),
		},
		daylight: normalizeDaylightConfig(config.daylight),
		sky: {
			enabled: booleanOrDefault(sky.enabled, DEFAULT_SKY_CONFIG.enabled),
		},
	};
};

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
	 * Controls used to navigate the scene.
	 */
	public controls: NavigationControls = null;

	private navigationControlsType: NavigationControlsType =
		DEFAULT_NAVIGATION_CONTROLS;

	/**
	 * FlyControls has no target, so retain a focus point for saved viewports and
	 * orientation-cube actions.
	 */
	private navigationTarget = new Vector3();

	private navigationTargetDistance = 3;

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

	constructor(
		canvas: HTMLCanvasElement,
		height: number,
		width: number,
		navigationControls: NavigationControlsType = DEFAULT_NAVIGATION_CONTROLS,
	) {
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

		this.navigationTargetDistance = this.camera.position.length();
		this.controls = this.createNavigationControls(navigationControls);

		this.transform = new TransformControls(this.camera, canvas);
		this.transform.addEventListener("dragging-changed", (event: any) => {
			this.controls.enabled = !event.value;
		});
		this.scene.add(this.transform.getHelper());

		this.createGrid();
	}

	private createNavigationControls(
		type: NavigationControlsType,
	): NavigationControls {
		this.navigationControlsType = type;
		const controls =
			type === "fly"
				? new FlyControls(this.camera, this.canvas)
				: type === "map"
					? new MapControls(this.camera, this.canvas)
					: new OrbitControls(this.camera, this.canvas);

		if (controls instanceof OrbitControls) {
			controls.target.copy(this.navigationTarget);
			controls.enableDamping = true;
			controls.dampingFactor = 0.05;
		}

		controls.addEventListener("change", () => {
			this.syncNavigationTarget();
			this.updateGridPosition();
		});

		return controls;
	}

	private syncNavigationTarget(): void {
		if (this.controls instanceof OrbitControls) {
			this.navigationTarget.copy(this.controls.target);
			this.navigationTargetDistance = Math.max(
				this.controls.target.distanceTo(this.camera.position),
				0.1,
			);
			return;
		}

		const direction = new Vector3();
		this.camera.getWorldDirection(direction);
		this.navigationTarget
			.copy(this.camera.position)
			.add(direction.multiplyScalar(this.navigationTargetDistance));
	}

	private setNavigationTarget(target: Vector3): void {
		this.navigationTarget.copy(target);
		this.navigationTargetDistance = Math.max(
			target.distanceTo(this.camera.position),
			0.1,
		);
		if (this.controls instanceof OrbitControls) {
			this.controls.target.copy(target);
		}
	}

	/**
	 * Replace the active navigation controller while preserving the current view.
	 */
	public setNavigationControlsType(
		type: NavigationControlsType,
	): NavigationControls {
		const normalizedType = normalizeNavigationControlsType(type);
		if (normalizedType === this.navigationControlsType) {
			return this.controls;
		}

		this.syncNavigationTarget();
		const enabled = this.controls.enabled;
		this.controls.dispose();
		this.controls = this.createNavigationControls(normalizedType);
		this.controls.enabled = enabled;
		this.controls.update(0);

		return this.controls;
	}

	public getNavigationControlsType(): NavigationControlsType {
		return this.navigationControlsType;
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
			background: {
				...this.spaceSceneConfig.background,
				...config.background,
			},
			daylight: {
				...this.spaceSceneConfig.daylight,
				...config.daylight,
			},
			sky: {
				...this.spaceSceneConfig.sky,
				...config.sky,
			},
		});

		this.applyDaylightConfig(this.spaceSceneConfig.daylight);
		this.applyAppearanceConfig();

		return this.getSpaceSceneConfig();
	}

	/**
	 * Get the current space-level scene configuration.
	 */
	public getSpaceSceneConfig(): SpaceSceneConfig {
		return {
			background: {...this.spaceSceneConfig.background},
			daylight: {...this.spaceSceneConfig.daylight},
			sky: {...this.spaceSceneConfig.sky},
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
		this.controls.update(0);

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
	 * Position the camera on a world axis while preserving its orbit target and
	 * distance from that target.
	 *
	 * @param direction - Axis pointing from the orbit target to the camera.
	 */
	public orientCamera(direction: Vector3): void {
		if (direction.lengthSq() === 0) {
			return;
		}

		this.syncNavigationTarget();
		const target = this.navigationTarget.clone();
		const distance = Math.max(this.navigationTargetDistance, 0.1);
		this.camera.position
			.copy(target)
			.add(direction.clone().normalize().multiplyScalar(distance));
		this.camera.lookAt(target);
		this.camera.updateMatrixWorld();
		this.setNavigationTarget(target);
		this.controls.update(0);
		this.updateGridPosition();
	}

	/**
	 * Capture the current camera position, orientation and projection mode.
	 */
	public captureViewportConfig(): CameraViewportConfig {
		this.syncNavigationTarget();
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
				x: this.navigationTarget.x,
				y: this.navigationTarget.y,
				z: this.navigationTarget.z,
			},
			targetDistance: this.navigationTargetDistance,
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
			this.setNavigationTarget(
				new Vector3(config.target.x, config.target.y, config.target.z),
			);
		} else {
			const direction = new Vector3(
				config.direction.x,
				config.direction.y,
				config.direction.z,
			).normalize();
			const distance = config.targetDistance ?? 10;
			this.setNavigationTarget(
				this.camera.position.clone().add(direction.multiplyScalar(distance)),
			);
		}

		this.camera.updateProjectionMatrix();
		this.camera.updateMatrixWorld();
		this.controls.update(0);
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
		this.applyAppearanceConfig();
	}

	/**
	 * Apply the sky visibility and fallback scene background.
	 */
	private applyAppearanceConfig(): void {
		if (this.sky) {
			this.sky.visible = this.spaceSceneConfig.sky.enabled;
		}

		this.scene.background =
			this.spaceSceneConfig.background.type === "transparent"
				? null
				: new Color(this.spaceSceneConfig.background.color);
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
