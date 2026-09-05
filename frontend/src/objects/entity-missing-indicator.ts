import {mdiAlert} from "@mdi/js";
import {Group} from "three";

import {IconSprite} from "./helpers/icon-sprite.js";

/** Yellow warning marker shown when a configured Home Assistant entity is missing. */
export class EntityMissingIndicator extends Group {
	public constructor() {
		super();

		this.name = "Entity missing";
		this.internal = true;
		this.position.y = 0.32;

		const icon = new IconSprite(mdiAlert, 0xffc107, 0.64);
		icon.internal = true;
		this.add(icon);
	}
}
