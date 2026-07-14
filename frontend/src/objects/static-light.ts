import {mdiLightbulbOffOutline, mdiLightbulbOnOutline} from "@mdi/js";
import type {BufferGeometry, Color, Material, Object3D, Texture} from "three";
import {PointLight} from "three";

import type {DTInteractionEvent} from "./dt-object.js";
import {DTObject} from "./dt-object.js";
import {IconSprite} from "./helpers/icon-sprite.js";
import {TextSprite} from "./helpers/text-sprite.js";

const STATIC_LIGHT_OBJECT_TYPE = "static-light";
const DEFAULT_COLOR = "#ffffff";

export type StaticLightSettings = {
	color: string;
	decay: number;
	distance: number;
	enabled: boolean;
	intensity: number;
	castsShadows: boolean;
	shadowBias: number;
};

const finiteNumber = (value: unknown, fallback: number, min?: number): number => {
	const parsed = Number(value);
	const normalized = Number.isFinite(parsed) ? parsed : fallback;

	return min == null ? normalized : Math.max(min, normalized);
};

const normalizeColor = (value: unknown): string => (
	typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value)
		? value
		: DEFAULT_COLOR
);

/**
 * A scene-owned point light that is independent from Home Assistant entities.
 * The wrapper supplies a selectable editor marker while the internal PointLight
 * provides the actual illumination.
 */
export class StaticLightObject extends DTObject {
	private readonly icon: IconSprite;

	private readonly label: TextSprite;

	private readonly light: PointLight;

	private isEnabled = true;

	public constructor(settings: Partial<StaticLightSettings> = {}) {
		super();

		this.name = "Static Light";
		this.userData.objectInstanceType = STATIC_LIGHT_OBJECT_TYPE;

		const color = normalizeColor(settings.color);
		this.light = new PointLight(
			color,
			finiteNumber(settings.intensity, 1, 0),
			finiteNumber(settings.distance, 10, 0),
			finiteNumber(settings.decay, 2, 0),
		);
		this.light.internal = true;
		this.add(this.light);

		this.icon = new IconSprite(mdiLightbulbOnOutline, color, 0.42);
		this.icon.internal = true;
		this.icon.position.y = 0.16;
		this.add(this.icon);

		this.label = new TextSprite(this.name, 44, {
			background: "rgba(14, 22, 34, 0.82)",
			borderRadius: 6,
			color: "#ffffff",
			fontWeight: "600",
			padding: 7,
		});
		this.label.internal = true;
		this.label.position.y = 0.5;
		this.label.visible = false;
		this.add(this.label);

		this.castsShadows = settings.castsShadows ?? true;
		this.shadowBias = finiteNumber(settings.shadowBias, -0.0001);
		this.enabled = settings.enabled ?? true;
	}

	public get color(): Color {
		return this.light.color;
	}

	public setColor(value: string): void {
		const color = normalizeColor(value);
		this.light.color.set(color);
		this.icon.setColor(color);
	}

	public get enabled(): boolean {
		return this.isEnabled;
	}

	public set enabled(value: boolean) {
		this.isEnabled = Boolean(value);
		this.light.visible = this.isEnabled;
		this.icon.setIcon(
			this.isEnabled ? mdiLightbulbOnOutline : mdiLightbulbOffOutline,
		);
	}

	public get intensity(): number {
		return this.light.intensity;
	}

	public set intensity(value: number) {
		this.light.intensity = finiteNumber(value, this.light.intensity, 0);
	}

	public get distance(): number {
		return this.light.distance;
	}

	public set distance(value: number) {
		this.light.distance = finiteNumber(value, this.light.distance, 0);
	}

	public get decay(): number {
		return this.light.decay;
	}

	public set decay(value: number) {
		this.light.decay = finiteNumber(value, this.light.decay, 0);
	}

	public get castsShadows(): boolean {
		return this.light.castShadow;
	}

	public set castsShadows(value: boolean) {
		this.light.castShadow = Boolean(value);
	}

	public get shadowBias(): number {
		return this.light.shadow.bias;
	}

	public set shadowBias(value: number) {
		this.light.shadow.bias = finiteNumber(value, this.light.shadow.bias);
	}

	public getSettings(): StaticLightSettings {
		return {
			color: `#${this.color.getHexString()}`,
			decay: this.decay,
			distance: this.distance,
			enabled: this.enabled,
			intensity: this.intensity,
			castsShadows: this.castsShadows,
			shadowBias: this.shadowBias,
		};
	}

	public override onInteraction(event: DTInteractionEvent): void {
		this.label.setText(this.name || "Static Light");
		this.label.visible = event.type === "pointerenter";
	}

	public override dispose(): void {
		this.light.shadow.map?.dispose();
		this.traverse((child: Object3D) => {
			const material = (child as any).material as Material | Material[] | undefined;
			const geometry = (child as any).geometry as BufferGeometry | undefined;
			geometry?.dispose();

			const materials = Array.isArray(material) ? material : material ? [material] : [];
			for (const item of materials) {
				const map = "map" in item ? item.map as Texture | null : null;
				map?.dispose();
				item.dispose();
			}
		});
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		const settings = source.getSettings();
		this.setColor(settings.color);
		this.intensity = settings.intensity;
		this.distance = settings.distance;
		this.decay = settings.decay;
		this.castsShadows = settings.castsShadows;
		this.shadowBias = settings.shadowBias;
		this.enabled = settings.enabled;
		this.label.setText(this.name || "Static Light");
		this.userData.objectInstanceType = STATIC_LIGHT_OBJECT_TYPE;

		if (recursive) {
			for (const child of source.children) {
				if (child.internal === true) {
					continue;
				}
				this.add(child.clone());
			}
		}

		return this;
	}
}
