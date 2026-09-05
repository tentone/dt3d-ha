import type {Object3D} from "three";

import type {EntityActionOverride} from "../editor/entity-actions.js";
import type {DTInteractionEvent} from "./dt-object.js";
import {DTObject} from "./dt-object.js";
import {EntityMissingIndicator} from "./entity-missing-indicator.js";

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

	/** Warning marker displayed in place of the normal entity visuals. */
	public readonly missingIndicator: EntityMissingIndicator;

	/** Per-entity action overrides; "default" inherits the card setting. */
	public clickAction: EntityActionOverride = "default";

	public doubleClickAction: EntityActionOverride = "default";

	/**
	 * Entity data.
	 */
	private entityData: any;

	private missing = false;

	/** Visibility of normal direct children before the missing marker replaced them. */
	private readonly visibilityBeforeMissing = new Map<Object3D, boolean>();

	/**
	 * Entity label that is only visible while the entity is hovered.
	 */
	private hoverLabel: Object3D | null = null;

	protected constructor(entityId: string, entity?: any) {
		super();

		this.entityId = entityId;
		this.name = entityId;
		this.missingIndicator = new EntityMissingIndicator();
		this.missingIndicator.visible = false;
		this.add(this.missingIndicator);

		if (entity) {
			this.setEntity(entity);
		}
	}

	public friendlyName(entity: any): string {
		return entity?.attributes?.friendly_name ?? this.name;
	}

	/**
	 * Update the entity data and refresh the visual representation.
	 */
	public setEntity(entity: any): void {
		this.entityData = entity;
		this.setMissing(entity == null);
		if (this.missing) {
			return;
		}
		this.updateFromEntity(entity);
	}

	/** Whether the configured entity is absent from Home Assistant state. */
	public get entityMissing(): boolean {
		return this.missing;
	}

	/**
	 * Retrieve the latest entity state stored on this object.
	 */
	public getEntity(): any {
		return this.entityData;
	}

	public override onInteraction(event: DTInteractionEvent): void {
		if (this.missing) {
			return;
		}
		this.updateHoverLabel(event);
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, recursive);
		this.clickAction = source.clickAction;
		this.doubleClickAction = source.doubleClickAction;
		return this;
	}

	/**
	 * Clone an entity without invoking its constructor with missing entity data.
	 *
	 * Three.js normally clones an Object3D with `new this.constructor()`. Entity constructors require an entity ID and state, so subclasses create a valid instance first. Its constructor already recreates the internal visuals; only user-added children should then be cloned from the source hierarchy.
	 */
	public override clone(recursive: boolean = true): this {
		const clone = this.createEntityClone();
		clone.copy(this, false);

		if (recursive) {
			for (const child of this.children) {
				if ((child as Object3D & {internal?: boolean}).internal) {
					continue;
				}
				clone.add(child.clone(true));
			}
		}

		return clone;
	}

	/**
	 * Construct a valid empty target for clone().
	 */
	protected abstract createEntityClone(): this;

	/**
	 * Register a label to show only while the entity is hovered.
	 *
	 * @param label - Label object to control.
	 */
	protected setHoverLabel(label: Object3D): void {
		this.hoverLabel = label;
		this.hoverLabel.visible = false;
	}

	/** Allow entity implementations to stop state-specific work when missing. */
	protected onEntityMissing(): void {}

	private setMissing(missing: boolean): void {
		if (missing === this.missing) {
			return;
		}

		this.missing = missing;
		this.missingIndicator.visible = missing;

		if (missing) {
			this.visibilityBeforeMissing.clear();
			for (const child of this.children) {
				if (child === this.missingIndicator) {
					continue;
				}
				this.visibilityBeforeMissing.set(child, child.visible);
				child.visible = false;
			}
			this.onEntityMissing();
			return;
		}

		for (const [child, visible] of this.visibilityBeforeMissing) {
			if (child.parent === this) {
				child.visible = visible;
			}
		}
		this.visibilityBeforeMissing.clear();
	}

	private updateHoverLabel(event: DTInteractionEvent): void {
		if (!this.hoverLabel) {
			return;
		}

		if (event.type === "pointerenter") {
			this.hoverLabel.visible = true;
		} else if (event.type === "pointerleave") {
			this.hoverLabel.visible = false;
		}
	}

	/**
	 * Refresh the visuals based on the provided entity data.
	 */
	protected abstract updateFromEntity(entity: any): void;
}
