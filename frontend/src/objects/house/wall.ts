import {
	BoxGeometry,
	ExtrudeGeometry,
	Mesh,
	MeshStandardMaterial,
	Path,
	Shape,
	Vector3,
} from "three";
import { DTObject } from "../dt-object.js";
import { CSSText } from "../helpers/css-text.js";
import { getCSSVar } from "../../utils/css-utils.js";
import { DoorObject } from "./door.js";
import { WindowObject } from "./window.js";
import { TextSprite } from "../helpers/text-sprite.js";

type WallDimensions = {
	length: number;
	height: number;
	thickness: number;
};

const DEFAULT_WALL_DIMENSIONS: WallDimensions = {
	length: 2,
	height: 2.4,
	thickness: 0.2,
};

const DEFAULT_WALL_COLOR = 0xc9c7c2;

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
	 * Mesh to represent the wall.
	 * 
	 * This mesh's geometry is updated when doors/windows are added/removed.
	 */
	private wallMesh: Mesh;
	
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

	constructor(dimensions: Partial<WallDimensions> = {}, color = DEFAULT_WALL_COLOR) {
		super();

		this.length = dimensions.length ?? DEFAULT_WALL_DIMENSIONS.length;
		this.height = dimensions.height ?? DEFAULT_WALL_DIMENSIONS.height;
		this.thickness = dimensions.thickness ?? DEFAULT_WALL_DIMENSIONS.thickness;

		this.name = "Wall";
		this.userData.meshType = "wall";

		const material = new MeshStandardMaterial({ color });
		this.wallMesh = new Mesh(new BoxGeometry(1, 1, 1), material);
		this.wallMesh.name = "Wall Body";
		this.wallMesh.userData.wallPart = "body";
		this.add(this.wallMesh);

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
		const length = start.distanceTo(end);

		const midpoint = start.clone().add(end).multiplyScalar(0.5);
		this.position.set(midpoint.x, start.y, midpoint.z);

		const direction = end.clone().sub(start);
		const angle = Math.atan2(direction.z, direction.x);
		this.rotation.set(0, angle, 0);

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
	 */
	public addDoor(): DoorObject {
		this.doorCount += 1;
		const door = new DoorObject();
		door.name = `Door ${this.doorCount}`;
		door.position.y = door.height / 2;
		this.add(door);
		this.updateGeometry();
		return door;
	}

	/**
	 * Add a window to the wall.
	 */
	public addWindow(): WindowObject {
		this.windowCount += 1;
		const window = new WindowObject();
		window.name = `Window ${this.windowCount}`;
		window.position.y = 1.2 + window.height / 2;
		this.add(window);
		this.updateGeometry();
		return window;
	}
	
	/**
	 * Get the material used for the wall mesh.
	 */
	public getWallMaterial(): MeshStandardMaterial {
		return this.wallMesh.material as MeshStandardMaterial;
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
		super.copy(source, recursive);
		if (source instanceof WallObject) {
			this.length = source.length;
			this.height = source.height;
			this.thickness = source.thickness;
			this.doorCount = source.doorCount;
			this.windowCount = source.windowCount;
		}

		const mesh = this.getObjectByProperty(
			"userData.wallPart",
			"body",
		) as Mesh | null;
		if (mesh) {
			this.wallMesh = mesh;
			this.updateGeometry();
		}
		return this;
	}

	private updateGeometry(): void {
		const shape = this.createWallShape();
		const geometry = new ExtrudeGeometry(shape, {
			depth: this.thickness,
			bevelEnabled: false,
		});
		geometry.translate(0, 0, -this.thickness / 2);
		this.wallMesh.geometry.dispose();
		this.wallMesh.geometry = geometry;
		this.wallMesh.position.set(0, 0, 0);
		if (this.lengthLabel) {
			this.lengthLabel.position.set(0, this.height + 0.2, 0);
		}
		this.lastOpeningsSignature = this.getOpeningsSignature();
	}

	private createWallShape(): Shape {
		const halfLength = this.length / 2;
		const shape = new Shape();
		shape.moveTo(-halfLength, 0);
		shape.lineTo(halfLength, 0);
		shape.lineTo(halfLength, this.height);
		shape.lineTo(-halfLength, this.height);
		shape.lineTo(-halfLength, 0);

		for (const opening of this.getOpenings()) {
			const { width, height, x, y } = opening;
			const left = x - width / 2;
			const right = x + width / 2;
			const bottom = y - height / 2;
			const top = y + height / 2;
			const hole = new Path();
			hole.moveTo(left, bottom);
			hole.lineTo(right, bottom);
			hole.lineTo(right, top);
			hole.lineTo(left, top);
			hole.lineTo(left, bottom);
			shape.holes.push(hole);
		}

		return shape;
	}

	private getOpenings(): Array<{ width: number; height: number; x: number; y: number }> {
		const openings: Array<{ width: number; height: number; x: number; y: number }> = [];
		for (const child of this.children) {
			if (child instanceof DoorObject) {
				openings.push({
					width: child.width,
					height: child.height,
					x: child.position.x,
					y: child.position.y,
				});
			}
			if (child instanceof WindowObject) {
				openings.push({
					width: child.width,
					height: child.height,
					x: child.position.x,
					y: child.position.y,
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
		return `${this.length}|${this.height}|${this.thickness}|${parts.join(";")}`;
	}
}
