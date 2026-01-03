import { CircleIconSprite } from "./helpers/circle-icon-sprite.js";
import { EntityObject } from "./entity-object.js";
import { TextSprite } from "./helpers/text-sprite.js";

/**
 * Creates a entity sensor representation.
 */
export class EntitySensor extends EntityObject {
	public label: TextSprite;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		const icon = new CircleIconSprite(0x1e90ff, 0.2);
		icon.position.y = 0.1;
		this.add(icon);

		this.label = new TextSprite("Loading\n...");
		this.label.position.y = 0.45;
		this.add(this.label);

		this.setEntity(entity);
	}

	/**
	 * Updates the sensor state.
	 *
	 * @param entity - The entity data.
	 */
	protected updateFromEntity(entity: any): void {
		const friendlyName = entity.attributes?.friendly_name ?? this.name;
		const labelText = `${friendlyName}\n${entity.state}`;
		this.label.setText(labelText);
	}
}
