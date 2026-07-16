import {mdiLightbulb} from "@mdi/js";
import {Color} from "three";

import {resolveHaIconPath} from "../utils/icon-utils.js";
import {EntityObject} from "./entity-object.js";
import {CSSText} from "./helpers/css-text.js";
import {IconSprite} from "./helpers/icon-sprite.js";
import type {LightSourceSettings, LightSourceType} from "./light-source.js";
import {LightSource} from "./light-source.js";

export class EntityLight extends EntityObject {
	private icon: IconSprite;

	/** Configurable light source used to illuminate the scene. */
	private lightSource: LightSource;

	/**
	 * Label with name of the entity.
	 */
	private label: CSSText;

	public constructor(
		entityId: string,
		entity: any,
		settings: Partial<LightSourceSettings> = {},
	) {
		super(entityId);

		const color = EntityLight.getLightColor(entity);
		this.icon = new IconSprite(
			EntityLight.getIconPath(entity),
			color.getHex(),
			0.5,
		);
		this.icon.internal = true;
		this.icon.position.y = 0.25;
		this.add(this.icon);

		this.lightSource = new LightSource({distance: 6, ...settings});
		this.lightSource.position.y = 0.6;
		this.add(this.lightSource);

		const friendlyName = this.friendlyName(entity);

		this.label = new CSSText(friendlyName);
		this.label.internal = true;
		this.label.position.y = 0.68;
		this.setHoverLabel(this.label);
		this.add(this.label);

		this.setEntity(entity);
	}

	/**
	 * Update the color of the light based on entity value.
	 *
	 * @param entity
	 */
	protected updateFromEntity(entity: any): void {
		const color = EntityLight.getLightColor(entity);
		this.icon.setColor(color.getHex());
		this.icon.setIcon(EntityLight.getIconPath(entity));

		this.lightSource.setColor(`#${color.getHexString()}`);
		this.lightSource.enabled = entity.state === "on";

		const friendlyName = entity.attributes?.friendly_name ?? this.name;
		this.label.setText(friendlyName);
	}

	public get sourceType(): LightSourceType {return this.lightSource.sourceType;}
	public set sourceType(value: LightSourceType) {this.lightSource.sourceType = value;}
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

	public setLightSettings(settings: Partial<LightSourceSettings>): void {
		this.lightSource.applySettings(settings);
		const entity = this.getEntity();
		if (entity) this.updateFromEntity(entity);
	}

	public getLightSettings(): LightSourceSettings {
		return this.lightSource.getSettings();
	}

	public override dispose(): void {
		this.lightSource.dispose();
	}

	/**
	 * Get the entity light color.
	 *
	 * @param entity - Entity to get light color from.
	 * @returns Color object.
	 */
	public static getLightColor(entity: any): Color {
		const rgbColor = entity.attributes?.rgb_color;
		if (Array.isArray(rgbColor) && rgbColor.length === 3) {
			return new Color(rgbColor[0] / 255, rgbColor[1] / 255, rgbColor[2] / 255);
		}

		const hsColor = entity.attributes?.hs_color;
		if (Array.isArray(hsColor) && hsColor.length === 2) {
			const color = new Color();
			color.setHSL(hsColor[0] / 360, hsColor[1] / 100, 0.5);
			return color;
		}

		return new Color(entity.state === "on" ? 0xffffaa : 0x555555);
	}

	private static getIconPath(entity: any): string {
		return resolveHaIconPath(entity?.attributes?.icon, mdiLightbulb);
	}

	/**
	 * Toggle the switch, called on click.
	 *
	 * @param hass - HA data
	 */
	public async toggle(hass: any): Promise<void> {
		if (!hass?.callService) {
			console.warn("DT3D: Unable to toggle light; hass instance not available",);
			return;
		}

		try {
			await hass.callService("light", "toggle", {
				entity_id: this.entityId,
			});
		} catch (error) {
			console.error(`DT3D: Failed to toggle light ${this.entityId}`, error);
		}
	}
}
