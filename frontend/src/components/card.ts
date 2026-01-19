import type { Camera, Intersection, Scene } from "three";
import {
	Mesh,
	BoxGeometry,
	CapsuleGeometry,
	CatmullRomCurve3,
	CircleGeometry,
	ConeGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	ExtrudeGeometry,
	IcosahedronGeometry,
	LatheGeometry,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	OctahedronGeometry,
	PlaneGeometry,
	PolyhedronGeometry,
	Raycaster,
	RingGeometry,
	Shape,
	ShapeGeometry,
	SphereGeometry,
	Vector2,
	Group,
	Vector3,
	TetrahedronGeometry,
	TorusGeometry,
	TorusKnotGeometry,
	TubeGeometry,
} from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import type { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { DT3DSidebar } from "./side-bar/side-bar.js";
import { DT3DTree } from "./object-tree/object-tree.js";
import { Locale } from "../locale/locale.js";
import { EntityLight } from "../objects/entity-light.js";
import { EntityBinary } from "../objects/entity-binary.js";
import { EntitySensor } from "../objects/entity-sensor.js";
import { EntitySwitch } from "../objects/entity-switch.js";
import { EntityObject } from "../objects/entity-object.js";
import { DT3DAddEntityModal } from "./add-entity-modal.js";
import { DTObject } from "../objects/dt-object.js";
import en from "../locale/en.json";
import { Marker } from "../objects/measurement/marker.js";
import { AngleMeasurement } from "../objects/measurement/angle.js";
import { DistanceMeasurement } from "../objects/measurement/distance.js";
import { ConnectionStatus } from "./connection-status/connection-status.js";
import { SceneManager } from "./scene.js";
import type { CameraMode } from "./scene.js";
import { RendererManager } from "./renderer.js";
import { createMeshObject } from "./mesh-options.js";
import { EntityGeneric } from "../objects/entity-generic.js";
import { DT3DCameraToggle } from "./camera-toggle.js";

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
	 * Tree element for displaying the 3D object hierarchy.
	 */
	public tree: DT3DTree;

	/**
	 * Tracks which measurement tool is currently active.
	 */
	private measurementMode: "none" | "distance" | "angle" = "none";

	/**
	 * Points selected for the current measurement operation.
	 */
	private measurementPoints: Vector3[] = [];

	/**
	 * Helper group that renders measurement visuals (markers, lines, labels).
	 */
	private measurementHelpers: Group = null;

	/**
	 * Raycaster for interaction with the scene.
	 */
	private raycaster: Raycaster = new Raycaster();

	/**
	 * Normalized pointer position.
	 */
	private pointer: Vector2 = new Vector2();

	/**
	 * Object currently hovered.
	 */
	private hoveredObject: DTObject | null = null;

	static properties = {
		hass: { attribute: false },
		_config: { state: true },
	};
	public locale: Locale;

	set hass(hass: any) {
		if (!this.hassInstance) {
			console.log("DT3D: Entity states", this, DT3DCard.styles, hass.states);
		}

		this.locale = new Locale();
		this.locale.load("en", en);

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
			loader.load(
				url,
				(gltf: any) => {
					cleanup();
					this.addToScene(gltf.scene ?? gltf.scenes?.[0], file.name);
				},
				undefined,
				onError,
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

		this.tree.updateTreeFromScene(this.space, true);
	}

	/**
	 * Check if a object is descendant of another.
	 * 
	 * @param object - Object to check
	 * @param ancestor - Possible object to be tested as ancestor.
	 * @returns True of object is descendant of ancestor.
	 */
	private isDescendant(object: Object3D, ancestor: Object3D): boolean {
		let current = object.parent;
		while (current) {
			if (current === ancestor) {
				return true;
			}
			current = current.parent;
		}

		return false;
	}

	/**
	 * 
	 * @param sourceId 
	 * @param targetId 
	 * @param position 
	 * @returns 
	 */
	private handleTreeDrop(sourceId: string, targetId: string, position: "before" | "after" | "inside"): void {
		if (!this.space) {
			return;
		}

		const source = this.space.getObjectByProperty(
			"uuid",
			sourceId,
		) as Object3D | null;
		const target = this.space.getObjectByProperty(
			"uuid",
			targetId,
		) as Object3D | null;

		if (!source || !target || source === target) {
			return;
		}

		if (this.isDescendant(target, source)) {
			return;
		}

		if (position === "inside") {
			if (source.parent !== target) {
				target.attach(source);
			} else {
				const index = target.children.indexOf(source);
				if (index > -1) {
					target.children.splice(index, 1);
					target.children.push(source);
				}
			}
		} else {
			const parent = target.parent;
			if (!parent || parent === source) {
				return;
			}

			if (source.parent !== parent) {
				parent.attach(source);
			}

			const currentIndex = parent.children.indexOf(source);
			if (currentIndex === -1) {
				return;
			}

			parent.children.splice(currentIndex, 1);

			const targetIndex = parent.children.indexOf(target);
			let newIndex = position === "before" ? targetIndex : targetIndex + 1;
			if (newIndex > parent.children.length) {
				newIndex = parent.children.length;
			}

			parent.children.splice(newIndex, 0, source);
		}

		this.tree.updateTreeFromScene();
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

		parent.remove(target);

		if (this.transform?.object === target) {
			this.transform.detach();
		}

		this.tree.updateTreeFromScene(this.space, true);
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
		this.tree.updateTreeFromScene(this.space);
	}

	/**
	 * Change the measurement mode.
	 * 
	 * @param mode - Measurement mode to be used.
	 */
	private setMeasurementMode(mode: "distance" | "angle" | "none"): void {
		this.measurementMode = mode;
		this.clearMeasurements();
	}

	/**
	 * Clear the measurements.
	 */
	private clearMeasurements(): void {
		this.measurementPoints = [];
		this.measurementHelpers.clear();
	}

	/**
	 * Add a new measurement point.
	 * 
	 * @param event - Mouse event.
	 */
	private processMeasurementClick(event: MouseEvent): void {
		if (this.measurementMode === "none" || !this.canvas || !this.camera || !this.space) {
			return;
		}

		const rect = this.canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.camera);

		const intersects = this.raycaster.intersectObjects(
			this.space.children,
			true,
		);
		const point = intersects[0]?.point;

		if (!point) {
			return;
		}

		this.addMeasurementPoint(point);
	}

	/**
	 * Handle canvas click events.
	 * 
	 * @param event - Mouse event
	 */
	private handleCanvasClick(event: MouseEvent): void {
		// If measrement mode is active, process measurement click
		if (this.measurementMode !== "none") {
			this.processMeasurementClick(event);
			return;
		}

		// Pick object and trigger click interaction
		const { object } = this.pickObjectFromEvent(event);
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
		const { object } = this.pickObjectFromEvent(event);
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
			return { object: null, intersection: null };
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
					return { object: current, intersection };
				}

				if (current?.internal === true) {
					internalHit = true;
				}

				current = current.parent;
			}

			if (internalHit) {
				continue;
			}
			return { object: null, intersection };
		}

		return { object: null, intersection: null };
	}



	/**
	 * Add a measurement point based on the current measurement mode.
	 *
	 * @param point - Position of the measurement point.
	 */
	private addMeasurementPoint(point: Vector3): void {
		this.measurementPoints.push(point.clone());

		if (
			this.measurementMode === "distance" &&
			this.measurementPoints.length === 2
		) {
			const points = [...this.measurementPoints];
			this.measurementHelpers.clear();
			this.measurementHelpers.add(new DistanceMeasurement(points));
			this.measurementPoints = [];
		} else if (
			this.measurementMode === "angle" &&
			this.measurementPoints.length === 3
		) {
			const points = [...this.measurementPoints];
			this.measurementHelpers.clear();
			this.measurementHelpers.add(new AngleMeasurement(points));
			this.measurementPoints = [];
		} else {
			this.measurementHelpers.clear();
			this.measurementPoints.forEach((point) => {
				this.measurementHelpers.add(new Marker(point));
			});
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
		const width = 300;
		const height = 300;

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

		this.tree = document.createElement("dt3d-tree") as DT3DTree;
		this.tree.style.cssText = `
			position: absolute;
			top: 0;	
			right: 0;
			height: 100%;
		`;
		this.content.appendChild(this.tree);

		const connection = document.createElement("connection-status") as ConnectionStatus;
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
		this.sceneManager.transform.addEventListener("objectChange", () => {
			this.tree.refreshSelectedObject();
		});

		this.scene = this.sceneManager.scene;
		this.camera = this.sceneManager.camera;
		this.controls = this.sceneManager.controls;
		this.transform = this.sceneManager.transform;
		this.space = this.sceneManager.space;
		this.measurementHelpers = this.sceneManager.measurements;

		this.rendererManager = new RendererManager(
			this.camera,
			this.canvas,
			this.controls,
			cssElem,
			height,
			this.scene,
			width,
		);

		const cameraToggle = document.createElement("dt3d-camera-toggle",) as DT3DCameraToggle;
		cameraToggle.mode = this.sceneManager.getCameraMode();
		cameraToggle.addEventListener("camera-mode-change", (event: Event) => {
			const { mode } = (event as CustomEvent<{ mode: CameraMode }>).detail;

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
			this.setMeasurementMode(mode);
		});

		this.sidebar.addEventListener("add-object", (e: any) => {
			const type = e.detail.type;

			let object: Mesh = null;
			const material = new MeshStandardMaterial({
				color: Math.floor(Math.random() * 0xffffff),
				wireframe: false,
			});
		
			object = createMeshObject(type, material);
			
			if (object) {
				this.addToScene(object);
			} else if (type === "upload") {
				this.selectFile();
			} else if (type === "entity") {
				this.addEntityModal();
			}
		});


		// Set base scene and update three
		this.sceneManager.createDefaultScene();
		this.tree.scene = this.space;
		this.tree.updateTreeFromScene(this.space, true);

		// Listen for selection events from the tree
		this.tree.addEventListener("object-selected", (e: any) => {
			const id = e.detail.id;
			const object = this.space.getObjectByProperty("uuid", id);
			if (object) {
				this.attachTransform(object);
			}
		});

		this.tree.addEventListener("object-dropped", (e: any) => {
			const { sourceId, targetId, position } = e.detail as {
				sourceId: string;
				targetId: string;
				position: "before" | "after" | "inside";
			};
			this.handleTreeDrop(sourceId, targetId, position);
		});

		this.tree.addEventListener("object-delete", (e: any) => {
			const id = e.detail.id as string;
			this.deleteObject(id);
		});

		this.tree.addEventListener("object-clone", (e: any) => {
			const id = e.detail.id as string;
			this.cloneObject(id);
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
		});

		this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
			const { object, intersection } = this.pickObjectFromEvent(event);
			if (intersection) {
				const target = object ?? (intersection.object as Object3D);
				this.attachTransform(target);
				this.tree.selectObject(target.uuid);
			}

			object?.onInteraction({
				type: "dblclick",
				event: event,
				hass: this.hassInstance,
			});
		});

		this.canvas.addEventListener("click", (event: MouseEvent) =>
			this.handleCanvasClick(event),
		);

		this.canvas.addEventListener("mousemove", (event: MouseEvent) =>
			this.handlePointerMove(event),
		);

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
		
		resizeDetector.observe(this.container, { box: "border-box" });
	}

	/**
	 * Method called to add a HA entity to the 3D scene.
	 *
	 * Presents a dialog to select an entity and adds a representation to the scene.
	 *
	 * The entities list is fetched from Home Assistant.
	 */
	public addEntityModal(): void {
		const modal = document.createElement("dt3d-add-entity-modal",) as DT3DAddEntityModal;
		modal.states = this.hassInstance?.states ?? {};

		const removeModal = () => modal.remove();
		modal.addEventListener("entity-selected", (event: Event) => {
			const { entityId } = (event as CustomEvent<{ entityId: string }>).detail;
			this.addEntityToScene(entityId);
			removeModal();
		});

		modal.addEventListener("modal-close", removeModal);

		this.content.appendChild(modal);
	}

	/**
	 * Adds a Home Assistant entity representation to the 3D scene.
	 *
	 * @param id - The ID of the entity to add.
	 */
	private addEntityToScene(id: string): void {
		const entity = this.hassInstance.states[id];
		if (!entity) {
			console.warn("DT3D: Entity not found:", id);
			return;
		}

		const domain = id.split(".")[0];
		let object: Object3D | null = null;

		if (domain === "sensor") {
			object = new EntitySensor(id, entity);
		} else if (domain === "binary_sensor") {
			object = new EntityBinary(id, entity);
		} else if (domain === "light") {
			object = new EntityLight(id, entity);
		} else if (domain === "switch") {
			object = new EntitySwitch(id, entity);
		} else {
			object = new EntityGeneric(id, entity);
		}

		if (!object) {
			return;
		}

		object.position.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
		this.addToScene(object, id);
	}

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
			port: 8080,
		};
	}
}
