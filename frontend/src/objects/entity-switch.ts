import {mdiToggleSwitch, mdiToggleSwitchOff} from "@mdi/js";

import {resolveHaIconPath} from "../utils/icon-utils.js";
import {EntityObject} from "./entity-object.js";
import {CSSText} from "./helpers/css-text.js";
import {IconSprite} from "./helpers/icon-sprite.js";

export class EntitySwitch extends EntityObject {
	public label: CSSText;
	private icon: IconSprite;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		this.icon = new IconSprite(
			EntitySwitch.getIconPath(entity),
			EntitySwitch.getStateColor(entity?.state),
			0.44,
		);
		this.icon.internal = true;
		this.icon.position.y = 0.22;
		this.add(this.icon);

		this.label = new CSSText("Loading\n...");
		this.label.internal = true;
		this.label.position.y = 0.58;
		this.setHoverLabel(this.label);
		this.add(this.label);

		this.setEntity(entity);
	}

	protected updateFromEntity(entity: any): void {
		const friendlyName = this.friendlyName(entity);
		const labelText = `${friendlyName}\n${entity.state}`;
		this.label.setText(labelText);

		this.icon.setColor(EntitySwitch.getStateColor(entity.state));
		this.icon.setIcon(EntitySwitch.getIconPath(entity));
	}

	/**
	 * Toggle the switch, called on click.
	 *
	 * @param hass - HA data
	 */
	public async toggle(hass: any): Promise<void> {
		if (!hass?.callService) {
			console.warn("DT3D: Unable to toggle switch; hass instance not available",);
			return;
		}

		try {
			await hass.callService("switch", "toggle", {
				entity_id: this.entityId,
			});
		} catch (error) {
			console.error(`DT3D: Failed to toggle switch ${this.entityId}`, error);
		}
	}

	private static getIconPath(entity: any): string {
		const fallbackIcon =
			entity?.state === "on" ? mdiToggleSwitch : mdiToggleSwitchOff;
		return resolveHaIconPath(entity?.attributes?.icon, fallbackIcon);
	}

	private static getStateColor(state?: string): number {
		if (state === "unavailable") {
			return 0x808080;
		}

		return state === "on" ? 0x00ff7f : 0x555555;
	}
}
