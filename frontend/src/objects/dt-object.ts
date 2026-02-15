import {Group} from "three";

/**
 * Possible types of interaction with 3D objects.
 */
export type DTInteractionType =
	| "pointerenter"
	| "pointerleave"
	| "click"
	| "dblclick";

/**
 * Description of the object interaction event.
 */
export interface DTInteractionEvent {
	// Type of interaction
	type: DTInteractionType;

	// Event from the browser
	event: MouseEvent;

	// Home assistant data
	hass?: any;
}

/**
 * Base class for 3D objects with lifecycle hooks and pointer interactions.
 */
export class DTObject extends Group {
	/**
	 * Indicates if the object has been initialized.
	 */
	public initialized: boolean = false;

	/**
	 * Indicates that it is a digital twin object.
	 */
	public isDTObject: boolean = true;

	/**
	 * When true, the object cannot be edited via controls or the inspector.
	 */
	public locked: boolean = false;

	/**
	 * Internal objects are hidden from the object tree and ignored by pointer events.
	 */
	public internal: boolean = false;

	/**
	 * Called once when the object is first added to the scene.
	 */

	public initialize(): void {}

	/**
	 * Called before each render with the current time.
	 */

	public update(_time: number): void {}

	/**
	 * Called to dispose of the object, before removal from the scene).
	 */
	public dispose(): void {}

	/**
	 * Called when the pointer interacts with the object (enter, leave, click, or double click).
	 */

	public onInteraction(_event: DTInteractionEvent): void {}

	/**
	 * Check if object has been initialized, and if not, initialize it.
	 */
	public init(): void {
		if (this.initialized) {
			return;
		}

		this.initialized = true;
		this.initialize();
	}

	/**
	 * Copy the object data from another DTObject, including lock state.
	 */
	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, recursive);
		this.locked = source.locked;
		this.internal = source.internal;
		return this;
	}
}
