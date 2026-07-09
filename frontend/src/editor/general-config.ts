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

export type RenderingConfig = {
	antialiasing: boolean;
	toneMapping: ToneMappingMode;
	resolution: ResolutionScale;
	shadowMap: {
		enabled: boolean;
		type: ShadowMapMode;
	};
};

export type GeneralConfig = {
	rendering: RenderingConfig;
	developmentMode: {
		enabled: boolean;
	};
};

export type SpaceConfiguration = {
	general: GeneralConfig;
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
	},
	developmentMode: {
		enabled: true,
	},
};

export const DEFAULT_SPACE_CONFIGURATION: SpaceConfiguration = {
	general: DEFAULT_GENERAL_CONFIG,
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

export const normalizeGeneralConfig = (
	config: Record<string, any> = {},
): GeneralConfig => {
	const rendering = config.rendering ?? {};
	const shadowMap = rendering.shadowMap ?? rendering.shadow_map ?? {};
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
		},
		developmentMode: {
			enabled: booleanOrDefault(
				developmentMode.enabled,
				DEFAULT_GENERAL_CONFIG.developmentMode.enabled,
			),
		},
	};
};

export const normalizeSpaceConfiguration = (
	config: Record<string, any> = {},
): SpaceConfiguration => ({
	general: normalizeGeneralConfig(config.general ?? {}),
	scene: normalizeSpaceSceneConfig(config.scene ?? config.spaceScene ?? {}),
});

export const hasGeneralConfiguration = (config: unknown): boolean => {
	if (!config || typeof config !== "object") {
		return false;
	}

	const value = config as Record<string, unknown>;
	return Boolean(
		value.general ||
		value.rendering ||
		value.developmentMode ||
		value.development_mode,
	);
};

export const hasSceneConfiguration = (config: unknown): boolean => {
	if (!config || typeof config !== "object") {
		return false;
	}

	const value = config as Record<string, unknown>;
	return Boolean(value.scene || value.spaceScene);
};
