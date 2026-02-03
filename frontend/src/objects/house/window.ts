import { Mesh, MeshStandardMaterial, BoxGeometry } from "three";
import { DTObject } from "../dt-object.js";

type WindowDimensions = {
	width: number;
	height: number;
	thickness: number;
};

const DEFAULT_WINDOW_DIMENSIONS: WindowDimensions = {
	width: 1.2,
	height: 1.0,
	thickness: 0.06,
};

const DEFAULT_WINDOW_COLOR = 0x6aa6ff;

export class WindowObject extends DTObject {
	public width: number;
	
	public height: number;

	public thickness: number;

	public open = false;

	private windowMesh: Mesh;

	constructor(
		dimensions: Partial<WindowDimensions> = {},
		color = DEFAULT_WINDOW_COLOR,
	) {
		super();

		this.width = dimensions.width ?? DEFAULT_WINDOW_DIMENSIONS.width;
		this.height = dimensions.height ?? DEFAULT_WINDOW_DIMENSIONS.height;
		this.thickness = dimensions.thickness ?? DEFAULT_WINDOW_DIMENSIONS.thickness;

		this.name = "Window";
		this.userData.meshType = "window";

		const material = new MeshStandardMaterial({
			color,
			transparent: true,
			opacity: 0.7,
		});
		this.windowMesh = new Mesh(new BoxGeometry(1, 1, 1), material);
		this.windowMesh.name = "Window Panel";
		this.add(this.windowMesh);

		this.updateGeometry();
		this.setOpen(this.open);
	}

	public setOpen(isOpen: boolean): void {
		this.open = isOpen;
		this.windowMesh.position.z = isOpen ? this.thickness : 0;
	}

	public toggleOpen(): void {
		this.setOpen(!this.open);
	}

	public getWindowMaterial(): MeshStandardMaterial {
		return this.windowMesh.material as MeshStandardMaterial;
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, recursive);
		if (source instanceof WindowObject) {
			this.width = source.width;
			this.height = source.height;
			this.thickness = source.thickness;
			this.open = source.open;
		}

		const mesh = this.getObjectByName("Window Panel") as Mesh | null;
		if (mesh) {
			this.windowMesh = mesh;
			this.updateGeometry();
			this.setOpen(this.open);
		}
		return this;
	}

	private updateGeometry(): void {
		const geometry = new BoxGeometry(this.width, this.height, this.thickness);
		this.windowMesh.geometry.dispose();
		this.windowMesh.geometry = geometry;
		this.windowMesh.position.set(0, this.height / 2, 0);
	}
}
