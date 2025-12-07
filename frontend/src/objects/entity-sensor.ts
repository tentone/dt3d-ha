import { Group } from "three";
import { TextSprite } from "./text-sprite.js";
import { CircleIconSprite } from "./circle-icon-sprite.js";

/**
 * Creates a entity sensor representation.
 */
export class EntitySensor extends Group {
    public label: TextSprite;

	public constructor(entityId: string, entity: any) {
		super();
		this.name = entityId;

		const icon = new CircleIconSprite(0x1e90ff, 0.2);
		icon.position.y = 0.1;
		this.add(icon);

		const friendlyName = entity.attributes?.friendly_name ?? entityId;
		const labelText = `${friendlyName}\n${entity.state}`;

		this.label = new TextSprite(labelText);
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
        this.label.material.map.dispose(); 
        this.label.material.map = new TextSprite(labelText).material.map;
        this.label.material.needsUpdate = true; 
    }
}
