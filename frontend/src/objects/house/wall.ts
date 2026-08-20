import type {ColorRepresentation, Object3D, Vector3} from "three";
import {
	BoxGeometry,
	BufferGeometry,
	Color,
	CylinderGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
} from "three";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {markObjectInternal} from "../../utils/internal-object.js";
import type {DTInteractionEvent} from "../dt-object.js";
import {DTObject} from "../dt-object.js";
import {CSSText} from "../helpers/css-text.js";
import {DoorObject} from "./door.js";
import {GateObject} from "./gate.js";
import {WindowObject} from "./window.js";

type WallDimensions = {
	length: number;
	height: number;
	thickness: number;
};

export type WallCustomization = {
	connectionShape: WallConnectionShape;
	baseboardEnabled: boolean;
	baseboardHeight: number;
	baseboardDepth: number;
	baseboardColor: string;
};

export type WallConnectionShape = "rectangle" | "circle";

const DEFAULT_WALL_DIMENSIONS: WallDimensions = {
	length: 2,
	height: 2.4,
	thickness: 0.2,
};

const DEFAULT_WALL_COLOR = 0xc9c7c2;

const DEFAULT_WALL_CUSTOMIZATION: WallCustomization = {
	connectionShape: "rectangle",
	baseboardEnabled: false,
	baseboardHeight: 0.12,
	baseboardDepth: 0.018,
	baseboardColor: "#f2f0e9",
};

export class WallObject extends DTObject {
	private static connectionShapeRevisionCounter = 0;

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

	/** Shape used by junctions connected to this wall. */
	public connectionShape: WallConnectionShape;

	/** Lets the most recently created or edited wall define a shared junction. */
	public connectionShapeRevision: number;

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
	 * This mesh's geometry is updated when doors/windows/gates are added/removed.
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
	 * Count of gates added to this wall.
	 */
	private gateCount = 0;

	/**
	 * Label with the length of the wall.
	 */
	private lengthLabel: CSSText | null = null;

	/**
	 * Signature of the last openings configuration.
	 *
	 * Used to track changes and update geometry only when needed.
	 */
	private lastOpeningsSignature = "";

	private baseboardGroup: Group;

	private baseboardMaterial: MeshStandardMaterial;

	private connectionGroup: Group;

	private startConnectionInset = 0;

	private endConnectionInset = 0;

	constructor(
		dimensions: Partial<WallDimensions> = {},
		color: ColorRepresentation = DEFAULT_WALL_COLOR,
		customization: Partial<WallCustomization> = {},
	) {
		super();

		this.length = dimensions.length ?? DEFAULT_WALL_DIMENSIONS.length;
		this.height = dimensions.height ?? DEFAULT_WALL_DIMENSIONS.height;
		this.thickness = dimensions.thickness ?? DEFAULT_WALL_DIMENSIONS.thickness;
		this.connectionShape =
			customization.connectionShape === "circle" ? "circle" : "rectangle";
		this.connectionShapeRevision = ++WallObject.connectionShapeRevisionCounter;
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
		this.wallMesh = markObjectInternal(
			new Mesh(new BoxGeometry(1, 1, 1), material),
		);
		this.wallMesh.name = "Wall Body";
		this.wallMesh.userData.wallPart = "body";
		this.wallMesh.userData.ownerMaterialTarget = true;
		this.add(this.wallMesh);

		this.baseboardGroup = markObjectInternal(new Group());
		this.baseboardGroup.name = "Wall Baseboard";
		this.baseboardGroup.userData.wallPart = "baseboard";
		this.add(this.baseboardGroup);
		this.baseboardMaterial = new MeshStandardMaterial({
			color: this.baseboardColor,
		});
		this.connectionGroup = markObjectInternal(new Group());
		this.connectionGroup.name = "Wall Connections";
		this.connectionGroup.userData.wallPart = "connection";
		this.add(this.connectionGroup);
		this.addEventListener("removed", () => {
			// Removing a parent does not dispatch `removed` to CSS3D descendants,
			// so explicitly detach the wall label from the renderer's DOM.
			this.lengthLabel?.element.remove();
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
		if (attribute === "connectionShape") {
			if (value !== "rectangle" && value !== "circle") return false;
			this.connectionShape = value;
			this.connectionShapeRevision = ++WallObject.connectionShapeRevisionCounter;
			return true;
		}
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
			connectionShape: this.connectionShape,
			baseboardEnabled: this.baseboardEnabled,
			baseboardHeight: this.baseboardHeight,
			baseboardDepth: this.baseboardDepth,
			baseboardColor: this.baseboardColor,
		};
	}

	/**
	 * Keep the wall cut-outs in sync when an opening is attached directly.
	 *
	 * Saved scenes are rebuilt by creating every object first and restoring the parent/child hierarchy afterwards. Rebuilding here ensures a reloaded wall is updated as soon as each saved opening is reattached, without depending on a later render-frame update.
	 */
	public override add(...objects: Object3D[]): this {
		super.add(...objects);
		if (
			this.wallMesh &&
			objects.some(
				(object) =>
					object instanceof DoorObject ||
					object instanceof WindowObject ||
					object instanceof GateObject,
			)
		) {
			this.updateGeometry();
		}
		return this;
	}

	/**
	 * Restore the solid wall immediately when an opening is removed or moved to another wall. The per-frame signature check remains as a fallback for opening dimension and transform changes.
	 */
	public override remove(...objects: Object3D[]): this {
		const removesOpening = objects.some(
			(object) =>
				object instanceof DoorObject ||
				object instanceof WindowObject ||
				object instanceof GateObject,
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
			this.lengthLabel = markObjectInternal(new CSSText(labelText));
			this.add(this.lengthLabel);
		} else {
			this.lengthLabel.setText(labelText);
		}

		this.lengthLabel.position.set(0, this.height + 0.2, 0);
		this.lengthLabel.visible = true;
	}

	/** Shorten the rectangular wall body by half its thickness at shared endpoints. */
	public setConnectedEndpoints(startConnected: boolean, endConnected: boolean): void {
		const startInset = startConnected ? this.thickness / 2 : 0;
		const endInset = endConnected ? this.thickness / 2 : 0;
		if (
			Math.abs(this.startConnectionInset - startInset) <= 1e-9 &&
			Math.abs(this.endConnectionInset - endInset) <= 1e-9
		) {
			return;
		}
		this.startConnectionInset = startInset;
		this.endConnectionInset = endInset;
		this.updateGeometry();
	}

	/** Remove all derived junction meshes owned by this wall. */
	public clearJunctionConnections(): void {
		for (const child of [...this.connectionGroup.children]) {
			if (child instanceof Mesh) {
				child.geometry.dispose();
			}
			this.connectionGroup.remove(child);
		}
	}

	/** Add one separately rendered junction at a logical wall endpoint. */
	public addJunctionConnection(
		endpoint: "start" | "end",
		shape: WallConnectionShape,
		size: number,
		height: number,
	): void {
		if (size <= 0 || height <= 0) {
			return;
		}
		const geometry =
			shape === "circle"
				? new CylinderGeometry(size / 2, size / 2, height, 32)
				: new BoxGeometry(size, height, size);
		const mesh = markObjectInternal(new Mesh(geometry, this.wallMesh.material));
		mesh.name = `${shape === "circle" ? "Circular" : "Rectangular"} Wall Connection`;
		mesh.userData.wallPart = "connection";
		mesh.castShadow = this.wallMesh.castShadow;
		mesh.receiveShadow = this.wallMesh.receiveShadow;
		mesh.position.set(
			endpoint === "start" ? -this.length / 2 : this.length / 2,
			height / 2,
			0,
		);
		this.connectionGroup.add(mesh);

		if (this.baseboardEnabled && this.baseboardHeight > 0) {
			const decorationSize = size + this.baseboardDepth * 2;
			const decorationGeometry =
				shape === "circle"
					? new CylinderGeometry(
						decorationSize / 2,
						decorationSize / 2,
						this.baseboardHeight,
						32,
					)
					: new BoxGeometry(
						decorationSize,
						this.baseboardHeight,
						decorationSize,
					);
			const decoration = markObjectInternal(
				new Mesh(decorationGeometry, this.baseboardMaterial),
			);
			decoration.name = "Wall Connection Baseboard";
			decoration.userData.wallPart = "baseboard";
			decoration.castShadow = this.wallMesh.castShadow;
			decoration.receiveShadow = this.wallMesh.receiveShadow;
			decoration.position.set(
				endpoint === "start" ? -this.length / 2 : this.length / 2,
				this.baseboardHeight / 2,
				0,
			);
			this.connectionGroup.add(decoration);
		}
	}

	/** Show the current wall length only while the pointer is over the wall. */
	public override onInteraction(event: DTInteractionEvent): void {
		if (event.type === "pointerenter") {
			this.updateLabel();
		} else if (event.type === "pointerleave" && this.lengthLabel) {
			this.lengthLabel.visible = false;
		}
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
	 * Add a gate to the wall. Its initial panel height matches the wall, while
	 * its structural cut-out remains full-height if the panel is resized.
	 *
	 * @param wallOffset - Position along the wall's local X axis.
	 */
	public addGate(wallOffset = 0): GateObject {
		this.gateCount += 1;
		const gate = new GateObject({
			width: Math.min(2.4, this.length),
			height: this.height,
		});
		gate.name = `Gate ${this.gateCount}`;
		gate.position.x = this.clampOpeningOffset(wallOffset, gate.width);
		gate.position.y = 0;
		this.add(gate);
		return gate;
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
			this.gateCount = source.gateCount;
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
					child === source.connectionGroup ||
					child.internal === true
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
		const bodyBounds = this.getBodyBounds();
		const floorOpeningIntervals = this.children
			.filter(
				(child): child is DoorObject | GateObject =>
					child instanceof DoorObject || child instanceof GateObject,
			)
			.filter((opening) => opening.position.y <= this.baseboardHeight)
			.map((opening) => ({
				left: Math.max(
					bodyBounds.left,
					opening.position.x - opening.width / 2,
				),
				right: Math.min(
					bodyBounds.right,
					opening.position.x + opening.width / 2,
				),
			}))
			.sort((a, b) => a.left - b.left);

		const segments: Array<{left: number; right: number}> = [];
		let cursor = bodyBounds.left;
		for (const interval of floorOpeningIntervals) {
			if (interval.left > cursor) {
				segments.push({left: cursor, right: interval.left});
			}
			cursor = Math.max(cursor, interval.right);
		}
		if (cursor < bodyBounds.right) {
			segments.push({left: cursor, right: bodyBounds.right});
		}

		const depth = this.thickness + this.baseboardDepth * 2;
		for (const segment of segments) {
			const width = segment.right - segment.left;
			if (width <= 0.001) continue;
			const mesh = markObjectInternal(
				new Mesh(
					new BoxGeometry(width, this.baseboardHeight, depth),
					this.baseboardMaterial,
				),
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
	 * Unlike a polygon hole, a cell layout remains valid when a door touches the floor or an opening reaches a wall edge. Every cell uses the wall's full depth, so even a very thin door/window always cuts through the wall.
	 */
	private createWallGeometry(): BufferGeometry {
		const epsilon = 1e-6;
		const {left: bodyLeft, right: bodyRight} = this.getBodyBounds();
		const openings = this.getOpenings()
			.map(({width, height, x, y}) => ({
				left: Math.max(bodyLeft, x - width / 2),
				right: Math.min(bodyRight, x + width / 2),
				bottom: Math.max(0, y - height / 2),
				top: Math.min(this.height, y + height / 2),
			}))
			.filter(
				({left, right, bottom, top}) =>
					right - left > epsilon && top - bottom > epsilon,
			);
		const xBoundaries = [
			bodyLeft,
			bodyRight,
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

	private getBodyBounds(): {left: number; right: number} {
		const halfLength = this.length / 2;
		const totalInset = this.startConnectionInset + this.endConnectionInset;
		if (totalInset < this.length - 1e-6) {
			return {
				left: -halfLength + this.startConnectionInset,
				right: halfLength - this.endConnectionInset,
			};
		}
		const midpointOffset =
			(this.startConnectionInset - this.endConnectionInset) / 2;
		return {
			left: midpointOffset - 5e-7,
			right: midpointOffset + 5e-7,
		};
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
			if (child instanceof GateObject) {
				openings.push({
					width: child.width,
					// The visible gate panel may be shorter than its wall, but the
					// structural opening always continues through the wall top.
					height: this.height,
					x: child.position.x,
					y: this.height / 2,
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
		return `${this.length}|${this.height}|${this.thickness}|${this.startConnectionInset}|${this.endConnectionInset}|${this.baseboardEnabled}|${this.baseboardHeight}|${this.baseboardDepth}|${parts.join(";")}`;
	}
}
