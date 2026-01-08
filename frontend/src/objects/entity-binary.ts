import * as mdiIcons from "@mdi/js";
import { IconSprite } from "./helpers/icon-sprite.js";
import { EntityObject } from "./entity-object.js";
import { TextSprite } from "./helpers/text-sprite.js";

const DEFAULT_ICON = mdiIcons.mdiHelpCircleOutline;

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
	private label: TextSprite;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		const iconPath = EntityBinary.getIconPath(entity?.attributes?.icon);
		const color = EntityBinary.getStateColor(entity?.state);

		this.icon = new IconSprite(iconPath, color, 0.32);
		this.icon.internal = true;
		this.icon.position.y = 0.1;
		this.add(this.icon);

		const friendlyName = this.friendlyName(entity);
		this.label = new TextSprite(`${friendlyName}\n${entity.state ?? "unknown"}`);
		this.label.internal = true;
		this.label.position.y = 0.5;
		this.add(this.label);

		this.setEntity(entity);
	}

	protected updateFromEntity(entity: any): void {
		const friendlyName = this.friendlyName(entity);
		this.label.setText(`${friendlyName}\n${entity.state ?? "unknown"}`);

		this.icon.setColor(EntityBinary.getStateColor(entity.state));
		this.icon.setIcon(EntityBinary.getIconPath(entity.attributes?.icon));
	}

	/**
	 * Map an HA icon string to an MDI path.
	 *
	 * @param icon - Icon name, e.g. "mdi:door".
	 * @returns SVG path data string.
	 */
	private static getIconPath(icon?: string): string {
		if (!icon || typeof icon !== "string") {
			return DEFAULT_ICON;
		}

		const [prefix, name] = icon.split(":");
		if (prefix !== "mdi" || !name) {
			return DEFAULT_ICON;
		}

		const formattedName =
			"mdi" +
			name
				.split("-")
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join("");

		return (mdiIcons as Record<string, string>)[formattedName] ?? DEFAULT_ICON;
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
