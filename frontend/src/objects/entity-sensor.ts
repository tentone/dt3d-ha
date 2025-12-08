import { Group } from "three";
import { SdfText } from "./sdf-text.js";
import { CircleIconSprite } from "./circle-icon-sprite.js";

/**
 * Creates a entity sensor representation.
 */
export class EntitySensor extends Group {
    public label: SdfText;

	public constructor(entityId: string, entity: any) {
		super();
		this.name = entityId;

		const icon = new CircleIconSprite(0x1e90ff, 0.2);
		icon.position.y = 0.1;
		this.add(icon);

		const friendlyName = entity.attributes?.friendly_name ?? entityId;
		const labelText = `${friendlyName}\n${entity.state}`;

                this.label = new SdfText(labelText, 0.16);
                this.label.position.y = 0.45;
                this.add(this.label);
	}

    /**
     * Updates the sensor state.
     * 
     * @param entity - The entity data. 
     */
    public updateState(entity: any): void {
        const friendlyName = entity.attributes?.friendly_name ?? this.name;
        const labelText = `${friendlyName}\n${entity.state}`;
        this.label.setText(labelText);
    }
}
