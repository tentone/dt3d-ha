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

	/**
	 * State of the door.
	 */
	public open = false;

	/**
	 * Hinge group that allows the door to rotate around its hinge when opening or closing.
	 */
	public hingeGroup: Group;

	/**
	 * Mesh used to represent the door panel. This mesh is a child of the hingeGroup, which allows for rotation around the hinge when opening or closing the door.
	 */
	public doorMesh: Mesh;

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

	/**
	 * Set the open state of the door.
	 * 
	 * @param isOpen - True to open the door, false to close it.
	 */
	public setOpen(isOpen: boolean): void {
		this.open = isOpen;
		this.hingeGroup.rotation.y = isOpen ? -Math.PI / 2 : 0;
	}

	/**
	 * Toggle the open state of the door. If the door is currently open, it will be closed, and if it is closed, it will be opened.
	 */
	public toggleOpen(): void {
		this.setOpen(!this.open);
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

	/**
	 * Update the door geometry based on the current width, height, and thickness. This method is called whenever the dimensions of the door are changed.
	 */
	private updateGeometry(): void {
		const geometry = new BoxGeometry(this.width, this.height, this.thickness);
		this.doorMesh.geometry.dispose();
		this.doorMesh.geometry = geometry;
		this.hingeGroup.position.set(-this.width / 2, this.height / 2, 0);
		this.doorMesh.position.set(this.width / 2, 0, 0);
	}
}
