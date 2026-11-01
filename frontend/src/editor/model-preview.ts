import type {BufferGeometry, Material, Object3D} from "three";
import {
	AmbientLight,
	ArrowHelper,
	Box3,
	DirectionalLight,
	DoubleSide,
	Group,
	HemisphereLight,
	Line,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	OrthographicCamera,
	PlaneGeometry,
	PointLight,
	PointLightHelper,
	RectAreaLight,
	Scene,
	SphereGeometry,
	SpotLight,
	SpotLightHelper,
	SRGBColorSpace,
	Vector3,
	WebGLRenderer,
} from "three";
import {RectAreaLightHelper} from "three/examples/jsm/helpers/RectAreaLightHelper.js";
import {RectAreaLightUniformsLib} from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

import {createFurnitureObject} from "../objects/furniture/furniture-registry.js";
import {DoorObject} from "../objects/house/door.js";
import {GateObject} from "../objects/house/gate.js";
import {WindowObject} from "../objects/house/window.js";
import {createMeshObject} from "./mesh-handler.js";
import type {ModelLibraryEntry} from "./model-library.js";

// Only image data survives closing the explorer; no scene objects or GPU resources are cached.
const thumbnails = new Map<string, string>();

function createLightPreview(type: string): Group {
	const group = new Group();
	const material = new MeshStandardMaterial({
		color: 0xaeb9c8,
		roughness: 0.7,
	});
	const sphere = new Mesh(new SphereGeometry(0.35, 24, 16), material);
	sphere.position.y = 0.35;
	const floor = new Mesh(new PlaneGeometry(2.4, 2.4), material);
	floor.rotation.x = -Math.PI / 2;
	group.add(sphere, floor);
	const origin = new Vector3(0.65, 1.4, 0.4);
	const color = 0xffcf77;
	if (type === "light-ambient") {
		group.add(new AmbientLight(color, 2));
		const globe = new Mesh(
			new SphereGeometry(0.65, 12, 8),
			new MeshBasicMaterial({color, wireframe: true}),
		);
		globe.position.y = 0.7;
		group.add(globe);
	} else if (type === "light-directional") {
		const light = new DirectionalLight(color, 3);
		light.position.copy(origin);
		const arrow = new ArrowHelper(
			origin.clone().negate().normalize(),
			origin,
			1.1,
			color,
			0.25,
			0.14,
		);
		// ArrowHelper shares its geometry globally; previews must own what they dispose.
		arrow.line.geometry = arrow.line.geometry.clone();
		arrow.cone.geometry = arrow.cone.geometry.clone();
		group.add(light, arrow);
	} else if (type === "light-spot") {
		const light = new SpotLight(color, 15, 1.7, Math.PI / 7, 0.3);
		light.position.copy(origin);
		group.add(light, light.target);
		group.updateMatrixWorld(true);
		group.add(new SpotLightHelper(light, color));
	} else if (type === "light-rect-area") {
		RectAreaLightUniformsLib.init();
		const light = new RectAreaLight(color, 6, 0.9, 0.6);
		light.position.copy(origin);
		light.lookAt(0, 0, 0);
		light.add(new RectAreaLightHelper(light, color));
		group.add(light);
	} else {
		const light = new PointLight(color, 8, 6);
		light.position.copy(origin);
		group.add(light, new PointLightHelper(light, 0.15, color));
	}
	return group;
}

/** Build isolated instances using the same default factories as the editor. */
export function createModelPreviewObject(entry: ModelLibraryEntry): Object3D {
	if (entry.kind === "furniture") return createFurnitureObject(entry.type);
	if (entry.kind === "opening") {
		switch (entry.type) {
			case "door":
				return new DoorObject();
			case "window":
				return new WindowObject();
			case "gate":
				return new GateObject();
		}
	}
	if (entry.kind === "light") return createLightPreview(entry.type);
	return createMeshObject(
		entry.type,
		new MeshStandardMaterial({
			color: 0x8da9cb,
			roughness: 0.55,
			side: DoubleSide,
		}),
	);
}

export function disposeModelPreview(object: Object3D): void {
	const geometries = new Set<BufferGeometry>();
	const materials = new Set<Material>();
	object.traverse((child) => {
		if (child instanceof Mesh || child instanceof Line) {
			geometries.add(child.geometry);
			for (const material of Array.isArray(child.material)
				? child.material
				: [child.material]) {
				materials.add(material);
			}
		}
		if (
			child instanceof PointLight ||
			child instanceof SpotLight ||
			child instanceof DirectionalLight
		)
			child.dispose();
	});
	geometries.forEach((geometry) => geometry.dispose());
	materials.forEach((material) => material.dispose());
}

/** One detached canvas per explorer, reused for every thumbnail and released on close. */
export class ModelPreviewRenderer {
	private renderer: WebGLRenderer | null = null;
	private failed = false;
	private readonly scene = new Scene();
	private readonly camera = new OrthographicCamera(
		-1,
		1,
		0.75,
		-0.75,
		0.01,
		100,
	);

	constructor() {
		const key = new DirectionalLight(0xfff5e6, 3);
		key.position.set(3, 5, 4);
		this.scene.add(new HemisphereLight(0xe5efff, 0x62616e, 2), key);
	}

	public cached(type: string): string | undefined {
		return thumbnails.get(type);
	}

	public render(entry: ModelLibraryEntry): string | undefined {
		const cached = this.cached(entry.type);
		if (cached || this.failed) return cached;
		let object: Object3D | null = null;
		try {
			if (!this.renderer) {
				this.renderer = new WebGLRenderer({alpha: true, antialias: true});
				this.renderer.setSize(240, 180, false);
				this.renderer.outputColorSpace = SRGBColorSpace;
				this.renderer.setClearColor(0x000000, 0);
			}
			object = createModelPreviewObject(entry);
			if (!object) return undefined;
			object.updateMatrixWorld(true);
			const bounds = new Box3().setFromObject(object);
			if (bounds.isEmpty()) return undefined;
			const center = bounds.getCenter(new Vector3());
			const radius = bounds.getSize(new Vector3()).length() / 2;
			this.scene.add(object);
			// A bounding sphere fits all shapes, including flat primitives, from the same angle.
			const extent = Math.max(radius * 1.15, 0.1);
			this.camera.left = (-extent * 4) / 3;
			this.camera.right = (extent * 4) / 3;
			this.camera.top = extent;
			this.camera.bottom = -extent;
			this.camera.far = Math.max(radius * 12, 10);
			this.camera.position
				.set(1, 0.75, 1.3)
				.normalize()
				.multiplyScalar(Math.max(radius * 4, 2));
			this.camera.position.add(center);
			this.camera.lookAt(center);
			this.camera.updateProjectionMatrix();
			this.renderer.render(this.scene, this.camera);
			const url = this.renderer.domElement.toDataURL("image/png");
			thumbnails.set(entry.type, url);
			return url;
		} catch {
			// WebGL may be unavailable or exhausted. Keep the library usable with its icons.
			this.failed =
				!this.renderer || this.renderer.getContext().isContextLost();
			return undefined;
		} finally {
			if (object) {
				this.scene.remove(object);
				disposeModelPreview(object);
			}
		}
	}

	public dispose(): void {
		this.renderer?.dispose();
		this.renderer?.forceContextLoss();
		this.renderer = null;
	}
}
