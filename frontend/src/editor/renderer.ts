import type {
	Camera,
	Object3D,
	Scene,
	WebGLRenderTarget,
} from "three";
import {
	ACESFilmicToneMapping,
	BasicShadowMap,
	CineonToneMapping,
	LinearToneMapping,
	NoToneMapping,
	PCFShadowMap,
	ReinhardToneMapping,
	Vector2,
	VSMShadowMap,
	WebGLRenderer,
} from "three";
import {BokehPass} from "three/examples/jsm/postprocessing/BokehPass.js";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {FilmPass} from "three/examples/jsm/postprocessing/FilmPass.js";
import {GTAOPass} from "three/examples/jsm/postprocessing/GTAOPass.js";
import {HalftonePass} from "three/examples/jsm/postprocessing/HalftonePass.js";
import {OutlinePass} from "three/examples/jsm/postprocessing/OutlinePass.js";
import {OutputPass} from "three/examples/jsm/postprocessing/OutputPass.js";
import type {Pass} from "three/examples/jsm/postprocessing/Pass.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import {SSAOPass} from "three/examples/jsm/postprocessing/SSAOPass.js";
import {SSRPass} from "three/examples/jsm/postprocessing/SSRPass.js";
import {UnrealBloomPass} from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {CSS3DRenderer} from "three/examples/jsm/renderers/CSS3DRenderer.js";

import type {RenderingConfig} from "./general-config.js";
import {normalizeGeneralConfig} from "./general-config.js";
import type {NavigationControls, ShadowMapCapabilities} from "./scene.js";

type PostProcessingPasses = {
	ssr: SSRPass;
	bokehDepth: BokehPass;
	bloom: UnrealBloomPass;
	gtao: GTAOPass;
	ssao: SSAOPass;
	halftone: HalftonePass;
	filmGrain: FilmPass;
};

type PostProcessingPipeline = {
	composer: EffectComposer;
	selectionOutline: SelectionOutlinePass;
	renderPass: RenderPass;
	passes: PostProcessingPasses;
};

const SELECTION_OUTLINE_COLOR = 0xffff00;

/**
 * Outline pass for editor selections.
 *
 * Editor helpers are hidden while the selection mask is rendered, and the mask intentionally ignores scene depth so occluded selections remain clear.
 */
class SelectionOutlinePass extends OutlinePass {
	public excludedObjects: Object3D[] = [];

	constructor(
		resolution: Vector2,
		scene: Scene,
		camera: Camera,
	) {
		super(resolution, scene, camera);

		this.prepareMaskMaterial.fragmentShader = `
			void main() {
				gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
			}
		`;
		this.prepareMaskMaterial.depthTest = false;
		this.prepareMaskMaterial.depthWrite = false;
		this.prepareMaskMaterial.needsUpdate = true;
	}

	public override render(
		renderer: WebGLRenderer,
		writeBuffer: WebGLRenderTarget,
		readBuffer: WebGLRenderTarget,
		deltaTime: number,
		maskActive: boolean,
	): void {
		const visibility = this.excludedObjects.map((object) => object.visible);

		for (const object of this.excludedObjects) {
			object.visible = false;
		}

		try {
			super.render(
				renderer,
				writeBuffer,
				readBuffer,
				deltaTime,
				maskActive,
			);
		} finally {
			this.excludedObjects.forEach((object, index) => {
				object.visible = visibility[index];
			});
		}
	}
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
	public controls: NavigationControls;

	private canvas: HTMLCanvasElement;

	private width: number;

	private height: number;

	private renderingConfig: RenderingConfig = normalizeGeneralConfig().rendering;

	private renderPass: RenderPass;

	private postProcessingPasses: PostProcessingPasses;

	private selectionOutline: SelectionOutlinePass;

	private selectedObjects: Object3D[] = [];

	private selectionOutlineExclusions: Object3D[] = [];

	/**
	 * If true the render loop if running.
	 */
	private running: boolean = false;

	private xrEnabled = false;

	private onUpdate?: (time: number) => void;

	private previousFrameTime = 0;

	private readonly animate = (time: DOMHighResTimeStamp): void => {
		if (!this.running) {
			return;
		}

		const delta =
			this.previousFrameTime === 0 ? 0 : (time - this.previousFrameTime) / 1000;
		this.previousFrameTime = time;
		if (!this.renderer.xr.isPresenting) {
			this.controls?.update(delta);
		}
		this.onUpdate?.(time);

		if (this.renderer.xr.isPresenting) {
			// EffectComposer does not produce a stereo XR framebuffer. Render the scene directly while immersive and keep post-processing for the card.
			this.renderer.render(this.scene, this.camera);
			return;
		}

		this.cssRenderer.render(this.scene, this.camera);
		if (this.renderingConfig.postProcessingEnabled) {
			this.composer.render();
		} else {
			this.renderer.render(this.scene, this.camera);
		}
	};

	constructor(
		camera: Camera,
		canvas: HTMLCanvasElement,
		controls: NavigationControls,
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
		this.selectionOutline = pipeline.selectionOutline;
		this.setCamera(camera);
	}

	private createRenderer(): WebGLRenderer {
		const renderer = new WebGLRenderer({
			alpha: true,
			antialias: this.renderingConfig.antialiasing,
			canvas: this.canvas,
		});
		// Scene.background supplies solid backgrounds. Keep the renderer clear transparent so spaces configured without one expose the card behind them.
		renderer.setClearColor(0x000000, 0);
		renderer.xr.enabled = this.xrEnabled;
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
		switch (this.renderingConfig.toneMapping) {
			case "linear":
				renderer.toneMapping = LinearToneMapping;
				break;
			case "reinhard":
				renderer.toneMapping = ReinhardToneMapping;
				break;
			case "cineon":
				renderer.toneMapping = CineonToneMapping;
				break;
			case "aces_filmic":
				renderer.toneMapping = ACESFilmicToneMapping;
				break;
			default:
				renderer.toneMapping = NoToneMapping;
		}
		renderer.shadowMap.enabled = this.renderingConfig.shadowMap.enabled;
		switch (this.renderingConfig.shadowMap.type) {
			case "basic":
				renderer.shadowMap.type = BasicShadowMap;
				break;
			case "vsm":
				renderer.shadowMap.type = VSMShadowMap;
				break;
			default:
				renderer.shadowMap.type = PCFShadowMap;
		}
		renderer.setSize(this.width, this.height, false);

		if (composer) {
			composer.setPixelRatio(pixelRatio);
			composer.setSize(this.width, this.height);
		}
	}

	private createPostProcessingPipeline(): PostProcessingPipeline {
		const config = this.renderingConfig.postProcessing;
		const renderPass = new RenderPass(this.scene, this.camera);
		const passes: PostProcessingPasses = {
			ssr: new SSRPass({
				renderer: this.renderer,
				scene: this.scene,
				camera: this.camera,
				width: this.width,
				height: this.height,
				selects: null,
				groundReflector: null,
			}),
			bokehDepth: new BokehPass(this.scene, this.camera, {
				focus: config.bokehDepth.focus,
				aperture: config.bokehDepth.aperture,
				maxblur: config.bokehDepth.maxBlur,
			}),
			bloom: new UnrealBloomPass(
				new Vector2(this.width, this.height),
				config.bloom.strength,
				config.bloom.radius,
				config.bloom.threshold,
			),
			gtao: new GTAOPass(this.scene, this.camera, this.width, this.height),
			ssao: new SSAOPass(this.scene, this.camera, this.width, this.height),
			halftone: new HalftonePass({
				shape: config.halftone.shape,
				radius: config.halftone.radius,
				rotateR: config.halftone.rotateR,
				rotateG: config.halftone.rotateG,
				rotateB: config.halftone.rotateB,
				scatter: config.halftone.scatter,
				blending: config.halftone.blending,
				blendingMode: config.halftone.blendingMode,
				greyscale: config.halftone.greyscale,
			}),
			filmGrain: new FilmPass(
				config.filmGrain.intensity,
				config.filmGrain.grayscale,
			),
		};
		const composer = new EffectComposer(this.renderer);
		const selectionOutline = new SelectionOutlinePass(
			new Vector2(this.width, this.height),
			this.scene,
			this.camera,
		);
		selectionOutline.excludedObjects = this.selectionOutlineExclusions;
		selectionOutline.visibleEdgeColor.setHex(SELECTION_OUTLINE_COLOR);
		selectionOutline.hiddenEdgeColor.setHex(SELECTION_OUTLINE_COLOR);
		selectionOutline.edgeStrength = 3;
		selectionOutline.edgeGlow = 0;
		selectionOutline.edgeThickness = 2;
		selectionOutline.enabled = false;

		// Effect order is significant and mirrors the space configuration UI.
		composer.addPass(renderPass);
		composer.addPass(passes.ssr);
		composer.addPass(passes.bokehDepth);
		composer.addPass(passes.bloom);
		composer.addPass(passes.gtao);
		composer.addPass(passes.ssao);
		composer.addPass(passes.halftone);
		composer.addPass(passes.filmGrain);
		composer.addPass(selectionOutline);
		composer.addPass(new OutputPass());

		this.applyPostProcessingPassConfig(passes);

		return {composer, renderPass, passes, selectionOutline};
	}

	private disposePostProcessingPipeline(): void {
		for (const pass of this.composer.passes as Pass[]) {
			pass.dispose();
		}
		this.composer.dispose();
	}

	private applyPostProcessingPassConfig(
		passes = this.postProcessingPasses,
	): void {
		const config = this.renderingConfig.postProcessing;
		passes.ssr.opacity = config.ssr.opacity;
		passes.ssr.maxDistance = config.ssr.maxDistance;
		passes.ssr.thickness = config.ssr.thickness;
		passes.ssr.blur = config.ssr.blur;
		passes.ssr.distanceAttenuation = config.ssr.distanceAttenuation;
		passes.ssr.fresnel = config.ssr.fresnel;
		if (passes.ssr.resolutionScale !== config.ssr.resolutionScale) {
			passes.ssr.resolutionScale = config.ssr.resolutionScale;
		}

		const bokehUniforms = passes.bokehDepth.uniforms as Record<
			string,
			{ value: unknown }
		>;
		bokehUniforms.focus.value = config.bokehDepth.focus;
		bokehUniforms.aperture.value = config.bokehDepth.aperture;
		bokehUniforms.maxblur.value = config.bokehDepth.maxBlur;

		passes.bloom.strength = config.bloom.strength;
		passes.bloom.radius = config.bloom.radius;
		passes.bloom.threshold = config.bloom.threshold;

		passes.gtao.updateGtaoMaterial({
			radius: config.gtao.radius,
			distanceExponent: config.gtao.distanceExponent,
			thickness: config.gtao.thickness,
			distanceFallOff: config.gtao.distanceFallOff,
			scale: config.gtao.scale,
			samples: config.gtao.samples,
			screenSpaceRadius: config.gtao.screenSpaceRadius,
		});
		passes.gtao.updatePdMaterial(config.gtao.denoise);
		passes.gtao.blendIntensity = config.gtao.blendIntensity;

		passes.ssao.kernelRadius = config.ssao.kernelRadius;
		passes.ssao.minDistance = config.ssao.minDistance;
		passes.ssao.maxDistance = config.ssao.maxDistance;

		passes.halftone.uniforms.shape.value = config.halftone.shape;
		passes.halftone.uniforms.radius.value = config.halftone.radius;
		passes.halftone.uniforms.rotateR.value = config.halftone.rotateR;
		passes.halftone.uniforms.rotateG.value = config.halftone.rotateG;
		passes.halftone.uniforms.rotateB.value = config.halftone.rotateB;
		passes.halftone.uniforms.scatter.value = config.halftone.scatter;
		passes.halftone.uniforms.blending.value = config.halftone.blending;
		passes.halftone.uniforms.blendingMode.value = config.halftone.blendingMode;
		passes.halftone.uniforms.greyscale.value = config.halftone.greyscale;

		const filmUniforms = passes.filmGrain.uniforms as Record<
			string,
			{ value: unknown }
		>;
		filmUniforms.intensity.value = config.filmGrain.intensity;
		filmUniforms.grayscale.value = config.filmGrain.grayscale;

		passes.ssr.enabled = config.ssr.enabled;
		passes.bokehDepth.enabled = config.bokehDepth.enabled;
		passes.bloom.enabled = config.bloom.enabled;
		passes.gtao.enabled = config.gtao.enabled;
		passes.ssao.enabled = config.ssao.enabled;
		passes.halftone.enabled = config.halftone.enabled;
		passes.filmGrain.enabled = config.filmGrain.enabled;
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
					ssr: {
						...this.renderingConfig.postProcessing.ssr,
						...(config.postProcessing?.ssr ?? {}),
					},
					bokehDepth: {
						...this.renderingConfig.postProcessing.bokehDepth,
						...(config.postProcessing?.bokehDepth ?? {}),
					},
					bloom: {
						...this.renderingConfig.postProcessing.bloom,
						...(config.postProcessing?.bloom ?? {}),
					},
					gtao: {
						...this.renderingConfig.postProcessing.gtao,
						...(config.postProcessing?.gtao ?? {}),
						denoise: {
							...this.renderingConfig.postProcessing.gtao.denoise,
							...(config.postProcessing?.gtao?.denoise ?? {}),
						},
					},
					ssao: {
						...this.renderingConfig.postProcessing.ssao,
						...(config.postProcessing?.ssao ?? {}),
					},
					halftone: {
						...this.renderingConfig.postProcessing.halftone,
						...(config.postProcessing?.halftone ?? {}),
					},
					filmGrain: {
						...this.renderingConfig.postProcessing.filmGrain,
						...(config.postProcessing?.filmGrain ?? {}),
					},
				},
			},
		}).rendering;
		const antialiasingChanged =
			nextConfig.antialiasing !== this.renderingConfig.antialiasing;

		this.renderingConfig = nextConfig;

		if (antialiasingChanged) {
			const previousRenderer = this.renderer;
			previousRenderer.setAnimationLoop(null);
			this.disposePostProcessingPipeline();
			previousRenderer.dispose();
			this.renderer = this.createRenderer();
			const pipeline = this.createPostProcessingPipeline();
			this.composer = pipeline.composer;
			this.renderPass = pipeline.renderPass;
			this.postProcessingPasses = pipeline.passes;
			this.selectionOutline = pipeline.selectionOutline;
			this.setCamera(this.camera);
			this.setSelectedObjects(this.selectedObjects);
			if (this.running) {
				this.renderer.setAnimationLoop(this.animate);
			}
			return;
		}

		this.applyRenderingConfig(this.renderer, this.composer);
		this.applyPostProcessingPassConfig();
	}

	/** GPU limits used when allocating directional and point-light shadow maps. */
	public getShadowMapCapabilities(): ShadowMapCapabilities {
		return {
			maxTextureSize: this.renderer.capabilities.maxTextureSize,
			maxCubemapSize: this.renderer.capabilities.maxCubemapSize,
		};
	}

	/**
	 * Start the rendering loop.
	 *
	 * @param onUpdate - Callback called before rendering.
	 */
	public start(onUpdate?: (time: number) => void): void {
		this.onUpdate = onUpdate;
		this.previousFrameTime = 0;
		this.running = true;
		this.renderer.setAnimationLoop(this.animate);
	}

	/**
	 * Stop the rendering loop and destroy all resources.
	 */
	public stop(): void {
		this.running = false;
		this.renderer.setAnimationLoop(null);
		this.controls?.dispose();
		this.disposePostProcessingPipeline();
		this.renderer.dispose();
		this.scene.clear();
	}

	/**
	 * Enable or disable WebXR support on the underlying renderer.
	 */
	public setXrEnabled(enabled: boolean): void {
		this.xrEnabled = enabled;
		this.renderer.xr.enabled = enabled;
	}

	/**
	 * Hand an immersive session to Three.js.
	 */
	public async setXrSession(session: XRSession | null): Promise<void> {
		if (session) {
			this.setXrEnabled(true);
			// "local" is a core immersive reference space and works even when a device does not grant the optional floor-tracking feature.
			this.renderer.xr.setReferenceSpaceType("local");
		}

		await this.renderer.xr.setSession(session);
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
		const perspectiveCamera = Number(
			Boolean(
				(camera as Camera & { isPerspectiveCamera?: boolean })
					.isPerspectiveCamera,
			),
		);
		this.renderPass.camera = camera;
		this.selectionOutline.renderCamera = camera;
		this.postProcessingPasses.ssr.camera = camera;
		this.postProcessingPasses.ssr.ssrMaterial.uniforms.cameraNear.value = (
			camera as Camera & { near: number }
		).near;
		this.postProcessingPasses.ssr.ssrMaterial.uniforms.cameraFar.value = (
			camera as Camera & { far: number }
		).far;
		this.postProcessingPasses.ssr.ssrMaterial.uniforms.cameraProjectionMatrix.value.copy(
			camera.projectionMatrix,
		);
		this.postProcessingPasses.ssr.ssrMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(
			camera.projectionMatrixInverse,
		);
		this.postProcessingPasses.ssr.ssrMaterial.defines.PERSPECTIVE_CAMERA =
			perspectiveCamera;
		this.postProcessingPasses.ssr.ssrMaterial.needsUpdate = true;
		this.postProcessingPasses.bokehDepth.camera = camera;
		this.postProcessingPasses.gtao.camera = camera;
		this.postProcessingPasses.ssao.camera = camera;

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

	public setControls(controls: NavigationControls): void {
		this.controls = controls;
	}

	/**
	 * Highlight an editor selection with a yellow glow.
	 *
	 * @param object - Selected object, or null to clear the highlight.
	 */
	public setSelectedObject(object: Object3D | null): void {
		this.setSelectedObjects(object ? [object] : []);
	}

	/**
	 * Highlight all objects in an editor multi-selection.
	 *
	 * @param objects - Selected objects, or an empty array to clear the highlight.
	 */
	public setSelectedObjects(objects: Object3D[]): void {
		this.selectedObjects = [...objects];
		this.selectionOutline.selectedObjects = this.selectedObjects;
		this.selectionOutline.enabled = this.selectedObjects.length > 0;
	}

	/**
	 * Keep editor-only helpers out of the selection mask.
	 *
	 * @param objects - Objects to hide while rendering the outline pass.
	 */
	public setSelectionOutlineExclusions(objects: Object3D[]): void {
		this.selectionOutlineExclusions = objects;
		this.selectionOutline.excludedObjects = objects;
	}
}
