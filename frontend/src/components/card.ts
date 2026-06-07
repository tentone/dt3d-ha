import "./add-entity-modal/add-entity-modal.js";
import "./camera-toggle/camera-toggle.js";
import "./connection-status/connection-status.js";
import "./hint-box/hint-box.js";
import "./mesh-menu/mesh-menu.js";
import "./object-tree/object-tree.js";
import "./side-bar/side-bar.js";
import "./space-config-menu/space-config-menu.js";

import {LitElement} from "lit";
import {customElement} from "lit/decorators.js";
import type {Camera, 	Group,
	Intersection, 		Mesh,Object3D,Scene} from "three";
import {
	MeshStandardMaterial,
	Raycaster,
	Vector2,
} from "three";
import type {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import type {TransformControls} from "three/examples/jsm/controls/TransformControls";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader.js";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader.js";

import {MeasurementManager} from "../editor/measurements.js";
import {createMeshObject, resolveMeshType} from "../editor/mesh-handler.js";
import {RendererManager} from "../editor/renderer.js";
import type {CameraMode, SpaceSceneConfig} from "../editor/scene.js";
import {normalizeSpaceSceneConfig,SceneManager} from "../editor/scene.js";
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
import {SpaceApi} from "../service/space-api.js";
import {SpaceSync} from "../service/space-sync.js";
import {LocalStorage} from "../utils/local-storage.js";
import type {DT3DAddEntityModal} from "./add-entity-modal/add-entity-modal.js";
import type {DT3DCameraToggle} from "./camera-toggle/camera-toggle.js";
import type {ConnectionStatus} from "./connection-status/connection-status.js";
import type {DT3DHintBox} from "./hint-box/hint-box.js";
import type {DT3DMeshMenu} from "./mesh-menu/mesh-menu.js";
import type {DT3DTree} from "./object-tree/object-tree.js";
import type {DT3DSidebar} from "./side-bar/side-bar.js";
import type {DT3DSpaceConfigMenu} from "./space-config-menu/space-config-menu.js";

const SPACE_SCENE_CONFIG_STORAGE_KEY = "space-scene-config";

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
	private controls: OrbitControls;

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
	 * Select a 3D model file to upload.
	 *
	 * Presents a file picker dialog to the user and loads the selected model into the scene.
	 */
	private selectFile() {
		if (!this.space) {
			return;
		}

		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".gltf,.glb,.obj,.fbx";
		input.style.display = "none";

		input.addEventListener("change", () => {
			const file = input.files?.[0];
			if (file) {
				this.loadModelFromFile(file);
			}
			input.remove();
		});

		const host = this.content ?? this;
		host.appendChild(input);
		input.click();
	}

	/**
	 * Loads a 3D model from a file.
	 *
	 * @param file - The model file to load.
	 */
	private loadModelFromFile(file: File) {
		if (!this.space) {
			return;
		}

		const extension = file.name.split(".").pop()?.toLowerCase();

		if (!extension) {
			console.warn("Unable to detect model file extension:", file.name);
			return;
		}

		const url = URL.createObjectURL(file);

		const cleanup = () => {
			URL.revokeObjectURL(url);
		};

		const onError = (error: any) => {
			console.error(`Failed to load ${extension} model`, error);
			cleanup();
		};

		if (extension === "gltf" || extension === "glb") {
			const loader = new GLTFLoader();
			const dracoLoader = new DRACOLoader();
			dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
			loader.setDRACOLoader(dracoLoader);
			loader.load(
				url,
				(gltf: any) => {
					dracoLoader.dispose();
					cleanup();
					this.addToScene(gltf.scene ?? gltf.scenes?.[0], file.name);
				},
				undefined,
				(error: any) => {
					onError(error);
					dracoLoader.dispose();
				},
			);
			return;
		} else if (extension === "obj") {
			const loader = new OBJLoader();
			loader.load(
				url,
				(obj: any) => {
					cleanup();
					this.addToScene(obj, file.name);
				},
				undefined,
				onError,
			);
			return;
		} else if (extension === "fbx") {
			const loader = new FBXLoader();
			loader.load(
				url,
				(fbx: any) => {
					cleanup();
					this.addToScene(fbx, file.name);
				},
				undefined,
				onError,
			);
			return;
		}

		console.warn("DT3D: Unsupported model format:", extension);
		cleanup();
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

		this.config = {
			port: 8080,
			...config,
		};

		console.log("DT3D: Config set:", this.config);
	}

	/**
	 * Adds a 3D object to the scene.
	 *
	 * @param object - The 3D object to add to the scene.
	 */
	public addToScene(object: Object3D | null | undefined, name?: string): void {
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

		// Detach if no target or target is locked
		if (!target || target instanceof DTObject && target.locked) {
			this.transform.detach();
			return;
		}

		this.transform.attach(target);

		// Restore previous enabled state (in case it was disabled)
		this.transform.enabled = enabled;
		this.transform.getHelper().visible = enabled;
	}

	/**
	 * Delete object from space.
	 *
	 * @param objectId - ID of the object to be delete from the space.
	 */
	private deleteObject(objectId: string): void {
		if (!this.space) {
			return;
		}

		const target = this.space.getObjectByProperty("uuid", objectId) as Object3D | null;
		if (!target || target === this.space) {
			return;
		}

		const parent = target.parent;
		if (!parent) {
			return;
		}

		target.traverse((child) => {
			if (child instanceof DTObject) {
				child.dispose();
			}
		});

		parent.remove(target);

		if (this.transform?.object === target) {
			this.transform.detach();
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
		if (!this.space) {
			return;
		}

		const original = this.space.getObjectByProperty("uuid", objectId) as Object3D | null;

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

	/**
	 * Handle canvas click events.
	 *
	 * @param event - Mouse event
	 */
	private handleCanvasClick(event: MouseEvent): void {
		// In measurement mode, single clicks are consumed to prevent misclicks
		if (this.measurementManager?.isActive() || this.wallManager?.isActive()) {
			return;
		}


		// Pick object and trigger click interaction
		const {object} = this.pickObjectFromEvent(event);
		this.lastSelectedObject = object;
		object?.onInteraction({
			type: "click",
			event: event,
			hass: this.hassInstance,
		});
	}

	/**
	 * Handle pointer move events.
	 *
	 * @param event - Mouse event
	 */
	private handlePointerMove(event: MouseEvent): void {
		this.wallManager?.handlePointerMove(event);

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
	private pickObjectFromEvent(event: MouseEvent): {object: DTObject | null; intersection: Intersection<Object3D> | null;} {
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
	 * Update the hint box message based on the currently active tool state.
	 */
	private updateHintMessage(): void {
		if (!this.hintBox) {
			return;
		}

		if (this.sidebar?.measurementTool === "distance") {
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
		if (!this.content || this.spaceConfigMenu) {
			return;
		}

		const menu = document.createElement("dt3d-space-config-menu") as DT3DSpaceConfigMenu;
		menu.config = this.spaceSceneConfig;

		menu.addEventListener("space-config-updated", (event: Event) => {
			const {config} = (event as CustomEvent<{ config: SpaceSceneConfig }>).detail;
			this.spaceSceneConfig = this.sceneManager.setSpaceSceneConfig(config);
			LocalStorage.write(SPACE_SCENE_CONFIG_STORAGE_KEY, this.spaceSceneConfig);
			menu.config = this.spaceSceneConfig;
		});

		menu.addEventListener("modal-close", () => {
			menu.remove();
			this.spaceConfigMenu = null;
		});

		this.spaceConfigMenu = menu;
		this.content.appendChild(menu);
	}

	/**
	 * Open the mesh add menu at the top card level.
	 *
	 * @param anchor - Menu anchor in viewport coordinates.
	 */
	private openMeshMenu(anchor: { left: number; top: number } | null): void {
		if (!this.content) {
			return;
		}

		if (this.meshMenu) {
			this.meshMenu.remove();
			this.meshMenu = null;
		}

		const contentRect = this.content.getBoundingClientRect();
		const x = Math.max(
			8,
			Math.min((anchor?.left ?? contentRect.left + 8) - contentRect.left, contentRect.width - 208),
		);
		const y = Math.max(
			8,
			Math.min((anchor?.top ?? contentRect.top + 8) - contentRect.top, contentRect.height - 8),
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
	 * Add a new object by sidebar/menu type.
	 *
	 * @param type - Object type to add.
	 */
	private handleAddObject(type: string): void {
		let object: Mesh = null;
		const material = new MeshStandardMaterial({
			color: Math.floor(Math.random() * 0xffffff),
			wireframe: false,
		});

		object = createMeshObject(type, material);

		if (object) {
			object.userData.meshType = type;
			this.addToScene(object);
		} else if (type === "upload") {
			this.selectFile();
		} else if (type === "entity") {
			this.addEntityModal();
		}
	}

	/**
	 * Method called when the element is added to the DOM.
	 *
	 * Initializes the 3D scene and starts the rendering loop.
	 */
	public connectedCallback() {
		if (this.container) {
			return;
		}

		const port = this.config?.port || 8080;
		const address = this.config?.address || "http://localhost";

		const width = 300;
		const height = 300;
		this.apiClient = new SpaceApi(address, port);

		this.style.cssText = `
			overflow: hidden;
			width: 100%;
			height: 100%;
			display: block;
			position: relative;
			border-radius: 10px;
		`;

		this.container = document.createElement("div");
		this.container.style.cssText = `
			width: 100%;
			height: 100%;
			overflow: hidden;
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

		const connection = document.createElement("dt3d-connection-status") as ConnectionStatus;
		connection.port = port;
		this.content.appendChild(connection);

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

		this.sceneManager = new SceneManager(this.canvas, height, width);
		this.spaceSceneConfig = normalizeSpaceSceneConfig(
			LocalStorage.read(SPACE_SCENE_CONFIG_STORAGE_KEY, {}),
		);
		this.spaceSceneConfig = this.sceneManager.setSpaceSceneConfig(
			this.spaceSceneConfig,
		);
		this.sceneManager.transform.addEventListener("objectChange", () => {
			this.tree.refreshSelectedObject();
			if (this.transform?.object) {
				void this.spaceSync?.syncObjectUpdate(this.transform.object);
			}
		});
		this.sceneManager.setGridEnabled(this.sidebar.gridEnabled);
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
			}),
			{
				addToScene: (object) => this.addToScene(object),
				attachTransform: (object) => this.attachTransform(object),
				updateTree: () => this.tree.updateTreeDiff(this.space),
				syncCreate: (object) => {void this.spaceSync?.syncObjectHierarchyCreate(object);},
				updateHintMessage: () => this.updateHintMessage(),
				setLastSelectedObject: (object) => {this.lastSelectedObject = object;},
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
		);

		const cameraToggle = document.createElement("dt3d-camera-toggle") as DT3DCameraToggle;
		cameraToggle.mode = this.sceneManager.getCameraMode();
		cameraToggle.addEventListener("camera-mode-change", (event: Event) => {
			const {mode} = (event as CustomEvent<{ mode: CameraMode }>).detail;

			this.sceneManager.setCameraMode(mode);
			this.camera = this.sceneManager.camera;
			this.rendererManager.setCamera(this.camera);
		});

		this.content.appendChild(cameraToggle);

		this.sidebar.addEventListener("transform-tool-selected", (e: any) => {
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
			this.sceneManager.setGridEnabled(enabled);
		});

		this.sidebar.addEventListener("grid-snap-toggle", (e: any) => {
			const enabled = e.detail.enabled as boolean;
			this.sceneManager.setTransformSnapEnabled(enabled);
		});

		this.sidebar.addEventListener("space-config-open", () => {
			this.openSpaceConfigMenu();
		});

		this.sidebar.addEventListener("mesh-menu-open", (event: Event) => {
			this.openMeshMenu(
				(event as CustomEvent<{ left: number; top: number } | null>).detail,
			);
		});

		this.sidebar.addEventListener("add-object", (e: any) => {
			const type = e.detail.type;

			this.handleAddObject(type);
		});


		this.tree.scene = this.space;
		this.spaceSync = new SpaceSync({
			apiClient: this.getApiClient(),
			sceneManager: this.sceneManager,
			space: this.space,
			tree: this.tree,
			resolveMeshType: (object) => resolveMeshType(object),
			createEntityObject: (entityId) => this.createEntityObject(entityId),
		});

		this.spaceSync.initializeSpaceFromApi();

		// Listen for selection events from the tree
		this.tree.addEventListener("object-selected", (e: any) => {
			const id = e.detail.id;
			const object = this.space.getObjectByProperty("uuid", id);
			if (object) {
				this.attachTransform(object);
				this.lastSelectedObject = object;
			}
		});


		this.tree.addEventListener("object-delete", (e: any) => {
			const id = e.detail.id as string;
			this.deleteObject(id);
		});

		this.tree.addEventListener("object-clone", (e: any) => {
			const id = e.detail.id as string;
			this.cloneObject(id);
		});

		this.tree.addEventListener("entity-open", (e: any) => {
			const entityId = e.detail.entityId as string;
			this.dispatchEvent(
				new CustomEvent("hass-more-info", {
					detail: {entityId},
					bubbles: true,
					composed: true,
				}),
			);
		});

		this.tree.addEventListener("entity-toggle", (e: any) => {
			const id = e.detail.id as string;
			const object = this.space?.getObjectByProperty("uuid", id);
			if (object && isToggleable(object)) {
				void object.toggle(this.hassInstance);
			}
		});

		this.tree.addEventListener("object-updated", (e: any) => {
			const updatedObject = e.detail?.object as Object3D | null;
			if (!updatedObject) {
				return;
			}

			if (updatedObject instanceof DTObject && updatedObject.locked) {
				if (this.transform?.object === updatedObject) {
					this.attachTransform(null);
				}
			} else if (this.transform?.object === updatedObject) {
				this.attachTransform(updatedObject);
			}

			this.tree.refreshSelectedObject();
			void this.spaceSync?.syncObjectUpdate(updatedObject);
		});

		this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
			// Handle measurement points on double click
			if (this.measurementManager?.handleClick(event)) {
				return;
			}

			// Handle wall tool clicks
			if (this.wallManager?.handleClick(event)) {
				return;
			}


			const {object, intersection} = this.pickObjectFromEvent(event);
			if (intersection) {
				const target = object ?? (intersection.object as Object3D);
				this.attachTransform(target);
				this.tree.selectObject(target.uuid);
				this.lastSelectedObject = target;
			}

			object?.onInteraction({
				type: "dblclick",
				event: event,
				hass: this.hassInstance,
			});
		});

		this.canvas.addEventListener("click", (event: MouseEvent) => {
			this.handleCanvasClick(event);
		});

		this.canvas.addEventListener("mousemove", (event: MouseEvent) => {
			this.handlePointerMove(event);
		});

		this.canvas.addEventListener("mouseleave", (event: MouseEvent) => {
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

	/**
	 * Method called to add a HA entity to the 3D scene.
	 *
	 * Presents a dialog to select an entity and adds a representation to the scene.
	 *
	 * The entities list is fetched from Home Assistant.
	 */
	public addEntityModal(): void {
		const modal = document.createElement("dt3d-add-entity-modal") as DT3DAddEntityModal;
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
		};
	}
}
