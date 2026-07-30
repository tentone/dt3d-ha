import "./add-entity-modal/add-entity-modal.js";
import "./bottom-bar/bottom-bar.js";
import "./camera-toggle/camera-toggle.js";
import "./confirmation-modal/confirmation-modal.js";
import "./connection-status/connection-status.js";
import "./form-modal/form-modal.js";
import "./hint-box/hint-box.js";
import "./light-menu/light-menu.js";
import "./mesh-menu/mesh-menu.js";
import "./object-sidebar/object-sidebar.js";
import "./object-tree/object-tree.js";
import "./orientation-cube/orientation-cube.js";
import "./space-config-menu/space-config-menu.js";
import "./space-selector/space-selector.js";
import "./sync-progress-component/sync-progress-component.js";
import "./upload-menu/upload-menu.js";
import "./xr-controls/xr-controls.js";

import {LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import type {Camera, Intersection, Object3D, Quaternion, Scene} from "three";
import {
	Box3,
	BoxGeometry,
	Group,
	Matrix4,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Plane,
	Raycaster,
	Vector2,
	Vector3,
} from "three";
import type {TransformControls} from "three/examples/jsm/controls/TransformControls";

import type {EditorAction} from "../editor/action-stack.js";
import {ActionStack} from "../editor/action-stack.js";
import type {CollisionObstacle} from "../editor/collision.js";
import {
	collectCollisionObstacles,
	getInitiallyOverlappingObstacles,
	getObjectBounds,
	resolveCollisionMovement,
} from "../editor/collision.js";
import type {
	EntityAction,
	EntityInteractionConfig,
} from "../editor/entity-actions.js";
import {normalizeEntityInteractionConfig} from "../editor/entity-actions.js";
import type {
	CardGeneralConfig,
	GeneralConfig,
	SpaceConfiguration,
	SpaceGeneralConfig,
} from "../editor/general-config.js";
import {
	hasCardGeneralConfiguration,
	hasSceneConfiguration,
	hasSpaceGeneralConfiguration,
	mergeGeneralConfig,
	normalizeCardGeneralConfig,
	normalizeGeneralConfig,
	normalizeSpaceConfiguration,
	normalizeSpaceGeneralConfig,
} from "../editor/general-config.js";
import {applyImageTextureToMesh} from "../editor/material-texture.js";
import {MeasurementManager} from "../editor/measurements.js";
import {createMeshObject, resolveMeshType} from "../editor/mesh-handler.js";
import {RendererManager} from "../editor/renderer.js";
import type {
	CameraMode,
	CameraViewportConfig,
	GridConfig,
	NavigationControls,
	NavigationControlsType,
	SpaceSceneConfig,
} from "../editor/scene.js";
import {
	normalizeGridConfig,
	normalizeNavigationControlsType,
	normalizeSpaceSceneConfig,
	SceneManager,
} from "../editor/scene.js";
import {WallManager} from "../editor/walls.js";
import type {Locale} from "../locale/locale.js";
import {localManager} from "../locale/locale.js";
import {DTObject} from "../objects/dt-object.js";
import {EntityBinary} from "../objects/entity-binary.js";
import {EntityCamera} from "../objects/entity-camera.js";
import {EntityClimate} from "../objects/entity-climate.js";
import {EntityGeneric} from "../objects/entity-generic.js";
import {EntityLight} from "../objects/entity-light.js";
import {EntityObject, isToggleable} from "../objects/entity-object.js";
import {EntitySensor} from "../objects/entity-sensor.js";
import {EntitySwitch} from "../objects/entity-switch.js";
import {StaticLightObject} from "../objects/static-light.js";
import {ViewportObject} from "../objects/viewport-object.js";
import type {SpaceResponse} from "../service/space-api.js";
import {SpaceApi} from "../service/space-api.js";
import {SpaceSync} from "../service/space-sync.js";
import {
	collectDroppedFiles,
	findImageFile,
	pickLocalFiles,
} from "../utils/file-utils.js";
import {isModelFile, loadModelsFromFiles} from "../utils/loader-utils.js";
import {LocalStorage} from "../utils/local-storage.js";
import {findMesh} from "../utils/object3d-utils.js";
import type {DT3DAddEntityModal} from "./add-entity-modal/add-entity-modal.js";
import type {DT3DBottomBar} from "./bottom-bar/bottom-bar.js";
import type {DT3DCameraToggle} from "./camera-toggle/camera-toggle.js";
import type {
	ConfirmationActionType,
	DT3DConfirmationModal,
} from "./confirmation-modal/confirmation-modal.js";
import type {ConnectionStatus} from "./connection-status/connection-status.js";
import type {DynamicFormField} from "./dynamic-form/dynamic-form.js";
import type {
	DT3DFormModal,
	FormModalSubmitDetail,
} from "./form-modal/form-modal.js";
import type {DT3DHintBox} from "./hint-box/hint-box.js";
import type {DT3DLightMenu} from "./light-menu/light-menu.js";
import type {DT3DMeshMenu} from "./mesh-menu/mesh-menu.js";
import type {ObjectUpdateDetail} from "./object-inspector/object-inspector.js";
import type {DT3DObjectSidebar} from "./object-sidebar/object-sidebar.js";
import type {DT3DTree} from "./object-tree/object-tree.js";
import type {
	DT3DOrientationCube,
	OrientationCubeDirection,
} from "./orientation-cube/orientation-cube.js";
import type {
	DT3DSpaceConfigMenu,
	SpaceConfigUpdateDetail,
} from "./space-config-menu/space-config-menu.js";
import type {DT3DSpaceSelector} from "./space-selector/space-selector.js";
import type {SyncProgressComponent} from "./sync-progress-component/sync-progress-component.js";
import type {DT3DUploadMenu} from "./upload-menu/upload-menu.js";
import type {DT3DXrControls, XrMode} from "./xr-controls/xr-controls.js";

const SPACE_SCENE_CONFIG_STORAGE_KEY = "space-scene-config";
const GRID_CONFIG_STORAGE_KEY = "grid-config";
const DEFAULT_CARD_HEIGHT = 300;
const MASONRY_CARD_UNIT_HEIGHT = 50;
const ENTITY_CLICK_DELAY = 300;
const VIEWER_CONTROL_MARGIN = 16;
const VIEWER_CONTROL_GAP = 8;

const booleanConfig = (value: unknown): boolean =>
	value === true || value === "true" || value === "1";

type ConfirmationOptions = {
	heading: string;
	message: string;
	confirmLabel: string;
	actionType: ConfirmationActionType;
	onConfirm: () => void;
};

type GeographicCoordinates = {
	latitude: number;
	longitude: number;
	altitude: number | null;
};

type SpaceTransformSnapshot = {
	position: Vector3;
	quaternion: Quaternion;
};

type DeviceOrientationEventWithCompass = DeviceOrientationEvent & {
	webkitCompassHeading?: number;
	webkitCompassAccuracy?: number;
};

type DeviceOrientationEventConstructorWithPermission =
	typeof DeviceOrientationEvent & {
		requestPermission?: (
			absolute?: boolean,
		) => Promise<"granted" | "denied" | "prompt">;
	};

type HierarchyMoveSnapshot = {
	object: Object3D;
	oldParent: Object3D;
	oldIndex: number;
	oldPosition: Vector3;
	oldQuaternion: Quaternion;
	oldScale: Vector3;
	newParent: Object3D;
	newIndex: number;
	newPosition: Vector3;
	newQuaternion: Quaternion;
	newScale: Vector3;
};

@customElement("dt3d-card")
export class DT3DCard extends LitElement {
	/**
	 * Home assistant card configuration.
	 */
	private config: any;

	/**
	 * Home assistant instance.
	 */
	public hassInstance: any;

	private container: HTMLElement = null;

	private content: HTMLElement = null;

	private canvas: HTMLCanvasElement = null;

	private sceneManager: SceneManager;

	private rendererManager: RendererManager;

	/**
	 * Viewport into the 3D space.
	 */
	private camera: Camera = null;

	/**
	 * Renderer for the 3D content.
	 */
	private controls: NavigationControls;

	/**
	 * Transform controls are used to manipulate objects.
	 */
	private transform: TransformControls = null;

	/**
	 * The scene where all 3D objects are placed.
	 */
	private scene: Scene;

	/**
	 * The home group that contains all main objects in the scene.
	 *
	 * This allows for easy manipulation of the entire scene (e.g., moving, scaling, rotating the whole scene).
	 */
	private space: Group;

	/**
	 * Sidebar element for object creation and wall tools.
	 */
	public objectSidebar: DT3DObjectSidebar;

	/**
	 * Bottom editor toolbar for transforms, measurements, and scene settings.
	 */
	public bottomBar: DT3DBottomBar;

	/**
	 * Hint box element that shows contextual instructions to the user.
	 */
	private hintBox: DT3DHintBox;

	private syncProgressComponent: SyncProgressComponent | null = null;

	private cameraToggle: DT3DCameraToggle | null = null;

	private xrControls: DT3DXrControls | null = null;

	private xrSystem: XRSystem | null = null;

	private xrAvailabilitySequence = 0;

	private activeXrSession: XRSession | null = null;

	private activeXrMode: XrMode | null = null;

	private xrSessionRequestPending = false;

	private controlsEnabledBeforeXr = true;

	private cameraViewportBeforeXr: CameraViewportConfig | null = null;

	private arSpaceTransform: SpaceTransformSnapshot | null = null;

	private orientationCube: DT3DOrientationCube | null = null;

	private objectTreeResizeObserver: ResizeObserver | null = null;

	private spaceSelector: DT3DSpaceSelector | null = null;

	private connectionStatus: ConnectionStatus | null = null;

	/**
	 * Tree element for displaying the 3D object hierarchy.
	 */
	public tree: DT3DTree;

	/**
	 * Handles measurement interactions and helper rendering.
	 */
	private measurementManager: MeasurementManager | null = null;

	/**
	 * Wall tool manager that handles wall/door/window placement.
	 */
	private wallManager: WallManager | null = null;

	private lastSelectedObject: Object3D | null = null;

	private selectedObjects: Object3D[] = [];

	/** Editor-only object used as TransformControls' multi-selection target. */
	private selectionPivot: Group | null = null;

	/**
	 * Object waiting to be placed by a scene double-click.
	 */
	private moveToPointObject: Object3D | null = null;

	/**
	 * Raycaster for interaction with the scene.
	 */
	private raycaster: Raycaster = new Raycaster();

	/**
	 * API client for fetching/saving spaces and objects.
	 */
	private apiClient: SpaceApi | null = null;

	/**
	 * API sync helper for spaces and objects.
	 */
	private spaceSync: SpaceSync | null = null;

	/**
	 * Normalized pointer position.
	 */
	private pointer: Vector2 = new Vector2();

	/**
	 * Object currently hovered.
	 */
	private hoveredObject: DTObject | null = null;

	private sceneLongPressTimer: number | null = null;

	private sceneLongPressPointerId: number | null = null;

	private sceneLongPressStart: { x: number; y: number } | null = null;

	private suppressNextCanvasClick = false;

	private suppressNextCanvasClickTimer: number | null = null;

	private pendingEntityClickTimer: number | null = null;

	private entityInteractions: EntityInteractionConfig =
		normalizeEntityInteractionConfig();

	private readonly handleXrDeviceChange = (): void => {
		void this.refreshXrAvailability();
	};

	private readonly handleXrSessionEnd = (event: Event): void => {
		const session = event.currentTarget as XRSession;
		queueMicrotask(() => this.finishXrSession(session));
	};

	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (event.defaultPrevented || event.repeat) {
			return;
		}

		if (
			this.isVisualizationOnly() ||
			this.hasOpenDialog() ||
			this.isKeyboardEventFromEditableElement(event)
		) {
			return;
		}

		if (event.key === "Escape" && this.moveToPointObject) {
			event.preventDefault();
			this.cancelMoveToPoint();
			return;
		}

		const modifier = event.ctrlKey || event.metaKey;
		const key = event.key.toLowerCase();
		if (modifier && !event.altKey && (key === "z" || key === "y")) {
			const redo = key === "y" || event.shiftKey;
			const changed = redo ? this.actionStack.redo() : this.actionStack.undo();
			if (changed) {
				event.preventDefault();
			}
			return;
		}

		if (event.key !== "Delete") {
			return;
		}

		const target = this.getSelectedObjectForDelete();
		if (!target) {
			return;
		}

		event.preventDefault();
		this.requestDeleteObject(target.uuid);
	};

	private readonly actionStack = new ActionStack();

	private transformStart: {
		object: Object3D;
		position: Vector3;
		quaternion: Quaternion;
		scale: Vector3;
	} | null = null;

	private multiTransformStart: {
		pivotMatrixWorld: Matrix4;
		objects: {
			object: Object3D;
			worldMatrix: Matrix4;
			position: Vector3;
			quaternion: Quaternion;
			scale: Vector3;
		}[];
	} | null = null;

	private collisionDrag: {
		bounds: Box3;
		ignoredObstacles: Set<CollisionObstacle>;
		obstacles: CollisionObstacle[];
		target: Object3D;
		targetWorldPosition: Vector3;
	} | null = null;

	private collisionBoundsHelper: Mesh | null = null;

	private readonly sceneLongPressDelay = 600;

	private readonly sceneLongPressMoveTolerance = 12;

	/**
	 * Current general rendering/development configuration.
	 */
	private generalConfig: GeneralConfig = normalizeGeneralConfig();
	private cardGeneralConfig: CardGeneralConfig = normalizeCardGeneralConfig();
	private spaceGeneralConfig: SpaceGeneralConfig =
		normalizeSpaceGeneralConfig();

	/**
	 * Current space-level scene configuration.
	 */
	private spaceSceneConfig: SpaceSceneConfig = normalizeSpaceSceneConfig();

	/**
	 * Active space configuration menu, if open.
	 */
	private spaceConfigMenu: DT3DSpaceConfigMenu | null = null;

	/**
	 * Active mesh add menu, if open.
	 */
	private meshMenu: DT3DMeshMenu | null = null;

	private lightMenu: DT3DLightMenu | null = null;

	private uploadMenu: DT3DUploadMenu | null = null;

	private confirmationModal: DT3DConfirmationModal | null = null;

	private gridConfigModal: DT3DFormModal | null = null;

	private spaceFormModal: DT3DFormModal | null = null;

	private persistSpaceConfigTimer: number | null = null;

	private pendingSpaceMetadata: Omit<SpaceConfigUpdateDetail, "config"> | null =
		null;

	static properties = {
		hass: {attribute: false},
		_config: {state: true},
	};
	public locale: Locale;

	set hass(hass: any) {
		if (!this.hassInstance) {
			console.log("DT3D: Entity states", this, DT3DCard.styles, hass.states);
		}

		this.locale = localManager;

		this.hassInstance = hass;

		this.updateSkyFromDateTime();
		this.updateEntityObjects();
		void this.refreshXrAvailability();
	}

	/**
	 * Apply Home Assistant's local solar position to date/time-following skies.
	 * The sun integration calculates these values from HA's configured clock and
	 * location and refreshes them as the current time changes.
	 */
	private updateSkyFromDateTime(): void {
		const attributes = this.hassInstance?.states?.["sun.sun"]?.attributes;
		const elevation = Number(attributes?.elevation);
		const azimuth = Number(attributes?.azimuth);

		this.sceneManager?.setDateTimeSunPosition(
			Number.isFinite(elevation) && Number.isFinite(azimuth)
				? {elevation, azimuth}
				: null,
		);
	}

	/**
	 * Select 3D model files or a model directory to upload.
	 *
	 * All selected files are made available to the model loaders so external
	 * material, texture, and buffer references can be resolved.
	 *
	 * @param directory - Whether to select a complete directory instead of files.
	 */
	private selectFiles(directory = false): void {
		if (!this.space || this.isVisualizationOnly()) {
			return;
		}

		const host = this.content ?? this;
		void pickLocalFiles(host, directory).then((files) =>
			this.importModels(files),
		);
	}

	private importModels(files: File[], position?: Vector3): Promise<void> {
		if (!this.space || this.isVisualizationOnly()) {
			return Promise.resolve();
		}

		return loadModelsFromFiles(files, (object, file) => {
			if (position) object.position.copy(position);
			this.addToScene(object, file.name);
		});
	}

	/**
	 * Set the configuration for the card.
	 *
	 * @param config - configuration object
	 * @throws Error if the configuration is invalid.
	 */
	public setConfig(config: any) {
		if (!config) {
			throw new Error("Invalid configuration");
		}

		const visualizationOnly = booleanConfig(
			config.visualization_only ?? config.visualizationOnly,
		);
		const orientationCube = booleanConfig(
			config.orientation_cube ?? config.orientationCube,
		);
		const vrMode = booleanConfig(
			config.vr_mode ?? config.vrMode ?? config.enable_vr ?? config.enableVr,
		);
		const arMode = booleanConfig(
			config.ar_mode ?? config.arMode ?? config.enable_ar ?? config.enableAr,
		);
		const arLocationBased = booleanConfig(
			config.ar_location_based ?? config.arLocationBased,
		);
		const arLocationEntity = String(
			config.ar_location_entity ?? config.arLocationEntity ?? "",
		).trim();
		const parsedArEnvironmentOrientation = Number(
			config.ar_environment_orientation ??
				config.arEnvironmentOrientation ??
				0,
		);
		const arEnvironmentOrientation = Number.isFinite(
			parsedArEnvironmentOrientation,
		)
			? parsedArEnvironmentOrientation
			: 0;
		const navigationControls = normalizeNavigationControlsType(
			config.navigation_controls ??
				config.navigationControls ??
				config.navigation_control ??
				config.navigationControl,
		);
		this.entityInteractions = normalizeEntityInteractionConfig(config);

		this.cardGeneralConfig = normalizeCardGeneralConfig(
			config.general ?? config,
		);

		const mergedConfig = {
			port: 8080,
			service_key: "",
			...config,
			general: this.cardGeneralConfig,
		};
		this.config = {
			...mergedConfig,
			ar_environment_orientation: arEnvironmentOrientation,
			ar_location_based: arLocationBased,
			ar_location_entity: arLocationEntity,
			ar_mode: arMode,
			orientation_cube: orientationCube,
			navigation_controls: navigationControls,
			visualization_only: visualizationOnly,
			vr_mode: vrMode,
			entity_click_action: this.entityInteractions.click,
			entity_double_click_action: this.entityInteractions.doubleClick,
		};
		this.clearPendingEntityClickAction();
		this.applyNavigationControls();
		this.applyGeneralConfig();
		this.applyVisualizationMode();
		this.applyXrConfiguration();

		console.log("DT3D: Config set:", this.config);
	}

	private isVisualizationOnly(): boolean {
		return this.config?.visualization_only === true;
	}

	private getNavigationControlsType(): NavigationControlsType {
		return normalizeNavigationControlsType(this.config?.navigation_controls);
	}

	private applyNavigationControls(): void {
		if (!this.sceneManager) {
			return;
		}

		this.controls = this.sceneManager.setNavigationControlsType(
			this.getNavigationControlsType(),
		);
		this.rendererManager?.setControls(this.controls);
	}

	private isXrModeEnabled(mode: XrMode): boolean {
		return this.config?.[`${mode}_mode`] === true;
	}

	private isAnyXrModeEnabled(): boolean {
		return this.isXrModeEnabled("vr") || this.isXrModeEnabled("ar");
	}

	private isLocationBasedArEnabled(): boolean {
		return this.config?.ar_location_based === true;
	}

	private getArLocationTarget(): GeographicCoordinates | null {
		const entityId = this.config?.ar_location_entity;
		if (
			!this.isLocationBasedArEnabled() ||
			typeof entityId !== "string" ||
			!entityId
		) {
			return null;
		}

		const attributes = this.hassInstance?.states?.[entityId]?.attributes;
		if (
			attributes?.latitude === null ||
			attributes?.latitude === undefined ||
			attributes?.latitude === "" ||
			attributes?.longitude === null ||
			attributes?.longitude === undefined ||
			attributes?.longitude === ""
		) {
			return null;
		}

		const latitude = Number(attributes?.latitude);
		const longitude = Number(attributes?.longitude);
		if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
			return null;
		}

		const altitude =
			attributes?.altitude === null ||
			attributes?.altitude === undefined ||
			attributes?.altitude === ""
				? Number.NaN
				: Number(attributes.altitude);
		return {
			latitude,
			longitude,
			altitude: Number.isFinite(altitude) ? altitude : null,
		};
	}

	private hasValidArLocationConfiguration(): boolean {
		return !this.isLocationBasedArEnabled() || this.getArLocationTarget() !== null;
	}

	private applyXrConfiguration(): void {
		this.rendererManager?.setXrEnabled(
			this.isAnyXrModeEnabled() || this.activeXrSession !== null,
		);

		if (
			this.activeXrSession &&
			this.activeXrMode &&
			!this.isXrModeEnabled(this.activeXrMode)
		) {
			void this.activeXrSession.end();
		}

		void this.refreshXrAvailability();
	}

	private bindXrSystem(): void {
		const system =
			typeof navigator === "undefined" ? null : (navigator.xr ?? null);
		if (this.xrSystem === system) {
			return;
		}

		this.xrSystem?.removeEventListener(
			"devicechange",
			this.handleXrDeviceChange,
		);
		this.xrSystem = system;
		this.xrSystem?.addEventListener("devicechange", this.handleXrDeviceChange);
	}

	private async refreshXrAvailability(): Promise<void> {
		const controls = this.xrControls;
		const requestSequence = ++this.xrAvailabilitySequence;
		if (!controls) {
			return;
		}

		this.bindXrSystem();
		const system = this.xrSystem;
		const vrEnabled = this.isXrModeEnabled("vr");
		const arEnabled =
			this.isXrModeEnabled("ar") && this.hasValidArLocationConfiguration();

		if (!system || (!vrEnabled && !arEnabled)) {
			controls.vrAvailable = false;
			controls.arAvailable = false;
			controls.hidden = true;
			this.updateViewerControlPositions();
			return;
		}

		const [vrAvailable, arAvailable] = await Promise.all([
			vrEnabled
				? system.isSessionSupported("immersive-vr").catch(() => false)
				: false,
			arEnabled
				? system.isSessionSupported("immersive-ar").catch(() => false)
				: false,
		]);

		if (
			requestSequence !== this.xrAvailabilitySequence ||
			controls !== this.xrControls
		) {
			return;
		}

		controls.vrAvailable = vrAvailable;
		controls.arAvailable = arAvailable;
		controls.hidden = !vrAvailable && !arAvailable;
		this.updateXrControlState();
		this.updateViewerControlPositions();
	}

	private updateXrControlState(): void {
		if (!this.xrControls) {
			return;
		}

		this.xrControls.activeMode = this.activeXrMode ?? "";
		this.xrControls.busy = this.xrSessionRequestPending;
		if (this.cameraToggle) {
			this.cameraToggle.hidden = this.activeXrSession !== null;
		}
	}

	private setEditorCameraMode(mode: CameraMode): void {
		if (!this.sceneManager || this.sceneManager.getCameraMode() === mode) {
			return;
		}

		this.sceneManager.setCameraMode(mode);
		this.camera = this.sceneManager.camera;
		this.controls = this.sceneManager.controls;
		this.transform = this.sceneManager.transform;
		this.rendererManager.setCamera(this.camera);
		this.rendererManager.setControls(this.controls);
		if (this.orientationCube) {
			this.orientationCube.camera = this.camera;
		}
		if (this.cameraToggle) {
			this.cameraToggle.mode = mode;
		}
	}

	private createXrSessionOptions(mode: XrMode): XRSessionInit {
		const optionalFeatures = ["local-floor", "bounded-floor", "hand-tracking"];
		const options: XRSessionInit = {optionalFeatures};

		if (mode === "ar" && this.content) {
			optionalFeatures.push("dom-overlay");
			options.domOverlay = {root: this.content};
		}

		return options;
	}

	private getCurrentDevicePosition(): Promise<GeographicCoordinates> {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error("Geolocation is not supported by this browser"));
				return;
			}

			navigator.geolocation.getCurrentPosition(
				(position) => {
					resolve({
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						altitude: position.coords.altitude,
					});
				},
				(error) => reject(error),
				{
					enableHighAccuracy: true,
					maximumAge: 0,
					timeout: 15000,
				},
			);
		});
	}

	private getDeviceHeading(): Promise<number | null> {
		if (
			typeof window === "undefined" ||
			typeof DeviceOrientationEvent === "undefined"
		) {
			return Promise.resolve(null);
		}

		const orientationEvent =
			DeviceOrientationEvent as DeviceOrientationEventConstructorWithPermission;
		let permission: Promise<"granted" | "denied" | "prompt">;
		try {
			permission = orientationEvent.requestPermission
				? orientationEvent.requestPermission(true)
				: Promise.resolve("granted");
		} catch {
			return Promise.resolve(null);
		}

		return permission
			.then((result) => {
				if (result !== "granted") {
					return null;
				}

				return new Promise<number | null>((resolve) => {
					let completed = false;
					const finish = (heading: number | null): void => {
						if (completed) {
							return;
						}

						completed = true;
						window.clearTimeout(timeout);
						window.removeEventListener(
							"deviceorientationabsolute",
							handleOrientation,
						);
						window.removeEventListener("deviceorientation", handleOrientation);
						resolve(heading);
					};
					const handleOrientation = (event: DeviceOrientationEvent): void => {
						const compassEvent = event as DeviceOrientationEventWithCompass;
						const webkitHeading = Number(compassEvent.webkitCompassHeading);
						if (Number.isFinite(webkitHeading)) {
							finish(((webkitHeading % 360) + 360) % 360);
							return;
						}

						const alpha = Number(event.alpha);
						if (!event.absolute || !Number.isFinite(alpha)) {
							return;
						}

						const screenAngle = Number(window.screen.orientation?.angle ?? 0);
						finish(((360 - alpha + screenAngle) % 360 + 360) % 360);
					};
					const timeout = window.setTimeout(() => finish(null), 3000);

					window.addEventListener(
						"deviceorientationabsolute",
						handleOrientation,
					);
					window.addEventListener("deviceorientation", handleOrientation);
				});
			})
			.catch(() => null);
	}

	private getGeographicOffset(
		device: GeographicCoordinates,
		target: GeographicCoordinates,
		heading: number,
	): Vector3 {
		const earthRadius = 6378137;
		const degreesToRadians = Math.PI / 180;
		const latitudeDelta =
			(target.latitude - device.latitude) * degreesToRadians;
		const longitudeDeltaDegrees =
			((target.longitude - device.longitude + 540) % 360) - 180;
		const longitudeDelta = longitudeDeltaDegrees * degreesToRadians;
		const meanLatitude =
			((target.latitude + device.latitude) / 2) * degreesToRadians;
		const north = latitudeDelta * earthRadius;
		const east = longitudeDelta * earthRadius * Math.cos(meanLatitude);
		const headingRadians = heading * degreesToRadians;
		const altitude =
			target.altitude !== null && device.altitude !== null
				? target.altitude - device.altitude
				: 0;

		return new Vector3(
			east * Math.cos(headingRadians) - north * Math.sin(headingRadians),
			altitude,
			-east * Math.sin(headingRadians) - north * Math.cos(headingRadians),
		);
	}

	private applyLocationBasedArTransform(
		device: GeographicCoordinates,
		heading: number | null,
	): void {
		const target = this.getArLocationTarget();
		if (!target || !this.space || this.arSpaceTransform) {
			return;
		}

		const resolvedHeading = heading ?? 0;
		if (heading === null) {
			console.warn(
				"DT3D: Compass heading unavailable; using the XR reference orientation for location-based AR",
			);
		}

		this.arSpaceTransform = {
			position: this.space.position.clone(),
			quaternion: this.space.quaternion.clone(),
		};

		this.space.updateWorldMatrix(true, true);
		const bounds = new Box3().setFromObject(this.space);
		const localCenter = bounds.isEmpty()
			? new Vector3()
			: this.space.worldToLocal(bounds.getCenter(new Vector3()));
		const geographicOffset = this.getGeographicOffset(
			device,
			target,
			resolvedHeading,
		);
		const orientation = Number(this.config?.ar_environment_orientation ?? 0);
		const yaw =
			((resolvedHeading - orientation) * Math.PI) / 180;
		const yawQuaternion = new Quaternion().setFromAxisAngle(
			new Vector3(0, 1, 0),
			yaw,
		);
		const nextQuaternion = yawQuaternion
			.clone()
			.multiply(this.arSpaceTransform.quaternion);
		const centerOffset = localCenter
			.clone()
			.multiply(this.space.scale)
			.applyQuaternion(nextQuaternion);

		this.space.quaternion.copy(nextQuaternion);
		this.space.position.set(
			geographicOffset.x - centerOffset.x,
			this.arSpaceTransform.position.y + geographicOffset.y,
			geographicOffset.z - centerOffset.z,
		);
		this.space.updateMatrix();
		this.space.updateWorldMatrix(false, true);
	}

	private restoreLocationBasedArTransform(): void {
		if (!this.arSpaceTransform || !this.space) {
			return;
		}

		this.space.position.copy(this.arSpaceTransform.position);
		this.space.quaternion.copy(this.arSpaceTransform.quaternion);
		this.space.updateMatrix();
		this.space.updateWorldMatrix(false, true);
		this.arSpaceTransform = null;
	}

	private async applyLocationBasedArWhenReady(
		session: XRSession,
		position: Promise<GeographicCoordinates>,
		heading: Promise<number | null>,
	): Promise<void> {
		try {
			const [devicePosition, deviceHeading] = await Promise.all([
				position,
				heading,
			]);
			if (this.activeXrSession !== session || this.activeXrMode !== "ar") {
				return;
			}

			this.applyLocationBasedArTransform(devicePosition, deviceHeading);
		} catch (error) {
			console.error(
				"DT3D: Location-based AR requires access to the device location",
				error,
			);
			if (this.activeXrSession === session) {
				try {
					await session.end();
				} catch {
					// The session may already be closing.
				}
			}
		}
	}

	private async toggleXrSession(mode: XrMode): Promise<void> {
		if (
			this.xrSessionRequestPending ||
			!this.isXrModeEnabled(mode) ||
			(mode === "ar" && !this.hasValidArLocationConfiguration())
		) {
			return;
		}

		if (this.activeXrSession) {
			try {
				await this.activeXrSession.end();
			} catch (error) {
				console.error("DT3D: Failed to exit immersive mode", error);
			}
			return;
		}

		const system = this.xrSystem;
		if (!system || !this.rendererManager || !this.sceneManager) {
			return;
		}

		this.xrSessionRequestPending = true;
		this.updateXrControlState();
		const locationBasedAr =
			mode === "ar" && this.isLocationBasedArEnabled();
		const devicePosition = locationBasedAr
			? this.getCurrentDevicePosition()
			: null;
		if (devicePosition) {
			// The XR permission prompt can resolve after geolocation rejects.
			// Attach a handler immediately; the positioning task still receives
			// and handles the original rejection once the session starts.
			void devicePosition.catch(() => undefined);
		}
		const deviceHeading = locationBasedAr
			? this.getDeviceHeading()
			: null;

		let session: XRSession | null = null;
		try {
			const sessionMode: XRSessionMode =
				mode === "vr" ? "immersive-vr" : "immersive-ar";
			session = await system.requestSession(
				sessionMode,
				this.createXrSessionOptions(mode),
			);

			this.activeXrSession = session;
			this.activeXrMode = mode;
			session.addEventListener("end", this.handleXrSessionEnd, {once: true});
			this.controlsEnabledBeforeXr = this.controls?.enabled ?? true;
			this.cameraViewportBeforeXr =
				this.sceneManager.captureViewportConfig();
			this.setEditorCameraMode("perspective");
			this.controls.enabled = false;
			this.sceneManager.setImmersiveMode(mode);
			this.updateXrControlState();

			await this.rendererManager.setXrSession(session);
			if (devicePosition && deviceHeading) {
				void this.applyLocationBasedArWhenReady(
					session,
					devicePosition,
					deviceHeading,
				);
			}
		} catch (error) {
			console.error(`DT3D: Failed to enter ${mode.toUpperCase()} mode`, error);
			if (session) {
				try {
					await session.end();
				} catch {
					// The browser may already have closed a partially started session.
				}
				this.finishXrSession(session);
			}
		} finally {
			this.xrSessionRequestPending = false;
			this.updateXrControlState();
		}
	}

	private finishXrSession(session: XRSession): void {
		if (this.activeXrSession !== session) {
			return;
		}

		session.removeEventListener("end", this.handleXrSessionEnd);
		this.activeXrSession = null;
		this.activeXrMode = null;
		this.sceneManager?.setImmersiveMode(null);
		this.restoreLocationBasedArTransform();

		const previousViewport = this.cameraViewportBeforeXr;
		this.cameraViewportBeforeXr = null;
		if (previousViewport) {
			this.sceneManager.applyViewportConfig(previousViewport);
			this.camera = this.sceneManager.camera;
			this.controls = this.sceneManager.controls;
			this.transform = this.sceneManager.transform;
			this.rendererManager.setCamera(this.camera);
			this.rendererManager.setControls(this.controls);
			if (this.orientationCube) {
				this.orientationCube.camera = this.camera;
			}
			if (this.cameraToggle) {
				this.cameraToggle.mode = this.sceneManager.getCameraMode();
			}
		}
		if (this.controls) {
			this.controls.enabled = this.controlsEnabledBeforeXr;
		}

		this.rendererManager?.setXrEnabled(this.isAnyXrModeEnabled());
		this.updateXrControlState();
	}

	private isOrientationCubeEnabled(): boolean {
		return this.config?.orientation_cube === true;
	}

	private applyOrientationCubeVisibility(): void {
		if (!this.content || !this.sceneManager) {
			return;
		}

		if (!this.isOrientationCubeEnabled()) {
			this.orientationCube?.remove();
			this.orientationCube = null;
			this.updateViewerControlPositions();
			return;
		}

		if (!this.orientationCube) {
			this.orientationCube = document.createElement("dt3d-orientation-cube");
			this.orientationCube.addEventListener(
				"orientation-select",
				(event: Event) => {
					const direction = (event as CustomEvent<OrientationCubeDirection>)
						.detail;
					this.sceneManager.orientCamera(
						new Vector3(direction.x, direction.y, direction.z),
					);
				},
			);
			this.content.appendChild(this.orientationCube);
		}

		this.orientationCube.camera = this.sceneManager.camera;
		this.observeObjectTreeSize();
		this.updateViewerControlPositions();
	}

	private observeObjectTreeSize(): void {
		if (!this.tree || this.objectTreeResizeObserver) {
			return;
		}

		this.objectTreeResizeObserver = new ResizeObserver(() => {
			this.updateViewerControlPositions();
		});
		this.objectTreeResizeObserver.observe(this.tree);
	}

	private updateViewerControlPositions(): void {
		const treeWidth = this.tree?.getBoundingClientRect().width ?? 0;
		const right = `${treeWidth + VIEWER_CONTROL_MARGIN}px`;

		if (this.orientationCube) {
			this.orientationCube.style.left = "auto";
			this.orientationCube.style.right = right;
			this.orientationCube.style.bottom = `${VIEWER_CONTROL_MARGIN}px`;
		}

		const cubeHeight =
			this.orientationCube?.getBoundingClientRect().height ?? 0;
		const cameraBottom = this.orientationCube
			? VIEWER_CONTROL_MARGIN + cubeHeight + VIEWER_CONTROL_GAP
			: VIEWER_CONTROL_MARGIN;

		if (this.cameraToggle) {
			this.cameraToggle.style.left = "auto";
			this.cameraToggle.style.right = right;
			this.cameraToggle.style.bottom = `${cameraBottom}px`;
		}

		if (this.xrControls) {
			this.xrControls.style.left = "auto";
			this.xrControls.style.right = right;
			this.xrControls.style.bottom = `${
				cameraBottom + 48 + VIEWER_CONTROL_GAP
			}px`;
		}
	}

	private getDefaultSpaceId(): string | undefined {
		const value = this.config?.default_space ?? this.config?.defaultSpace;
		return typeof value === "string" && value.trim() ? value.trim() : undefined;
	}

	private getDefaultViewportId(): string | undefined {
		const value = this.config?.default_viewport ?? this.config?.defaultViewport;
		return typeof value === "string" && value.trim() ? value.trim() : undefined;
	}

	private isDevelopmentMode(): boolean {
		return this.generalConfig.developmentMode.enabled;
	}

	private applyDevelopmentMode(): void {
		if (this.connectionStatus) {
			this.connectionStatus.style.display = this.isDevelopmentMode()
				? ""
				: "none";
		}
	}

	private applyGeneralConfig(): void {
		this.generalConfig = mergeGeneralConfig(
			this.cardGeneralConfig,
			this.spaceGeneralConfig,
		);
		this.rendererManager?.setRenderingConfig(this.generalConfig.rendering);
		this.sceneManager?.setShadowsEnabled(
			this.generalConfig.rendering.shadowMap.enabled,
			this.generalConfig.rendering.shadowMap.resolution,
		);
		this.applyDevelopmentMode();
	}

	private getSpaceConfiguration(): SpaceConfiguration {
		return normalizeSpaceConfiguration({
			general: this.spaceGeneralConfig,
			scene: this.spaceSceneConfig,
		});
	}

	private applySpaceConfiguration(
		config: Partial<SpaceConfiguration>,
	): SpaceConfiguration {
		const normalized = normalizeSpaceConfiguration({
			general: config.general ?? this.spaceGeneralConfig,
			scene: config.scene ?? this.spaceSceneConfig,
		});

		this.spaceGeneralConfig = normalized.general;
		this.applyGeneralConfig();
		this.spaceSceneConfig = this.sceneManager
			? this.sceneManager.setSpaceSceneConfig(normalized.scene)
			: normalizeSpaceSceneConfig(normalized.scene);
		LocalStorage.write(SPACE_SCENE_CONFIG_STORAGE_KEY, this.spaceSceneConfig);

		return this.getSpaceConfiguration();
	}

	private applySpaceConfigFromApi(space: SpaceResponse | null): void {
		const apiConfig = space?.config ?? {};
		const hasCardGeneral = hasCardGeneralConfiguration(apiConfig);
		const hasGeneral = hasSpaceGeneralConfiguration(apiConfig);
		const hasScene = hasSceneConfiguration(apiConfig);
		const nextConfig = normalizeSpaceConfiguration({
			general: hasGeneral
				? (apiConfig.general ?? apiConfig)
				: normalizeSpaceGeneralConfig(),
			scene: hasScene
				? (apiConfig.scene ?? apiConfig.spaceScene)
				: this.spaceSceneConfig,
		});

		this.applySpaceConfiguration(nextConfig);

		if (space && (!hasGeneral || !hasScene || hasCardGeneral)) {
			void this.persistSpaceConfiguration();
		}
	}

	private schedulePersistSpaceConfiguration(
		metadata?: Omit<SpaceConfigUpdateDetail, "config">,
	): void {
		if (metadata) {
			this.pendingSpaceMetadata = metadata;
		}
		if (this.persistSpaceConfigTimer !== null) {
			window.clearTimeout(this.persistSpaceConfigTimer);
		}

		this.persistSpaceConfigTimer = window.setTimeout(() => {
			this.persistSpaceConfigTimer = null;
			void this.persistSpaceConfiguration();
		}, 300);
	}

	private async persistSpaceConfiguration(): Promise<void> {
		const metadata = this.pendingSpaceMetadata;
		if (metadata && !metadata.name.trim()) {
			return;
		}

		try {
			const updatedSpace = await this.spaceSync?.updateActiveSpaceConfig(
				this.getSpaceConfiguration(),
				metadata
					? {
						name: metadata.name.trim(),
						description: metadata.description.trim(),
						isDefault: metadata.isDefault,
					}
					: undefined,
			);
			if (updatedSpace && this.spaceSelector && this.spaceSync) {
				this.spaceSelector.spaces = this.spaceSync.availableSpaces;
			}
			if (this.pendingSpaceMetadata === metadata) {
				this.pendingSpaceMetadata = null;
			}
		} catch (error) {
			console.warn("DT3D: Failed to persist space configuration", error);
		}
	}

	private applyVisualizationMode(): void {
		const visualizationOnly = this.isVisualizationOnly();
		this.spaceSync?.setReadOnly(visualizationOnly);
		this.rendererManager?.setSelectedObjects(
			visualizationOnly ? [] : this.selectedObjects,
		);

		if (this.objectSidebar) {
			this.objectSidebar.style.display = visualizationOnly ? "none" : "";
			if (this.syncProgressComponent) {
				this.syncProgressComponent.objectSidebarCollapsed =
					visualizationOnly || this.objectSidebar.collapsed;
			}
		}

		if (this.bottomBar) {
			this.bottomBar.style.display = visualizationOnly ? "none" : "";
		}

		if (this.tree) {
			this.tree.style.display = visualizationOnly ? "none" : "";
			this.tree.closeContextMenu();
		}

		if (this.spaceSelector) {
			this.spaceSelector.style.display = visualizationOnly ? "none" : "";
		}

		if (visualizationOnly) {
			this.cancelMoveToPoint();
			this.spaceConfigMenu?.remove();
			this.spaceConfigMenu = null;
			this.meshMenu?.remove();
			this.meshMenu = null;
			this.lightMenu?.remove();
			this.lightMenu = null;
			this.uploadMenu?.remove();
			this.uploadMenu = null;
			this.confirmationModal?.remove();
			this.confirmationModal = null;
			this.gridConfigModal?.remove();
			this.gridConfigModal = null;
			this.spaceFormModal?.remove();
			this.spaceFormModal = null;
			this.content
				?.querySelectorAll("dt3d-add-entity-modal")
				.forEach((modal) => modal.remove());

			this.measurementManager?.setMode("none");
			this.wallManager?.setMode("none");
			if (this.bottomBar) {
				this.bottomBar.measurementTool = "none";
			}
			if (this.objectSidebar) {
				this.objectSidebar.wallTool = "none";
			}

			if (this.transform) {
				this.transform.detach();
				this.transform.enabled = false;
				this.transform.getHelper().visible = false;
			}
		}

		this.applyGridVisibility();
		this.updateHintMessage();
		this.applyOrientationCubeVisibility();
	}

	private applyGridVisibility(): void {
		this.sceneManager?.setGridEnabled(
			!this.isVisualizationOnly() && (this.bottomBar?.gridEnabled ?? true),
		);
	}

	private recordAction(action: EditorAction): void {
		if (!this.isVisualizationOnly()) {
			this.actionStack.record(action);
		}
	}

	private refreshAfterObjectMutation(object: Object3D | null): void {
		this.sceneManager?.requestShadowMapUpdate();
		if (object) {
			this.sceneManager?.applyShadowSettingsToObject(object);
		}
		this.tree?.updateTreeDiff(this.space);
		this.tree?.refreshSelectedObject();
		if (this.selectedObjects.length > 1 && !this.multiTransformStart) {
			this.attachTransformToSelection();
		}
	}

	private insertObject(
		object: Object3D,
		parent: Object3D,
		index: number,
	): void {
		parent.add(object);
		const currentIndex = parent.children.indexOf(object);
		parent.children.splice(currentIndex, 1);
		parent.children.splice(
			Math.max(0, Math.min(index, parent.children.length)),
			0,
			object,
		);
		object.traverse((child) => {
			if (child instanceof DTObject) {
				child.init();
			}
		});
		this.refreshAfterObjectMutation(object);
	}

	private removeObject(object: Object3D): void {
		const remainingSelection = this.selectedObjects.filter(
			(selectedObject) =>
				!object.getObjectByProperty("uuid", selectedObject.uuid),
		);
		const removesSelection =
			remainingSelection.length !== this.selectedObjects.length;
		const removesTransform = this.transform?.object
			? Boolean(object.getObjectByProperty("uuid", this.transform.object.uuid))
			: false;
		const removesMoveToPointTarget = this.moveToPointObject
			? Boolean(object.getObjectByProperty("uuid", this.moveToPointObject.uuid))
			: false;

		object.removeFromParent();
		if (removesTransform) {
			this.transform.detach();
		}
		if (removesMoveToPointTarget) {
			this.cancelMoveToPoint();
		}
		if (removesSelection) {
			this.setSelectedObjects(remainingSelection);
		}
		this.refreshAfterObjectMutation(null);
	}

	/** Restore all hierarchy placements as one undoable operation. */
	private placeObjects(
		moves: HierarchyMoveSnapshot[],
		state: "old" | "new",
	): void {
		for (const move of moves) {
			move.object.removeFromParent();
		}

		const movesByParent = new Map<Object3D, HierarchyMoveSnapshot[]>();
		for (const move of moves) {
			const parent = state === "old" ? move.oldParent : move.newParent;
			const parentMoves = movesByParent.get(parent) ?? [];
			parentMoves.push(move);
			movesByParent.set(parent, parentMoves);
		}

		for (const [parent, parentMoves] of movesByParent) {
			parentMoves.sort((first, second) => {
				const firstIndex = state === "old" ? first.oldIndex : first.newIndex;
				const secondIndex = state === "old" ? second.oldIndex : second.newIndex;
				return firstIndex - secondIndex;
			});

			for (const move of parentMoves) {
				const index = state === "old" ? move.oldIndex : move.newIndex;
				const position = state === "old" ? move.oldPosition : move.newPosition;
				const quaternion =
					state === "old" ? move.oldQuaternion : move.newQuaternion;
				const scale = state === "old" ? move.oldScale : move.newScale;

				parent.add(move.object);
				const currentIndex = parent.children.indexOf(move.object);
				parent.children.splice(currentIndex, 1);
				parent.children.splice(
					Math.max(0, Math.min(index, parent.children.length)),
					0,
					move.object,
				);
				move.object.position.copy(position);
				move.object.quaternion.copy(quaternion);
				move.object.scale.copy(scale);
				move.object.updateMatrix();
			}
		}

		for (const move of moves) {
			move.object.updateWorldMatrix(false, true);
		}
		this.refreshAfterObjectMutation(null);
	}

	private recordAddedObject(object: Object3D): void {
		const parent = object.parent;
		if (!parent) {
			return;
		}
		const index = parent.children.indexOf(object);
		this.recordAction({
			type: "add-object",
			label: object.name || "Object",
			undo: () => this.removeObject(object),
			redo: () => this.insertObject(object, parent, index),
			sync: (operation) =>
				operation === "undo"
					? this.spaceSync?.syncObjectDelete(object)
					: this.spaceSync?.syncObjectHierarchyCreate(object),
		});
	}

	/**
	 * Adds a 3D object to the scene.
	 *
	 * @param object - The 3D object to add to the scene.
	 */
	public addToScene(object: Object3D | null | undefined, name?: string): void {
		if (this.isVisualizationOnly()) {
			return;
		}

		if (!object) {
			return;
		}

		if (name) {
			object.name = name;
		}

		console.log("DT3d: Adding object to scene", object, name);

		if (object instanceof DTObject) {
			object.init();
		}

		this.space.add(object);
		this.sceneManager?.applyShadowSettingsToObject(object);
		this.attachTransform(object);

		this.tree.updateTreeDiff(this.space);

		this.recordAddedObject(object);
	}

	/**
	 * Attach transform controls to the target object if it is editable.
	 *
	 * Locked DTObjects cannot be edited and will detach the transform helper.
	 *
	 * @param target - Object to attach to.
	 */
	private attachTransform(target: Object3D | null): void {
		const enabled = this.transform?.enabled;

		if (!this.transform) {
			return;
		}

		if (this.isVisualizationOnly()) {
			this.transform.detach();
			this.transform.enabled = false;
			this.transform.getHelper().visible = false;
			return;
		}

		// Detach if no target or target is locked
		if (!target || (target instanceof DTObject && target.locked)) {
			this.transform.detach();
			return;
		}

		this.transform.attach(target);

		// Restore previous enabled state (in case it was disabled)
		this.transform.enabled = enabled;
		this.transform.getHelper().visible = enabled;
	}

	/** Return selected roots so descendants are not transformed twice. */
	private getTopLevelSelectedObjects(): Object3D[] {
		const selected = new Set(this.selectedObjects);
		return this.selectedObjects.filter((object) => {
			let parent = object.parent;
			while (parent) {
				if (selected.has(parent)) {
					return false;
				}
				parent = parent.parent;
			}
			return true;
		});
	}

	/** Calculate combined world-space bounds, falling back to object origins. */
	private getCombinedObjectBounds(objects: Object3D[]): Box3 {
		const bounds = new Box3();
		for (const object of objects) {
			object.updateWorldMatrix(true, true);
			const objectBounds = new Box3().expandByObject(object, true);
			if (objectBounds.isEmpty()) {
				bounds.expandByPoint(object.getWorldPosition(new Vector3()));
			} else {
				bounds.union(objectBounds);
			}
		}

		return bounds;
	}

	/** Frame the complete editor selection in the current camera view. */
	private focusSelectedObjects(): void {
		if (this.selectedObjects.length === 0) {
			return;
		}

		this.sceneManager.focusBounds(
			this.getCombinedObjectBounds(this.getTopLevelSelectedObjects()),
		);
	}

	/** Attach TransformControls to either the selected object or a shared pivot. */
	private attachTransformToSelection(): void {
		if (!this.transform) {
			return;
		}

		if (this.selectedObjects.length <= 1) {
			this.attachTransform(this.selectedObjects[0] ?? null);
			return;
		}

		if (
			this.selectedObjects.some(
				(object) => object instanceof DTObject && object.locked,
			)
		) {
			this.attachTransform(null);
			return;
		}

		if (!this.selectionPivot) {
			this.selectionPivot = new Group();
			this.selectionPivot.name = "Multi-selection pivot";
			this.selectionPivot.internal = true;
		}
		if (this.scene && this.selectionPivot.parent !== this.scene) {
			this.scene.add(this.selectionPivot);
		}

		const bounds = this.getCombinedObjectBounds(this.selectedObjects);
		const center = new Vector3();
		bounds.getCenter(center);

		this.selectionPivot.position.copy(center);
		this.selectionPivot.quaternion.identity();
		this.selectionPivot.scale.set(1, 1, 1);
		this.selectionPivot.updateMatrix();
		this.selectionPivot.updateWorldMatrix(true, false);
		this.attachTransform(this.selectionPivot);
	}

	/**
	 * Store the current selection and show its editor-only outline.
	 *
	 * @param object - Selected object, or null to clear the selection.
	 */
	private setSelectedObject(object: Object3D | null): void {
		this.setSelectedObjects(object ? [object] : []);
	}

	/** Store and display a complete object selection. */
	private setSelectedObjects(objects: Object3D[]): void {
		const uniqueObjects = [...new Set(objects)];
		if (uniqueObjects.length === 0 && this.moveToPointObject) {
			this.cancelMoveToPoint();
		}
		this.selectedObjects = uniqueObjects;
		this.lastSelectedObject =
			uniqueObjects.length === 1 ? uniqueObjects[0] : null;
		if (this.bottomBar) {
			this.bottomBar.hasSelection = uniqueObjects.length > 0;
		}
		this.rendererManager?.setSelectedObjects(
			this.isVisualizationOnly() ? [] : uniqueObjects,
		);
		this.attachTransformToSelection();
	}

	/** Apply the current pivot delta to every selected top-level object. */
	private applyMultiTransformDelta(): void {
		const start = this.multiTransformStart;
		if (
			!start ||
			!this.selectionPivot ||
			this.transform?.object !== this.selectionPivot
		) {
			return;
		}

		this.selectionPivot.updateWorldMatrix(true, false);
		const delta = new Matrix4()
			.copy(this.selectionPivot.matrixWorld)
			.multiply(new Matrix4().copy(start.pivotMatrixWorld).invert());

		for (const snapshot of start.objects) {
			const parent = snapshot.object.parent;
			if (!parent) {
				continue;
			}

			parent.updateWorldMatrix(true, false);
			const localMatrix = new Matrix4()
				.copy(parent.matrixWorld)
				.invert()
				.multiply(delta)
				.multiply(snapshot.worldMatrix);
			localMatrix.decompose(
				snapshot.object.position,
				snapshot.object.quaternion,
				snapshot.object.scale,
			);
			snapshot.object.updateMatrix();
			snapshot.object.updateWorldMatrix(false, true);
		}

		this.sceneManager?.requestShadowMapUpdate();
	}

	/**
	 * Start collision tracking for a transform-controls translation.
	 */
	private beginCollisionDrag(
		movingObjects: Object3D[],
		target: Object3D,
	): void {
		this.endCollisionDrag();
		if (
			!this.bottomBar?.collisionAvoidanceEnabled ||
			this.transform?.getMode() !== "translate" ||
			!this.space
		) {
			return;
		}

		const bounds = getObjectBounds(movingObjects);
		if (bounds.isEmpty()) {
			return;
		}

		const obstacles = collectCollisionObstacles(this.space, movingObjects);
		target.updateWorldMatrix(true, false);
		this.collisionDrag = {
			bounds,
			ignoredObstacles: getInitiallyOverlappingObstacles(bounds, obstacles),
			obstacles,
			target,
			targetWorldPosition: target.getWorldPosition(new Vector3()),
		};
		this.updateCollisionBoundsHelper(bounds);
	}

	/**
	 * Clamp the current transform target to the nearest obstacle.
	 */
	private applyCollisionConstraint(): void {
		const drag = this.collisionDrag;
		if (!drag || !this.bottomBar?.collisionAvoidanceEnabled) {
			return;
		}

		drag.target.updateWorldMatrix(true, false);
		const proposedWorldPosition = drag.target.getWorldPosition(new Vector3());
		const requestedMovement = proposedWorldPosition
			.clone()
			.sub(drag.targetWorldPosition);
		const result = resolveCollisionMovement(
			drag.bounds,
			requestedMovement,
			drag.obstacles,
			drag.ignoredObstacles,
		);
		const allowedWorldPosition = drag.targetWorldPosition
			.clone()
			.add(result.movement);

		if (!allowedWorldPosition.equals(proposedWorldPosition)) {
			this.setObjectWorldPosition(drag.target, allowedWorldPosition);
			if (this.multiTransformStart && drag.target === this.selectionPivot) {
				this.applyMultiTransformDelta();
			}
		}

		drag.bounds.copy(result.bounds);
		drag.targetWorldPosition.copy(allowedWorldPosition);
		this.updateCollisionBoundsHelper(drag.bounds);
	}

	/**
	 * Set an object's world position while preserving its parent transform.
	 */
	private setObjectWorldPosition(object: Object3D, position: Vector3): void {
		if (object.parent) {
			object.parent.updateWorldMatrix(true, false);
			object.position.copy(object.parent.worldToLocal(position.clone()));
		} else {
			object.position.copy(position);
		}
		object.updateMatrix();
		object.updateWorldMatrix(false, true);
	}

	/**
	 * Show the active moving bounds as a translucent red box.
	 */
	private updateCollisionBoundsHelper(bounds: Box3): void {
		if (!this.scene) {
			return;
		}

		if (!this.collisionBoundsHelper) {
			const material = new MeshBasicMaterial({
				color: 0xff0000,
				depthTest: false,
				depthWrite: false,
				opacity: 0.4,
				transparent: true,
			});
			this.collisionBoundsHelper = new Mesh(new BoxGeometry(1, 1, 1), material);
			this.collisionBoundsHelper.name = "Collision bounds";
			(this.collisionBoundsHelper as Mesh & { internal?: boolean }).internal =
				true;
			this.collisionBoundsHelper.renderOrder = 1000;
			this.scene.add(this.collisionBoundsHelper);
		}

		bounds.getCenter(this.collisionBoundsHelper.position);
		bounds.getSize(this.collisionBoundsHelper.scale);
		this.collisionBoundsHelper.visible = true;
		this.collisionBoundsHelper.updateMatrix();
	}

	/**
	 * Clear collision state and hide the editor-only bounds mesh.
	 */
	private endCollisionDrag(): void {
		this.collisionDrag = null;
		if (this.collisionBoundsHelper) {
			this.collisionBoundsHelper.visible = false;
		}
	}

	private disposeCollisionBoundsHelper(): void {
		this.endCollisionDrag();
		if (!this.collisionBoundsHelper) {
			return;
		}

		this.collisionBoundsHelper.removeFromParent();
		this.collisionBoundsHelper.geometry.dispose();
		const materials = Array.isArray(this.collisionBoundsHelper.material)
			? this.collisionBoundsHelper.material
			: [this.collisionBoundsHelper.material];
		for (const material of materials) {
			material.dispose();
		}
		this.collisionBoundsHelper = null;
	}

	private openConfirmationModal(options: ConfirmationOptions): void {
		if (!this.content) {
			return;
		}

		this.confirmationModal?.remove();

		const modal = document.createElement(
			"dt3d-confirmation-modal",
		) as DT3DConfirmationModal;
		modal.heading = options.heading;
		modal.message = options.message;
		modal.confirmLabel = options.confirmLabel;
		modal.actionType = options.actionType;

		const closeModal = () => {
			modal.remove();
			if (this.confirmationModal === modal) {
				this.confirmationModal = null;
			}
		};

		modal.addEventListener("modal-confirm", () => {
			closeModal();
			options.onConfirm();
		});
		modal.addEventListener("modal-close", closeModal);

		this.confirmationModal = modal;
		this.content.appendChild(modal);
	}

	private requestDeleteObject(objectId: string): void {
		if (!this.space || this.isVisualizationOnly()) {
			return;
		}

		const target = this.space.getObjectByProperty(
			"uuid",
			objectId,
		) as Object3D | null;
		if (!target || target === this.space) {
			return;
		}

		this.tree?.closeContextMenu();
		this.openConfirmationModal({
			heading: localManager.get("deleteObjectTitle"),
			message: localManager.get("confirmDelete"),
			confirmLabel: localManager.get("delete"),
			actionType: "red",
			onConfirm: () => this.deleteObject(objectId),
		});
	}

	/**
	 * Enter a one-shot mode that places an object at the next scene
	 * double-click.
	 */
	private beginMoveToPoint(objectId: string): void {
		if (!this.space || this.isVisualizationOnly()) {
			return;
		}

		const object = this.space.getObjectByProperty(
			"uuid",
			objectId,
		) as Object3D | null;
		if (
			!object ||
			object === this.space ||
			!object.parent ||
			(object instanceof DTObject && object.locked)
		) {
			return;
		}

		this.measurementManager?.setMode("none");
		this.wallManager?.setMode("none");
		if (this.bottomBar) {
			this.bottomBar.measurementTool = "none";
		}
		if (this.objectSidebar) {
			this.objectSidebar.wallTool = "none";
		}

		this.moveToPointObject = object;
		this.attachTransform(object);
		this.tree.selectObject(object.uuid);
		this.setSelectedObject(object);
		if (this.canvas) {
			this.canvas.style.cursor = "crosshair";
		}
		this.updateHintMessage();
	}

	/**
	 * Leave move-to-point mode without changing the object.
	 */
	private cancelMoveToPoint(): void {
		this.moveToPointObject = null;
		if (this.canvas) {
			this.canvas.style.cursor = "";
		}
		this.updateHintMessage();
	}

	/**
	 * Delete object from space.
	 *
	 * @param objectId - ID of the object to be delete from the space.
	 */
	private deleteObject(objectId: string): void {
		if (!this.space || this.isVisualizationOnly()) {
			return;
		}

		const target = this.space.getObjectByProperty(
			"uuid",
			objectId,
		) as Object3D | null;
		if (!target || target === this.space) {
			return;
		}

		const parent = target.parent;
		if (!parent) {
			return;
		}

		const index = parent.children.indexOf(target);
		this.removeObject(target);
		this.recordAction({
			type: "delete-object",
			label: target.name || "Object",
			undo: () => this.insertObject(target, parent, index),
			redo: () => this.removeObject(target),
			sync: (operation) =>
				operation === "undo"
					? this.spaceSync?.syncObjectHierarchyCreate(target)
					: this.spaceSync?.syncObjectDelete(target),
		});
	}

	/**
	 * Clone a object in the space.
	 *
	 * @param objectId - Object ID to clone
	 */
	private cloneObject(objectId: string): void {
		if (!this.space || this.isVisualizationOnly()) {
			return;
		}

		const original = this.space.getObjectByProperty(
			"uuid",
			objectId,
		) as Object3D | null;

		if (!original || original === this.space) {
			return;
		}

		const parent = original.parent ?? this.space;
		const clone = original.clone(true);

		// Object3D.clone() copies userData, including the API IDs assigned to the
		// original hierarchy. Remove them so persistence creates new records
		// instead of updating the originals.
		clone.traverse((child) => {
			delete child.userData.apiId;
		});

		parent.add(clone);

		this.attachTransform(clone);
		this.tree.updateTreeDiff(this.space);

		this.recordAddedObject(clone);
	}

	private pickDropPositionFromEvent(event: MouseEvent): Vector3 {
		const {intersection} = this.pickObjectFromEvent(event);

		return intersection?.point.clone() ?? new Vector3(0, 0, 0);
	}

	private async handleCanvasDrop(event: DragEvent): Promise<void> {
		event.preventDefault();

		if (this.isVisualizationOnly()) {
			return;
		}

		const files = event.dataTransfer
			? await collectDroppedFiles(event.dataTransfer)
			: [];
		const modelFiles = files.filter(isModelFile);

		if (modelFiles.length > 0) {
			const position = this.pickDropPositionFromEvent(event as MouseEvent);
			await this.importModels(files, position);
			return;
		}

		await this.handleTextureDrop(event, findImageFile(files));
	}

	private async handleTextureDrop(
		event: DragEvent,
		file: File | null,
	): Promise<void> {
		event.preventDefault();
		if (this.isVisualizationOnly()) {
			return;
		}

		if (!file) {
			return;
		}

		const {intersection} = this.pickObjectFromEvent(event as MouseEvent);
		const mesh = findMesh(intersection?.object ?? null);
		if (!mesh) {
			return;
		}

		const beforeMaterial = Array.isArray(mesh.material)
			? mesh.material.map((material) => material.clone())
			: mesh.material.clone();
		await applyImageTextureToMesh(mesh, file);
		const afterMaterial = Array.isArray(mesh.material)
			? mesh.material.map((material) => material.clone())
			: mesh.material.clone();
		const applyMaterial = (material: typeof beforeMaterial): void => {
			mesh.material = Array.isArray(material)
				? material.map((item) => item.clone())
				: material.clone();
			this.refreshAfterObjectMutation(mesh);
		};
		this.tree.refreshSelectedObject();
		this.recordAction({
			type: "update-object",
			label: `${mesh.name || "Object"}: material`,
			undo: () => applyMaterial(beforeMaterial),
			redo: () => applyMaterial(afterMaterial),
			sync: () => this.spaceSync?.syncObjectUpdate(mesh),
		});
	}

	/**
	 * Handle canvas click events.
	 *
	 * @param event - Mouse event
	 */
	private handleCanvasClick(event: MouseEvent): void {
		if (this.suppressNextCanvasClick) {
			this.clearCanvasClickSuppression();
			return;
		}

		this.tree?.closeContextMenu();

		// Keep the pending object selected while waiting for the placement
		// double-click. Browsers emit click events before dblclick.
		if (this.moveToPointObject) {
			return;
		}

		// In measurement mode, single clicks are consumed to prevent misclicks
		if (this.measurementManager?.isActive() || this.wallManager?.isActive()) {
			return;
		}

		this.clearPendingEntityClickAction();

		// Pick object and trigger click interaction
		const {object} = this.pickObjectFromEvent(event);
		this.setSelectedObject(object);
		object?.onInteraction({
			type: "click",
			event: event,
			hass: this.hassInstance,
		});

		if (!(object instanceof EntityObject)) {
			return;
		}

		// A browser emits click events before dblclick. Delay the single-click
		// action so a double-click can cancel it and run only its own action.
		const action = this.resolveEntityAction(object, "click");
		if (event.detail > 1 || action === "nothing") {
			return;
		}

		this.pendingEntityClickTimer = window.setTimeout(() => {
			this.pendingEntityClickTimer = null;
			this.performEntityAction(object, action);
		}, ENTITY_CLICK_DELAY);
	}

	private clearPendingEntityClickAction(): void {
		if (this.pendingEntityClickTimer !== null) {
			window.clearTimeout(this.pendingEntityClickTimer);
			this.pendingEntityClickTimer = null;
		}
	}

	private openEntity(entityId: string): void {
		this.dispatchEvent(
			new CustomEvent("hass-more-info", {
				detail: {entityId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private performEntityAction(
		object: EntityObject,
		action: EntityAction,
	): void {
		switch (action) {
			case "open":
				this.openEntity(object.entityId);
				break;
			case "toggle":
				if (isToggleable(object)) {
					void object.toggle(this.hassInstance);
				}
				break;
			case "nothing":
				break;
		}
	}

	private resolveEntityAction(
		object: EntityObject,
		interaction: "click" | "doubleClick",
	): EntityAction {
		const override =
			interaction === "click" ? object.clickAction : object.doubleClickAction;
		const action =
			override === "default" ? this.entityInteractions[interaction] : override;

		return action === "toggle" && !isToggleable(object) ? "nothing" : action;
	}

	/**
	 * Handle pointer move events.
	 *
	 * @param event - Mouse or pointer event
	 */
	private handlePointerMove(event: MouseEvent): void {
		if (!this.isVisualizationOnly()) {
			this.wallManager?.handlePointerMove(event);
		}

		const {object} = this.pickObjectFromEvent(event);
		if (object === this.hoveredObject) {
			return;
		}

		// If there is a previously hovered object, send pointerleave
		if (this.hoveredObject) {
			this.hoveredObject.onInteraction({
				type: "pointerleave",
				event: event,
				hass: this.hassInstance,
			});
		}

		this.hoveredObject = object;

		// If there is a new hovered object, send pointerenter
		if (this.hoveredObject) {
			this.hoveredObject.onInteraction({
				type: "pointerenter",
				event: event,
				hass: this.hassInstance,
			});
		}
	}

	/**
	 * Pick digital tiwn object using the raycaster.
	 *
	 * @param event - Mouse event to get pointer coordinates
	 * @returns - Object fround in interaction
	 */
	private pickObjectFromEvent(event: MouseEvent): {
		object: DTObject | null;
		intersection: Intersection<Object3D> | null;
	} {
		if (!this.canvas || !this.camera || !this.space) {
			return {object: null, intersection: null};
		}

		const rect = this.canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.camera);

		const intersects = this.raycaster.intersectObjects(
			this.space.children,
			true,
		);

		for (const intersection of intersects) {
			let current: Object3D | null = intersection.object;
			let internalHit = false;

			while (current) {
				if (current instanceof DTObject && current?.internal !== true) {
					return {object: current, intersection};
				}

				if (current?.internal === true) {
					internalHit = true;
				}

				current = current.parent;
			}

			if (internalHit) {
				continue;
			}
			return {object: null, intersection};
		}

		return {object: null, intersection: null};
	}

	/**
	 * Resolve a world-space placement point while ignoring the object being
	 * moved. Empty scene areas fall back to the world ground plane.
	 */
	private pickMoveToPointPosition(
		event: MouseEvent,
		movingObject: Object3D,
	): Vector3 | null {
		if (!this.canvas || !this.camera || !this.space) {
			return null;
		}

		const rect = this.canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.camera);

		const intersections = this.raycaster.intersectObjects(
			this.space.children,
			true,
		);
		const intersection = intersections.find((candidate) => {
			let current: Object3D | null = candidate.object;
			while (current) {
				if (
					current === movingObject ||
					(current instanceof DTObject && current.internal)
				) {
					return false;
				}
				current = current.parent;
			}
			return true;
		});
		if (intersection) {
			return intersection.point.clone();
		}

		return this.raycaster.ray.intersectPlane(
			new Plane(new Vector3(0, 1, 0), 0),
			new Vector3(),
		);
	}

	/**
	 * Apply the pending move-to-point command from a scene double-click.
	 *
	 * @returns True when move-to-point mode consumed the event.
	 */
	private handleMoveToPointDoubleClick(event: MouseEvent): boolean {
		const object = this.moveToPointObject;
		if (!object) {
			return false;
		}

		const liveObject = this.space?.getObjectByProperty(
			"uuid",
			object.uuid,
		) as Object3D | null;
		if (
			!liveObject ||
			liveObject !== object ||
			!object.parent ||
			(object instanceof DTObject && object.locked)
		) {
			this.cancelMoveToPoint();
			return true;
		}

		const worldPoint = this.pickMoveToPointPosition(event, object);
		if (!worldPoint) {
			return true;
		}

		const oldPosition = object.position.clone();
		object.parent.updateWorldMatrix(true, false);
		const newPosition = object.parent.worldToLocal(worldPoint.clone());
		const applyPosition = (position: Vector3): void => {
			object.position.copy(position);
			object.updateMatrix();
			object.updateWorldMatrix(false, true);
			this.refreshAfterObjectMutation(object);
		};

		applyPosition(newPosition);
		this.cancelMoveToPoint();

		if (!oldPosition.equals(newPosition)) {
			this.recordAction({
				type: "update-object",
				label: `${object.name || "Object"}: position`,
				undo: () => applyPosition(oldPosition),
				redo: () => applyPosition(newPosition),
				sync: () => this.spaceSync?.syncObjectUpdate(object),
			});
		}

		return true;
	}

	/**
	 * Resolve the object that should own a scene context menu action.
	 *
	 * @param event - Pointer or mouse event to resolve.
	 */
	private resolveSceneContextMenuTarget(event: MouseEvent): Object3D | null {
		const {object, intersection} = this.pickObjectFromEvent(event);

		return object ?? intersection?.object ?? null;
	}

	/**
	 * Open the object context menu from the 3D scene.
	 *
	 * @param event - Pointer or mouse event with the viewport position.
	 */
	private openSceneContextMenu(event: MouseEvent): boolean {
		event.preventDefault();
		event.stopPropagation();

		if (this.isVisualizationOnly()) {
			this.tree?.closeContextMenu();
			return false;
		}

		const target = this.resolveSceneContextMenuTarget(event);
		if (!target || target === this.space) {
			this.tree?.closeContextMenu();
			return false;
		}

		this.attachTransform(target);
		this.tree.selectObject(target.uuid);
		this.setSelectedObject(target);
		this.tree.openContextMenu(target.uuid, event.clientX, event.clientY);

		return true;
	}

	/**
	 * Start a mobile long-press timer for opening the scene context menu.
	 *
	 * @param event - Pointer event from the canvas.
	 */
	private startSceneLongPress(event: PointerEvent): void {
		if (this.isVisualizationOnly()) {
			return;
		}

		if (event.pointerType === "mouse") {
			return;
		}

		if (!event.isPrimary) {
			this.clearSceneLongPress();
			return;
		}

		this.clearSceneLongPress();
		this.sceneLongPressPointerId = event.pointerId;
		this.sceneLongPressStart = {x: event.clientX, y: event.clientY};
		this.sceneLongPressTimer = window.setTimeout(() => {
			this.sceneLongPressTimer = null;
			this.sceneLongPressPointerId = null;
			this.sceneLongPressStart = null;

			if (this.openSceneContextMenu(event)) {
				this.suppressNextCanvasClickOnce();
			}
		}, this.sceneLongPressDelay);
	}

	/**
	 * Cancel long press when the pointer moves far enough to become navigation.
	 *
	 * @param event - Pointer move event from the canvas.
	 */
	private handleSceneLongPressMove(event: PointerEvent): void {
		if (
			this.sceneLongPressPointerId !== event.pointerId ||
			!this.sceneLongPressStart
		) {
			return;
		}

		const dx = event.clientX - this.sceneLongPressStart.x;
		const dy = event.clientY - this.sceneLongPressStart.y;
		if (Math.hypot(dx, dy) > this.sceneLongPressMoveTolerance) {
			this.clearSceneLongPress();
		}
	}

	/**
	 * Cancel any pending scene long-press timer.
	 */
	private clearSceneLongPress(): void {
		if (this.sceneLongPressTimer !== null) {
			window.clearTimeout(this.sceneLongPressTimer);
		}

		this.sceneLongPressTimer = null;
		this.sceneLongPressPointerId = null;
		this.sceneLongPressStart = null;
	}

	/**
	 * Suppress the synthetic click that can follow a mobile long press.
	 */
	private suppressNextCanvasClickOnce(): void {
		this.clearCanvasClickSuppression();
		this.suppressNextCanvasClick = true;
		this.suppressNextCanvasClickTimer = window.setTimeout(() => {
			this.clearCanvasClickSuppression();
		}, 700);
	}

	/**
	 * Clear pending synthetic-click suppression.
	 */
	private clearCanvasClickSuppression(): void {
		if (this.suppressNextCanvasClickTimer !== null) {
			window.clearTimeout(this.suppressNextCanvasClickTimer);
		}

		this.suppressNextCanvasClick = false;
		this.suppressNextCanvasClickTimer = null;
	}

	private hasOpenDialog(): boolean {
		return Boolean(
			this.confirmationModal ||
			this.gridConfigModal ||
			this.spaceFormModal ||
			this.spaceConfigMenu ||
			this.meshMenu ||
			this.lightMenu ||
			this.content?.querySelector("dt3d-add-entity-modal"),
		);
	}

	private isKeyboardEventFromEditableElement(event: KeyboardEvent): boolean {
		return event.composedPath().some((target) => {
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target instanceof HTMLSelectElement
			) {
				return true;
			}

			return (
				target instanceof HTMLElement &&
				(target.isContentEditable || target.getAttribute("role") === "textbox")
			);
		});
	}

	private getSelectedObjectForDelete(): Object3D | null {
		if (!this.space || !this.lastSelectedObject) {
			return null;
		}

		const target = this.space.getObjectByProperty(
			"uuid",
			this.lastSelectedObject.uuid,
		) as Object3D | null;

		if (!target || target === this.space) {
			return null;
		}

		return target;
	}

	/**
	 * Update the hint box message based on the currently active tool state.
	 */
	private updateHintMessage(): void {
		if (!this.hintBox) {
			return;
		}

		if (this.isVisualizationOnly()) {
			this.hintBox.message = "";
		} else if (this.bottomBar?.measurementTool === "distance") {
			this.hintBox.message = localManager.get("hintMeasureDistance");
		} else if (this.bottomBar?.measurementTool === "angle") {
			this.hintBox.message = localManager.get("hintMeasureAngle");
		} else if (this.moveToPointObject) {
			this.hintBox.message = localManager.get("hintMoveToPoint");
		} else if (this.wallManager?.mode === "wall") {
			this.hintBox.message = this.wallManager.wallDraftStart
				? localManager.get("hintWallEnd")
				: localManager.get("hintWallStart");
		} else if (this.wallManager?.mode === "door") {
			this.hintBox.message = localManager.get("hintAddDoor");
		} else if (this.wallManager?.mode === "window") {
			this.hintBox.message = localManager.get("hintAddWindow");
		} else {
			this.hintBox.message = "";
		}
	}

	/**
	 * Open the space-level scene configuration menu.
	 */
	private openSpaceConfigMenu(): void {
		if (!this.content || this.spaceConfigMenu || this.isVisualizationOnly()) {
			return;
		}

		const menu = document.createElement(
			"dt3d-space-config-menu",
		) as DT3DSpaceConfigMenu;
		const activeSpace = this.spaceSync?.activeSpace;
		if (!activeSpace) {
			return;
		}
		menu.config = this.getSpaceConfiguration();
		menu.spaceName = activeSpace.name;
		menu.spaceDescription = activeSpace.description;
		menu.isDefault = activeSpace.is_default;

		menu.addEventListener("space-config-updated", (event: Event) => {
			const {config, ...metadata} = (
				event as CustomEvent<SpaceConfigUpdateDetail>
			).detail;
			menu.config = this.applySpaceConfiguration(config);
			this.schedulePersistSpaceConfiguration(metadata);
		});

		menu.addEventListener("modal-close", () => {
			menu.remove();
			this.spaceConfigMenu = null;
		});

		this.spaceConfigMenu = menu;
		this.content.appendChild(menu);
	}

	/**
	 * Open the grid configuration form.
	 */
	private openGridConfigModal(): void {
		if (!this.content || this.gridConfigModal || this.isVisualizationOnly()) {
			return;
		}

		const fields: DynamicFormField[] = [
			{
				label: localManager.get("gridSize"),
				attribute: "size",
				type: "number",
				tooltip: localManager.get("gridSizeTooltip"),
				editable: true,
				enabled: true,
				step: 1,
				min: 1,
			},
			{
				label: localManager.get("gridSnapSize"),
				attribute: "snapSize",
				type: "number",
				tooltip: localManager.get("gridSnapSizeTooltip"),
				editable: true,
				enabled: true,
				step: 0.01,
				min: 0.01,
			},
		];
		const modal = document.createElement("dt3d-form-modal") as DT3DFormModal;
		modal.heading = localManager.get("gridConfiguration");
		modal.description = localManager.get("gridConfigurationDescription");
		modal.confirmLabel = localManager.get("save");
		modal.fields = fields;
		modal.data = this.sceneManager.getGridConfig();

		const closeModal = () => {
			modal.remove();
			if (this.gridConfigModal === modal) {
				this.gridConfigModal = null;
			}
		};

		modal.addEventListener("form-submit", (event: Event) => {
			const {values} = (event as CustomEvent<FormModalSubmitDetail>).detail;
			const config = normalizeGridConfig(values as Partial<GridConfig>);
			const appliedConfig = this.sceneManager.setGridConfig(config);
			LocalStorage.write(GRID_CONFIG_STORAGE_KEY, appliedConfig);
			closeModal();
		});
		modal.addEventListener("modal-close", closeModal);

		this.gridConfigModal = modal;
		this.content.appendChild(modal);
	}

	/**
	 * Open the mesh add menu at the top card level.
	 *
	 * @param anchor - Menu anchor in viewport coordinates.
	 */
	private openMeshMenu(anchor: { left: number; top: number } | null): void {
		if (!this.content || this.isVisualizationOnly()) {
			return;
		}

		if (this.meshMenu) {
			this.meshMenu.remove();
			this.meshMenu = null;
		}
		this.lightMenu?.remove();
		this.lightMenu = null;
		this.uploadMenu?.remove();
		this.uploadMenu = null;

		const contentRect = this.content.getBoundingClientRect();
		const x = Math.max(
			8,
			Math.min(
				(anchor?.left ?? contentRect.left + 8) - contentRect.left,
				contentRect.width - 208,
			),
		);
		const y = Math.max(
			8,
			Math.min(
				(anchor?.top ?? contentRect.top + 8) - contentRect.top,
				contentRect.height - 8,
			),
		);
		const menu = document.createElement("dt3d-mesh-menu") as DT3DMeshMenu;
		menu.x = x;
		menu.y = y;

		menu.addEventListener("add-object", (event: Event) => {
			const {type} = (event as CustomEvent<{ type: string }>).detail;
			this.handleAddObject(type);
		});
		menu.addEventListener("modal-close", () => {
			menu.remove();
			this.meshMenu = null;
		});

		this.meshMenu = menu;
		this.content.appendChild(menu);
	}

	/**
	 * Create a saved viewport from the active camera configuration.
	 */
	private addViewportFromCurrentCamera(): void {
		if (!this.sceneManager || this.isVisualizationOnly()) {
			return;
		}

		const name = `${localManager.get("viewport")} ${this.getViewportCount() + 1}`;
		const viewport = new ViewportObject(
			this.sceneManager.captureViewportConfig(),
			name,
		);

		this.addToScene(viewport);
	}

	/**
	 * Count existing saved viewport objects.
	 */
	private getViewportCount(): number {
		let count = 0;
		this.space?.traverse((child) => {
			if (child instanceof ViewportObject) {
				count += 1;
			}
		});

		return count;
	}

	/** Open the static-light type menu at the top card level. */
	private openLightMenu(anchor: { left: number; top: number } | null): void {
		if (!this.content || this.isVisualizationOnly()) return;

		this.meshMenu?.remove();
		this.meshMenu = null;
		this.lightMenu?.remove();
		this.uploadMenu?.remove();
		this.uploadMenu = null;
		const contentRect = this.content.getBoundingClientRect();
		const menu = document.createElement("dt3d-light-menu") as DT3DLightMenu;
		menu.x = Math.max(
			8,
			Math.min(
				(anchor?.left ?? contentRect.left + 8) - contentRect.left,
				contentRect.width - 208,
			),
		);
		menu.y = Math.max(
			8,
			Math.min(
				(anchor?.top ?? contentRect.top + 8) - contentRect.top,
				contentRect.height - 8,
			),
		);
		menu.addEventListener("add-object", (event: Event) => {
			const {type} = (event as CustomEvent<{ type: string }>).detail;
			this.handleAddObject(type);
		});
		menu.addEventListener("modal-close", () => {
			menu.remove();
			this.lightMenu = null;
		});
		this.lightMenu = menu;
		this.content.appendChild(menu);
	}

	/** Open the model upload menu at the top card level. */
	private openUploadMenu(anchor: { left: number; top: number } | null): void {
		if (!this.content || this.isVisualizationOnly()) return;

		this.meshMenu?.remove();
		this.meshMenu = null;
		this.lightMenu?.remove();
		this.lightMenu = null;
		this.uploadMenu?.remove();

		const contentRect = this.content.getBoundingClientRect();
		const menu = document.createElement("dt3d-upload-menu") as DT3DUploadMenu;
		menu.x = Math.max(
			8,
			Math.min(
				(anchor?.left ?? contentRect.left + 8) - contentRect.left,
				contentRect.width - 208,
			),
		);
		menu.y = Math.max(
			8,
			Math.min(
				(anchor?.top ?? contentRect.top + 8) - contentRect.top,
				contentRect.height - 8,
			),
		);
		menu.addEventListener("upload-model", (event: Event) => {
			const {directory} = (event as CustomEvent<{ directory: boolean }>)
				.detail;
			this.selectFiles(directory);
		});
		menu.addEventListener("modal-close", () => {
			menu.remove();
			this.uploadMenu = null;
		});

		this.uploadMenu = menu;
		this.content.appendChild(menu);
	}

	/**
	 * Open the form used to create and activate a space.
	 */
	private openCreateSpaceModal(): void {
		if (!this.content || this.spaceFormModal || this.isVisualizationOnly()) {
			return;
		}

		const fields: DynamicFormField[] = [
			{
				label: localManager.get("spaceName"),
				attribute: "name",
				type: "string",
				editable: true,
				enabled: true,
			},
			{
				label: localManager.get("spaceDescription"),
				attribute: "description",
				type: "string",
				editable: true,
				enabled: true,
			},
		];
		const modal = document.createElement("dt3d-form-modal") as DT3DFormModal;
		modal.heading = localManager.get("createSpace");
		modal.description = localManager.get("createSpaceDescription");
		modal.confirmLabel = localManager.get("createSpace");
		modal.fields = fields;
		modal.data = {
			name: `${localManager.get("space")} ${(this.spaceSync?.availableSpaces.length ?? 0) + 1}`,
			description: "",
		};

		const closeModal = () => {
			modal.remove();
			if (this.spaceFormModal === modal) {
				this.spaceFormModal = null;
			}
		};

		modal.addEventListener("form-submit", (event: Event) => {
			const {values} = (event as CustomEvent<FormModalSubmitDetail>).detail;
			const name = String(values.name ?? "").trim();
			const description = String(values.description ?? "").trim();
			if (!name) {
				return;
			}

			void this.createSpace(name, description).then((created) => {
				if (created) {
					closeModal();
				}
			});
		});
		modal.addEventListener("modal-close", closeModal);

		this.spaceFormModal = modal;
		this.content.appendChild(modal);
	}

	private async createSpace(
		name: string,
		description: string,
	): Promise<boolean> {
		if (!this.spaceSync || this.isVisualizationOnly()) {
			return false;
		}

		if (this.spaceSelector) {
			this.spaceSelector.loading = true;
		}

		try {
			await this.actionStack.flush();
			this.attachTransform(null);
			this.setSelectedObject(null);
			const space = await this.spaceSync.createSpace(name, description);
			this.actionStack.clear();
			this.applySpaceConfigFromApi(space);
			this.applyDefaultViewportOnLoad();
			if (this.spaceSelector) {
				this.spaceSelector.spaces = this.spaceSync.availableSpaces;
				this.spaceSelector.selectedSpaceId = space.id;
			}
			return true;
		} catch (error) {
			console.error("DT3D: Failed to create space", error);
			return false;
		} finally {
			if (this.spaceSelector) {
				this.spaceSelector.loading = false;
			}
		}
	}

	/**
	 * Open the form used to clone and activate a space.
	 */
	private openCloneSpaceModal(spaceId: string): void {
		if (
			!this.content ||
			this.spaceFormModal ||
			this.isVisualizationOnly() ||
			!this.spaceSync
		) {
			return;
		}

		const source = this.spaceSync.availableSpaces.find(
			(space) => space.id === spaceId,
		);
		if (!source) {
			return;
		}

		const modal = document.createElement("dt3d-form-modal") as DT3DFormModal;
		modal.heading = localManager.get("cloneSpace");
		modal.description = localManager.get("cloneSpaceDescription");
		modal.confirmLabel = localManager.get("cloneSpace");
		modal.fields = [
			{
				label: localManager.get("spaceName"),
				attribute: "name",
				type: "string",
				editable: true,
				enabled: true,
			},
		];
		modal.data = {
			name: `${source.name} (copy)`,
		};

		const closeModal = () => {
			modal.remove();
			if (this.spaceFormModal === modal) {
				this.spaceFormModal = null;
			}
		};

		modal.addEventListener("form-submit", (event: Event) => {
			const {values} = (event as CustomEvent<FormModalSubmitDetail>).detail;
			const name = String(values.name ?? "").trim();
			if (!name) {
				return;
			}

			void this.cloneSpace(spaceId, name).then((cloned) => {
				if (cloned) {
					closeModal();
				}
			});
		});
		modal.addEventListener("modal-close", closeModal);

		this.spaceFormModal = modal;
		this.content.appendChild(modal);
	}

	private async cloneSpace(spaceId: string, name: string): Promise<boolean> {
		if (!this.spaceSync || this.isVisualizationOnly()) {
			return false;
		}

		if (this.spaceSelector) {
			this.spaceSelector.loading = true;
		}

		try {
			await this.actionStack.flush();
			this.attachTransform(null);
			this.setSelectedObject(null);
			const space = await this.spaceSync.cloneSpace(spaceId, name);
			this.actionStack.clear();
			this.applySpaceConfigFromApi(space);
			this.applyDefaultViewportOnLoad();
			if (this.spaceSelector) {
				this.spaceSelector.spaces = this.spaceSync.availableSpaces;
				this.spaceSelector.selectedSpaceId = space.id;
			}
			return true;
		} catch (error) {
			console.error("DT3D: Failed to clone space", error);
			return false;
		} finally {
			if (this.spaceSelector) {
				this.spaceSelector.loading = false;
			}
		}
	}

	private async exportSpace(spaceId: string): Promise<void> {
		if (!this.spaceSync || !spaceId || this.isVisualizationOnly()) {
			return;
		}

		if (this.spaceSelector) {
			this.spaceSelector.loading = true;
		}

		try {
			const blob = await this.spaceSync.exportSpace(spaceId);
			const spaceName =
				this.spaceSync?.availableSpaces.find((space) => space.id === spaceId)
					?.name ?? "space";
			const fileName =
				spaceName
					.trim()
					.replace(/[^\p{L}\p{N}_-]+/gu, "-")
					.replace(/^-+|-+$/g, "") || "space";
			const downloadUrl = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = downloadUrl;
			link.download = `${fileName}.dt3d`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
		} catch (error) {
			console.error("DT3D: Failed to export space", error);
		} finally {
			if (this.spaceSelector) {
				this.spaceSelector.loading = false;
			}
		}
	}

	private async importSpace(file: File): Promise<void> {
		if (!this.spaceSync || this.isVisualizationOnly()) {
			return;
		}

		if (this.spaceSelector) {
			this.spaceSelector.loading = true;
		}

		try {
			await this.actionStack.flush();
			this.attachTransform(null);
			this.setSelectedObject(null);
			const space = await this.spaceSync.importSpace(file);
			this.actionStack.clear();
			this.applySpaceConfigFromApi(space);
			this.applyDefaultViewportOnLoad();
			if (this.spaceSelector) {
				this.spaceSelector.spaces = this.spaceSync.availableSpaces;
				this.spaceSelector.selectedSpaceId = space.id;
			}
		} catch (error) {
			console.error("DT3D: Failed to import space", error);
		} finally {
			if (this.spaceSelector) {
				this.spaceSelector.loading = false;
			}
		}
	}

	private requestDeleteSpace(spaceId: string): void {
		if (!spaceId || this.isVisualizationOnly()) {
			return;
		}

		this.openConfirmationModal({
			heading: localManager.get("deleteSpaceTitle"),
			message: localManager.get("confirmDeleteSpace"),
			confirmLabel: localManager.get("deleteSpace"),
			actionType: "red",
			onConfirm: () => {
				void this.deleteSpace(spaceId);
			},
		});
	}

	private async deleteSpace(spaceId: string): Promise<void> {
		if (!this.spaceSync || this.isVisualizationOnly()) {
			return;
		}

		if (this.spaceSelector) {
			this.spaceSelector.loading = true;
		}

		try {
			await this.actionStack.flush();
			this.attachTransform(null);
			this.setSelectedObject(null);
			const space = await this.spaceSync.deleteSpace(spaceId);
			this.actionStack.clear();
			this.applySpaceConfigFromApi(space);
			this.applyDefaultViewportOnLoad();
			if (this.spaceSelector) {
				this.spaceSelector.spaces = this.spaceSync.availableSpaces;
				this.spaceSelector.selectedSpaceId = space?.id ?? "";
			}
		} catch (error) {
			console.error("DT3D: Failed to delete space", error);
		} finally {
			if (this.spaceSelector) {
				this.spaceSelector.loading = false;
			}
		}
	}

	private getViewportById(objectId: string): ViewportObject | null {
		const objectByUuid = this.space?.getObjectByProperty(
			"uuid",
			objectId,
		) as Object3D | null;
		if (objectByUuid instanceof ViewportObject) {
			return objectByUuid;
		}

		let viewport: ViewportObject | null = null;
		this.space?.traverse((child) => {
			if (
				!viewport &&
				child instanceof ViewportObject &&
				child.userData.apiId === objectId
			) {
				viewport = child;
			}
		});

		return viewport;
	}

	private getDefaultViewport(): ViewportObject | null {
		let defaultViewport: ViewportObject | null = null;

		this.space?.traverse((child) => {
			if (
				!defaultViewport &&
				child instanceof ViewportObject &&
				child.defaultViewport
			) {
				defaultViewport = child;
			}
		});

		return defaultViewport;
	}

	private enforceSingleDefaultViewport(
		preferredViewport?: ViewportObject,
	): ViewportObject[] {
		const changed: ViewportObject[] = [];
		let defaultViewport = preferredViewport?.defaultViewport
			? preferredViewport
			: null;

		this.space?.traverse((child) => {
			if (!(child instanceof ViewportObject) || !child.defaultViewport) {
				return;
			}

			if (!defaultViewport) {
				defaultViewport = child;
				return;
			}

			if (child !== defaultViewport) {
				child.defaultViewport = false;
				changed.push(child);
			}
		});

		return changed;
	}

	private syncViewportObjects(viewports: Iterable<ViewportObject>): void {
		for (const viewport of new Set(viewports)) {
			void this.spaceSync?.syncObjectUpdate(viewport);
		}
	}

	private applyDefaultViewportOnLoad(): void {
		const changedViewports = this.enforceSingleDefaultViewport();

		if (changedViewports.length > 0) {
			this.tree.updateTreeDiff(this.space);

			if (!this.isVisualizationOnly()) {
				this.syncViewportObjects(changedViewports);
			}
		}

		const configuredViewportId = this.getDefaultViewportId();
		const initialViewport = configuredViewportId
			? (this.getViewportById(configuredViewportId) ??
				this.getDefaultViewport())
			: this.getDefaultViewport();
		if (initialViewport) {
			this.activateViewport(initialViewport);
		}
	}

	private async changeActiveSpace(spaceId: string): Promise<void> {
		if (
			this.isVisualizationOnly() ||
			!this.spaceSync ||
			!spaceId ||
			spaceId === this.spaceSync.activeSpaceId
		) {
			return;
		}

		if (this.persistSpaceConfigTimer !== null) {
			window.clearTimeout(this.persistSpaceConfigTimer);
			this.persistSpaceConfigTimer = null;
		}
		this.pendingSpaceMetadata = null;

		if (this.spaceSelector) {
			this.spaceSelector.loading = true;
		}

		try {
			await this.actionStack.flush();
			this.attachTransform(null);
			this.setSelectedObject(null);
			const space = await this.spaceSync.loadSpaceFromApi(spaceId);
			this.actionStack.clear();
			this.applySpaceConfigFromApi(space);
			this.applyDefaultViewportOnLoad();
			if (this.spaceSelector) {
				this.spaceSelector.selectedSpaceId = space.id;
			}
		} catch (error) {
			console.error("DT3D: Failed to change active space", error);
			if (this.spaceSelector) {
				this.spaceSelector.selectedSpaceId = this.spaceSync.activeSpaceId ?? "";
			}
		} finally {
			if (this.spaceSelector) {
				this.spaceSelector.loading = false;
			}
		}
	}

	private setDefaultViewport(viewport: ViewportObject): void {
		if (this.isVisualizationOnly()) {
			return;
		}

		const viewports: ViewportObject[] = [];
		this.space.traverse((child) => {
			if (child instanceof ViewportObject) {
				viewports.push(child);
			}
		});
		const before = new Map(
			viewports.map((item) => [item, item.defaultViewport]),
		);
		const changedViewports = new Set<ViewportObject>();

		if (!viewport.defaultViewport) {
			viewport.defaultViewport = true;
			changedViewports.add(viewport);
		}

		for (const changedViewport of this.enforceSingleDefaultViewport(viewport)) {
			changedViewports.add(changedViewport);
		}

		if (changedViewports.size === 0) {
			return;
		}

		this.tree.updateTreeDiff(this.space);
		this.tree.refreshSelectedObject();
		const after = new Map(
			viewports.map((item) => [item, item.defaultViewport]),
		);
		const apply = (values: Map<ViewportObject, boolean>) => {
			for (const [item, value] of values) {
				item.defaultViewport = value;
			}
			this.refreshAfterObjectMutation(viewport);
		};
		this.recordAction({
			type: "update-object",
			label: `${viewport.name || "Viewport"}: default`,
			undo: () => apply(before),
			redo: () => apply(after),
			sync: () =>
				Promise.all(
					viewports.map((item) => this.spaceSync?.syncObjectUpdate(item)),
				),
		});
	}

	private setDefaultViewportById(objectId: string): void {
		const viewport = this.getViewportById(objectId);
		if (!viewport) {
			return;
		}

		this.setDefaultViewport(viewport);
	}

	private updateViewportFromCurrentCamera(viewport: ViewportObject): void {
		if (!this.sceneManager || this.isVisualizationOnly()) {
			return;
		}

		const before = viewport.getViewportConfig();
		const after = this.sceneManager.captureViewportConfig();
		viewport.setViewportConfig(after);
		this.tree.updateTreeDiff(this.space);
		this.tree.refreshSelectedObject();
		const apply = (config: CameraViewportConfig) => {
			viewport.setViewportConfig(config);
			this.refreshAfterObjectMutation(viewport);
		};
		this.recordAction({
			type: "update-object",
			label: `${viewport.name || "Viewport"}: camera`,
			undo: () => apply(before),
			redo: () => apply(after),
			sync: () => this.spaceSync?.syncObjectUpdate(viewport),
		});
	}

	private updateViewportFromCurrentCameraById(objectId: string): void {
		const viewport = this.getViewportById(objectId);
		if (!viewport) {
			return;
		}

		this.updateViewportFromCurrentCamera(viewport);
	}

	/**
	 * Move the editor camera to a saved viewport.
	 *
	 * @param viewport - Viewport marker to activate.
	 */
	private activateViewport(viewport: ViewportObject): void {
		this.sceneManager.applyViewportConfig(viewport.getViewportConfig());
		this.camera = this.sceneManager.camera;
		this.controls = this.sceneManager.controls;
		this.transform = this.sceneManager.transform;
		this.rendererManager.setCamera(this.camera);
		if (this.orientationCube) {
			this.orientationCube.camera = this.camera;
		}

		if (this.cameraToggle) {
			this.cameraToggle.mode = this.sceneManager.getCameraMode();
		}
	}

	/**
	 * Add a new object by sidebar/menu type.
	 *
	 * @param type - Object type to add.
	 */
	private handleAddObject(type: string): void {
		if (this.isVisualizationOnly()) {
			return;
		}

		let object: Object3D = null;
		const material = new MeshStandardMaterial({
			color: Math.floor(Math.random() * 0xffffff),
			wireframe: false,
		});

		object = createMeshObject(type, material);

		if (object) {
			object.userData.meshType = type;
			this.addToScene(object);
		} else if (type === "viewport") {
			this.addViewportFromCurrentCamera();
		} else if (type === "entity") {
			this.addEntityModal();
		} else if (type === "static-light" || type.startsWith("light-")) {
			const sourceType =
				type === "light-spot"
					? "spot"
					: type === "light-rect-area"
						? "rect-area"
						: "point";
			const light = new StaticLightObject({
				type: sourceType,
				intensity: sourceType === "rect-area" ? 5 : 1,
			});
			if (sourceType !== "point") {
				light.rotation.x = -Math.PI / 2;
			}
			let lightCount = 0;
			this.space.traverse((child) => {
				if (child instanceof StaticLightObject) {
					lightCount += 1;
				}
			});
			const nameKey =
				sourceType === "spot"
					? "spotLight"
					: sourceType === "rect-area"
						? "rectAreaLight"
						: "pointLight";
			light.name = `${localManager.get(nameKey)} ${lightCount + 1}`;
			this.addToScene(light);
		} else if (type === "group") {
			const group = new Group();
			let groupCount = 0;
			this.space.traverse((child) => {
				if (child instanceof Group && child !== this.space) {
					groupCount += 1;
				}
			});
			group.name = `${localManager.get("group")} ${groupCount + 1}`;
			this.addToScene(group);
		}
	}

	/**
	 * Method called when the element is added to the DOM.
	 *
	 * Initializes the 3D scene and starts the rendering loop.
	 */
	public connectedCallback() {
		window.addEventListener("keydown", this.handleKeyDown);
		this.bindXrSystem();
		const minimumHeight = this.isInsideMasonryView()
			? `${DEFAULT_CARD_HEIGHT}px`
			: "0";
		this.style.minHeight = minimumHeight;

		if (this.container) {
			this.applyOrientationCubeVisibility();
			this.applyXrConfiguration();
			return;
		}

		const port = this.config?.port || 8080;
		const address = this.config?.address || "http://localhost";
		const serviceKey = this.config?.service_key || "";

		const width = 300;
		const height = DEFAULT_CARD_HEIGHT;
		this.apiClient = new SpaceApi(address, port, serviceKey);

		this.style.cssText = `
			overflow: hidden;
			width: 100%;
			height: 100%;
			min-height: ${minimumHeight};
			display: block;
			position: relative;
			border-radius: 10px;
		`;

		this.container = document.createElement("div");
		this.container.style.cssText = `
			width: 100%;
			height: 100%;
			overflow: hidden;
			min-height: 300px;
		`;
		this.appendChild(this.container);

		this.content = document.createElement("div");
		this.content.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			height: 100%;
		`;
		this.container.appendChild(this.content);

		this.canvas = document.createElement("canvas");
		this.canvas.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			width: ${width}px;
			height: ${height}px;
			border-radius: 10px;
			touch-action: none;
		`;
		this.content.appendChild(this.canvas);

		this.objectSidebar = document.createElement(
			"dt3d-object-sidebar",
		) as DT3DObjectSidebar;
		this.objectSidebar.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			height: 100%;
		`;
		this.content.appendChild(this.objectSidebar);

		this.bottomBar = document.createElement("dt3d-bottom-bar") as DT3DBottomBar;
		this.bottomBar.objectSidebarCollapsed = this.objectSidebar.collapsed;
		this.content.appendChild(this.bottomBar);

		this.hintBox = document.createElement("dt3d-hint-box") as DT3DHintBox;
		this.content.appendChild(this.hintBox);

		this.tree = document.createElement("dt3d-tree") as DT3DTree;
		this.tree.style.cssText = `
			position: absolute;
			top: 0;	
			right: 0;
			height: 100%;
		`;
		this.content.appendChild(this.tree);
		this.observeObjectTreeSize();

		const connection = document.createElement(
			"dt3d-connection-status",
		) as ConnectionStatus;
		connection.port = port;
		connection.address = address;
		connection.serviceKey = serviceKey;
		this.connectionStatus = connection;
		this.applyDevelopmentMode();
		this.content.appendChild(connection);

		this.syncProgressComponent = document.createElement(
			"sync-progress-component",
		) as SyncProgressComponent;
		this.syncProgressComponent.objectSidebarCollapsed =
			this.objectSidebar.collapsed;
		this.objectSidebar.addEventListener(
			"object-sidebar-collapse-changed",
			(event: Event) => {
				const {collapsed} = (event as CustomEvent<{ collapsed: boolean }>)
					.detail;
				this.syncProgressComponent!.objectSidebarCollapsed = collapsed;
				this.bottomBar.objectSidebarCollapsed = collapsed;
			},
		);
		this.content.appendChild(this.syncProgressComponent);

		const cssElem = document.createElement("div");
		cssElem.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			width: ${width}px;
			height: ${height}px;
			border-radius: 10px;
			pointer-events: none;
		`;
		this.content.appendChild(cssElem);

		this.sceneManager = new SceneManager(
			this.canvas,
			height,
			width,
			this.getNavigationControlsType(),
		);
		this.sceneManager.setGridConfig(
			normalizeGridConfig(LocalStorage.read(GRID_CONFIG_STORAGE_KEY, {}) ?? {}),
		);
		this.spaceSceneConfig = normalizeSpaceSceneConfig(
			LocalStorage.read(SPACE_SCENE_CONFIG_STORAGE_KEY, {}),
		);
		this.spaceSceneConfig = this.sceneManager.setSpaceSceneConfig(
			this.spaceSceneConfig,
		);
		this.updateSkyFromDateTime();
		this.sceneManager.transform.addEventListener("objectChange", () => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.applyMultiTransformDelta();
			this.applyCollisionConstraint();
			this.tree.refreshSelectedObject();
		});
		this.sceneManager.transform.addEventListener(
			"dragging-changed",
			(event: any) => {
				if (this.isVisualizationOnly()) {
					this.transformStart = null;
					this.multiTransformStart = null;
					this.endCollisionDrag();
					return;
				}

				if (event.value) {
					if (
						this.selectedObjects.length > 1 &&
						this.selectionPivot &&
						this.transform?.object === this.selectionPivot
					) {
						this.selectionPivot.updateWorldMatrix(true, false);
						this.multiTransformStart = {
							pivotMatrixWorld: this.selectionPivot.matrixWorld.clone(),
							objects: this.getTopLevelSelectedObjects().map((object) => {
								object.updateWorldMatrix(true, false);
								return {
									object,
									worldMatrix: object.matrixWorld.clone(),
									position: object.position.clone(),
									quaternion: object.quaternion.clone(),
									scale: object.scale.clone(),
								};
							}),
						};
						this.transformStart = null;
						this.beginCollisionDrag(
							this.multiTransformStart.objects.map(({object}) => object),
							this.selectionPivot,
						);
						return;
					}

					const object = this.transform?.object;
					this.transformStart = object
						? {
							object,
							position: object.position.clone(),
							quaternion: object.quaternion.clone(),
							scale: object.scale.clone(),
						}
						: null;
					if (object) {
						this.beginCollisionDrag([object], object);
					}
					return;
				}

				this.endCollisionDrag();
				const multiStart = this.multiTransformStart;
				this.multiTransformStart = null;
				if (multiStart) {
					const end = multiStart.objects.map(({object}) => ({
						object,
						position: object.position.clone(),
						quaternion: object.quaternion.clone(),
						scale: object.scale.clone(),
					}));
					const changed = end.some((snapshot, index) => {
						const start = multiStart.objects[index];
						return (
							!start.position.equals(snapshot.position) ||
							!start.quaternion.equals(snapshot.quaternion) ||
							!start.scale.equals(snapshot.scale)
						);
					});
					this.attachTransformToSelection();
					if (!changed) {
						return;
					}

					const applyTransforms = (
						snapshots: {
							object: Object3D;
							position: Vector3;
							quaternion: Quaternion;
							scale: Vector3;
						}[],
					) => {
						for (const snapshot of snapshots) {
							snapshot.object.position.copy(snapshot.position);
							snapshot.object.quaternion.copy(snapshot.quaternion);
							snapshot.object.scale.copy(snapshot.scale);
							snapshot.object.updateMatrix();
							snapshot.object.updateWorldMatrix(false, true);
						}
						this.refreshAfterObjectMutation(null);
					};
					const start = multiStart.objects.map((snapshot) => ({
						object: snapshot.object,
						position: snapshot.position,
						quaternion: snapshot.quaternion,
						scale: snapshot.scale,
					}));

					this.recordAction({
						type: "update-object",
						label: `${this.selectedObjects.length} objects transform`,
						undo: () => applyTransforms(start),
						redo: () => applyTransforms(end),
						sync: () =>
							Promise.all(
								end.map(({object}) =>
									this.spaceSync?.syncObjectUpdate(object),
								),
							),
					});
					return;
				}

				const start = this.transformStart;
				this.transformStart = null;
				if (!start) {
					return;
				}

				const {object} = start;
				const end = {
					position: object.position.clone(),
					quaternion: object.quaternion.clone(),
					scale: object.scale.clone(),
				};
				if (
					start.position.equals(end.position) &&
					start.quaternion.equals(end.quaternion) &&
					start.scale.equals(end.scale)
				) {
					return;
				}
				const applyTransform = (
					position: Vector3,
					quaternion: Quaternion,
					scale: Vector3,
				) => {
					object.position.copy(position);
					object.quaternion.copy(quaternion);
					object.scale.copy(scale);
					object.updateMatrix();
					this.refreshAfterObjectMutation(object);
				};

				this.recordAction({
					type: "update-object",
					label: object.name || "Object transform",
					undo: () =>
						applyTransform(start.position, start.quaternion, start.scale),
					redo: () => applyTransform(end.position, end.quaternion, end.scale),
					sync: () => this.spaceSync?.syncObjectUpdate(object),
				});
			},
		);
		this.applyGridVisibility();
		this.sceneManager.setTransformSnapEnabled(this.bottomBar.gridSnapEnabled);

		this.scene = this.sceneManager.scene;
		this.camera = this.sceneManager.camera;
		this.controls = this.sceneManager.controls;
		this.transform = this.sceneManager.transform;
		this.space = this.sceneManager.space;
		this.measurementManager = new MeasurementManager(
			this.sceneManager.measurements,
			() => ({
				canvas: this.canvas,
				camera: this.camera,
				space: this.space,
			}),
		);
		this.wallManager = new WallManager(
			this.sceneManager.measurements,
			() => ({
				canvas: this.canvas,
				camera: this.camera,
				space: this.space,
				lastSelectedObject: this.lastSelectedObject,
				gridSnapEnabled: this.bottomBar.gridSnapEnabled,
				gridSnapSize: this.sceneManager.getGridSnapSize(),
			}),
			{
				addToScene: (object) => this.addToScene(object),
				attachTransform: (object) => this.attachTransform(object),
				updateTree: () => this.tree.updateTreeDiff(this.space),
				syncCreate: (object) => {
					this.recordAddedObject(object);
				},
				updateHintMessage: () => this.updateHintMessage(),
				setLastSelectedObject: (object) => {
					this.setSelectedObject(object);
				},
				selectObject: (object) => this.tree.selectObject(object.uuid),
			},
		);

		this.rendererManager = new RendererManager(
			this.camera,
			this.canvas,
			this.controls,
			cssElem,
			height,
			this.scene,
			width,
			this.generalConfig.rendering,
		);
		this.rendererManager.setSelectionOutlineExclusions([
			this.transform.getHelper(),
		]);
		this.applyGeneralConfig();
		this.applyOrientationCubeVisibility();

		this.cameraToggle = document.createElement(
			"dt3d-camera-toggle",
		) as DT3DCameraToggle;
		this.cameraToggle.mode = this.sceneManager.getCameraMode();
		this.cameraToggle.addEventListener("camera-mode-change", (event: Event) => {
			const {mode} = (event as CustomEvent<{ mode: CameraMode }>).detail;
			this.setEditorCameraMode(mode);
		});

		this.content.appendChild(this.cameraToggle);

		this.xrControls = document.createElement(
			"dt3d-xr-controls",
		) as DT3DXrControls;
		this.xrControls.hidden = true;
		this.xrControls.addEventListener("xr-session-toggle", (event: Event) => {
			const {mode} = (event as CustomEvent<{ mode: XrMode }>).detail;
			void this.toggleXrSession(mode);
		});
		this.content.appendChild(this.xrControls);
		this.applyXrConfiguration();
		this.updateViewerControlPositions();

		this.spaceSelector = document.createElement(
			"dt3d-space-selector",
		) as DT3DSpaceSelector;
		this.spaceSelector.loading = true;
		this.spaceSelector.addEventListener("space-change", (event: Event) => {
			const {spaceId} = (event as CustomEvent<{ spaceId: string }>).detail;
			void this.changeActiveSpace(spaceId);
		});
		this.spaceSelector.addEventListener("space-create-request", () => {
			this.openCreateSpaceModal();
		});
		this.spaceSelector.addEventListener("space-config-request", () => {
			this.openSpaceConfigMenu();
		});
		this.spaceSelector.addEventListener(
			"space-clone-request",
			(event: Event) => {
				const {spaceId} = (event as CustomEvent<{ spaceId: string }>).detail;
				this.openCloneSpaceModal(spaceId);
			},
		);
		this.spaceSelector.addEventListener(
			"space-export-request",
			(event: Event) => {
				const {spaceId} = (event as CustomEvent<{ spaceId: string }>).detail;
				void this.exportSpace(spaceId);
			},
		);
		this.spaceSelector.addEventListener(
			"space-import-request",
			(event: Event) => {
				const {file} = (event as CustomEvent<{ file: File }>).detail;
				void this.importSpace(file);
			},
		);
		this.spaceSelector.addEventListener(
			"space-delete-request",
			(event: Event) => {
				const {spaceId} = (event as CustomEvent<{ spaceId: string }>).detail;
				this.requestDeleteSpace(spaceId);
			},
		);
		this.content.appendChild(this.spaceSelector);

		this.applyVisualizationMode();

		this.bottomBar.addEventListener("transform-tool-selected", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const tool = e.detail.tool;
			this.cancelMoveToPoint();
			this.endCollisionDrag();
			if (tool === "none") {
				this.transform.enabled = false;
				this.transform.getHelper().visible = false;
				return;
			}

			this.transform.enabled = true;
			this.transform.getHelper().visible = true;
			this.transform.setMode(tool);
		});

		this.bottomBar.addEventListener("focus-selection", () => {
			if (!this.isVisualizationOnly()) {
				this.focusSelectedObjects();
			}
		});

		this.bottomBar.addEventListener("measurement-mode-selected", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const mode = e.detail.mode as "distance" | "angle" | "none";
			this.measurementManager?.setMode(mode);
			this.bottomBar.measurementTool = mode;

			if (mode !== "none") {
				this.wallManager?.setMode("none");
				this.objectSidebar.wallTool = "none";
				this.cancelMoveToPoint();
			}

			this.updateHintMessage();
		});

		this.bottomBar.addEventListener("measurements-clear", () => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.measurementManager?.setMode("none");
			this.measurementManager?.clear();
			this.bottomBar.measurementTool = "none";
			this.updateHintMessage();
		});

		this.objectSidebar.addEventListener("wall-tool-selected", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const mode = e.detail.mode as "wall" | "door" | "window" | "none";
			this.wallManager?.setMode(mode);
			this.objectSidebar.wallTool = mode;
			if (mode !== "none") {
				this.measurementManager?.setMode("none");
				this.bottomBar.measurementTool = "none";
				this.cancelMoveToPoint();
			}

			this.updateHintMessage();
		});

		this.bottomBar.addEventListener("grid-visibility-toggle", (e: any) => {
			const enabled = e.detail.enabled as boolean;
			this.sceneManager.setGridEnabled(enabled && !this.isVisualizationOnly());
		});

		this.bottomBar.addEventListener("grid-snap-toggle", (e: any) => {
			const enabled = e.detail.enabled as boolean;
			this.sceneManager.setTransformSnapEnabled(enabled);
		});

		this.bottomBar.addEventListener("collision-avoidance-toggle", (e: any) => {
			const enabled = e.detail.enabled as boolean;
			if (!enabled) {
				this.endCollisionDrag();
			}
		});

		this.bottomBar.addEventListener("grid-config-open", () => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.openGridConfigModal();
		});

		this.objectSidebar.addEventListener("mesh-menu-open", (event: Event) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.openMeshMenu(
				(event as CustomEvent<{ left: number; top: number } | null>).detail,
			);
		});

		this.objectSidebar.addEventListener("upload-menu-open", (event: Event) => {
			if (this.isVisualizationOnly()) return;
			this.openUploadMenu(
				(event as CustomEvent<{ left: number; top: number } | null>).detail,
			);
		});

		this.objectSidebar.addEventListener("add-object", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const type = e.detail.type;

			this.handleAddObject(type);
		});

		this.tree.scene = this.space;
		this.spaceSync = new SpaceSync({
			apiClient: this.getApiClient(),
			readOnly: this.isVisualizationOnly(),
			sceneManager: this.sceneManager,
			space: this.space,
			tree: this.tree,
			resolveMeshType: (object) => resolveMeshType(object),
			createEntityObject: (entityId) => this.createEntityObject(entityId),
		});
		this.spaceSync.addProgressListener((progress) => {
			if (this.syncProgressComponent) {
				this.syncProgressComponent.progress = progress;
			}
		});

		void this.spaceSync
			.initializeSpaceFromApi(this.getDefaultSpaceId())
			.then((space) => {
				this.actionStack.clear();
				if (this.spaceSelector) {
					this.spaceSelector.spaces = this.spaceSync?.availableSpaces ?? [];
					this.spaceSelector.selectedSpaceId = space?.id ?? "";
					this.spaceSelector.loading = false;
				}
				this.applySpaceConfigFromApi(space);
				this.applyDefaultViewportOnLoad();
			});

		// Listen for selection events from the tree
		this.tree.addEventListener("object-selected", (e: any) => {
			const ids = (e.detail.ids ?? [e.detail.id]).filter(Boolean) as string[];
			const objects = ids
				.map((id) => this.space.getObjectByProperty("uuid", id))
				.filter((object): object is Object3D => Boolean(object));
			if (!this.isVisualizationOnly()) {
				this.setSelectedObjects(objects);
			}
		});

		this.tree.addEventListener("object-delete", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const id = e.detail.id as string;
			this.requestDeleteObject(id);
		});

		this.tree.addEventListener("object-clone", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const id = e.detail.id as string;
			this.cloneObject(id);
		});

		this.tree.addEventListener("object-move-to-point", (e: any) => {
			const id = e.detail.id as string;
			this.beginMoveToPoint(id);
		});

		this.tree.addEventListener("entity-open", (e: any) => {
			const entityId = e.detail.entityId as string;
			this.openEntity(entityId);
		});

		this.tree.addEventListener("entity-toggle", (e: any) => {
			const id = e.detail.id as string;
			const object = this.space?.getObjectByProperty("uuid", id);
			if (object && isToggleable(object)) {
				void object.toggle(this.hassInstance);
			}
		});

		this.objectSidebar.addEventListener("light-menu-open", (event: Event) => {
			if (this.isVisualizationOnly()) return;
			this.openLightMenu(
				(event as CustomEvent<{ left: number; top: number } | null>).detail,
			);
		});

		this.tree.addEventListener("viewport-set-default", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const id = e.detail.id as string;
			this.setDefaultViewportById(id);
		});

		this.tree.addEventListener("viewport-update", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const id = e.detail.id as string;
			this.updateViewportFromCurrentCameraById(id);
		});

		this.tree.addEventListener("object-updated", (e: Event) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const detail = (e as CustomEvent<ObjectUpdateDetail>).detail;
			const updatedObject = detail?.object ?? null;
			if (!updatedObject) {
				return;
			}
			this.sceneManager.applyShadowSettingsToObject(updatedObject);

			const changedDefaultViewports =
				updatedObject instanceof ViewportObject && updatedObject.defaultViewport
					? this.enforceSingleDefaultViewport(updatedObject)
					: [];

			if (updatedObject instanceof DTObject && updatedObject.locked) {
				if (this.transform?.object === updatedObject) {
					this.attachTransform(null);
				}
			} else if (this.transform?.object === updatedObject) {
				this.attachTransform(updatedObject);
			}

			if (changedDefaultViewports.length > 0) {
				this.tree.updateTreeDiff(this.space);
			}

			this.tree.refreshSelectedObject();
			const undoUpdate = detail.undo;
			const redoUpdate = detail.redo;
			this.recordAction({
				type: "update-object",
				label: `${updatedObject.name || "Object"}: ${detail.attribute}`,
				undo: () => {
					undoUpdate();
					for (const viewport of changedDefaultViewports) {
						viewport.defaultViewport = true;
					}
					this.refreshAfterObjectMutation(updatedObject);
				},
				redo: () => {
					redoUpdate();
					for (const viewport of changedDefaultViewports) {
						viewport.defaultViewport = false;
					}
					this.refreshAfterObjectMutation(updatedObject);
				},
				sync: () =>
					Promise.all(
						[updatedObject, ...changedDefaultViewports].map((object) =>
							this.spaceSync?.syncObjectUpdate(object),
						),
					),
			});
		});

		this.tree.addEventListener("object-moved", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const moves = e.detail?.moves as HierarchyMoveSnapshot[] | undefined;
			const movedObject = moves?.[0]?.object ?? null;
			const affectedObjects = e.detail?.objects as Object3D[] | undefined;
			if (!movedObject || !moves?.length) {
				return;
			}
			const syncObjects = affectedObjects ?? moves.map(({object}) => object);

			this.sceneManager.requestShadowMapUpdate();
			this.tree.refreshSelectedObject();
			this.attachTransformToSelection();
			this.recordAction({
				type: "move-object",
				label:
					moves.length === 1
						? movedObject.name || "Object"
						: `${moves.length} objects`,
				undo: () => this.placeObjects(moves, "old"),
				redo: () => this.placeObjects(moves, "new"),
				sync: () =>
					Promise.all(
						syncObjects.map((object) =>
							this.spaceSync?.syncObjectUpdate(object),
						),
					),
			});
		});

		this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
			this.clearPendingEntityClickAction();

			if (!this.isVisualizationOnly()) {
				if (this.handleMoveToPointDoubleClick(event)) {
					return;
				}

				// Handle measurement points on double click
				if (this.measurementManager?.handleClick(event)) {
					return;
				}

				// Handle wall tool clicks
				if (this.wallManager?.handleClick(event)) {
					return;
				}
			}

			const {object, intersection} = this.pickObjectFromEvent(event);
			if (intersection && !this.isVisualizationOnly()) {
				const target = object ?? (intersection.object as Object3D);
				this.attachTransform(target);
				this.tree.selectObject(target.uuid);
				this.setSelectedObject(target);
			}

			if (object instanceof ViewportObject) {
				this.activateViewport(object);
			}

			object?.onInteraction({
				type: "dblclick",
				event: event,
				hass: this.hassInstance,
			});

			if (object instanceof EntityObject) {
				this.performEntityAction(
					object,
					this.resolveEntityAction(object, "doubleClick"),
				);
			}
		});

		this.canvas.addEventListener("click", (event: MouseEvent) => {
			this.handleCanvasClick(event);
		});

		this.canvas.addEventListener("contextmenu", (event: MouseEvent) => {
			this.clearSceneLongPress();
			this.openSceneContextMenu(event);
		});

		this.canvas.addEventListener("pointerdown", (event: PointerEvent) => {
			this.handlePointerMove(event);
			this.startSceneLongPress(event);
		});

		this.canvas.addEventListener("pointermove", (event: PointerEvent) => {
			this.handlePointerMove(event);
			this.handleSceneLongPressMove(event);
		});

		this.canvas.addEventListener("pointerup", () => {
			this.clearSceneLongPress();
		});

		this.canvas.addEventListener("pointercancel", () => {
			this.clearSceneLongPress();
		});

		this.canvas.addEventListener("dragover", (event: DragEvent) => {
			event.preventDefault();
		});

		this.canvas.addEventListener("drop", (event: DragEvent) => {
			void this.handleCanvasDrop(event);
		});

		this.canvas.addEventListener("mouseleave", (event: MouseEvent) => {
			this.clearSceneLongPress();

			if (!this.hoveredObject) {
				return;
			}

			this.hoveredObject.onInteraction({
				type: "pointerleave",
				event: event,
				hass: this.hassInstance,
			});
			this.hoveredObject = null;
		});

		this.rendererManager.start((time: number) => {
			this.space.traverse((child) => {
				if (child instanceof DTObject) {
					child.update(time);
				}
			});
			this.sceneManager.updateShadowMap();
		});

		const resizeDetector = new ResizeObserver((event) => {
			const width = event[0].contentRect.width;
			const height = event[0].contentRect.height;

			this.content.style.width = `${width}px`;
			this.content.style.height = `${height}px`;

			this.canvas.style.width = `${width}px`;
			this.canvas.style.height = `${height}px`;

			cssElem.style.width = `${width}px`;
			cssElem.style.height = `${height}px`;

			this.sceneManager.updateSize(width, height);
			this.rendererManager.resize(width, height);
		});

		resizeDetector.observe(this.container, {box: "border-box"});
	}

	public disconnectedCallback(): void {
		window.removeEventListener("keydown", this.handleKeyDown);
		this.xrAvailabilitySequence += 1;
		this.xrSystem?.removeEventListener(
			"devicechange",
			this.handleXrDeviceChange,
		);
		this.xrSystem = null;
		if (this.activeXrSession) {
			void this.activeXrSession.end();
		}
		this.objectTreeResizeObserver?.disconnect();
		this.objectTreeResizeObserver = null;
		if (this.persistSpaceConfigTimer !== null) {
			window.clearTimeout(this.persistSpaceConfigTimer);
			this.persistSpaceConfigTimer = null;
		}
		this.pendingSpaceMetadata = null;
		this.disposeCollisionBoundsHelper();
		this.cancelMoveToPoint();
		this.clearSceneLongPress();
		this.clearCanvasClickSuppression();
		this.clearPendingEntityClickAction();
		this.meshMenu?.remove();
		this.meshMenu = null;
		this.lightMenu?.remove();
		this.lightMenu = null;
		this.uploadMenu?.remove();
		this.uploadMenu = null;
		this.confirmationModal?.remove();
		this.confirmationModal = null;
		this.gridConfigModal?.remove();
		this.gridConfigModal = null;
		this.spaceFormModal?.remove();
		this.spaceFormModal = null;
	}

	/**
	 * Method called to add a HA entity to the 3D scene.
	 *
	 * Presents a dialog to select an entity and adds a representation to the scene.
	 *
	 * The entities list is fetched from Home Assistant.
	 */
	public addEntityModal(): void {
		if (this.isVisualizationOnly()) {
			return;
		}

		const modal = document.createElement(
			"dt3d-add-entity-modal",
		) as DT3DAddEntityModal;
		modal.states = this.hassInstance?.states ?? {};

		modal.addEventListener("entity-selected", (event: Event) => {
			const {entityId} = (event as CustomEvent<{ entityId: string }>).detail;
			this.addEntityToScene(entityId);
			modal.remove();
		});

		modal.addEventListener("modal-close", () => modal.remove());

		this.content.appendChild(modal);
	}

	/**
	 * Adds a Home Assistant entity representation to the 3D scene.
	 *
	 * @param id - The ID of the entity to add.
	 */
	private addEntityToScene(id: string): void {
		if (this.isVisualizationOnly()) {
			return;
		}

		const object = this.createEntityObject(id);
		if (!object) {
			return;
		}

		object.userData.entityId = id;
		object.position.set(0, 0, 0);
		const entityName =
			this.hassInstance?.states?.[id]?.attributes?.friendly_name;
		this.addToScene(object, entityName || id);
	}

	/**
	 * Create object to represent a Home Assistant entity based on its domain.
	 *
	 * @param id - ID of the entity.
	 * @returns Object created to visually represent the entity.
	 */
	private createEntityObject(id: string): Object3D | null {
		const entity = this.hassInstance?.states?.[id];
		if (!entity) {
			console.warn("DT3D: Entity not found:", id);
			return null;
		}

		const domain = id.split(".")[0];

		if (domain === "sensor") {
			return new EntitySensor(id, entity);
		} else if (domain === "binary_sensor") {
			return new EntityBinary(id, entity);
		} else if (domain === "camera") {
			return new EntityCamera(id, entity);
		} else if (domain === "climate") {
			return new EntityClimate(
				id,
				entity,
				this.hassInstance?.config?.unit_system?.temperature,
			);
		} else if (domain === "light") {
			return new EntityLight(id, entity);
		} else if (domain === "switch") {
			return new EntitySwitch(id, entity);
		}

		return new EntityGeneric(id, entity);
	}

	/**
	 * Update all entity objects in the scene with the latest state from HA.
	 */
	private updateEntityObjects(): void {
		if (!this.space || !this.hassInstance?.states) {
			return;
		}

		this.space.traverse((child) => {
			if (child instanceof EntityObject) {
				const entityState = this.hassInstance.states[child.entityId];
				if (entityState) {
					child.setEntity(entityState);
				}
			}
		});
	}

	/**
	 * Get the API client instance for communicating with the backend.
	 *
	 * @returns api client instance or throws an error if it is not initialized.
	 */
	private getApiClient(): SpaceApi {
		if (!this.apiClient) {
			throw new Error("DT3D: API client not initialized");
		}
		return this.apiClient;
	}

	/**
	 * Check whether Home Assistant mounted the card in its masonry view.
	 *
	 * Dashboard views use shadow DOM, so walk through the shadow hosts instead
	 * of relying on `closest()`, which cannot cross those boundaries.
	 */
	private isInsideMasonryView(): boolean {
		let root = this.getRootNode();

		while (root instanceof ShadowRoot) {
			if (root.host.localName === "hui-masonry-view") {
				return true;
			}
			root = root.host.getRootNode();
		}

		return false;
	}

	/**
	 * Height hint used by Home Assistant to balance masonry columns.
	 * One masonry size unit is 50 pixels.
	 */
	public getCardSize(): number {
		return Math.ceil(DEFAULT_CARD_HEIGHT / MASONRY_CARD_UNIT_HEIGHT);
	}

	/**
	 * Grid settings for the card
	 *
	 * @returns grid options
	 */
	public getGridOptions(): any {
		return {
			rows: 3,
			columns: 6,
			min_rows: 3,
			max_rows: 3,
		};
	}

	/**
	 * Get the configuration element for the card.
	 *
	 * @returns - configuration element
	 */
	static getConfigElement(): HTMLElement {
		return document.createElement("dt3d-config-editor");
	}

	/**
	 * Get a stub configuration for the card.
	 *
	 * @returns - stub configuration
	 */
	static getStubConfig(): any {
		return {
			address: "http://localhost",
			port: 8080,
			service_key: "",
			default_space: "",
			default_viewport: "",
			orientation_cube: false,
			navigation_controls: "orbit",
			general: normalizeCardGeneralConfig(),
		};
	}
}
