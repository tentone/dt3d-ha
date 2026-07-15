import {mdiLightbulbOffOutline, mdiLightbulbOnOutline} from "@mdi/js";
import type {BufferGeometry, Color, Material, Object3D, Texture} from "three";

import type {DTInteractionEvent} from "./dt-object.js";
import {DTObject} from "./dt-object.js";
import {IconSprite} from "./helpers/icon-sprite.js";
import {TextSprite} from "./helpers/text-sprite.js";
import type {LightSourceSettings, LightSourceType} from "./light-source.js";
import {LightSource} from "./light-source.js";

const STATIC_LIGHT_OBJECT_TYPE = "static-light";

/** A scene-owned light with a selectable editor marker. */
export class StaticLightObject extends DTObject {
	private readonly icon: IconSprite;

	private readonly label: TextSprite;

	private readonly lightSource: LightSource;

	public constructor(settings: Partial<LightSourceSettings> = {}) {
		super();
		this.name = "Static Light";
		this.userData.objectInstanceType = STATIC_LIGHT_OBJECT_TYPE;

		this.lightSource = new LightSource(settings);
		this.add(this.lightSource);

		this.icon = new IconSprite(
			settings.enabled === false ? mdiLightbulbOffOutline : mdiLightbulbOnOutline,
			this.lightSource.color.getHex(),
			0.42,
		);
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
	}

	public get sourceType(): LightSourceType {return this.lightSource.sourceType;}
	public set sourceType(value: LightSourceType) {this.lightSource.sourceType = value;}
	public get color(): Color {return this.lightSource.color;}
	public setColor(value: string): void {this.lightSource.setColor(value); this.icon.setColor(value);}
	public get enabled(): boolean {return this.lightSource.enabled;}
	public set enabled(value: boolean) {
		this.lightSource.enabled = value;
		this.icon.setIcon(value ? mdiLightbulbOnOutline : mdiLightbulbOffOutline);
	}
	public get intensity(): number {return this.lightSource.intensity;}
	public set intensity(value: number) {this.lightSource.intensity = value;}
	public get distance(): number {return this.lightSource.distance;}
	public set distance(value: number) {this.lightSource.distance = value;}
	public get decay(): number {return this.lightSource.decay;}
	public set decay(value: number) {this.lightSource.decay = value;}
	public get angle(): number {return this.lightSource.angle;}
	public set angle(value: number) {this.lightSource.angle = value;}
	public get penumbra(): number {return this.lightSource.penumbra;}
	public set penumbra(value: number) {this.lightSource.penumbra = value;}
	public get width(): number {return this.lightSource.width;}
	public set width(value: number) {this.lightSource.width = value;}
	public get height(): number {return this.lightSource.height;}
	public set height(value: number) {this.lightSource.height = value;}
	public get castsShadows(): boolean {return this.lightSource.castsShadows;}
	public set castsShadows(value: boolean) {this.lightSource.castsShadows = value;}
	public get shadowBias(): number {return this.lightSource.shadowBias;}
	public set shadowBias(value: number) {this.lightSource.shadowBias = value;}

	public getLightSettings(): LightSourceSettings {
		return this.lightSource.getSettings();
	}

	public override onInteraction(event: DTInteractionEvent): void {
		this.label.setText(this.name || "Static Light");
		this.label.visible = event.type === "pointerenter";
	}

	public override dispose(): void {
		this.lightSource.dispose();
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
		this.lightSource.applySettings(source.getLightSettings());
		this.icon.setColor(this.color.getHex());
		this.icon.setIcon(this.enabled ? mdiLightbulbOnOutline : mdiLightbulbOffOutline);
		this.label.setText(this.name || "Static Light");
		this.userData.objectInstanceType = STATIC_LIGHT_OBJECT_TYPE;

		if (recursive) {
			for (const child of source.children) {
				if (child.internal === true) continue;
				this.add(child.clone());
			}
		}
		return this;
	}
}
