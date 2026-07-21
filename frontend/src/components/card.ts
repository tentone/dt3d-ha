import "./add-entity-modal/add-entity-modal.js";
import "./camera-toggle/camera-toggle.js";
import "./confirmation-modal/confirmation-modal.js";
import "./connection-status/connection-status.js";
import "./form-modal/form-modal.js";
import "./hint-box/hint-box.js";
import "./light-menu/light-menu.js";
import "./mesh-menu/mesh-menu.js";
import "./object-tree/object-tree.js";
import "./orientation-cube/orientation-cube.js";
import "./side-bar/side-bar.js";
import "./space-config-menu/space-config-menu.js";
import "./space-selector/space-selector.js";
import "./sync-progress-component/sync-progress-component.js";
import "./upload-menu/upload-menu.js";

import {LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import type {Camera, Intersection, Object3D, Scene} from "three";
import {Group, MeshStandardMaterial, Raycaster, Vector2, Vector3} from "three";
import type {TransformControls} from "three/examples/jsm/controls/TransformControls";

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
import type {DT3DTree} from "./object-tree/object-tree.js";
import type {
	DT3DOrientationCube,
	OrientationCubeDirection,
} from "./orientation-cube/orientation-cube.js";
import type {DT3DSidebar} from "./side-bar/side-bar.js";
import type {DT3DSpaceConfigMenu} from "./space-config-menu/space-config-menu.js";
import type {DT3DSpaceSelector} from "./space-selector/space-selector.js";
import type {SyncProgressComponent} from "./sync-progress-component/sync-progress-component.js";
import type {DT3DUploadMenu} from "./upload-menu/upload-menu.js";

const SPACE_SCENE_CONFIG_STORAGE_KEY = "space-scene-config";
const GRID_CONFIG_STORAGE_KEY = "grid-config";
const DEFAULT_CARD_HEIGHT = 300;
const MASONRY_CARD_UNIT_HEIGHT = 50;
const ENTITY_CLICK_DELAY = 300;

const booleanConfig = (value: unknown): boolean =>
	value === true || value === "true" || value === "1";

type ConfirmationOptions = {
	heading: string;
	message: string;
	confirmLabel: string;
	actionType: ConfirmationActionType;
	onConfirm: () => void;
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
	 * Sidebar element for tools and options.
	 */
	public sidebar: DT3DSidebar;

	/**
	 * Hint box element that shows contextual instructions to the user.
	 */
	private hintBox: DT3DHintBox;

	private syncProgressComponent: SyncProgressComponent | null = null;

	private cameraToggle: DT3DCameraToggle | null = null;

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

	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== "Delete" || event.defaultPrevented || event.repeat) {
			return;
		}

		if (
			this.isVisualizationOnly() ||
			this.hasOpenDialog() ||
			this.isKeyboardEventFromEditableElement(event)
		) {
			return;
		}

		const target = this.getSelectedObjectForDelete();
		if (!target) {
			return;
		}

		event.preventDefault();
		this.requestDeleteObject(target.uuid);
	};

	private readonly sceneLongPressDelay = 600;

	private readonly sceneLongPressMoveTolerance = 12;

	/**
	 * Current general rendering/development configuration.
	 */
	private generalConfig: GeneralConfig = normalizeGeneralConfig();
	private cardGeneralConfig: CardGeneralConfig = normalizeCardGeneralConfig();
	private spaceGeneralConfig: SpaceGeneralConfig = normalizeSpaceGeneralConfig();

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

		this.updateEntityObjects();
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

	private importModels(
		files: File[],
		position?: Vector3,
	): Promise<void> {
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
			orientation_cube: orientationCube,
			navigation_controls: navigationControls,
			visualization_only: visualizationOnly,
			entity_click_action: this.entityInteractions.click,
			entity_double_click_action: this.entityInteractions.doubleClick,
		};
		this.clearPendingEntityClickAction();
		this.applyNavigationControls();
		this.applyGeneralConfig();
		this.applyVisualizationMode();

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

	private isOrientationCubeEnabled(): boolean {
		return this.config?.orientation_cube === true;
	}

	private applyOrientationCubeVisibility(): void {
		if (!this.content || !this.sceneManager) {
			return;
		}

		if (!this.isOrientationCubeEnabled()) {
			this.objectTreeResizeObserver?.disconnect();
			this.objectTreeResizeObserver = null;
			this.orientationCube?.remove();
			this.orientationCube = null;
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
		if (this.tree && !this.objectTreeResizeObserver) {
			this.objectTreeResizeObserver = new ResizeObserver(() => {
				this.updateOrientationCubePosition();
			});
			this.objectTreeResizeObserver.observe(this.tree);
		}
		this.updateOrientationCubePosition();
	}

	private updateOrientationCubePosition(): void {
		if (!this.orientationCube) {
			return;
		}

		const treeWidth = this.tree?.getBoundingClientRect().width ?? 0;
		this.orientationCube.style.left = "auto";
		this.orientationCube.style.right = `${treeWidth + 16}px`;
		this.orientationCube.style.bottom = "16px";
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

	private schedulePersistSpaceConfiguration(): void {
		if (this.persistSpaceConfigTimer !== null) {
			window.clearTimeout(this.persistSpaceConfigTimer);
		}

		this.persistSpaceConfigTimer = window.setTimeout(() => {
			this.persistSpaceConfigTimer = null;
			void this.persistSpaceConfiguration();
		}, 300);
	}

	private async persistSpaceConfiguration(): Promise<void> {
		try {
			await this.spaceSync?.updateActiveSpaceConfig(
				this.getSpaceConfiguration(),
			);
		} catch (error) {
			console.warn("DT3D: Failed to persist space configuration", error);
		}
	}

	private applyVisualizationMode(): void {
		const visualizationOnly = this.isVisualizationOnly();
		this.spaceSync?.setReadOnly(visualizationOnly);

		if (this.sidebar) {
			this.sidebar.style.display = visualizationOnly ? "none" : "";
			if (this.syncProgressComponent) {
				this.syncProgressComponent.sidebarCollapsed =
					visualizationOnly || this.sidebar.collapsed;
			}
		}

		if (this.tree) {
			this.tree.style.display = visualizationOnly ? "none" : "";
			this.tree.closeContextMenu();
		}

		if (this.spaceSelector) {
			this.spaceSelector.style.display = visualizationOnly ? "none" : "";
		}

		if (visualizationOnly) {
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
			if (this.sidebar) {
				this.sidebar.measurementTool = "none";
				this.sidebar.wallTool = "none";
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
			!this.isVisualizationOnly() && (this.sidebar?.gridEnabled ?? true),
		);
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

		this.sceneManager?.applyShadowSettingsToObject(object);
		this.space.add(object);
		this.attachTransform(object);

		this.tree.updateTreeDiff(this.space);

		void this.spaceSync?.syncObjectHierarchyCreate(object);
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

		const transformTarget = this.transform?.object ?? null;
		const selectedTarget = this.lastSelectedObject;
		const removesTransformTarget = transformTarget
			? Boolean(target.getObjectByProperty("uuid", transformTarget.uuid))
			: false;
		const removesSelectedTarget = selectedTarget
			? Boolean(target.getObjectByProperty("uuid", selectedTarget.uuid))
			: false;

		target.traverse((child) => {
			if (child instanceof DTObject) {
				child.dispose();
			}
		});

		parent.remove(target);

		if (removesTransformTarget) {
			this.transform.detach();
		}

		if (removesSelectedTarget) {
			this.lastSelectedObject = null;
		}

		this.tree.updateTreeDiff(this.space);

		void this.spaceSync?.syncObjectDelete(target);
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

		parent.add(clone);

		this.attachTransform(clone);
		this.tree.updateTreeDiff(this.space);

		void this.spaceSync?.syncObjectHierarchyCreate(clone);
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

		await applyImageTextureToMesh(mesh, file);
		this.tree.refreshSelectedObject();
		void this.spaceSync?.syncObjectUpdate(mesh);
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

		// In measurement mode, single clicks are consumed to prevent misclicks
		if (this.measurementManager?.isActive() || this.wallManager?.isActive()) {
			return;
		}

		this.clearPendingEntityClickAction();

		// Pick object and trigger click interaction
		const {object} = this.pickObjectFromEvent(event);
		this.lastSelectedObject = object;
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

	private performEntityAction(object: EntityObject, action: EntityAction): void {
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
			override === "default"
				? this.entityInteractions[interaction]
				: override;

		return action === "toggle" && !isToggleable(object) ? "nothing" : action;
	}

	/**
	 * Handle pointer move events.
	 *
	 * @param event - Mouse event
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
		this.lastSelectedObject = target;
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
		} else if (this.sidebar?.measurementTool === "distance") {
			this.hintBox.message = localManager.get("hintMeasureDistance");
		} else if (this.sidebar?.measurementTool === "angle") {
			this.hintBox.message = localManager.get("hintMeasureAngle");
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
		menu.config = this.getSpaceConfiguration();

		menu.addEventListener("space-config-updated", (event: Event) => {
			const {config} = (event as CustomEvent<{ config: SpaceConfiguration }>)
				.detail;
			menu.config = this.applySpaceConfiguration(config);
			this.schedulePersistSpaceConfiguration();
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
		menu.x = Math.max(8, Math.min(
			(anchor?.left ?? contentRect.left + 8) - contentRect.left,
			contentRect.width - 208,
		));
		menu.y = Math.max(8, Math.min(
			(anchor?.top ?? contentRect.top + 8) - contentRect.top,
			contentRect.height - 8,
		));
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
		menu.x = Math.max(8, Math.min(
			(anchor?.left ?? contentRect.left + 8) - contentRect.left,
			contentRect.width - 208,
		));
		menu.y = Math.max(8, Math.min(
			(anchor?.top ?? contentRect.top + 8) - contentRect.top,
			contentRect.height - 8,
		));
		menu.addEventListener("upload-model", (event: Event) => {
			const {directory} = (event as CustomEvent<{ directory: boolean }>).detail;
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
			this.attachTransform(null);
			this.lastSelectedObject = null;
			const space = await this.spaceSync.createSpace(name, description);
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
			this.attachTransform(null);
			this.lastSelectedObject = null;
			const space = await this.spaceSync.deleteSpace(spaceId);
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
			if (!defaultViewport && child instanceof ViewportObject && child.defaultViewport) {
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
			? this.getViewportById(configuredViewportId) ?? this.getDefaultViewport()
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

		if (this.spaceSelector) {
			this.spaceSelector.loading = true;
		}

		try {
			this.attachTransform(null);
			this.lastSelectedObject = null;
			const space = await this.spaceSync.loadSpaceFromApi(spaceId);
			this.applySpaceConfigFromApi(space);
			this.applyDefaultViewportOnLoad();
			if (this.spaceSelector) {
				this.spaceSelector.selectedSpaceId = space.id;
			}
		} catch (error) {
			console.error("DT3D: Failed to change active space", error);
			if (this.spaceSelector) {
				this.spaceSelector.selectedSpaceId =
					this.spaceSync.activeSpaceId ?? "";
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
		this.syncViewportObjects(changedViewports);
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

		viewport.setViewportConfig(this.sceneManager.captureViewportConfig());
		this.tree.updateTreeDiff(this.space);
		this.tree.refreshSelectedObject();
		void this.spaceSync?.syncObjectUpdate(viewport);
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
			const sourceType = type === "light-spot"
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
			const nameKey = sourceType === "spot"
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
		const minimumHeight = this.isInsideMasonryView()
			? `${DEFAULT_CARD_HEIGHT}px`
			: "0";
		this.style.minHeight = minimumHeight;

		if (this.container) {
			this.applyOrientationCubeVisibility();
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

		this.sidebar = document.createElement("dt3d-sidebar") as DT3DSidebar;
		this.sidebar.style.cssText = `
			position: absolute;
			top: 0;
			left: 0;
			height: 100%;
		`;
		this.content.appendChild(this.sidebar);

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
		this.syncProgressComponent.sidebarCollapsed = this.sidebar.collapsed;
		this.sidebar.addEventListener("sidebar-collapse-changed", (event: Event) => {
			this.syncProgressComponent!.sidebarCollapsed = (
				event as CustomEvent<{collapsed: boolean}>
			).detail.collapsed;
		});
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
		let transformedObject: Object3D | null = null;
		this.sceneManager.transform.addEventListener("objectChange", () => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.tree.refreshSelectedObject();
			if (this.transform?.object) {
				transformedObject = this.transform.object;
			}
		});
		this.sceneManager.transform.addEventListener(
			"dragging-changed",
			(event: any) => {
				if (this.isVisualizationOnly()) {
					transformedObject = null;
					return;
				}

				if (event.value) {
					transformedObject = null;
					return;
				}

				if (transformedObject) {
					void this.spaceSync?.syncObjectUpdate(transformedObject);
					transformedObject = null;
				}
			},
		);
		this.applyGridVisibility();
		this.sceneManager.setTransformSnapEnabled(this.sidebar.gridSnapEnabled);

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
				gridSnapEnabled: this.sidebar.gridSnapEnabled,
				gridSnapSize: this.sceneManager.getGridSnapSize(),
			}),
			{
				addToScene: (object) => this.addToScene(object),
				attachTransform: (object) => this.attachTransform(object),
				updateTree: () => this.tree.updateTreeDiff(this.space),
				syncCreate: (object) => {
					void this.spaceSync?.syncObjectHierarchyCreate(object);
				},
				updateHintMessage: () => this.updateHintMessage(),
				setLastSelectedObject: (object) => {
					this.lastSelectedObject = object;
				},
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
		this.applyGeneralConfig();
		this.applyOrientationCubeVisibility();

		this.cameraToggle = document.createElement(
			"dt3d-camera-toggle",
		) as DT3DCameraToggle;
		this.cameraToggle.mode = this.sceneManager.getCameraMode();
		this.cameraToggle.addEventListener("camera-mode-change", (event: Event) => {
			const {mode} = (event as CustomEvent<{ mode: CameraMode }>).detail;

			this.sceneManager.setCameraMode(mode);
			this.camera = this.sceneManager.camera;
			this.rendererManager.setCamera(this.camera);
			if (this.orientationCube) {
				this.orientationCube.camera = this.camera;
			}
		});

		this.content.appendChild(this.cameraToggle);

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
		this.spaceSelector.addEventListener("space-delete-request", (event: Event) => {
			const {spaceId} = (event as CustomEvent<{spaceId: string}>).detail;
			this.requestDeleteSpace(spaceId);
		});
		this.content.appendChild(this.spaceSelector);

		this.applyVisualizationMode();

		this.sidebar.addEventListener("transform-tool-selected", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const tool = e.detail.tool;
			if (tool === "none") {
				this.transform.enabled = false;
				this.transform.getHelper().visible = false;
				return;
			}

			this.transform.enabled = true;
			this.transform.getHelper().visible = true;
			this.transform.setMode(tool);
		});

		this.sidebar.addEventListener("measurement-mode-selected", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const mode = e.detail.mode as "distance" | "angle" | "none";
			this.measurementManager?.setMode(mode);
			this.sidebar.measurementTool = mode;

			if (mode !== "none") {
				this.wallManager?.setMode("none");
				this.sidebar.wallTool = "none";
			}

			this.updateHintMessage();
		});

		this.sidebar.addEventListener("wall-tool-selected", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const mode = e.detail.mode as "wall" | "door" | "window" | "none";
			this.wallManager?.setMode(mode);
			this.sidebar.wallTool = mode;
			if (mode !== "none") {
				this.measurementManager?.setMode("none");
				this.sidebar.measurementTool = "none";
			}

			this.updateHintMessage();
		});

		this.sidebar.addEventListener("grid-visibility-toggle", (e: any) => {
			const enabled = e.detail.enabled as boolean;
			this.sceneManager.setGridEnabled(enabled && !this.isVisualizationOnly());
		});

		this.sidebar.addEventListener("grid-snap-toggle", (e: any) => {
			const enabled = e.detail.enabled as boolean;
			this.sceneManager.setTransformSnapEnabled(enabled);
		});

		this.sidebar.addEventListener("grid-config-open", () => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.openGridConfigModal();
		});

		this.sidebar.addEventListener("space-config-open", () => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.openSpaceConfigMenu();
		});

		this.sidebar.addEventListener("mesh-menu-open", (event: Event) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			this.openMeshMenu(
				(event as CustomEvent<{ left: number; top: number } | null>).detail,
			);
		});

		this.sidebar.addEventListener("upload-menu-open", (event: Event) => {
			if (this.isVisualizationOnly()) return;
			this.openUploadMenu(
				(event as CustomEvent<{ left: number; top: number } | null>).detail,
			);
		});

		this.sidebar.addEventListener("add-object", (e: any) => {
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
			const id = e.detail.id;
			const object = this.space.getObjectByProperty("uuid", id);
			if (object && !this.isVisualizationOnly()) {
				this.attachTransform(object);
				this.lastSelectedObject = object;
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

		this.sidebar.addEventListener("light-menu-open", (event: Event) => {
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

		this.tree.addEventListener("object-updated", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const updatedObject = e.detail?.object as Object3D | null;
			if (!updatedObject) {
				return;
			}

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
				this.syncViewportObjects(changedDefaultViewports);
			}

			this.tree.refreshSelectedObject();
			void this.spaceSync?.syncObjectUpdate(updatedObject);
		});

		this.tree.addEventListener("object-moved", (e: any) => {
			if (this.isVisualizationOnly()) {
				return;
			}

			const movedObject = e.detail?.object as Object3D | null;
			const affectedObjects = e.detail?.objects as Object3D[] | undefined;
			if (!movedObject) {
				return;
			}

			this.tree.refreshSelectedObject();
			void Promise.all(
				(affectedObjects ?? [movedObject]).map((object) =>
					this.spaceSync?.syncObjectUpdate(object),
				),
			);
		});

		this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
			this.clearPendingEntityClickAction();

			if (!this.isVisualizationOnly()) {
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
				this.lastSelectedObject = target;
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
			this.startSceneLongPress(event);
		});

		this.canvas.addEventListener("pointermove", (event: PointerEvent) => {
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

		this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
			this.handlePointerMove(event);
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
		this.objectTreeResizeObserver?.disconnect();
		this.objectTreeResizeObserver = null;
		if (this.persistSpaceConfigTimer !== null) {
			window.clearTimeout(this.persistSpaceConfigTimer);
			this.persistSpaceConfigTimer = null;
		}
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
		object.position.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
		this.addToScene(object, id);
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
