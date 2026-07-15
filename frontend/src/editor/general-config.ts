import type {SpaceSceneConfig} from "./scene.js";
import {normalizeSpaceSceneConfig} from "./scene.js";

export type ToneMappingMode =
	| "none"
	| "linear"
	| "reinhard"
	| "cineon"
	| "aces_filmic";

export type ResolutionScale = 1 | 0.75 | 0.5;

export type ShadowMapMode = "basic" | "pcf" | "pcf_soft" | "vsm";

export type BokehDepthConfig = {
	enabled: boolean;
	focus: number;
	aperture: number;
	maxBlur: number;
};

export type BloomConfig = {
	enabled: boolean;
	strength: number;
	radius: number;
	threshold: number;
};

export type GtaoConfig = {
	enabled: boolean;
	radius: number;
	distanceExponent: number;
	thickness: number;
	distanceFallOff: number;
	scale: number;
	samples: number;
	screenSpaceRadius: boolean;
	blendIntensity: number;
	denoise: {
		lumaPhi: number;
		depthPhi: number;
		normalPhi: number;
		radius: number;
		radiusExponent: number;
		rings: number;
		samples: number;
	};
};

export type SsaoConfig = {
	enabled: boolean;
	kernelRadius: number;
	minDistance: number;
	maxDistance: number;
};

export type HalftoneConfig = {
	enabled: boolean;
	shape: number;
	radius: number;
	rotateR: number;
	rotateG: number;
	rotateB: number;
	scatter: number;
	blending: number;
	blendingMode: number;
	greyscale: boolean;
};

export type FilmGrainConfig = {
	enabled: boolean;
	intensity: number;
	grayscale: boolean;
};

export type PostProcessingConfig = {
	bokehDepth: BokehDepthConfig;
	bloom: BloomConfig;
	gtao: GtaoConfig;
	ssao: SsaoConfig;
	halftone: HalftoneConfig;
	filmGrain: FilmGrainConfig;
};

export type RenderingConfig = {
	antialiasing: boolean;
	toneMapping: ToneMappingMode;
	resolution: ResolutionScale;
	shadowMap: {
		enabled: boolean;
		type: ShadowMapMode;
	};
	postProcessing: PostProcessingConfig;
};

export type GeneralConfig = {
	rendering: RenderingConfig;
	developmentMode: {
		enabled: boolean;
	};
};

export type CardGeneralConfig = {
	rendering: Pick<
		RenderingConfig,
		"antialiasing" | "resolution" | "shadowMap"
	>;
	developmentMode: GeneralConfig["developmentMode"];
};

export type SpaceGeneralConfig = {
	rendering: Pick<RenderingConfig, "toneMapping" | "postProcessing">;
};

export type SpaceConfiguration = {
	general: SpaceGeneralConfig;
	scene: SpaceSceneConfig;
};

export const DEFAULT_GENERAL_CONFIG: GeneralConfig = {
	rendering: {
		antialiasing: false,
		toneMapping: "none",
		resolution: 1,
		shadowMap: {
			enabled: false,
			type: "pcf",
		},
		postProcessing: {
			bokehDepth: {
				enabled: false,
				focus: 3,
				aperture: 0.0025,
				maxBlur: 0.01,
			},
			bloom: {
				enabled: false,
				strength: 0.8,
				radius: 0.4,
				threshold: 0.85,
			},
			gtao: {
				enabled: false,
				radius: 0.25,
				distanceExponent: 1,
				thickness: 1,
				distanceFallOff: 1,
				scale: 1,
				samples: 16,
				screenSpaceRadius: false,
				blendIntensity: 1,
				denoise: {
					lumaPhi: 10,
					depthPhi: 2,
					normalPhi: 3,
					radius: 8,
					radiusExponent: 2,
					rings: 2,
					samples: 16,
				},
			},
			ssao: {
				enabled: false,
				kernelRadius: 8,
				minDistance: 0.005,
				maxDistance: 0.1,
			},
			halftone: {
				enabled: false,
				shape: 1,
				radius: 4,
				rotateR: Math.PI / 12,
				rotateG: (Math.PI / 12) * 2,
				rotateB: (Math.PI / 12) * 3,
				scatter: 0,
				blending: 1,
				blendingMode: 1,
				greyscale: false,
			},
			filmGrain: {
				enabled: false,
				intensity: 0.35,
				grayscale: false,
			},
		},
	},
	developmentMode: {
		enabled: true,
	},
};

export const DEFAULT_CARD_GENERAL_CONFIG: CardGeneralConfig = {
	rendering: {
		antialiasing: DEFAULT_GENERAL_CONFIG.rendering.antialiasing,
		resolution: DEFAULT_GENERAL_CONFIG.rendering.resolution,
		shadowMap: DEFAULT_GENERAL_CONFIG.rendering.shadowMap,
	},
	developmentMode: DEFAULT_GENERAL_CONFIG.developmentMode,
};

export const DEFAULT_SPACE_GENERAL_CONFIG: SpaceGeneralConfig = {
	rendering: {
		toneMapping: DEFAULT_GENERAL_CONFIG.rendering.toneMapping,
		postProcessing: DEFAULT_GENERAL_CONFIG.rendering.postProcessing,
	},
};

export const DEFAULT_SPACE_CONFIGURATION: SpaceConfiguration = {
	general: DEFAULT_SPACE_GENERAL_CONFIG,
	scene: normalizeSpaceSceneConfig(),
};

const booleanOrDefault = (value: unknown, fallback: boolean): boolean => {
	if (value === true || value === "true" || value === "1" || value === 1) {
		return true;
	}

	if (value === false || value === "false" || value === "0" || value === 0) {
		return false;
	}

	return fallback;
};

const numberOrDefault = (
	value: unknown,
	fallback: number,
	minimum = Number.NEGATIVE_INFINITY,
	maximum = Number.POSITIVE_INFINITY,
): number => {
	const parsed = typeof value === "string" ? Number(value) : value;
	if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
		return fallback;
	}

	return Math.min(Math.max(parsed, minimum), maximum);
};

const integerOrDefault = (
	value: unknown,
	fallback: number,
	minimum: number,
	maximum: number,
): number => Math.round(numberOrDefault(value, fallback, minimum, maximum));

const passConfig = (
	value: unknown,
	fallbackEnabled: boolean,
): {enabled: boolean; values: Record<string, any>} => {
	if (value && typeof value === "object" && !Array.isArray(value)) {
		const values = value as Record<string, any>;
		return {
			enabled: booleanOrDefault(values.enabled, fallbackEnabled),
			values,
		};
	}

	return {
		enabled: booleanOrDefault(value, fallbackEnabled),
		values: {},
	};
};

const normalizeToken = (value: unknown): string =>
	typeof value === "string"
		? value
			.trim()
			.replace(/([a-z])([A-Z])/g, "$1_$2")
			.replace(/[\s-]+/g, "_")
			.toLowerCase()
		: "";

export const normalizeToneMappingMode = (value: unknown): ToneMappingMode => {
	switch (normalizeToken(value)) {
		case "linear":
		case "linear_tone_mapping":
			return "linear";
		case "reinhard":
		case "reinhard_tone_mapping":
			return "reinhard";
		case "cineon":
		case "cineon_tone_mapping":
			return "cineon";
		case "aces":
		case "aces_filmic":
		case "aces_filmic_tone_mapping":
			return "aces_filmic";
		default:
			return DEFAULT_GENERAL_CONFIG.rendering.toneMapping;
	}
};

export const normalizeResolutionScale = (value: unknown): ResolutionScale => {
	if (typeof value === "string" && value.trim().endsWith("%")) {
		const percent = Number(value.trim().slice(0, -1));
		if (percent === 75) {
			return 0.75;
		}

		if (percent === 50) {
			return 0.5;
		}
	}

	const parsed = typeof value === "string" ? Number(value) : value;

	if (parsed === 0.75 || parsed === 75) {
		return 0.75;
	}

	if (parsed === 0.5 || parsed === 50) {
		return 0.5;
	}

	return 1;
};

export const normalizeShadowMapMode = (value: unknown): ShadowMapMode => {
	switch (normalizeToken(value)) {
		case "basic":
		case "basic_shadow_map":
			return "basic";
		case "pcf_soft":
		case "pcf_soft_shadow_map":
			return "pcf_soft";
		case "vsm":
		case "vsm_shadow_map":
			return "vsm";
		default:
			return "pcf";
	}
};

export const normalizePostProcessingConfig = (
	config: Record<string, any> = {},
): PostProcessingConfig => {
	const defaults = DEFAULT_GENERAL_CONFIG.rendering.postProcessing;
	const bokehDepth = passConfig(
		config.bokehDepth ?? config.bokeh_depth ?? config.bokeh,
		defaults.bokehDepth.enabled,
	);
	const bloom = passConfig(config.bloom, defaults.bloom.enabled);
	const gtao = passConfig(
		config.gtao ?? config.gtaoEnabled ?? config.gtao_enabled,
		defaults.gtao.enabled,
	);
	const ssao = passConfig(
		config.ssao ?? config.ssaoEnabled ?? config.ssao_enabled,
		defaults.ssao.enabled,
	);
	const halftone = passConfig(
		config.halftone ?? config.halfTone ?? config.half_tone,
		defaults.halftone.enabled,
	);
	const filmGrain = passConfig(
		config.filmGrain ?? config.film_grain ?? config.film,
		defaults.filmGrain.enabled,
	);
	const denoise =
		gtao.values.denoise && typeof gtao.values.denoise === "object"
			? gtao.values.denoise
			: {};
	const minDistance = numberOrDefault(
		ssao.values.minDistance ?? ssao.values.min_distance,
		defaults.ssao.minDistance,
		0,
		1,
	);

	return {
		bokehDepth: {
			enabled: bokehDepth.enabled,
			focus: numberOrDefault(
				bokehDepth.values.focus,
				defaults.bokehDepth.focus,
				0.1,
				10000,
			),
			aperture: numberOrDefault(
				bokehDepth.values.aperture,
				defaults.bokehDepth.aperture,
				0,
				1,
			),
			maxBlur: numberOrDefault(
				bokehDepth.values.maxBlur ?? bokehDepth.values.maxblur,
				defaults.bokehDepth.maxBlur,
				0,
				1,
			),
		},
		bloom: {
			enabled: bloom.enabled,
			strength: numberOrDefault(
				bloom.values.strength,
				defaults.bloom.strength,
				0,
				10,
			),
			radius: numberOrDefault(
				bloom.values.radius,
				defaults.bloom.radius,
				0,
				1,
			),
			threshold: numberOrDefault(
				bloom.values.threshold,
				defaults.bloom.threshold,
				0,
				1,
			),
		},
		gtao: {
			enabled: gtao.enabled,
			radius: numberOrDefault(
				gtao.values.radius,
				defaults.gtao.radius,
				0.01,
				10,
			),
			distanceExponent: numberOrDefault(
				gtao.values.distanceExponent ?? gtao.values.distance_exponent,
				defaults.gtao.distanceExponent,
				0.1,
				10,
			),
			thickness: numberOrDefault(
				gtao.values.thickness,
				defaults.gtao.thickness,
				0.01,
				10,
			),
			distanceFallOff: numberOrDefault(
				gtao.values.distanceFallOff ?? gtao.values.distance_fall_off,
				defaults.gtao.distanceFallOff,
				0,
				10,
			),
			scale: numberOrDefault(
				gtao.values.scale,
				defaults.gtao.scale,
				0.01,
				10,
			),
			samples: integerOrDefault(
				gtao.values.samples,
				defaults.gtao.samples,
				2,
				32,
			),
			screenSpaceRadius: booleanOrDefault(
				gtao.values.screenSpaceRadius ?? gtao.values.screen_space_radius,
				defaults.gtao.screenSpaceRadius,
			),
			blendIntensity: numberOrDefault(
				gtao.values.blendIntensity ?? gtao.values.blend_intensity,
				defaults.gtao.blendIntensity,
				0,
				5,
			),
			denoise: {
				lumaPhi: numberOrDefault(
					denoise.lumaPhi ?? denoise.luma_phi,
					defaults.gtao.denoise.lumaPhi,
					0,
					20,
				),
				depthPhi: numberOrDefault(
					denoise.depthPhi ?? denoise.depth_phi,
					defaults.gtao.denoise.depthPhi,
					0,
					20,
				),
				normalPhi: numberOrDefault(
					denoise.normalPhi ?? denoise.normal_phi,
					defaults.gtao.denoise.normalPhi,
					0,
					20,
				),
				radius: numberOrDefault(
					denoise.radius,
					defaults.gtao.denoise.radius,
					0,
					32,
				),
				radiusExponent: numberOrDefault(
					denoise.radiusExponent ?? denoise.radius_exponent,
					defaults.gtao.denoise.radiusExponent,
					1,
					4,
				),
				rings: integerOrDefault(
					denoise.rings,
					defaults.gtao.denoise.rings,
					1,
					4,
				),
				samples: integerOrDefault(
					denoise.samples,
					defaults.gtao.denoise.samples,
					4,
					32,
				),
			},
		},
		// GTAO takes precedence when an external/persisted config enables both.
		ssao: {
			enabled: ssao.enabled && !gtao.enabled,
			kernelRadius: numberOrDefault(
				ssao.values.kernelRadius ?? ssao.values.kernel_radius,
				defaults.ssao.kernelRadius,
				0,
				64,
			),
			minDistance,
			maxDistance: numberOrDefault(
				ssao.values.maxDistance ?? ssao.values.max_distance,
				defaults.ssao.maxDistance,
				minDistance,
				1,
			),
		},
		halftone: {
			enabled: halftone.enabled,
			shape: integerOrDefault(
				halftone.values.shape,
				defaults.halftone.shape,
				1,
				4,
			),
			radius: numberOrDefault(
				halftone.values.radius,
				defaults.halftone.radius,
				1,
				25,
			),
			rotateR: numberOrDefault(
				halftone.values.rotateR ?? halftone.values.rotate_r,
				defaults.halftone.rotateR,
				0,
				Math.PI * 2,
			),
			rotateG: numberOrDefault(
				halftone.values.rotateG ?? halftone.values.rotate_g,
				defaults.halftone.rotateG,
				0,
				Math.PI * 2,
			),
			rotateB: numberOrDefault(
				halftone.values.rotateB ?? halftone.values.rotate_b,
				defaults.halftone.rotateB,
				0,
				Math.PI * 2,
			),
			scatter: numberOrDefault(
				halftone.values.scatter,
				defaults.halftone.scatter,
				0,
				1,
			),
			blending: numberOrDefault(
				halftone.values.blending,
				defaults.halftone.blending,
				0,
				1,
			),
			blendingMode: integerOrDefault(
				halftone.values.blendingMode ?? halftone.values.blending_mode,
				defaults.halftone.blendingMode,
				1,
				5,
			),
			greyscale: booleanOrDefault(
				halftone.values.greyscale ?? halftone.values.grayscale,
				defaults.halftone.greyscale,
			),
		},
		filmGrain: {
			enabled: filmGrain.enabled,
			intensity: numberOrDefault(
				filmGrain.values.intensity,
				defaults.filmGrain.intensity,
				0,
				1,
			),
			grayscale: booleanOrDefault(
				filmGrain.values.grayscale ?? filmGrain.values.greyscale,
				defaults.filmGrain.grayscale,
			),
		},
	};
};

export const normalizeGeneralConfig = (
	config: Record<string, any> = {},
): GeneralConfig => {
	const rendering = config.rendering ?? {};
	const shadowMap = rendering.shadowMap ?? rendering.shadow_map ?? {};
	const postProcessing =
		rendering.postProcessing ??
		rendering.post_processing ??
		rendering.postprocessing ??
		{};
	const developmentMode =
		config.developmentMode ?? config.development_mode ?? {};

	return {
		rendering: {
			antialiasing: booleanOrDefault(
				rendering.antialiasing,
				DEFAULT_GENERAL_CONFIG.rendering.antialiasing,
			),
			toneMapping: normalizeToneMappingMode(
				rendering.toneMapping ?? rendering.tone_mapping,
			),
			resolution: normalizeResolutionScale(rendering.resolution),
			shadowMap: {
				enabled: booleanOrDefault(
					shadowMap.enabled,
					DEFAULT_GENERAL_CONFIG.rendering.shadowMap.enabled,
				),
				type: normalizeShadowMapMode(shadowMap.type),
			},
			postProcessing: normalizePostProcessingConfig(postProcessing),
		},
		developmentMode: {
			enabled: booleanOrDefault(
				developmentMode.enabled,
				DEFAULT_GENERAL_CONFIG.developmentMode.enabled,
			),
		},
	};
};

export const normalizeCardGeneralConfig = (
	config: Record<string, any> = {},
): CardGeneralConfig => {
	const normalized = normalizeGeneralConfig(config);

	return {
		rendering: {
			antialiasing: normalized.rendering.antialiasing,
			resolution: normalized.rendering.resolution,
			shadowMap: normalized.rendering.shadowMap,
		},
		developmentMode: normalized.developmentMode,
	};
};

export const normalizeSpaceGeneralConfig = (
	config: Record<string, any> = {},
): SpaceGeneralConfig => {
	const normalized = normalizeGeneralConfig(config);

	return {
		rendering: {
			toneMapping: normalized.rendering.toneMapping,
			postProcessing: normalized.rendering.postProcessing,
		},
	};
};

export const mergeGeneralConfig = (
	cardConfig: Record<string, any> = {},
	spaceConfig: Record<string, any> = {},
): GeneralConfig => {
	const card = normalizeCardGeneralConfig(cardConfig);
	const space = normalizeSpaceGeneralConfig(spaceConfig);

	return {
		rendering: {
			...card.rendering,
			...space.rendering,
		},
		developmentMode: card.developmentMode,
	};
};

export const normalizeSpaceConfiguration = (
	config: Record<string, any> = {},
): SpaceConfiguration => ({
	general: normalizeSpaceGeneralConfig(config.general ?? {}),
	scene: normalizeSpaceSceneConfig(config.scene ?? config.spaceScene ?? {}),
});

export const hasSpaceGeneralConfiguration = (config: unknown): boolean => {
	if (!config || typeof config !== "object") {
		return false;
	}

	const value = config as Record<string, unknown>;
	const general =
		value.general && typeof value.general === "object"
			? (value.general as Record<string, unknown>)
			: value;
	const rendering =
		general.rendering && typeof general.rendering === "object"
			? (general.rendering as Record<string, unknown>)
			: {};

	return [
		rendering.toneMapping,
		rendering.tone_mapping,
		rendering.postProcessing,
		rendering.post_processing,
		rendering.postprocessing,
	].some((entry) => entry !== undefined);
};

export const hasCardGeneralConfiguration = (config: unknown): boolean => {
	if (!config || typeof config !== "object") {
		return false;
	}

	const value = config as Record<string, unknown>;
	const general =
		value.general && typeof value.general === "object"
			? (value.general as Record<string, unknown>)
			: value;
	const rendering =
		general.rendering && typeof general.rendering === "object"
			? (general.rendering as Record<string, unknown>)
			: {};

	return [
		rendering.antialiasing,
		rendering.resolution,
		rendering.shadowMap,
		rendering.shadow_map,
		general.developmentMode,
		general.development_mode,
	].some((entry) => entry !== undefined);
};

export const hasSceneConfiguration = (config: unknown): boolean => {
	if (!config || typeof config !== "object") {
		return false;
	}

	const value = config as Record<string, unknown>;
	return Boolean(value.scene || value.spaceScene);
};
