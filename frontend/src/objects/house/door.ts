import {BoxGeometry,Group, Mesh, MeshStandardMaterial} from "three";

import {DTObject} from "../dt-object.js";

type DoorDimensions = {
	width: number;
	height: number;
	thickness: number;
};

const DEFAULT_DOOR_DIMENSIONS: DoorDimensions = {
	width: 0.9,
	height: 2.1,
	thickness: 0.08,
};

const DEFAULT_DOOR_COLOR = 0x7a4e2f;

export class DoorObject extends DTObject {
	public width: number;

	public height: number;

	public thickness: number;

	public open = false;

	private hingeGroup: Group;

	private doorMesh: Mesh;

	constructor(
		dimensions: Partial<DoorDimensions> = {},
		color = DEFAULT_DOOR_COLOR,
	) {
		super();

		this.width = dimensions.width ?? DEFAULT_DOOR_DIMENSIONS.width;
		this.height = dimensions.height ?? DEFAULT_DOOR_DIMENSIONS.height;
		this.thickness = dimensions.thickness ?? DEFAULT_DOOR_DIMENSIONS.thickness;

		this.name = "Door";
		this.userData.meshType = "door";

		this.hingeGroup = new Group();
		this.add(this.hingeGroup);

		const material = new MeshStandardMaterial({color});
		this.doorMesh = new Mesh(new BoxGeometry(1, 1, 1), material);
		this.doorMesh.name = "Door Panel";
		this.hingeGroup.add(this.doorMesh);

		this.updateGeometry();
	}

	public setOpen(isOpen: boolean): void {
		this.open = isOpen;
		this.hingeGroup.rotation.y = isOpen ? -Math.PI / 2 : 0;
	}

	public toggleOpen(): void {
		this.setOpen(!this.open);
	}

	public getDoorMaterial(): MeshStandardMaterial {
		return this.doorMesh.material as MeshStandardMaterial;
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, recursive);
		if (source instanceof DoorObject) {
			this.width = source.width;
			this.height = source.height;
			this.thickness = source.thickness;
			this.open = source.open;
		}

		const mesh = this.getObjectByName("Door Panel") as Mesh | null;
		if (mesh) {
			this.doorMesh = mesh;
			this.updateGeometry();
			this.setOpen(this.open);
		}
		return this;
	}

	private updateGeometry(): void {
		const geometry = new BoxGeometry(this.width, this.height, this.thickness);
		this.doorMesh.geometry.dispose();
		this.doorMesh.geometry = geometry;
		this.hingeGroup.position.set(-this.width / 2, this.height / 2, 0);
		this.doorMesh.position.set(this.width / 2, 0, 0);
	}
}
