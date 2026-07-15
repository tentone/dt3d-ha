import type {Color, Light} from "three";
import {Group, MathUtils, PointLight, RectAreaLight, SpotLight} from "three";
import {RectAreaLightUniformsLib} from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";

RectAreaLightUniformsLib.init();

export type LightSourceType = "point" | "spot" | "rect-area";

export type LightSourceSettings = {
	type: LightSourceType;
	color: string;
	intensity: number;
	distance: number;
	decay: number;
	angle: number;
	penumbra: number;
	width: number;
	height: number;
	castsShadows: boolean;
	shadowBias: number;
	enabled: boolean;
};

const DEFAULT_SETTINGS: LightSourceSettings = {
	type: "point",
	color: "#ffffff",
	intensity: 1,
	distance: 10,
	decay: 2,
	angle: 45,
	penumbra: 0,
	width: 1,
	height: 1,
	castsShadows: true,
	shadowBias: -0.0001,
	enabled: true,
};

const finiteNumber = (
	value: unknown,
	fallback: number,
	min?: number,
	max?: number,
): number => {
	const parsed = Number(value);
	let normalized = Number.isFinite(parsed) ? parsed : fallback;
	if (min != null) normalized = Math.max(min, normalized);
	if (max != null) normalized = Math.min(max, normalized);

	return normalized;
};

const normalizeColor = (value: unknown, fallback: string): string => (
	typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
		? value
		: fallback
);

const normalizeType = (value: unknown, fallback: LightSourceType): LightSourceType => {
	if (value === "point" || value === "spot" || value === "rect-area") {
		return value;
	}

	return fallback;
};

/** Owns and hot-swaps the concrete Three.js light used by an editor object. */
export class LightSource extends Group {
	public internal = true;

	private settings: LightSourceSettings;

	private light: PointLight | SpotLight | RectAreaLight;

	public constructor(settings: Partial<LightSourceSettings> = {}) {
		super();
		this.settings = this.normalizeSettings(settings, DEFAULT_SETTINGS);
		this.rebuildLight();
	}

	public get sourceType(): LightSourceType {
		return this.settings.type;
	}

	public set sourceType(value: LightSourceType) {
		const normalized = normalizeType(value, this.settings.type);
		if (normalized === this.settings.type) return;
		this.settings.type = normalized;
		this.rebuildLight();
	}

	public get color(): Color {
		return this.light.color;
	}

	public setColor(value: string): void {
		this.settings.color = normalizeColor(value, this.settings.color);
		this.light.color.set(this.settings.color);
	}

	public get enabled(): boolean {
		return this.settings.enabled;
	}

	public set enabled(value: boolean) {
		this.settings.enabled = Boolean(value);
		this.light.visible = this.settings.enabled;
	}

	public get intensity(): number {
		return this.settings.intensity;
	}

	public set intensity(value: number) {
		this.settings.intensity = finiteNumber(value, this.settings.intensity, 0);
		this.light.intensity = this.settings.intensity;
	}

	public get distance(): number {
		return this.settings.distance;
	}

	public set distance(value: number) {
		this.settings.distance = finiteNumber(value, this.settings.distance, 0);
		if (this.light instanceof PointLight || this.light instanceof SpotLight) {
			this.light.distance = this.settings.distance;
		}
	}

	public get decay(): number {
		return this.settings.decay;
	}

	public set decay(value: number) {
		this.settings.decay = finiteNumber(value, this.settings.decay, 0);
		if (this.light instanceof PointLight || this.light instanceof SpotLight) {
			this.light.decay = this.settings.decay;
		}
	}

	public get angle(): number {
		return this.settings.angle;
	}

	public set angle(value: number) {
		this.settings.angle = finiteNumber(value, this.settings.angle, 1, 90);
		if (this.light instanceof SpotLight) {
			this.light.angle = MathUtils.degToRad(this.settings.angle);
		}
	}

	public get penumbra(): number {
		return this.settings.penumbra;
	}

	public set penumbra(value: number) {
		this.settings.penumbra = finiteNumber(value, this.settings.penumbra, 0, 1);
		if (this.light instanceof SpotLight) {
			this.light.penumbra = this.settings.penumbra;
		}
	}

	public get width(): number {
		return this.settings.width;
	}

	public set width(value: number) {
		this.settings.width = finiteNumber(value, this.settings.width, 0.01);
		if (this.light instanceof RectAreaLight) {
			this.light.width = this.settings.width;
		}
	}

	public get height(): number {
		return this.settings.height;
	}

	public set height(value: number) {
		this.settings.height = finiteNumber(value, this.settings.height, 0.01);
		if (this.light instanceof RectAreaLight) {
			this.light.height = this.settings.height;
		}
	}

	public get castsShadows(): boolean {
		return this.settings.castsShadows;
	}

	public set castsShadows(value: boolean) {
		this.settings.castsShadows = Boolean(value);
		this.applyShadowSettings();
	}

	public get shadowBias(): number {
		return this.settings.shadowBias;
	}

	public set shadowBias(value: number) {
		this.settings.shadowBias = finiteNumber(value, this.settings.shadowBias);
		this.applyShadowSettings();
	}

	public applySettings(settings: Partial<LightSourceSettings>): void {
		const previousType = this.settings.type;
		this.settings = this.normalizeSettings(settings, this.settings);
		if (this.settings.type !== previousType) {
			this.rebuildLight();
			return;
		}

		this.applySettingsToLight();
	}

	public getSettings(): LightSourceSettings {
		return {...this.settings, color: `#${this.light.color.getHexString()}`};
	}

	public dispose(): void {
		this.disposeLight(this.light);
		this.clear();
	}

	private normalizeSettings(
		settings: Partial<LightSourceSettings>,
		fallback: LightSourceSettings,
	): LightSourceSettings {
		return {
			type: normalizeType(settings.type, fallback.type),
			color: normalizeColor(settings.color, fallback.color),
			intensity: finiteNumber(settings.intensity, fallback.intensity, 0),
			distance: finiteNumber(settings.distance, fallback.distance, 0),
			decay: finiteNumber(settings.decay, fallback.decay, 0),
			angle: finiteNumber(settings.angle, fallback.angle, 1, 90),
			penumbra: finiteNumber(settings.penumbra, fallback.penumbra, 0, 1),
			width: finiteNumber(settings.width, fallback.width, 0.01),
			height: finiteNumber(settings.height, fallback.height, 0.01),
			castsShadows: settings.castsShadows ?? fallback.castsShadows,
			shadowBias: finiteNumber(settings.shadowBias, fallback.shadowBias),
			enabled: settings.enabled ?? fallback.enabled,
		};
	}

	private rebuildLight(): void {
		if (this.light) {
			this.remove(this.light);
			if (this.light instanceof SpotLight) {
				this.remove(this.light.target);
			}
			this.disposeLight(this.light);
		}

		switch (this.settings.type) {
			case "spot": {
				const light = new SpotLight();
				light.target.position.set(0, 0, -1);
				light.target.internal = true;
				this.add(light.target);
				this.light = light;
				break;
			}
			case "rect-area":
				this.light = new RectAreaLight();
				break;
			case "point":
			default:
				this.light = new PointLight();
				break;
		}

		this.light.internal = true;
		this.add(this.light);
		this.applySettingsToLight();
	}

	private applySettingsToLight(): void {
		this.light.color.set(this.settings.color);
		this.light.intensity = this.settings.intensity;
		this.light.visible = this.settings.enabled;

		if (this.light instanceof PointLight || this.light instanceof SpotLight) {
			this.light.distance = this.settings.distance;
			this.light.decay = this.settings.decay;
		}
		if (this.light instanceof SpotLight) {
			this.light.angle = MathUtils.degToRad(this.settings.angle);
			this.light.penumbra = this.settings.penumbra;
		}
		if (this.light instanceof RectAreaLight) {
			this.light.width = this.settings.width;
			this.light.height = this.settings.height;
		}

		this.applyShadowSettings();
	}

	private applyShadowSettings(): void {
		if (this.light instanceof PointLight || this.light instanceof SpotLight) {
			this.light.castShadow = this.settings.castsShadows;
			this.light.shadow.bias = this.settings.shadowBias;
		}
	}

	private disposeLight(light: Light): void {
		if (light instanceof PointLight || light instanceof SpotLight) {
			light.shadow.map?.dispose();
		}
	}
}
