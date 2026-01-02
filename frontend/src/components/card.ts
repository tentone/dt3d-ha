import {
	Mesh,
	BoxGeometry,
	PerspectiveCamera,
	Scene,
	WebGLRenderer,
	MeshBasicMaterial,
	Raycaster,
	Vector2,
	PlaneGeometry,
	SphereGeometry,
	Group,
	MathUtils,
	Vector3,
	Object3D,
	Intersection,
	MeshStandardMaterial,
	AmbientLight,
	DirectionalLight,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { Sky } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { DT3DSidebar } from "./side-bar/side-bar.js";
import { DT3DTree } from "./object-tree/object-tree.js";
import { Locale } from "../locale/locale.js";
import { EntityLight } from "../objects/entity-light.js";
import { EntitySensor } from "../objects/entity-sensor.js";
import { EntitySwitch } from "../objects/entity-switch.js";
import { EntityObject } from "../objects/entity-object.js";
import { DTObject } from "../objects/dt-object.js";
import en from "../locale/en.json";
import { Marker } from "../objects/measurement/marker.js";
import { AngleMeasurement } from "../objects/measurement/angle.js";
import { DistanceMeasurement } from "../objects/measurement/distance.js";
import { ConnectionStatus } from "./connection-status/connection-status.js";

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

	/**
	 * Viewport into the 3D space.
	 */
	private camera: PerspectiveCamera = null;

	/**
	 * Renderer for the 3D content.
	 */
	private renderer: WebGLRenderer = null;

	/**
	 * Controls to navigate the 3D space using input.
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
	private home: Group;

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
		if (!this.home) {
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
		if (!this.home) {
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

		this.home.add(object);
		this.transform?.attach(object);

		this.tree.updateTreeFromScene(this.home, true);
	}

	private isDescendant(object: Object3D, potentialAncestor: Object3D): boolean {
		let current = object.parent;
		while (current) {
			if (current === potentialAncestor) {
				return true;
			}
			current = current.parent;
		}

		return false;
	}

	private handleTreeDrop(
		sourceId: string,
		targetId: string,
		position: "before" | "after" | "inside",
	): void {
		if (!this.home) {
			return;
		}

		const source = this.home.getObjectByProperty(
			"uuid",
			sourceId,
		) as Object3D | null;
		const target = this.home.getObjectByProperty(
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

	private deleteObject(objectId: string): void {
		if (!this.home) {
			return;
		}

		const target = this.home.getObjectByProperty(
			"uuid",
			objectId,
		) as Object3D | null;
		if (!target || target === this.home) {
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

		this.tree.updateTreeFromScene(this.home, true);
	}

	/**
	 * Clone a object in the scene.
	 * 
	 * @param objectId - Object ID
	 */
	private cloneObject(objectId: string): void {
		if (!this.home) {
			return;
		}

		const original = this.home.getObjectByProperty(
			"uuid",
			objectId,
		) as Object3D | null;

		if (!original || original === this.home) {
			return;
		}

		const parent = original.parent ?? this.home;
		const clone = original.clone(true);

		clone.position.x += 0.1;
		clone.position.z += 0.1;

		parent.add(clone);

		this.transform?.attach(clone);

		this.tree.updateTreeFromScene(this.home);
	}

	/**
	 * Measurement mode.
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
		this.measurementHelpers?.clear();
	}

	/**
	 * Add a new measurement point.
	 * 
	 * @param event - Mouse event.
	 */
	private processMeasurementClick(event: MouseEvent): void {
		if (
			this.measurementMode === "none" ||
			!this.canvas ||
			!this.camera ||
			!this.home
		) {
			return;
		}

		const rect = this.canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.camera);

		const intersects = this.raycaster.intersectObjects(
			this.home.children,
			true,
		);
		const point = intersects[0]?.point;

		if (!point) {
			return;
		}

		this.addMeasurementPoint(point);
	}

	private handleCanvasClick(event: MouseEvent): void {
		if (this.measurementMode !== "none") {
			this.processMeasurementClick(event);
			return;
		}

		const { object } = this.pickDTObjectFromEvent(event);

		object?.onInteraction({
			type: "click",
			event: event,
			hass: this.hassInstance,
		});
	}

	private handlePointerMove(event: MouseEvent): void {
		const { object } = this.pickDTObjectFromEvent(event);

		if (object === this.hoveredObject) {
			return;
		}

		if (this.hoveredObject) {
			this.hoveredObject.onInteraction({
				type: "pointerleave",
				event: event,
				hass: this.hassInstance,
			});
		}

		this.hoveredObject = object;

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
	 * @param event
	 * @returns
	 */
	private pickDTObjectFromEvent(event: MouseEvent): {
		object: DTObject | null;
		intersection: Intersection<Object3D> | null;
	} {
		if (!this.canvas || !this.camera || !this.home) {
			return { object: null, intersection: null };
		}

		const rect = this.canvas.getBoundingClientRect();
		this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
		this.raycaster.setFromCamera(this.pointer, this.camera);

		const intersects = this.raycaster.intersectObjects(
			this.home.children,
			true,
		);

		const intersection = intersects[0] ?? null;
		let current = intersection?.object ?? null;

		while (current) {
			if (current instanceof DTObject) {
				return { object: current, intersection };
			}

			current = current.parent;
		}

		return { object: null, intersection };
	}

	private updateDTObjects(time: number): void {
		if (!this.home) {
			return;
		}

		this.home.traverse((child) => {
			if (child instanceof DTObject) {
				child.init();
				child.update(time);
			}
		});
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

		this.scene = new Scene();

		this.measurementHelpers = new Group();
		this.scene.add(this.measurementHelpers);

		this.scene.add(new AmbientLight(0xBBBBBB));

		const directional = new DirectionalLight(0xEEEEEE);
		directional.position.set(200, 1000, 300);
		this.scene.add(directional);

		this.home = new Group();
		this.scene.add(this.home);

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

		const connection = document.createElement('connection-status') as ConnectionStatus;
		connection.port = port;
		this.content.appendChild(connection);

		this.sidebar.addEventListener("transform-tool-selected", (e: any) => {
			const tool = e.detail.tool;
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

			if (type === "cube") {
				const geometry = new BoxGeometry();
				object = new Mesh(geometry, material);
				object.name = "Cube";
			} else if (type === "plane") {
				const geometry = new PlaneGeometry(1, 1, 1);
				object = new Mesh(geometry, material);
				object.rotation.x = -Math.PI / 2;
				object.position.y = -1;
				object.name = "Plane";
			} else if (type === "sphere") {
				const geometry = new SphereGeometry();
				object = new Mesh(geometry, material);
				object.name = "Sphere";
			}

			if (object) {
				this.addToScene(object);
			}

			if (type === "upload") {
				this.selectFile();
			}
			if (type === "entity") {
				this.addEntityModal();
			}
		});

		this.camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
		this.camera.position.z = 3;

		this.renderer = new WebGLRenderer({ alpha: true, canvas: this.canvas });
		this.renderer.setSize(width, height, false);
		this.renderer.setClearColor(0x446644, 1);
		this.container.appendChild(this.renderer.domElement);

		// Sky
		const sky = new Sky();
		sky.scale.setScalar(1e4);

		const phi = MathUtils.degToRad(90);
		const theta = MathUtils.degToRad(180);
		const sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta);

		sky.material.uniforms.sunPosition.value = sunPosition;
		this.scene.add(sky);

		// Add OrbitControls
		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true; // Enable damping for smoother controls
		this.controls.dampingFactor = 0.05;

		this.transform = new TransformControls(
			this.camera,
			this.renderer.domElement,
		);
		this.transform.addEventListener("dragging-changed", (event: any) => {
			this.controls.enabled = !event.value;
		});
		this.transform.addEventListener("objectChange", () => {
			this.tree.refreshSelectedObject();
		});
		this.scene.add(this.transform.getHelper());

		// Add a cube
		const geometry = new BoxGeometry();
		const material = new MeshStandardMaterial({
			color: 0xffff00,
			wireframe: false,
		});
		const cube = new Mesh(geometry, material);
		this.transform.attach(cube);
		this.home.add(cube);

		const planeGeometry = new BoxGeometry(5, 5, 0.1);
		const planeMaterial = new MeshBasicMaterial({ color: 0x00ff00 });

		const plane = new Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
		plane.position.y = -1; // Position it below the cube
		this.home.add(plane);

		this.tree.scene = this.home;
		this.tree.updateTreeFromScene(this.home, true);

		// Listen for selection events from the tree
		this.tree.addEventListener("object-selected", (e: any) => {
			const id = e.detail.id;
			const object = this.home.getObjectByProperty("uuid", id);
			if (object) {
				this.transform.attach(object);
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

		// Raycaster for object picking
		this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
			const { object, intersection } = this.pickDTObjectFromEvent(event);

			if (intersection) {
				this.transform.attach(intersection.object as Mesh);
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

		const animate = (time: number) => {
			requestAnimationFrame(animate);
			cube.rotation.x += 0.01;
			cube.rotation.y += 0.01;

			this.updateDTObjects(time);

			// Update controls
			this.controls.update();

			this.renderer.render(this.scene, this.camera);
		};
		animate(0);

		const resizeDetector = new ResizeObserver((event) => {
			const width = event[0].contentRect.width;
			const height = event[0].contentRect.height;

			this.content.style.width = `${width}px`;
			this.content.style.height = `${height}px`;

			this.canvas.style.width = `${width}px`;
			this.canvas.style.height = `${height}px`;

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height, false);
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
		const states = this.hassInstance.states;
		console.log("DT3D: Available entities:", states);

		const dialog = document.createElement("div");
		dialog.style.cssText = `
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			background: var(--ha-color-neutral-10);
			padding: 20px;
			border-radius: 10px;
			box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
			z-index: 1000;
		`;

		const title = document.createElement("h3");
		title.textContent = "Select an Entity";
		dialog.appendChild(title);

		const searchInput = document.createElement("input");
		searchInput.type = "search";
		searchInput.placeholder = "Search entities...";
		searchInput.style.cssText = `
						width: 100%;
						padding: 6px 8px;
						margin: 8px 0 12px 0;
						border-radius: 6px;
						border: 1px solid var(--ha-color-border);
						background: var(--ha-color-neutral-05);
						color: var(--ha-color-neutral-95);
				`;

		dialog.appendChild(searchInput);

		const list = document.createElement("ul");
		list.style.cssText = `
						list-style: none;
						padding: 0;
						margin: 10px 0;
						max-height: 200px;
						overflow-y: auto;
				`;

		const listItems: HTMLLIElement[] = [];

		Object.keys(states).forEach((entityId) => {
			const listItem = document.createElement("li");
			listItem.style.cssText = `
								padding: 5px;
								cursor: pointer;
								border-bottom: 1px solid #ccc;
						`;

			listItem.textContent = entityId;
			listItem.dataset.entityId = entityId.toLowerCase();
			listItem.addEventListener("click", () => {
				this.addEntityToScene(entityId);
				dialog.remove();
			});

			listItems.push(listItem);
			list.appendChild(listItem);
		});

		const filterList = () => {
			const query = searchInput.value.trim().toLowerCase();
			listItems.forEach((item) => {
				const match = !query || item.dataset.entityId?.includes(query);
				item.style.display = match ? "" : "none";
			});
		};

		searchInput.addEventListener("input", filterList);

		dialog.appendChild(list);

		const cancelButton = document.createElement("button");
		cancelButton.textContent = "Cancel";
		cancelButton.style.cssText = `
			margin-top: 10px;
			padding: 5px 10px;
			background: var(--ha-color-red-40);
			color: white;
			border: none;
			border-radius: 5px;
			cursor: pointer;
		`;

		cancelButton.addEventListener("click", () => {
			dialog.remove();
		});

		dialog.appendChild(cancelButton);
		this.content.appendChild(dialog);
	}

	/**
	 * Adds a Home Assistant entity representation to the 3D scene.
	 *
	 * @param entityId - The ID of the entity to add.
	 */
	private addEntityToScene(entityId: string): void {
		const entity = this.hassInstance.states[entityId];
		if (!entity) {
			console.warn("DT3D: Entity not found:", entityId);
			return;
		}

		const domain = entityId.split(".")[0];
		let object: Object3D | null = null;

		if (domain === "sensor") {
			object = new EntitySensor(entityId, entity);
		} else if (domain === "light") {
			object = new EntityLight(entityId, entity);
		} else if (domain === "switch") {
			object = new EntitySwitch(entityId, entity);
		} else {
			object = this.createDefaultEntityRepresentation(entityId);
		}

		if (!object) {
			return;
		}

		object.position.set(Math.random() * 2 - 1, 0, Math.random() * 2 - 1);
		this.addToScene(object, entityId);
	}

	private updateEntityObjects(): void {
		if (!this.home || !this.hassInstance?.states) {
			return;
		}

		this.home.traverse((child) => {
			if (child instanceof EntityObject) {
				const entityState = this.hassInstance.states[child.entityId];
				if (entityState) {
					child.setEntity(entityState);
				}
			}
		});
	}

	/**
	 * Default placeholder for unsupported entity domains.
	 */
	private createDefaultEntityRepresentation(entityId: string): Object3D {
		const material = new MeshBasicMaterial({
			color: 0x0000ff,
			wireframe: true,
		});
		const geometry = new BoxGeometry(0.5, 0.5, 0.5);
		const entityMesh = new Mesh(geometry, material);
		entityMesh.name = entityId;
		return entityMesh;
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
