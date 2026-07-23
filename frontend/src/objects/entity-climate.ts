import {resolveEntityIconPath} from "../utils/icon-utils.js";
import {EntityObject} from "./entity-object.js";
import {CSSText} from "./helpers/css-text.js";
import {IconSprite} from "./helpers/icon-sprite.js";

/**
 * Home Assistant climate entity representation.
 */
export class EntityClimate extends EntityObject {
	private readonly defaultTemperatureUnit: string;

	private icon: IconSprite;

	private label: CSSText;

	public constructor(
		entityId: string,
		entity: any,
		defaultTemperatureUnit = "°",
	) {
		super(entityId);
		this.defaultTemperatureUnit = defaultTemperatureUnit;

		this.icon = new IconSprite(
			EntityClimate.getIconPath(entity),
			EntityClimate.getModeColor(entity?.state),
			0.5,
			EntityClimate.getTargetTemperature(entity, this.defaultTemperatureUnit),
		);
		this.icon.internal = true;
		this.icon.position.y = 0.25;
		this.add(this.icon);

		this.label = new CSSText("");
		this.label.internal = true;
		this.label.position.y = 0.68;
		this.setHoverLabel(this.label);
		this.add(this.label);

		this.setEntity(entity);
	}

	protected updateFromEntity(entity: any): void {
		const targetTemperature = EntityClimate.getTargetTemperature(
			entity,
			this.defaultTemperatureUnit,
		);
		const mode = EntityClimate.getModeLabel(entity?.state);
		this.label.setText(
			`${this.friendlyName(entity)}\n${mode}${targetTemperature ? ` · ${targetTemperature}` : ""}`,
		);

		this.icon.setAppearance(
			EntityClimate.getIconPath(entity),
			EntityClimate.getModeColor(entity?.state),
			targetTemperature,
		);
	}

	private static getIconPath(entity: any): string {
		return resolveEntityIconPath("climate", entity?.attributes?.icon);
	}

	/**
	 * Use a distinct, recognizable color for each HVAC mode.
	 */
	private static getModeColor(state?: string): number {
		switch (state?.toLowerCase()) {
			case "fan":
			case "fan_only":
				return 0x26c6da;
			case "cool":
			case "cooling":
				return 0x2196f3;
			case "auto":
			case "heat_cool":
				return 0x66bb6a;
			case "heat":
			case "heating":
			case "warm":
				return 0xff7043;
			case "dehumidifier":
			case "dehumidify":
			case "dry":
			case "drying":
				return 0xab47bc;
			case "off":
				return 0x555555;
			case "unavailable":
				return 0x808080;
			default:
				return 0x607d8b;
		}
	}

	private static getModeLabel(state?: string): string {
		switch (state?.toLowerCase()) {
			case "fan":
			case "fan_only":
				return "Fan";
			case "cool":
			case "cooling":
				return "Cool";
			case "auto":
			case "heat_cool":
				return "Auto";
			case "heat":
			case "heating":
			case "warm":
				return "Warm";
			case "dehumidifier":
			case "dehumidify":
			case "dry":
			case "drying":
				return "Dehumidifier";
			case "off":
				return "Off";
			case "unavailable":
				return "Unavailable";
			default:
				return state || "Unknown";
		}
	}

	/**
	 * Format the configured target temperature while climate control is active.
	 */
	private static getTargetTemperature(
		entity: any,
		defaultTemperatureUnit: string,
	): string {
		const state = entity?.state?.toLowerCase();
		if (!state || ["off", "unavailable", "unknown"].includes(state)) {
			return "";
		}

		const attributes = entity?.attributes ?? {};
		const unit =
			typeof attributes.temperature_unit === "string"
				? attributes.temperature_unit.trim()
				: typeof attributes.unit_of_measurement === "string"
					? attributes.unit_of_measurement.trim()
					: defaultTemperatureUnit;
		const suffix = unit.startsWith("°") ? unit : ` ${unit}`;
		const temperature = attributes.temperature ?? attributes.target_temperature;

		if (EntityClimate.isTemperature(temperature)) {
			return `${Number(temperature)}${suffix}`;
		}

		const low = attributes.target_temp_low ?? attributes.target_temperature_low;
		const high =
			attributes.target_temp_high ?? attributes.target_temperature_high;
		if (EntityClimate.isTemperature(low) && EntityClimate.isTemperature(high)) {
			return `${Number(low)}–${Number(high)}${suffix}`;
		}

		return "";
	}

	private static isTemperature(value: unknown): boolean {
		return (
			(typeof value === "number" || typeof value === "string") &&
			String(value).trim() !== "" &&
			Number.isFinite(Number(value))
		);
	}
}
