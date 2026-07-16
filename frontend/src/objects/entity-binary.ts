import {DEFAULT_HA_ICON, resolveHaIconPath} from "../utils/icon-utils.js";
import {EntityObject} from "./entity-object.js";
import {CSSText} from "./helpers/css-text.js";
import {IconSprite} from "./helpers/icon-sprite.js";

/**
 * Home Assistant binary entity representation.
 */
export class EntityBinary extends EntityObject {
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

		const iconPath = resolveHaIconPath(entity?.attributes?.icon, DEFAULT_HA_ICON);
		const color = EntityBinary.getStateColor(entity?.state);

		this.icon = new IconSprite(iconPath, color, 0.64);
		this.icon.internal = true;
		this.icon.position.y = 0.32;
		this.add(this.icon);

		const friendlyName = this.friendlyName(entity);
		this.label = new CSSText(`${friendlyName}\n${entity.state ?? "unknown"}`);
		this.label.internal = true;
		this.label.position.y = 0.72;
		this.setHoverLabel(this.label);
		this.add(this.label);

		this.setEntity(entity);
	}

	protected updateFromEntity(entity: any): void {
		const friendlyName = this.friendlyName(entity);
		this.label.setText(`${friendlyName}\n${entity.state ?? "unknown"}`);

		this.icon.setColor(EntityBinary.getStateColor(entity.state));
		this.icon.setIcon(resolveHaIconPath(entity.attributes?.icon, DEFAULT_HA_ICON));
	}

	/**
	 * Background color based on binary state.
	 *
	 * @param state - Entity state string.
	 * @returns Color as hex number.
	 */
	private static getStateColor(state?: string): number {
		const isOn =
			state === "on" ||
			state === "open" ||
			state === "detected" ||
			state === "home" ||
			state === "occupied";

		if (state === "unavailable") {
			return 0x808080;
		}

		return isOn ? 0x1e90ff : 0x555555;
	}
}
