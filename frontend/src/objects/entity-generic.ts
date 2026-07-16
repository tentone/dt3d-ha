import {EntityObject} from "./entity-object.js";
import {CircleIconSprite} from "./helpers/circle-icon-sprite.js";
import {CSSText} from "./helpers/css-text.js";

/**
 * Generic entity implementation used to represent entities of type that are not supported or have no specific interaction.
 */
export class EntityGeneric extends EntityObject {
	public label: CSSText;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		const icon = new CircleIconSprite(0x1e90ff, 0.4);
		icon.internal = true;
		icon.position.y = 0.2;
		this.add(icon);

		const friendlyName = this.friendlyName(entity);

		this.label = new CSSText(friendlyName);
		this.label.internal = true;
		this.label.position.y = 0.55;
		this.setHoverLabel(this.label);
		this.add(this.label);

		this.setEntity(entity);
	}

	protected updateFromEntity(entity: any): void {
		this.label.setText(this.friendlyName(entity));
	}
}
