import type {Camera, Material} from "three";
import {
	BoxGeometry,
	CanvasTexture,
	EdgesGeometry,
	Group,
	LineBasicMaterial,
	LineSegments,
	Mesh,
	MeshBasicMaterial,
	OrthographicCamera,
	Quaternion,
	Raycaster,
	Scene,
	SRGBColorSpace,
	Vector2,
	WebGLRenderer,
} from "three";

export type OrientationCubeDirection = {
	x: number;
	y: number;
	z: number;
};

const CUBE_SIZE = 88;

const FACES: Array<{
	color: string;
	direction: OrientationCubeDirection;
	label: string;
}> = [
	{color: "#b93838", direction: {x: 1, y: 0, z: 0}, label: "RIGHT"},
	{color: "#7f2929", direction: {x: -1, y: 0, z: 0}, label: "LEFT"},
	{color: "#369447", direction: {x: 0, y: 1, z: 0}, label: "TOP"},
	{color: "#286d35", direction: {x: 0, y: -1, z: 0}, label: "BOTTOM"},
	{color: "#3972b7", direction: {x: 0, y: 0, z: 1}, label: "FRONT"},
	{color: "#294f7d", direction: {x: 0, y: 0, z: -1}, label: "BACK"},
];

/**
 * Camera-aligned cube used to select the editor's six axis views.
 */
export class DT3DOrientationCube extends HTMLElement {
	public camera: Camera | null = null;

	private cube: Mesh<BoxGeometry, MeshBasicMaterial[]> | null = null;
	private frameHandle: number | null = null;
	private renderer: WebGLRenderer | null = null;
	private readonly raycaster = new Raycaster();
	private readonly pointer = new Vector2();
	private readonly scene = new Scene();
	private readonly viewCamera = new OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0.1, 10);
	private readonly viewGroup = new Group();
	private readonly inverseCameraQuaternion = new Quaternion();

	public connectedCallback(): void {
		if (!this.shadowRoot) {
			const shadow = this.attachShadow({mode: "open"});
			shadow.innerHTML = `
				<style>
					:host {
						display: block;
						position: absolute;
						width: ${CUBE_SIZE}px;
						height: ${CUBE_SIZE}px;
						z-index: 5;
						border-radius: 12px;
						background: rgba(0, 0, 0, 0.48);
						box-shadow: 0 4px 12px rgba(0, 0, 0, 0.24);
						overflow: hidden;
					}

					canvas {
						display: block;
						width: 100%;
						height: 100%;
						cursor: pointer;
						touch-action: manipulation;
					}
				</style>
				<canvas
					aria-label="3D orientation cube. Double-click a face to orient the camera."
					title="Double-click a face to orient the camera"
				></canvas>
			`;
		}

		this.initializeRenderer();
	}

	public disconnectedCallback(): void {
		this.disposeRenderer();
	}

	private initializeRenderer(): void {
		if (this.renderer) {
			return;
		}

		const canvas = this.shadowRoot?.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			return;
		}

		this.renderer = new WebGLRenderer({alpha: true, antialias: true, canvas});
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		this.renderer.setSize(CUBE_SIZE, CUBE_SIZE, false);
		this.renderer.outputColorSpace = SRGBColorSpace;
		this.renderer.setClearColor(0x000000, 0);

		const materials = FACES.map(
			(face) =>
				new MeshBasicMaterial({
					map: this.createFaceTexture(face.label, face.color),
				}),
		);
		this.cube = new Mesh(new BoxGeometry(2, 2, 2), materials);
		this.viewGroup.add(this.cube);

		const edges = new LineSegments(
			new EdgesGeometry(this.cube.geometry),
			new LineBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.8}),
		);
		this.viewGroup.add(edges);
		this.scene.add(this.viewGroup);
		this.viewCamera.position.set(0, 0, 5);
		this.viewCamera.lookAt(0, 0, 0);

		canvas.addEventListener("dblclick", this.handleDoubleClick);
		this.renderFrame();
	}

	private createFaceTexture(label: string, color: string): CanvasTexture {
		const canvas = document.createElement("canvas");
		canvas.width = 256;
		canvas.height = 256;
		const context = canvas.getContext("2d");

		if (context) {
			context.fillStyle = color;
			context.fillRect(0, 0, canvas.width, canvas.height);
			context.fillStyle = "rgba(255, 255, 255, 0.95)";
			context.font = "700 38px sans-serif";
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillText(label, canvas.width / 2, canvas.height / 2);
		}

		const texture = new CanvasTexture(canvas);
		texture.colorSpace = SRGBColorSpace;
		return texture;
	}

	private readonly handleDoubleClick = (event: MouseEvent): void => {
		if (!this.cube || !this.renderer) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		const rect = this.renderer.domElement.getBoundingClientRect();
		this.pointer.set(
			((event.clientX - rect.left) / rect.width) * 2 - 1,
			-((event.clientY - rect.top) / rect.height) * 2 + 1,
		);
		this.raycaster.setFromCamera(this.pointer, this.viewCamera);
		const intersection = this.raycaster.intersectObject(this.cube, false)[0];
		const materialIndex = intersection?.face?.materialIndex;
		const face = typeof materialIndex === "number" ? FACES[materialIndex] : null;

		if (!face) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent<OrientationCubeDirection>("orientation-select", {
				bubbles: true,
				composed: true,
				detail: face.direction,
			}),
		);
	};

	private renderFrame = (): void => {
		if (!this.renderer || !this.isConnected) {
			return;
		}

		if (this.camera) {
			this.inverseCameraQuaternion.copy(this.camera.quaternion).invert();
			this.viewGroup.quaternion.copy(this.inverseCameraQuaternion);
		}

		this.renderer.render(this.scene, this.viewCamera);
		this.frameHandle = window.requestAnimationFrame(this.renderFrame);
	};

	private disposeRenderer(): void {
		if (this.frameHandle !== null) {
			window.cancelAnimationFrame(this.frameHandle);
			this.frameHandle = null;
		}

		const canvas = this.shadowRoot?.querySelector("canvas");
		canvas?.removeEventListener("dblclick", this.handleDoubleClick);
		this.cube?.geometry.dispose();
		for (const material of this.cube?.material ?? []) {
			material.map?.dispose();
			material.dispose();
		}

		this.viewGroup.traverse((object) => {
			const renderable = object as typeof object & {
				geometry?: {dispose: () => void};
				material?: Material | Material[];
			};
			if (object !== this.cube) {
				renderable.geometry?.dispose();
				const materials = Array.isArray(renderable.material)
					? renderable.material
					: renderable.material
						? [renderable.material]
						: [];
				for (const material of materials) {
					material.dispose();
				}
			}
		});
		this.viewGroup.clear();
		this.scene.remove(this.viewGroup);
		this.cube = null;
		this.renderer?.dispose();
		this.renderer = null;
	}
}

customElements.define("dt3d-orientation-cube", DT3DOrientationCube);

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-orientation-cube": DT3DOrientationCube;
	}
}
