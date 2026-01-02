import { TextSDF } from "./helpers/text-sdf.js";
import { CircleIconSprite } from "./helpers/circle-icon-sprite.js";
import { EntityObject } from "./entity-object.js";
import { TextSprite } from "./helpers/text-sprite.js";

/**
 * Generic entity implementation used to represent entities of type that are not supported or have no specific interaction.
 */
export class EntityGeneric extends EntityObject {
	public label: TextSDF;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		const icon = new CircleIconSprite(0x1e90ff, 0.2);
		icon.position.y = 0.1;
		this.add(icon);

		this.label = new TextSprite();
		this.label.position.y = 0.45;
		this.add(this.label);

		this.setEntity(entity);
	}
}
