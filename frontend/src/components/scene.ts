import {
	AmbientLight,
	BoxGeometry,
	DirectionalLight,
	Group,
	Intersection,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PerspectiveCamera,
	PlaneGeometry,
	Raycaster,
	Scene,
	SphereGeometry,
	Vector2,
	Vector3,
	WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { TransformControls } from "three/examples/jsm/controls/TransformControls";
import { Sky } from "three/examples/jsm/Addons.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { DT3DSidebar } from "./side-bar/side-bar.js";
import { DT3DTree } from "./object-tree/object-tree.js";
import { DTObject } from "../objects/dt-object.js";
import { EntityLight } from "../objects/entity-light.js";
import { EntitySensor } from "../objects/entity-sensor.js";
import { EntitySwitch } from "../objects/entity-switch.js";
import { EntityObject } from "../objects/entity-object.js";
import { Marker } from "../objects/measurement/marker.js";
import { AngleMeasurement } from "../objects/measurement/angle.js";
import { DistanceMeasurement } from "../objects/measurement/distance.js";

type MeasurementMode = "none" | "distance" | "angle";

interface SceneOptions {
	container: HTMLElement;
	content: HTMLElement;
	tree: DT3DTree;
	sidebar: DT3DSidebar;
	getHass: () => any;
}

export class DT3DScene {
	private readonly container: HTMLElement;
	private readonly content: HTMLElement;
	private readonly tree: DT3DTree;
	private readonly sidebar: DT3DSidebar;
	private readonly getHass: () => any;

	private canvas: HTMLCanvasElement | null = null;
	private camera: PerspectiveCamera | null = null;
	private renderer: WebGLRenderer | null = null;
	private controls: OrbitControls | null = null;
	private transform: TransformControls | null = null;
	private scene: Scene | null = null;
	public home: Group | null = null;
	private measurementMode: MeasurementMode = "none";
	private measurementPoints: Vector3[] = [];
	private measurementHelpers: Group | null = null;
	private raycaster: Raycaster = new Raycaster();
	private pointer: Vector2 = new Vector2();
	private hoveredObject: DTObject | null = null;
	private animationFrameId: number | null = null;
	private demoCube: Mesh | null = null;
	private resizeDetector: ResizeObserver | null = null;

	constructor(options: SceneOptions) {
		this.container = options.container;
		this.content = options.content;
		this.tree = options.tree;
		this.sidebar = options.sidebar;
		this.getHass = options.getHass;
	}

	public initialize(): void {
		if (this.canvas) {
			return;
		}

		const width = 300;
		const height = 300;

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

		this.camera = new PerspectiveCamera(75, width / height, 0.1, 10000);
		this.camera.position.z = 3;

		this.renderer = new WebGLRenderer({ alpha: true, canvas: this.canvas });
		this.renderer.setSize(width, height, false);
		this.renderer.setClearColor(0x446644, 1);
		this.container.appendChild(this.renderer.domElement);

		this.configureSky();
		this.configureControls();
		this.addInitialObjects();
		this.registerTreeListeners();
		this.registerSidebarListeners();
		this.registerCanvasListeners();
		this.registerResizeObserver();

		this.startRendering();
	}

	public dispose(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}

		this.resizeDetector?.disconnect();
	}

	public setMeasurementMode(mode: MeasurementMode): void {
		this.measurementMode = mode;
		this.clearMeasurements();
	}

	public selectFile(): void {
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

		this.content.appendChild(input);
		input.click();
	}

	public loadModelFromFile(file: File): void {
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
		}

		if (extension === "obj") {
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
		}

		if (extension === "fbx") {
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

	public addToScene(object: Object3D | null | undefined, name?: string): void {
		if (!object || !this.home) {
			return;
		}

		if (name) {
			object.name = name;
		}

		if (object instanceof DTObject) {
			object.init();
		}

		this.home.add(object);
		this.transform?.attach(object);

		this.tree.updateTreeFromScene(this.home, true);
	}

	public addPrimitive(type: string): void {
		if (!this.home) {
			return;
		}

		let object: Mesh | null = null;
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
	}

	public addEntityToScene(entityId: string, hassInstance: any): void {
		const entity = hassInstance?.states?.[entityId];
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

	public updateEntityObjects(hassInstance: any): void {
		if (!this.home || !hassInstance?.states) {
			return;
		}

		this.home.traverse((child) => {
			if (child instanceof EntityObject) {
				const entityState = hassInstance.states[child.entityId];
				if (entityState) {
					child.setEntity(entityState);
				}
			}
		});
	}

	private configureSky(): void {
		if (!this.scene) {
			return;
		}

		const sky = new Sky();
		sky.scale.setScalar(1e4);

		const phi = MathUtils.degToRad(90);
		const theta = MathUtils.degToRad(180);
		const sunPosition = new Vector3().setFromSphericalCoords(1, phi, theta);

		sky.material.uniforms.sunPosition.value = sunPosition;
		this.scene.add(sky);
	}

	private configureControls(): void {
		if (!this.camera || !this.renderer || !this.scene) {
			return;
		}

		this.controls = new OrbitControls(
			this.camera,
			this.renderer.domElement,
		);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;

		this.transform = new TransformControls(
			this.camera,
			this.renderer.domElement,
		);
		this.transform.addEventListener("dragging-changed", (event: any) => {
			if (this.controls) {
				this.controls.enabled = !event.value;
			}
		});
		this.transform.addEventListener("objectChange", () => {
			this.tree.refreshSelectedObject();
		});
		this.scene.add(this.transform.getHelper());
	}

	private addInitialObjects(): void {
		if (!this.home) {
			return;
		}

		const geometry = new BoxGeometry();
		const material = new MeshStandardMaterial({
			color: 0xffff00,
			wireframe: false,
		});
		this.demoCube = new Mesh(geometry, material);
		this.transform?.attach(this.demoCube);
		this.home.add(this.demoCube);

		const planeGeometry = new BoxGeometry(5, 5, 0.1);
		const planeMaterial = new MeshBasicMaterial({ color: 0x00ff00 });

		const plane = new Mesh(planeGeometry, planeMaterial);
		plane.rotation.x = -Math.PI / 2;
		plane.position.y = -1;
		this.home.add(plane);

		this.tree.scene = this.home;
		this.tree.updateTreeFromScene(this.home, true);
	}

	private registerTreeListeners(): void {
		if (!this.home) {
			return;
		}

		this.tree.addEventListener("object-selected", (e: any) => {
			const id = e.detail.id;
			const object = this.home?.getObjectByProperty("uuid", id);
			if (object) {
				this.transform?.attach(object);
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
	}

	private registerSidebarListeners(): void {
		this.sidebar.addEventListener("transform-tool-selected", (e: any) => {
			const tool = e.detail.tool;
			this.transform?.setMode(tool);
		});

		this.sidebar.addEventListener("measurement-mode-selected", (e: any) => {
			const mode = e.detail.mode as MeasurementMode;
			this.setMeasurementMode(mode);
		});
	}

	private registerCanvasListeners(): void {
		if (!this.canvas) {
			return;
		}

		this.canvas.addEventListener("dblclick", (event: MouseEvent) => {
			const { object, intersection } = this.pickDTObjectFromEvent(event);

			if (intersection) {
				this.transform?.attach(intersection.object as Mesh);
			}

			object?.onInteraction({
				type: "dblclick",
				event: event,
				hass: this.getHass(),
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
				hass: this.getHass(),
			});
			this.hoveredObject = null;
		});
	}

	private registerResizeObserver(): void {
		this.resizeDetector = new ResizeObserver((event) => {
			const width = event[0].contentRect.width;
			const height = event[0].contentRect.height;

			if (!this.content || !this.canvas || !this.camera || !this.renderer) {
				return;
			}

			this.content.style.width = `${width}px`;
			this.content.style.height = `${height}px`;

			this.canvas.style.width = `${width}px`;
			this.canvas.style.height = `${height}px`;

			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();

			this.renderer.setSize(width, height, false);
		});

		this.resizeDetector.observe(this.container, { box: "border-box" });
	}

	private startRendering(): void {
		const animate = (time: number) => {
			this.animationFrameId = requestAnimationFrame(animate);

			if (this.demoCube) {
				this.demoCube.rotation.x += 0.01;
				this.demoCube.rotation.y += 0.01;
			}

			this.updateDTObjects(time);
			this.controls?.update();

			if (this.scene && this.camera && this.renderer) {
				this.renderer.render(this.scene, this.camera);
			}
		};

		animate(0);
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

	private clearMeasurements(): void {
		this.measurementPoints = [];
		this.measurementHelpers?.clear();
	}

	private addMeasurementPoint(point: Vector3): void {
		this.measurementPoints.push(point.clone());

		if (
			this.measurementMode === "distance" &&
			this.measurementPoints.length === 2
		) {
			const points = [...this.measurementPoints];
			this.measurementHelpers?.clear();
			this.measurementHelpers?.add(new DistanceMeasurement(points));
			this.measurementPoints = [];
		} else if (
			this.measurementMode === "angle" &&
			this.measurementPoints.length === 3
		) {
			const points = [...this.measurementPoints];
			this.measurementHelpers?.clear();
			this.measurementHelpers?.add(new AngleMeasurement(points));
			this.measurementPoints = [];
		} else {
			this.measurementHelpers?.clear();
			this.measurementPoints.forEach((measurementPoint) => {
				this.measurementHelpers?.add(new Marker(measurementPoint));
			});
		}
	}

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
			hass: this.getHass(),
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
				hass: this.getHass(),
			});
		}

		this.hoveredObject = object;

		if (this.hoveredObject) {
			this.hoveredObject.onInteraction({
				type: "pointerenter",
				event: event,
				hass: this.getHass(),
			});
		}
	}

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
}
