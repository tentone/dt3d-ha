import type {Camera, Scene} from "three";
import {
	ACESFilmicToneMapping,
	BasicShadowMap,
	CineonToneMapping,
	LinearToneMapping,
	NoToneMapping,
	PCFShadowMap,
	PCFSoftShadowMap,
	ReinhardToneMapping,
	VSMShadowMap,
	WebGLRenderer,
} from "three";
import type {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {CSS3DRenderer} from "three/examples/jsm/renderers/CSS3DRenderer.js";

import type {
	RenderingConfig,
	ShadowMapMode,
	ToneMappingMode,
} from "./general-config.js";
import {normalizeGeneralConfig} from "./general-config.js";

const getToneMapping = (mode: ToneMappingMode) => {
	switch (mode) {
		case "linear":
			return LinearToneMapping;
		case "reinhard":
			return ReinhardToneMapping;
		case "cineon":
			return CineonToneMapping;
		case "aces_filmic":
			return ACESFilmicToneMapping;
		default:
			return NoToneMapping;
	}
};

const getShadowMapType = (type: ShadowMapMode) => {
	switch (type) {
		case "basic":
			return BasicShadowMap;
		case "pcf_soft":
			return PCFSoftShadowMap;
		case "vsm":
			return VSMShadowMap;
		default:
			return PCFShadowMap;
	}
};

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
	public camera: Camera;

	/**
	 * Control object used to move around the scene.
	 */
	public controls: OrbitControls;

	private canvas: HTMLCanvasElement;

	private width: number;

	private height: number;

	private renderingConfig: RenderingConfig = normalizeGeneralConfig().rendering;

	/**
	 * If true the render loop if running.
	 */
	private running: boolean = false;

	constructor(
		camera: Camera,
		canvas: HTMLCanvasElement,
		controls: OrbitControls,
		cssElement: HTMLElement,
		height: number,
		scene: Scene,
		width: number,
		renderingConfig: Partial<RenderingConfig> = {},
	) {
		this.scene = scene;
		this.camera = camera;
		this.controls = controls;
		this.canvas = canvas;
		this.width = width;
		this.height = height;
		this.renderingConfig = normalizeGeneralConfig({
			rendering: renderingConfig,
		}).rendering;

		this.cssRenderer = new CSS3DRenderer({element: cssElement});
		this.cssRenderer.setSize(width, height);

		this.renderer = this.createRenderer();
	}

	private createRenderer(): WebGLRenderer {
		const renderer = new WebGLRenderer({
			alpha: true,
			antialias: this.renderingConfig.antialiasing,
			canvas: this.canvas,
		});
		renderer.setClearColor(0x446644, 1);
		this.applyRenderingConfig(renderer);

		return renderer;
	}

	private applyRenderingConfig(renderer = this.renderer): void {
		const pixelRatio =
			(window.devicePixelRatio || 1) * this.renderingConfig.resolution;
		renderer.setPixelRatio(pixelRatio);
		renderer.toneMapping = getToneMapping(this.renderingConfig.toneMapping);
		renderer.shadowMap.enabled = this.renderingConfig.shadowMap.enabled;
		renderer.shadowMap.type = getShadowMapType(
			this.renderingConfig.shadowMap.type,
		);
		renderer.setSize(this.width, this.height, false);
	}

	public setRenderingConfig(config: Partial<RenderingConfig>): void {
		const nextConfig = normalizeGeneralConfig({
			rendering: {
				...this.renderingConfig,
				...config,
				shadowMap: {
					...this.renderingConfig.shadowMap,
					...config.shadowMap,
				},
			},
		}).rendering;
		const antialiasingChanged =
			nextConfig.antialiasing !== this.renderingConfig.antialiasing;

		this.renderingConfig = nextConfig;

		if (antialiasingChanged) {
			this.renderer.dispose();
			this.renderer = this.createRenderer();
			return;
		}

		this.applyRenderingConfig();
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
		this.width = width;
		this.height = height;
		this.renderer.setSize(width, height, false);
		this.cssRenderer.setSize(width, height);
	}

	public setCamera(camera: Camera): void {
		this.camera = camera;
	}
}
