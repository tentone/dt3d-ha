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
	/**
	 * WebGL content renderer.
	 */
	public renderer: WebGLRenderer;

	/**
	 * CSS 3D renderer, used to render CSS transformed DOM elements.
	 */
	public cssRenderer: CSS3DRenderer;

	/**
	 * Base scene used to render all object visible.
	 */
	public scene: Scene;

	/**
	 * Camera to view into the scene.
	 */
	public camera: PerspectiveCamera;

	/**
	 * Control object used to move around the scene.
	 */
	public controls: OrbitControls;

	/**
	 * If true the render loop if running.
	 */
	private running: boolean = false;

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

	/**
	 * Start the rendering loop.
	 * 
	 * @param onUpdate - Callback called before rendering.
	 */
	public start(onUpdate?: (time: number) => void): void {
		this.running = true;
		const animate = (time: number) => {
			if (this.running) {
				requestAnimationFrame(animate);
			}

			this.controls?.update();
			onUpdate?.(time);

			this.cssRenderer.render(this.scene, this.camera);
			this.renderer.render(this.scene, this.camera);
		};

		animate(0);
	}

	/**
	 * Stop the rendering loop and destroy all resources.
	 */
	public stop(): void {
		this.controls?.dispose();
		this.renderer.dispose();
		this.scene.clear();

		this.running = false;
	}

	/**
	 * Resize the renderer.
	 * 
	 * @param width - Width in px
	 * @param height - Height in px
	 */
	public resize(width: number, height: number): void {
		this.renderer.setSize(width, height, false);
		this.cssRenderer.setSize(width, height);
	}
}
