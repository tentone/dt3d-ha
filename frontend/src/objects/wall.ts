import {
	BoxGeometry,
	ExtrudeGeometry,
	Mesh,
	MeshStandardMaterial,
	Path,
	Shape,
	Vector3,
} from "three";
import { DTObject } from "./dt-object.js";
import { CSSText } from "./helpers/css-text.js";
import { getCSSVar } from "../utils/css-utils.js";
import { DoorObject } from "./door.js";
import { WindowObject } from "./window.js";

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
	public length: number;
	public height: number;
	public thickness: number;

	private wallMesh: Mesh;
	private doorCount = 0;
	private windowCount = 0;
	private lengthLabel: CSSText | null = null;
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

	public setFromPoints(start: Vector3, end: Vector3): void {
		const length = start.distanceTo(end);
		this.setLength(length);

		const midpoint = start.clone().add(end).multiplyScalar(0.5);
		this.position.set(midpoint.x, start.y, midpoint.z);

		const direction = end.clone().sub(start);
		const angle = Math.atan2(direction.z, direction.x);
		this.rotation.set(0, angle, 0);
	}

	public setHeight(height: number): void {
		if (!Number.isFinite(height) || height <= 0) {
			return;
		}

		this.height = height;
		this.updateGeometry();
	}

	public setThickness(thickness: number): void {
		if (!Number.isFinite(thickness) || thickness <= 0) {
			return;
		}

		this.thickness = thickness;
		this.updateGeometry();
	}

	public setLength(length: number): void {
		if (!Number.isFinite(length) || length <= 0) {
			return;
		}

		this.length = length;
		this.updateGeometry();
	}

	public updateWallLabel(): void {
		const labelText = `${this.length.toFixed(2)}m`;
		if (!this.lengthLabel) {
			this.lengthLabel = new CSSText(labelText, {
				style: {
					color: getCSSVar("--ha-color-primary-95"),
					backgroundColor: getCSSVar("--ha-color-neutral-20"),
					padding: "2px 6px",
					borderRadius: "6px",
				},
			});
			this.lengthLabel.scale.setScalar(0.25);
			(this.lengthLabel as any).internal = true;
			this.add(this.lengthLabel);
		} else {
			this.lengthLabel.setText(labelText);
		}

		this.lengthLabel.position.set(0, this.height + 0.2, 0);
	}

	public addDoor(): DoorObject {
		this.doorCount += 1;
		const door = new DoorObject();
		door.name = `Door ${this.doorCount}`;
		door.position.y = door.height / 2;
		this.add(door);
		this.updateGeometry();
		return door;
	}

	public addWindow(): WindowObject {
		this.windowCount += 1;
		const window = new WindowObject();
		window.name = `Window ${this.windowCount}`;
		window.position.y = 1.2 + window.height / 2;
		this.add(window);
		this.updateGeometry();
		return window;
	}

	public getWallMaterial(): MeshStandardMaterial {
		return this.wallMesh.material as MeshStandardMaterial;
	}

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

	private getOpeningsSignature(): string {
		const parts = this.getOpenings().map((opening) =>
			[opening.width, opening.height, opening.x, opening.y].join(","),
		);
		return `${this.length}|${this.height}|${this.thickness}|${parts.join(";")}`;
	}
}
