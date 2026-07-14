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
	Vector2,
	VSMShadowMap,
	WebGLRenderer,
} from "three";
import type {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {BokehPass} from "three/examples/jsm/postprocessing/BokehPass.js";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {FilmPass} from "three/examples/jsm/postprocessing/FilmPass.js";
import {GTAOPass} from "three/examples/jsm/postprocessing/GTAOPass.js";
import {HalftonePass} from "three/examples/jsm/postprocessing/HalftonePass.js";
import {OutputPass} from "three/examples/jsm/postprocessing/OutputPass.js";
import type {Pass} from "three/examples/jsm/postprocessing/Pass.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import {SSAOPass} from "three/examples/jsm/postprocessing/SSAOPass.js";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {CSS3DRenderer} from "three/examples/jsm/renderers/CSS3DRenderer.js";

import type {
	RenderingConfig,
	ShadowMapMode,
	ToneMappingMode,
} from "./general-config.js";
import {normalizeGeneralConfig} from "./general-config.js";

type PostProcessingPasses = {
	bokehDepth: BokehPass;
	bloom: UnrealBloomPass;
	gtao: GTAOPass;
	ssao: SSAOPass;
	halftone: HalftonePass;
	filmGrain: FilmPass;
};

type PostProcessingPipeline = {
	composer: EffectComposer;
	renderPass: RenderPass;
	passes: PostProcessingPasses;
};

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
	 * Composer used to render the scene and its configured post-processing passes.
	 */
	public composer: EffectComposer;

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

	private renderPass: RenderPass;

	private postProcessingPasses: PostProcessingPasses;

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
		const pipeline = this.createPostProcessingPipeline();
		this.composer = pipeline.composer;
		this.renderPass = pipeline.renderPass;
		this.postProcessingPasses = pipeline.passes;
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

	private applyRenderingConfig(
		renderer = this.renderer,
		composer?: EffectComposer,
	): void {
		const pixelRatio =
			(window.devicePixelRatio || 1) * this.renderingConfig.resolution;
		renderer.setPixelRatio(pixelRatio);
		renderer.toneMapping = getToneMapping(this.renderingConfig.toneMapping);
		renderer.shadowMap.enabled = this.renderingConfig.shadowMap.enabled;
		renderer.shadowMap.type = getShadowMapType(
			this.renderingConfig.shadowMap.type,
		);
		renderer.setSize(this.width, this.height, false);

		if (composer) {
			composer.setPixelRatio(pixelRatio);
			composer.setSize(this.width, this.height);
		}
	}

	private getBokehFocusDistance(): number {
		return Math.max(this.camera.position.distanceTo(this.controls.target), 0.1);
	}

	private createPostProcessingPipeline(): PostProcessingPipeline {
		const renderPass = new RenderPass(this.scene, this.camera);
		const passes: PostProcessingPasses = {
			bokehDepth: new BokehPass(this.scene, this.camera, {
				focus: this.getBokehFocusDistance(),
				aperture: 0.0025,
				maxblur: 0.01,
			}),
			bloom: new UnrealBloomPass(
				new Vector2(this.width, this.height),
				0.8,
				0.4,
				0.85,
			),
			gtao: new GTAOPass(this.scene, this.camera, this.width, this.height),
			ssao: new SSAOPass(this.scene, this.camera, this.width, this.height),
			halftone: new HalftonePass({
				shape: 1,
				radius: 4,
				rotateR: Math.PI / 12,
				rotateG: (Math.PI / 12) * 2,
				rotateB: (Math.PI / 12) * 3,
				scatter: 0,
				blending: 1,
				blendingMode: 1,
				greyscale: false,
			}),
			filmGrain: new FilmPass(0.35, false),
		};
		const composer = new EffectComposer(this.renderer);

		// Effect order is significant and mirrors the space configuration UI.
		composer.addPass(renderPass);
		composer.addPass(passes.bokehDepth);
		composer.addPass(passes.bloom);
		composer.addPass(passes.gtao);
		composer.addPass(passes.ssao);
		composer.addPass(passes.halftone);
		composer.addPass(passes.filmGrain);
		composer.addPass(new OutputPass());

		const config = this.renderingConfig.postProcessing;
		passes.bokehDepth.enabled = config.bokehDepth;
		passes.bloom.enabled = config.bloom;
		passes.gtao.enabled = config.gtao;
		passes.ssao.enabled = config.ssao;
		passes.halftone.enabled = config.halftone;
		passes.filmGrain.enabled = config.filmGrain;

		return {composer, renderPass, passes};
	}

	private disposePostProcessingPipeline(): void {
		for (const pass of this.composer.passes as Pass[]) {
			pass.dispose();
		}
		this.composer.dispose();
	}

	private applyPostProcessingConfig(): void {
		const config = this.renderingConfig.postProcessing;
		this.postProcessingPasses.bokehDepth.enabled = config.bokehDepth;
		this.postProcessingPasses.bloom.enabled = config.bloom;
		this.postProcessingPasses.gtao.enabled = config.gtao;
		this.postProcessingPasses.ssao.enabled = config.ssao;
		this.postProcessingPasses.halftone.enabled = config.halftone;
		this.postProcessingPasses.filmGrain.enabled = config.filmGrain;
	}

	private updateBokehFocus(): void {
		if (!this.postProcessingPasses.bokehDepth.enabled) {
			return;
		}

		const uniforms = this.postProcessingPasses.bokehDepth.uniforms as Record<
			string,
			{ value: unknown }
		>;
		uniforms.focus.value = this.getBokehFocusDistance();
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
				postProcessing: {
					...this.renderingConfig.postProcessing,
					...(config.postProcessing ?? {}),
				},
			},
		}).rendering;
		const antialiasingChanged =
			nextConfig.antialiasing !== this.renderingConfig.antialiasing;

		this.renderingConfig = nextConfig;

		if (antialiasingChanged) {
			this.disposePostProcessingPipeline();
			this.renderer.dispose();
			this.renderer = this.createRenderer();
			const pipeline = this.createPostProcessingPipeline();
			this.composer = pipeline.composer;
			this.renderPass = pipeline.renderPass;
			this.postProcessingPasses = pipeline.passes;
			return;
		}

		this.applyRenderingConfig(this.renderer, this.composer);
		this.applyPostProcessingConfig();
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
			this.updateBokehFocus();
			this.composer.render();
		};

		animate(0);
	}

	/**
	 * Stop the rendering loop and destroy all resources.
	 */
	public stop(): void {
		this.controls?.dispose();
		this.disposePostProcessingPipeline();
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
		this.composer.setSize(width, height);
		this.cssRenderer.setSize(width, height);
	}

	public setCamera(camera: Camera): void {
		this.camera = camera;
		this.renderPass.camera = camera;
		this.postProcessingPasses.bokehDepth.camera = camera;
		this.postProcessingPasses.gtao.camera = camera;
		this.postProcessingPasses.ssao.camera = camera;

		const perspectiveCamera = Number(
			Boolean(
				(camera as Camera & { isPerspectiveCamera?: boolean })
					.isPerspectiveCamera,
			),
		);
		this.postProcessingPasses.bokehDepth.materialBokeh.defines = {
			...this.postProcessingPasses.bokehDepth.materialBokeh.defines,
			PERSPECTIVE_CAMERA: perspectiveCamera,
		};
		this.postProcessingPasses.bokehDepth.materialBokeh.needsUpdate = true;
		this.postProcessingPasses.gtao.gtaoMaterial.defines = {
			...this.postProcessingPasses.gtao.gtaoMaterial.defines,
			PERSPECTIVE_CAMERA: perspectiveCamera,
		};
		this.postProcessingPasses.gtao.gtaoMaterial.needsUpdate = true;
	}
}
