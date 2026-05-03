import {DTObject} from "./dt-object.js";

/**
 * Interface for entities that support toggling their state.
 */
export interface Toggleable {
	toggle(hass: any): Promise<void>;
}

/**
 * Type guard to check if an object implements the Toggleable interface.
 *
 * @param obj - Object to check.
 */
export function isToggleable(obj: unknown): obj is Toggleable {
	return typeof (obj as any)?.toggle === "function";
}

/**
 * Base 3D representation for Home Assistant entities.
 */
export abstract class EntityObject extends DTObject {
	/**
	 * ID of the HA entity associated.
	 */
	public readonly entityId: string;

	/**
	 * Entity data.
	 */
	private entityData: any;

	protected constructor(entityId: string, entity?: any) {
		super();

		this.entityId = entityId;
		this.name = entityId;

		if (entity) {
			this.setEntity(entity);
		}
	}

	public friendlyName(entity: any): string {
		return entity.attributes?.friendly_name ?? this.name;
	}

	/**
	 * Update the entity data and refresh the visual representation.
	 */
	public setEntity(entity: any): void {
		this.entityData = entity;
		this.updateFromEntity(entity);
	}

	/**
	 * Retrieve the latest entity state stored on this object.
	 */
	public getEntity(): any {
		return this.entityData;
	}

	/**
	 * Refresh the visuals based on the provided entity data.
	 */
	protected abstract updateFromEntity(entity: any): void;
}
