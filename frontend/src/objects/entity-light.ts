import {mdiLightbulb} from "@mdi/js";
import {Color, PointLight} from "three";

import {resolveHaIconPath} from "../utils/icon-utils.js";
import type {DTInteractionEvent} from "./dt-object.js";
import {EntityObject} from "./entity-object.js";
import {IconSprite} from "./helpers/icon-sprite.js";
import {TextSprite} from "./helpers/text-sprite.js";

export class EntityLight extends EntityObject {
	private icon: IconSprite;

	/**
	 * Point light to represent the light.
	 */
	private light: PointLight;

	/**
	 * Label with name of the entity.
	 */
	private label: TextSprite;

	public constructor(entityId: string, entity: any) {
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

		this.light = new PointLight(0x555555, 0, 6, 2);
		this.light.internal = true;
		this.light.castShadow = true;
		this.light.position.y = 0.6;
		this.add(this.light);

		const friendlyName = this.friendlyName(entity);

		this.label = new TextSprite(friendlyName);
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

		this.light.color = color;
		this.light.intensity = entity.state === "on" ? 1 : 0;

		const friendlyName = entity.attributes?.friendly_name ?? this.name;
		this.label.setText(friendlyName);
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

	public onInteraction(event: DTInteractionEvent): void {
		super.onInteraction(event);

		if (event.type === "dblclick") {
			this.toggle((event as any).hass ?? null);
		}
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
