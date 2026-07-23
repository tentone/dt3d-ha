import {resolveEntityIconPath} from "../utils/icon-utils.js";
import {EntityObject} from "./entity-object.js";
import {CSSText} from "./helpers/css-text.js";
import {IconSprite} from "./helpers/icon-sprite.js";

const SENSOR_REFRESH_INTERVAL_MS = 5000;

/**
 * Creates a entity sensor representation.
 */
export class EntitySensor extends EntityObject {
	public label: CSSText;

	private icon: IconSprite;

	private lastVisualUpdate = 0;

	private pendingEntity: any = null;

	private refreshTimer: number | null = null;

	public constructor(entityId: string, entity: any) {
		super(entityId);

		this.icon = new IconSprite(
			EntitySensor.getIconPath(entity),
			EntitySensor.getStateColor(entity?.state),
			0.4,
			EntitySensor.getReading(entity),
		);
		this.icon.internal = true;
		this.icon.position.y = 0.2;
		this.add(this.icon);

		this.label = new CSSText("Loading\n...");
		this.label.internal = true;
		this.label.position.y = 0.55;
		this.setHoverLabel(this.label);
		this.add(this.label);

		this.setEntity(entity);
	}

	/**
	 * Updates the sensor state.
	 *
	 * @param entity - The entity data.
	 */
	protected updateFromEntity(entity: any): void {
		this.pendingEntity = entity;

		const elapsed = Date.now() - this.lastVisualUpdate;
		if (elapsed >= SENSOR_REFRESH_INTERVAL_MS) {
			this.refreshVisuals();
			return;
		}

		if (this.refreshTimer === null) {
			this.refreshTimer = window.setTimeout(() => {
				this.refreshTimer = null;
				this.refreshVisuals();
			}, SENSOR_REFRESH_INTERVAL_MS - elapsed);
		}
	}

	public override dispose(): void {
		if (this.refreshTimer !== null) {
			window.clearTimeout(this.refreshTimer);
			this.refreshTimer = null;
		}
		this.pendingEntity = null;
	}

	private refreshVisuals(): void {
		const entity = this.pendingEntity;
		if (!entity) {
			return;
		}

		this.pendingEntity = null;
		this.lastVisualUpdate = Date.now();

		const friendlyName = this.friendlyName(entity);
		const reading = EntitySensor.getReading(entity);
		const labelText = `${friendlyName}\n${reading}`;
		this.label.setText(labelText);

		this.icon.setAppearance(
			EntitySensor.getIconPath(entity),
			EntitySensor.getStateColor(entity.state),
			reading,
		);
	}

	private static getReading(entity: any): string {
		const state = String(entity?.state ?? "unknown");
		const unit = entity?.attributes?.unit_of_measurement;

		return typeof unit === "string" && unit.trim()
			? `${state} ${unit.trim()}`
			: state;
	}

	private static getIconPath(entity: any): string {
		return resolveEntityIconPath("sensor", entity?.attributes?.icon);
	}

	private static getStateColor(state?: string): number {
		return state === "unavailable" ? 0x808080 : 0x1e90ff;
	}
}
