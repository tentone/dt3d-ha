import type {Object3D, Vector3} from "three";
import {
	BoxGeometry,
	BufferGeometry,
	Color,
	Group,
	Mesh,
	MeshStandardMaterial,
} from "three";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {DTObject} from "../dt-object.js";
import {TextSprite} from "../helpers/text-sprite.js";
import {DoorObject} from "./door.js";
import {WindowObject} from "./window.js";

type WallDimensions = {
	length: number;
	height: number;
	thickness: number;
};

export type WallCustomization = {
	baseboardEnabled: boolean;
	baseboardHeight: number;
	baseboardDepth: number;
	baseboardColor: string;
};

const DEFAULT_WALL_DIMENSIONS: WallDimensions = {
	length: 2,
	height: 2.4,
	thickness: 0.2,
};

const DEFAULT_WALL_COLOR = 0xc9c7c2;

const DEFAULT_WALL_CUSTOMIZATION: WallCustomization = {
	baseboardEnabled: false,
	baseboardHeight: 0.12,
	baseboardDepth: 0.018,
	baseboardColor: "#f2f0e9",
};

export class WallObject extends DTObject {
	/**
	 * Length of the wall in meters.
	 */
	public length: number;

	/**
	 * Height of the wall in meters.
	 */
	public height: number;

	/**
	 * Thickness of the wall in meters.
	 */
	public thickness: number;

	/**
	 * Whether decorative trim is rendered along the bottom of the wall.
	 */
	public baseboardEnabled: boolean;

	public baseboardHeight: number;

	public baseboardDepth: number;

	public baseboardColor: string;

	/**
	 * Mesh to represent the wall.
	 *
	 * This mesh's geometry is updated when doors/windows are added/removed.
	 */
	public wallMesh: Mesh;

	/**
	 * Count of doors added to this wall.
	 */
	private doorCount = 0;

	/**
	 * Count of windows added to this wall.
	 */
	private windowCount = 0;

	/**
	 * Label with the length of the wall.
	 */
	private lengthLabel: TextSprite | null = null;

	/**
	 * Signature of the last openings configuration.
	 *
	 * Used to track changes and update geometry only when needed.
	 */
	private lastOpeningsSignature = "";

	private baseboardGroup: Group;

	private baseboardMaterial: MeshStandardMaterial;

	constructor(
		dimensions: Partial<WallDimensions> = {},
		color = DEFAULT_WALL_COLOR,
		customization: Partial<WallCustomization> = {},
	) {
		super();

		this.length = dimensions.length ?? DEFAULT_WALL_DIMENSIONS.length;
		this.height = dimensions.height ?? DEFAULT_WALL_DIMENSIONS.height;
		this.thickness = dimensions.thickness ?? DEFAULT_WALL_DIMENSIONS.thickness;
		this.baseboardEnabled =
			customization.baseboardEnabled ??
			DEFAULT_WALL_CUSTOMIZATION.baseboardEnabled;
		this.baseboardHeight =
			customization.baseboardHeight ??
			DEFAULT_WALL_CUSTOMIZATION.baseboardHeight;
		this.baseboardDepth =
			customization.baseboardDepth ?? DEFAULT_WALL_CUSTOMIZATION.baseboardDepth;
		this.baseboardColor =
			customization.baseboardColor ?? DEFAULT_WALL_CUSTOMIZATION.baseboardColor;

		this.name = "Wall";
		this.userData.meshType = "wall";

		const material = new MeshStandardMaterial({color});
		this.wallMesh = new Mesh(new BoxGeometry(1, 1, 1), material);
		this.wallMesh.name = "Wall Body";
		this.wallMesh.userData.wallPart = "body";
		this.add(this.wallMesh);

		this.baseboardGroup = new Group();
		this.baseboardGroup.name = "Wall Baseboard";
		this.baseboardGroup.userData.wallPart = "baseboard";
		(this.baseboardGroup as any).internal = true;
		this.add(this.baseboardGroup);
		this.baseboardMaterial = new MeshStandardMaterial({
			color: this.baseboardColor,
		});

		this.updateGeometry();
	}

	/**
	 * Change wall to fit between two points.
	 *
	 * These points must ideally be at the same height (y coordinate).
	 *
	 * @param start - Starting point
	 * @param end - Ending point
	 */
	public setFromPoints(start: Vector3, end: Vector3): void {
		const direction = end.clone().sub(start);
		const length = Math.hypot(direction.x, direction.z);
		if (length <= 0) {
			return;
		}

		const midpoint = start.clone().add(end).multiplyScalar(0.5);
		this.position.set(midpoint.x, start.y, midpoint.z);

		const angle = Math.atan2(direction.z, direction.x);
		this.rotation.set(0, -angle, 0);

		this.length = length;
		this.updateGeometry();
	}

	/**
	 * Change the height of the wall.
	 *
	 * @param height - New height in meters
	 */
	public setHeight(height: number): void {
		if (!Number.isFinite(height) || height <= 0) {
			return;
		}

		this.height = height;
		this.updateGeometry();
	}

	/**
	 * Change the thickness of the wall.
	 *
	 * @param thickness - New thickness in meters
	 */
	public setThickness(thickness: number): void {
		if (!Number.isFinite(thickness) || thickness <= 0) {
			return;
		}

		this.thickness = thickness;
		this.updateGeometry();
	}

	public setConfiguration(attribute: string, value: unknown): boolean {
		if (attribute === "height" || attribute === "thickness") {
			const number = Number(value);
			if (!Number.isFinite(number) || number <= 0) return false;
			if (attribute === "height") {
				this.setHeight(number);
			} else {
				this.setThickness(number);
			}
			return true;
		}
		if (attribute === "baseboardEnabled") {
			this.baseboardEnabled = Boolean(value);
			this.updateBaseboardGeometry();
			return true;
		}
		if (attribute === "baseboardColor") {
			if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
				return false;
			}
			this.baseboardColor = value;
			this.updateBaseboardGeometry();
			return true;
		}
		if (attribute === "baseboardHeight" || attribute === "baseboardDepth") {
			const number = Number(value);
			if (!Number.isFinite(number) || number < 0) return false;
			this[attribute] = number;
			this.updateBaseboardGeometry();
			return true;
		}
		return false;
	}

	public getCustomization(): WallCustomization {
		return {
			baseboardEnabled: this.baseboardEnabled,
			baseboardHeight: this.baseboardHeight,
			baseboardDepth: this.baseboardDepth,
			baseboardColor: this.baseboardColor,
		};
	}

	/**
	 * Keep the wall cut-outs in sync when an opening is attached directly.
	 *
	 * Saved scenes are rebuilt by creating every object first and restoring the
	 * parent/child hierarchy afterwards. Rebuilding here ensures a reloaded wall
	 * is updated as soon as each saved door or window is reattached, without
	 * depending on a later render-frame update.
	 */
	public override add(...objects: Object3D[]): this {
		super.add(...objects);
		if (
			this.wallMesh &&
			objects.some(
				(object) =>
					object instanceof DoorObject || object instanceof WindowObject,
			)
		) {
			this.updateGeometry();
		}
		return this;
	}

	/**
	 * Restore the solid wall immediately when an opening is removed or moved to
	 * another wall. The per-frame signature check remains as a fallback for
	 * opening dimension and transform changes.
	 */
	public override remove(...objects: Object3D[]): this {
		const removesOpening = objects.some(
			(object) =>
				object instanceof DoorObject || object instanceof WindowObject,
		);
		super.remove(...objects);
		if (this.wallMesh && removesOpening) {
			this.updateGeometry();
		}
		return this;
	}

	/**
	 * Update label with the length of the wall.
	 */
	public updateLabel(): void {
		const labelText = `${this.length.toFixed(2)}m`;
		if (!this.lengthLabel) {
			this.lengthLabel = new TextSprite(labelText);
			this.lengthLabel.scale.setScalar(0.25);
			(this.lengthLabel as any).internal = true;
			this.add(this.lengthLabel);
		} else {
			this.lengthLabel.setText(labelText);
		}

		this.lengthLabel.position.set(0, this.height + 0.2, 0);
	}

	/**
	 * Add a door to the wall.
	 *
	 * @param wallOffset - Position along the wall's local X axis.
	 */
	public addDoor(wallOffset = 0): DoorObject {
		this.doorCount += 1;
		const door = new DoorObject();
		door.name = `Door ${this.doorCount}`;
		door.position.x = this.clampOpeningOffset(wallOffset, door.width);
		door.position.y = 0;
		this.add(door);
		return door;
	}

	/**
	 * Add a window to the wall.
	 *
	 * @param wallOffset - Position along the wall's local X axis.
	 */
	public addWindow(wallOffset = 0): WindowObject {
		this.windowCount += 1;
		const window = new WindowObject();
		window.name = `Window ${this.windowCount}`;
		window.position.x = this.clampOpeningOffset(wallOffset, window.width);
		window.position.y = 1.2;
		this.add(window);
		return window;
	}

	/**
	 * Update the wall geometry if the openings configuration has changed.
	 *
	 * Check the signature of the current openings and compare it to the last known signature.
	 *
	 * @param _time - Frame time (not used).
	 */
	public override update(_time: number): void {
		const signature = this.getOpeningsSignature();
		if (signature !== this.lastOpeningsSignature) {
			this.updateGeometry();
		}
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		if (source instanceof WallObject) {
			this.length = source.length;
			this.height = source.height;
			this.thickness = source.thickness;
			this.doorCount = source.doorCount;
			this.windowCount = source.windowCount;
			Object.assign(this, source.getCustomization());
			this.wallMesh.material = Array.isArray(source.wallMesh.material)
				? source.wallMesh.material.map((material) => material.clone())
				: source.wallMesh.material.clone();
		}

		if (recursive) {
			for (const child of source.children) {
				if (
					child === source.wallMesh ||
					child === source.baseboardGroup ||
					(child as any).internal === true
				) {
					continue;
				}
				this.add(child.clone(true));
			}
		}
		this.updateGeometry();
		return this;
	}

	private updateGeometry(): void {
		const geometry = this.createWallGeometry();
		this.wallMesh.geometry.dispose();
		this.wallMesh.geometry = geometry;
		this.wallMesh.position.set(0, 0, 0);
		if (this.lengthLabel) {
			this.lengthLabel.position.set(0, this.height + 0.2, 0);
		}
		this.updateBaseboardGeometry();
		this.lastOpeningsSignature = this.getOpeningsSignature();
	}

	private updateBaseboardGeometry(): void {
		for (const child of [...this.baseboardGroup.children]) {
			if (child instanceof Mesh) {
				child.geometry.dispose();
			}
			this.baseboardGroup.remove(child);
		}
		this.baseboardGroup.visible = this.baseboardEnabled;
		if (!this.baseboardEnabled || this.baseboardHeight <= 0) {
			return;
		}

		this.baseboardMaterial.color = new Color(this.baseboardColor);
		const doorIntervals = this.children
			.filter((child): child is DoorObject => child instanceof DoorObject)
			.filter((door) => door.position.y <= this.baseboardHeight)
			.map((door) => ({
				left: Math.max(-this.length / 2, door.position.x - door.width / 2),
				right: Math.min(this.length / 2, door.position.x + door.width / 2),
			}))
			.sort((a, b) => a.left - b.left);

		const segments: Array<{left: number; right: number}> = [];
		let cursor = -this.length / 2;
		for (const interval of doorIntervals) {
			if (interval.left > cursor) {
				segments.push({left: cursor, right: interval.left});
			}
			cursor = Math.max(cursor, interval.right);
		}
		if (cursor < this.length / 2) {
			segments.push({left: cursor, right: this.length / 2});
		}

		const depth = this.thickness + this.baseboardDepth * 2;
		for (const segment of segments) {
			const width = segment.right - segment.left;
			if (width <= 0.001) continue;
			const mesh = new Mesh(
				new BoxGeometry(width, this.baseboardHeight, depth),
				this.baseboardMaterial,
			);
			mesh.position.set(
				(segment.left + segment.right) / 2,
				this.baseboardHeight / 2,
				0,
			);
			this.baseboardGroup.add(mesh);
		}
	}

	/**
	 * Build the wall from solid rectangular cells around every opening.
	 *
	 * Unlike a polygon hole, a cell layout remains valid when a door touches
	 * the floor or an opening reaches a wall edge. Every cell uses the wall's
	 * full depth, so even a very thin door/window always cuts through the wall.
	 */
	private createWallGeometry(): BufferGeometry {
		const epsilon = 1e-6;
		const halfLength = this.length / 2;
		const openings = this.getOpenings()
			.map(({width, height, x, y}) => ({
				left: Math.max(-halfLength, x - width / 2),
				right: Math.min(halfLength, x + width / 2),
				bottom: Math.max(0, y - height / 2),
				top: Math.min(this.height, y + height / 2),
			}))
			.filter(
				({left, right, bottom, top}) =>
					right - left > epsilon && top - bottom > epsilon,
			);
		const xBoundaries = [
			-halfLength,
			halfLength,
			...openings.flatMap(({left, right}) => [left, right]),
		]
			.sort((left, right) => left - right)
			.filter(
				(value, index, values) =>
					index === 0 || value - values[index - 1] > epsilon,
			);
		const cells: BoxGeometry[] = [];

		const addCell = (
			left: number,
			right: number,
			bottom: number,
			top: number,
		): void => {
			if (right - left <= epsilon || top - bottom <= epsilon) {
				return;
			}
			const geometry = new BoxGeometry(
				right - left,
				top - bottom,
				this.thickness,
			);
			geometry.translate((left + right) / 2, (bottom + top) / 2, 0);
			cells.push(geometry);
		};

		for (let index = 0; index < xBoundaries.length - 1; index += 1) {
			const left = xBoundaries[index];
			const right = xBoundaries[index + 1];
			const blockedIntervals = openings
				.filter(
					(opening) =>
						opening.left < right - epsilon &&
						opening.right > left + epsilon,
				)
				.map(({bottom, top}) => ({bottom, top}))
				.sort((first, second) => first.bottom - second.bottom);
			let solidStart = 0;

			for (const interval of blockedIntervals) {
				if (interval.bottom > solidStart + epsilon) {
					addCell(left, right, solidStart, interval.bottom);
				}
				solidStart = Math.max(solidStart, interval.top);
				if (solidStart >= this.height - epsilon) {
					break;
				}
			}
			if (solidStart < this.height - epsilon) {
				addCell(left, right, solidStart, this.height);
			}
		}

		if (cells.length === 0) {
			return new BufferGeometry();
		}
		if (cells.length === 1) {
			return cells[0];
		}

		const geometry = mergeGeometries(cells);
		for (const cell of cells) {
			cell.dispose();
		}
		return geometry;
	}

	private clampOpeningOffset(offset: number, width: number): number {
		const maximumOffset = Math.max(0, (this.length - width) / 2);
		return Math.min(maximumOffset, Math.max(-maximumOffset, offset));
	}

	private getOpenings(): Array<{
		width: number;
		height: number;
		x: number;
		y: number;
	}> {
		const openings: Array<{
			width: number;
			height: number;
			x: number;
			y: number;
		}> = [];
		for (const child of this.children) {
			if (child instanceof DoorObject) {
				openings.push({
					width: child.width,
					height: child.height,
					x: child.position.x,
					y: child.position.y + child.height / 2,
				});
			}
			if (child instanceof WindowObject) {
				openings.push({
					width: child.width,
					height: child.height,
					x: child.position.x,
					y: child.position.y + child.height / 2,
				});
			}
		}
		return openings;
	}

	/**
	 * Signature of the opening configuration (doors, windows, etc)
	 *
	 * Used to easily trackn changes to the wall config.
	 *
	 * @returns - Signature
	 */
	private getOpeningsSignature(): string {
		const parts = this.getOpenings().map((opening) =>
			[opening.width, opening.height, opening.x, opening.y].join(","),
		);
		return `${this.length}|${this.height}|${this.thickness}|${this.baseboardEnabled}|${this.baseboardHeight}|${this.baseboardDepth}|${parts.join(";")}`;
	}
}
