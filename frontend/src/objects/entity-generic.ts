import {Color} from "three/src/math/Color.js";

import {resolveEntityIconPath} from "../utils/icon-utils.js";
import {EntityObject} from "./entity-object.js";
import {CSSText} from "./helpers/css-text.js";
import {IconSprite} from "./helpers/icon-sprite.js";

/**
 * Generic entity implementation used to represent entities of type that are not supported or have no specific interaction.
 */
export class EntityGeneric extends EntityObject {
	/**
	 * Icon of the binary entity.
	 */
	private icon: IconSprite;

	/**
	 * Label of the entity.
	 */
	private label: CSSText;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		const iconPath = resolveEntityIconPath(entityId, entity?.attributes?.icon);

		this.icon = new IconSprite(iconPath, new Color(0x1e90ff), 0.64);
		this.icon.internal = true;
		this.icon.position.y = 0.32;
		this.add(this.icon);

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

		this.icon.setIcon(
			resolveEntityIconPath(this.entityId, entity?.attributes?.icon),
		);
	}
}
