import {mdiEye} from "@mdi/js";

import {resolveHaIconPath} from "../utils/icon-utils.js";
import {EntityObject} from "./entity-object.js";
import {IconSprite} from "./helpers/icon-sprite.js";
import {TextSprite} from "./helpers/text-sprite.js";

/**
 * Creates a entity sensor representation.
 */
export class EntitySensor extends EntityObject {
	public label: TextSprite;

	private icon: IconSprite;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		this.icon = new IconSprite(
			EntitySensor.getIconPath(entity),
			EntitySensor.getStateColor(entity?.state),
			0.4,
		);
		this.icon.internal = true;
		this.icon.position.y = 0.2;
		this.add(this.icon);

		this.label = new TextSprite("Loading\n...");
		this.label.internal = true;
		this.label.position.y = 0.55;
		this.setHoverLabel(this.label);
		this.add(this.label);

		this.setEntity(entity);
	}

	/**
	 * Updates the sensor state.
	 *
	 * @param entity - The entity data.
	 */
	protected updateFromEntity(entity: any): void {
		const friendlyName = this.friendlyName(entity);
		const labelText = `${friendlyName}\n${entity.state}`;
		this.label.setText(labelText);

		this.icon.setColor(EntitySensor.getStateColor(entity.state));
		this.icon.setIcon(EntitySensor.getIconPath(entity));
	}

	private static getIconPath(entity: any): string {
		return resolveHaIconPath(entity?.attributes?.icon, mdiEye);
	}

	private static getStateColor(state?: string): number {
		return state === "unavailable" ? 0x808080 : 0x1e90ff;
	}
}
