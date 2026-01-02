import { Object3D } from "three";
import { TextSDF } from "./helpers/text-sdf.js";
import { CircleIconSprite } from "./helpers/circle-icon-sprite.js";
import { EntityObject } from "./entity-object.js";
import type { DTInteractionEvent } from "./dt-object.js";
import { TextSprite } from "./helpers/text-sprite.js";

export class EntitySwitch extends EntityObject {
	public label: TextSDF;
	private icon: Object3D;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		this.icon = this.createIcon(false);
		this.icon.position.y = 0.1;
		this.add(this.icon);

		this.label = new TextSprite("Loading\n...");
		this.label.position.y = 0.45;
		this.add(this.label);

		this.setEntity(entity);
	}

	protected updateFromEntity(entity: any): void {
		const friendlyName = entity.attributes?.friendly_name ?? this.name;
		const labelText = `${friendlyName}\n${entity.state}`;
		this.label.setText(labelText);

		this.refreshIcon(entity.state === "on");
	}

	public onInteraction(event: DTInteractionEvent): void {
		if (event.type === "click") {
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

	/**
	 * Refresh the icon of the switch after its state has been changed.
	 * 
	 * 
	 * @param isOn - State of the switch.
	 */
	private refreshIcon(isOn: boolean): void {
		if (this.icon) {
			this.remove(this.icon);
		}

		this.icon = this.createIcon(isOn);
		this.icon.position.y = 0.1;
		this.add(this.icon);
	}

	private createIcon(isOn: boolean): Object3D {
		const color = isOn ? 0x00ff7f : 0x555555;
		return new CircleIconSprite(color, 0.22);
	}
}
