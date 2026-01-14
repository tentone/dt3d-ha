import { CircleIconSprite } from "./helpers/circle-icon-sprite.js";
import { EntityObject } from "./entity-object.js";
import { TextSprite } from "./helpers/text-sprite.js";
import type { DTInteractionEvent } from "./dt-object.js";

/**
 * Generic entity implementation used to represent entities of type that are not supported or have no specific interaction.
 */
export class EntityGeneric extends EntityObject {
	public label: TextSprite;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		const icon = new CircleIconSprite(0x1e90ff, 0.2);
		icon.internal = true;
		icon.position.y = 0.1;
		this.add(icon);

		const friendlyName = this.friendlyName(entity);

		this.label = new TextSprite(friendlyName);
		this.label.internal = true;
		this.label.position.y = 0.45;
		this.add(this.label);

		this.setEntity(entity);
	}

	protected updateFromEntity(entity: any): void {}

	public onInteraction(_event: DTInteractionEvent): void {
		console.log("DT3D: Interaction with entity", _event);

		this.label.visible = _event.type === 'pointerenter';
	}
}
