import type { PerspectiveCamera, Scene } from "three";
import { WebGLRenderer } from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer.js";

interface RendererManagerOptions {
	camera: PerspectiveCamera;
	canvas: HTMLCanvasElement;
	controls?: OrbitControls;
	cssElement: HTMLElement;
	height: number;
	scene: Scene;
	width: number;
}

/**
 * RendererManager handles WebGL and CSS renderers along with the render loop.
 */
export class RendererManager {
	public renderer: WebGLRenderer;
	public cssRenderer: CSS3DRenderer;

	private scene: Scene;
	private camera: PerspectiveCamera;
	private controls?: OrbitControls;

	constructor({
		camera,
		canvas,
		controls,
		cssElement,
		height,
		scene,
		width,
	}: RendererManagerOptions) {
		this.scene = scene;
		this.camera = camera;
		this.controls = controls;

		this.cssRenderer = new CSS3DRenderer({ element: cssElement });
		this.cssRenderer.setSize(width, height);

		this.renderer = new WebGLRenderer({ alpha: true, canvas });
		this.renderer.setSize(width, height, false);
		this.renderer.setClearColor(0x446644, 1);
	}

	public start(onUpdate?: (time: number) => void): void {
		const animate = (time: number) => {
			requestAnimationFrame(animate);

			this.controls?.update();
			onUpdate?.(time);

			this.cssRenderer.render(this.scene, this.camera);
			this.renderer.render(this.scene, this.camera);
		};

		animate(0);
	}

	public resize(width: number, height: number): void {
		this.renderer.setSize(width, height, false);
		this.cssRenderer.setSize(width, height);
	}
}
