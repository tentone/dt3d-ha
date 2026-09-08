import type {Material, Texture} from "three";
import {
	AmbientLight,
	Color,
	DirectionalLight,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	Scene,
	Source,
	SphereGeometry,
	SRGBColorSpace,
	WebGLRenderer,
} from "three";

/** Snapshot appearance without serializing texture pixels or editor metadata. */
export function materialPreviewKey(
	material: Material,
	background: string,
): string {
	const snapshot = (value: any): any => {
		if (value?.isTexture) {
			const texture = value as Texture;
			const data = texture.toJSON({
				textures: {},
				images: {[texture.source.uuid]: {uuid: texture.source.uuid}},
			});
			delete data.name;
			delete data.userData;
			return [
				data,
				texture.version,
				texture.source.version,
				texture.matrix.elements,
			];
		}
		if (value?.toArray) return value.toArray();
		if (Array.isArray(value)) return value.map(snapshot);
		if (value && typeof value === "object") {
			return Object.fromEntries(
				Object.entries(value)
					.filter(
						([key]) =>
							!key.startsWith("_") &&
							!["id", "uuid", "name", "userData", "version"].includes(key),
					)
					.map(([key, item]) => [key, snapshot(item)]),
			);
		}
		return value;
	};
	return JSON.stringify([background, snapshot(material)]);
}

/** One context for all preview jobs; only preview-owned resources are disposed. */
export class MaterialPreviewRenderer {
	private renderer: WebGLRenderer;
	private scene = new Scene();
	private camera = new PerspectiveCamera(32, 4 / 3, 0.1, 20);
	private geometry = new SphereGeometry(0.82, 48, 32);
	private placeholder = new MeshBasicMaterial();
	private sphere = new Mesh<SphereGeometry, Material>(
		this.geometry,
		this.placeholder,
	);

	constructor(
		createRenderer = () =>
			new WebGLRenderer({
				alpha: true,
				antialias: true,
				preserveDrawingBuffer: true,
			}),
	) {
		this.renderer = createRenderer();
		try {
			this.renderer.setPixelRatio(1);
			this.renderer.setSize(160, 120, false);
			this.renderer.outputColorSpace = SRGBColorSpace;
			this.camera.position.set(0, 0.1, 3.8);
			this.camera.lookAt(0, 0, 0);
			this.scene.add(this.sphere, new AmbientLight(0xffffff, 1.35));
			const key = new DirectionalLight(0xffffff, 2.8);
			key.position.set(3, 4, 4);
			const rim = new DirectionalLight(0x87aaff, 0.85);
			rim.position.set(-3, 1, -2);
			this.scene.add(key, rim);
		} catch (error) {
			this.dispose();
			throw error;
		}
	}

	render(material: Material, background: string): string {
		const preview = material.clone();
		const textures = new Map<Texture, Texture>();
		try {
			// Isolate GPU allocations and disposal listeners from the main scene.
			for (const [key, value] of Object.entries(preview)) {
				if (!(value as Texture)?.isTexture) continue;
				const source = value as Texture;
				if (!textures.has(source)) {
					// Texture.copy marks its source dirty; isolate it before cloning.
					const input = Object.create(source) as Texture;
					input.source = new Source(source.source.data);
					textures.set(source, input.clone());
				}
				(preview as any)[key] = textures.get(source);
			}
			this.sphere.material = preview;
			this.scene.background = new Color(background);
			this.renderer.clear();
			this.renderer.render(this.scene, this.camera);
			return this.renderer.domElement.toDataURL("image/png");
		} finally {
			this.sphere.material = this.placeholder;
			preview.dispose();
			for (const texture of textures.values()) texture.dispose();
			this.renderer.renderLists.dispose();
		}
	}

	dispose(): void {
		this.geometry.dispose();
		this.placeholder.dispose();
		this.scene.clear();
		try {
			this.renderer.dispose();
		} finally {
			this.renderer.forceContextLoss();
			this.renderer.domElement.width = 0;
			this.renderer.domElement.height = 0;
		}
	}
}
