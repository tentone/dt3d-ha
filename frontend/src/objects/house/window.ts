import {BoxGeometry, Color, Group, Mesh, MeshStandardMaterial} from "three";

import {DTObject} from "../dt-object.js";

export type WindowDimensions = {
	width: number;
	height: number;
	thickness: number;
};

export type WindowCustomization = {
	borderEnabled: boolean;
	borderThickness: number;
	borderDepth: number;
	borderColor: string;
	gridEnabled: boolean;
	gridRows: number;
	gridColumns: number;
	gridBarThickness: number;
	gridHorizontalSpacing: number;
	gridVerticalSpacing: number;
	blindsEnabled: boolean;
	blindPosition: number;
	blindSlatSpacing: number;
	blindColor: string;
};

const DEFAULT_WINDOW_DIMENSIONS: WindowDimensions = {
	width: 1.2,
	height: 1,
	thickness: 0.06,
};

const DEFAULT_WINDOW_CUSTOMIZATION: WindowCustomization = {
	borderEnabled: true,
	borderThickness: 0.06,
	borderDepth: 0.03,
	borderColor: "#f2f0e9",
	gridEnabled: false,
	gridRows: 2,
	gridColumns: 2,
	gridBarThickness: 0.025,
	gridHorizontalSpacing: 0,
	gridVerticalSpacing: 0,
	blindsEnabled: false,
	blindPosition: 0,
	blindSlatSpacing: 0.06,
	blindColor: "#dedbd2",
};

const DEFAULT_WINDOW_COLOR = 0x6aa6ff;

function disposeGroupGeometry(group: Group): void {
	for (const child of [...group.children]) {
		child.traverse((object) => {
			if (object instanceof Mesh) {
				object.geometry.dispose();
			}
		});
		group.remove(child);
	}
}

export class WindowObject extends DTObject {
	public width: number;

	public height: number;

	public thickness: number;

	public open = false;

	public borderEnabled: boolean;

	public borderThickness: number;

	public borderDepth: number;

	public borderColor: string;

	public gridEnabled: boolean;

	public gridRows: number;

	public gridColumns: number;

	public gridBarThickness: number;

	public gridHorizontalSpacing: number;

	public gridVerticalSpacing: number;

	public blindsEnabled: boolean;

	/**
	 * Blind extension percentage: 0 is fully raised, 100 is fully lowered.
	 */
	public blindPosition: number;

	public blindSlatSpacing: number;

	public blindColor: string;

	private sashGroup: Group;

	private frameGroup: Group;

	private gridGroup: Group;

	private blindsGroup: Group;

	private windowMesh: Mesh;

	private frameMaterial: MeshStandardMaterial;

	private gridMaterial: MeshStandardMaterial;

	private blindMaterial: MeshStandardMaterial;

	constructor(
		dimensions: Partial<WindowDimensions> = {},
		color = DEFAULT_WINDOW_COLOR,
		customization: Partial<WindowCustomization> = {},
	) {
		super();

		this.width = dimensions.width ?? DEFAULT_WINDOW_DIMENSIONS.width;
		this.height = dimensions.height ?? DEFAULT_WINDOW_DIMENSIONS.height;
		this.thickness =
			dimensions.thickness ?? DEFAULT_WINDOW_DIMENSIONS.thickness;

		this.borderEnabled =
			customization.borderEnabled ?? DEFAULT_WINDOW_CUSTOMIZATION.borderEnabled;
		this.borderThickness =
			customization.borderThickness ??
			DEFAULT_WINDOW_CUSTOMIZATION.borderThickness;
		this.borderDepth =
			customization.borderDepth ?? DEFAULT_WINDOW_CUSTOMIZATION.borderDepth;
		this.borderColor =
			customization.borderColor ?? DEFAULT_WINDOW_CUSTOMIZATION.borderColor;
		this.gridEnabled =
			customization.gridEnabled ?? DEFAULT_WINDOW_CUSTOMIZATION.gridEnabled;
		this.gridRows = Math.min(
			20,
			Math.max(
				1,
				Math.round(
					customization.gridRows ?? DEFAULT_WINDOW_CUSTOMIZATION.gridRows,
				),
			),
		);
		this.gridColumns = Math.min(
			20,
			Math.max(
				1,
				Math.round(
					customization.gridColumns ??
						DEFAULT_WINDOW_CUSTOMIZATION.gridColumns,
				),
			),
		);
		this.gridBarThickness =
			customization.gridBarThickness ??
			DEFAULT_WINDOW_CUSTOMIZATION.gridBarThickness;
		this.gridHorizontalSpacing =
			customization.gridHorizontalSpacing ??
			DEFAULT_WINDOW_CUSTOMIZATION.gridHorizontalSpacing;
		this.gridVerticalSpacing =
			customization.gridVerticalSpacing ??
			DEFAULT_WINDOW_CUSTOMIZATION.gridVerticalSpacing;
		this.blindsEnabled =
			customization.blindsEnabled ?? DEFAULT_WINDOW_CUSTOMIZATION.blindsEnabled;
		this.blindPosition = Math.min(
			100,
			Math.max(
				0,
				customization.blindPosition ??
					DEFAULT_WINDOW_CUSTOMIZATION.blindPosition,
			),
		);
		this.blindSlatSpacing =
			customization.blindSlatSpacing ??
			DEFAULT_WINDOW_CUSTOMIZATION.blindSlatSpacing;
		this.blindColor =
			customization.blindColor ?? DEFAULT_WINDOW_CUSTOMIZATION.blindColor;

		this.name = "Window";
		this.userData.meshType = "window";

		this.sashGroup = new Group();
		this.sashGroup.name = "Window Sash";
		(this.sashGroup as any).internal = true;
		this.add(this.sashGroup);

		const material = new MeshStandardMaterial({
			color,
			transparent: true,
			opacity: 0.7,
			roughness: 0.08,
			metalness: 0.04,
		});
		this.windowMesh = new Mesh(new BoxGeometry(1, 1, 1), material);
		this.windowMesh.name = "Window Panel";
		this.sashGroup.add(this.windowMesh);

		this.frameGroup = new Group();
		this.frameGroup.name = "Window Border";
		(this.frameGroup as any).internal = true;
		this.add(this.frameGroup);

		this.gridGroup = new Group();
		this.gridGroup.name = "Window Grid";
		this.sashGroup.add(this.gridGroup);

		this.blindsGroup = new Group();
		this.blindsGroup.name = "Window Blinds";
		(this.blindsGroup as any).internal = true;
		this.add(this.blindsGroup);

		this.frameMaterial = new MeshStandardMaterial({color: this.borderColor});
		this.gridMaterial = new MeshStandardMaterial({color: this.borderColor});
		this.blindMaterial = new MeshStandardMaterial({
			color: this.blindColor,
			roughness: 0.7,
		});

		this.updateGeometry();
		this.setOpen(this.open);
	}

	public setOpen(isOpen: boolean): void {
		this.open = isOpen;
		this.sashGroup.position.z = isOpen ? this.thickness + this.borderDepth : 0;
	}

	public toggleOpen(): void {
		this.setOpen(!this.open);
	}

	public setBlindPosition(position: number): void {
		if (!Number.isFinite(position)) {
			return;
		}
		this.blindPosition = Math.min(100, Math.max(0, position));
		this.updateBlindsGeometry();
	}

	public raiseBlinds(): void {
		this.setBlindPosition(0);
	}

	public lowerBlinds(): void {
		this.setBlindPosition(100);
	}

	public get glassColor(): string {
		return `#${this.getWindowMaterial().color.getHexString()}`;
	}

	public get glassOpacity(): number {
		return this.getWindowMaterial().opacity;
	}

	public get glassRoughness(): number {
		return this.getWindowMaterial().roughness;
	}

	public setConfiguration(attribute: string, value: unknown): boolean {
		if (attribute === "open") {
			this.setOpen(Boolean(value));
			return true;
		}
		if (attribute === "blindPosition") {
			const position = Number(value);
			if (!Number.isFinite(position)) return false;
			this.setBlindPosition(position);
			return true;
		}
		if (
			attribute === "borderEnabled" ||
			attribute === "gridEnabled" ||
			attribute === "blindsEnabled"
		) {
			(this as any)[attribute] = Boolean(value);
			this.updateGeometry();
			return true;
		}
		if (
			attribute === "borderColor" ||
			attribute === "blindColor" ||
			attribute === "glassColor"
		) {
			if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
				return false;
			}
			if (attribute === "glassColor") {
				this.getWindowMaterial().color = new Color(value);
			} else {
				(this as any)[attribute] = value;
				this.updateGeometry();
			}
			return true;
		}
		if (attribute === "glassOpacity" || attribute === "glassRoughness") {
			const number = Number(value);
			if (!Number.isFinite(number)) return false;
			const material = this.getWindowMaterial();
			material[attribute === "glassOpacity" ? "opacity" : "roughness"] =
				Math.min(1, Math.max(0, number));
			material.transparent = material.opacity < 1;
			material.needsUpdate = true;
			return true;
		}

		const numericAttributes = new Set([
			"width",
			"height",
			"thickness",
			"borderThickness",
			"borderDepth",
			"gridRows",
			"gridColumns",
			"gridBarThickness",
			"gridHorizontalSpacing",
			"gridVerticalSpacing",
			"blindSlatSpacing",
		]);
		if (!numericAttributes.has(attribute)) {
			return false;
		}
		const number = Number(value);
		if (!Number.isFinite(number) || number < 0) {
			return false;
		}
		if (
			(attribute === "width" ||
				attribute === "height" ||
				attribute === "thickness") &&
			number <= 0
		) {
			return false;
		}
		(this as any)[attribute] =
			attribute === "gridRows" || attribute === "gridColumns"
				? Math.min(20, Math.max(1, Math.round(number)))
				: number;
		this.updateGeometry();
		this.setOpen(this.open);
		return true;
	}

	public getWindowMaterial(): MeshStandardMaterial {
		return this.windowMesh.material as MeshStandardMaterial;
	}

	public getCustomization(): WindowCustomization {
		return {
			borderEnabled: this.borderEnabled,
			borderThickness: this.borderThickness,
			borderDepth: this.borderDepth,
			borderColor: this.borderColor,
			gridEnabled: this.gridEnabled,
			gridRows: this.gridRows,
			gridColumns: this.gridColumns,
			gridBarThickness: this.gridBarThickness,
			gridHorizontalSpacing: this.gridHorizontalSpacing,
			gridVerticalSpacing: this.gridVerticalSpacing,
			blindsEnabled: this.blindsEnabled,
			blindPosition: this.blindPosition,
			blindSlatSpacing: this.blindSlatSpacing,
			blindColor: this.blindColor,
		};
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		if (source instanceof WindowObject) {
			this.width = source.width;
			this.height = source.height;
			this.thickness = source.thickness;
			this.open = source.open;
			Object.assign(this, source.getCustomization());
			this.windowMesh.material = Array.isArray(source.windowMesh.material)
				? source.windowMesh.material.map((material) => material.clone())
				: source.windowMesh.material.clone();
		}

		this.updateGeometry();
		this.setOpen(this.open);
		if (recursive) {
			for (const child of source.children) {
				if (
					child === source.sashGroup ||
					child === source.frameGroup ||
					child === source.blindsGroup ||
					(child as any).internal === true
				) {
					continue;
				}
				this.add(child.clone(true));
			}
		}
		return this;
	}

	private updateGeometry(): void {
		const border = this.borderEnabled
			? Math.min(this.borderThickness, this.width / 3, this.height / 3)
			: 0;
		const glassWidth = Math.max(0.02, this.width - border * 2);
		const glassHeight = Math.max(0.02, this.height - border * 2);
		const geometry = new BoxGeometry(glassWidth, glassHeight, this.thickness);
		this.windowMesh.geometry.dispose();
		this.windowMesh.geometry = geometry;
		this.windowMesh.position.set(0, this.height / 2, 0);

		this.updateFrameGeometry(border);
		this.updateGridGeometry(glassWidth, glassHeight);
		this.updateBlindsGeometry();
	}

	private updateFrameGeometry(border: number): void {
		disposeGroupGeometry(this.frameGroup);
		this.frameGroup.visible = this.borderEnabled;
		if (!this.borderEnabled || border <= 0) return;

		this.frameMaterial.color = new Color(this.borderColor);
		const depth = this.thickness + this.borderDepth * 2;
		for (const side of [-1, 1]) {
			const vertical = new Mesh(
				new BoxGeometry(border, this.height, depth),
				this.frameMaterial,
			);
			vertical.position.set(
				side * (this.width / 2 - border / 2),
				this.height / 2,
				0,
			);
			this.frameGroup.add(vertical);

			const horizontal = new Mesh(
				new BoxGeometry(this.width - border * 2, border, depth),
				this.frameMaterial,
			);
			horizontal.position.set(
				0,
				this.height / 2 + side * (this.height / 2 - border / 2),
				0,
			);
			this.frameGroup.add(horizontal);
		}
	}

	private updateGridGeometry(glassWidth: number, glassHeight: number): void {
		disposeGroupGeometry(this.gridGroup);
		this.gridGroup.visible = this.gridEnabled;
		if (!this.gridEnabled) return;

		this.gridMaterial.color = new Color(this.borderColor);
		const bar = Math.min(
			this.gridBarThickness,
			glassWidth / 4,
			glassHeight / 4,
		);
		if (bar <= 0) return;
		const depth = this.thickness + 0.01;
		const columnSpacing =
			this.gridHorizontalSpacing > 0
				? this.gridHorizontalSpacing
				: glassWidth / this.gridColumns;
		const rowSpacing =
			this.gridVerticalSpacing > 0
				? this.gridVerticalSpacing
				: glassHeight / this.gridRows;

		for (let index = 1; index < this.gridColumns; index += 1) {
			const x = (index - this.gridColumns / 2) * columnSpacing;
			if (Math.abs(x) >= glassWidth / 2) continue;
			const vertical = new Mesh(
				new BoxGeometry(bar, glassHeight, depth),
				this.gridMaterial,
			);
			vertical.position.set(x, this.height / 2, 0);
			this.gridGroup.add(vertical);
		}
		for (let index = 1; index < this.gridRows; index += 1) {
			const y = this.height / 2 + (index - this.gridRows / 2) * rowSpacing;
			if (y <= 0 || y >= this.height) continue;
			const horizontal = new Mesh(
				new BoxGeometry(glassWidth, bar, depth),
				this.gridMaterial,
			);
			horizontal.position.set(0, y, 0);
			this.gridGroup.add(horizontal);
		}
	}

	private updateBlindsGeometry(): void {
		disposeGroupGeometry(this.blindsGroup);
		this.blindsGroup.visible = this.blindsEnabled;
		if (!this.blindsEnabled) return;

		this.blindMaterial.color = new Color(this.blindColor);
		const border = this.borderEnabled
			? Math.min(this.borderThickness, this.width / 3, this.height / 3)
			: 0;
		const innerWidth = Math.max(0.02, this.width - border * 2);
		const innerHeight = Math.max(0.02, this.height - border * 2);
		const coverage = innerHeight * (this.blindPosition / 100);
		const spacing = Math.max(0.02, this.blindSlatSpacing);
		const slatCount = Math.ceil(coverage / spacing);
		const top = this.height - border;
		for (let index = 0; index < slatCount; index += 1) {
			const y = top - Math.min(coverage, index * spacing + spacing / 2);
			const slat = new Mesh(
				new BoxGeometry(innerWidth, Math.min(0.025, spacing * 0.5), 0.025),
				this.blindMaterial,
			);
			slat.position.set(0, y, this.thickness / 2 + 0.025);
			this.blindsGroup.add(slat);
		}
		const headRail = new Mesh(
			new BoxGeometry(innerWidth, Math.min(0.05, innerHeight), 0.04),
			this.blindMaterial,
		);
		headRail.position.set(0, top, this.thickness / 2 + 0.025);
		this.blindsGroup.add(headRail);
	}
}
