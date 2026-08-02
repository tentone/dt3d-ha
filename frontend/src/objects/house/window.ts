import {BoxGeometry, Color, Group, Mesh, MeshStandardMaterial} from "three";

import {markObjectInternal} from "../../utils/internal-object.js";
import {DTObject} from "../dt-object.js";

export type WindowDimensions = {
	width: number;
	height: number;
	thickness: number;
};

export type WindowCustomization = {
	openingType: "sliding" | "hinged";
	panelCount: 1 | 2;
	hingeSide: "left" | "right";
	openingDirection: "inward" | "outward";
	openAmount: number;
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
	blindPlacement: "inside" | "outside";
	blindPosition: number;
	blindSlatSpacing: number;
	blindColor: string;
	shuttersEnabled: boolean;
	shutterPanelCount: 1 | 2;
	shutterOpenAmount: number;
	shutterBladeCount: number;
	shutterBladeOpenAmount: number;
	shutterColor: string;
};

const DEFAULT_WINDOW_DIMENSIONS: WindowDimensions = {
	width: 1.2,
	height: 1,
	thickness: 0.06,
};

const DEFAULT_WINDOW_CUSTOMIZATION: WindowCustomization = {
	openingType: "sliding",
	panelCount: 1,
	hingeSide: "left",
	openingDirection: "inward",
	openAmount: 0,
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
	blindPlacement: "inside",
	blindPosition: 0,
	blindSlatSpacing: 0.06,
	blindColor: "#dedbd2",
	shuttersEnabled: false,
	shutterPanelCount: 2,
	shutterOpenAmount: 0,
	shutterBladeCount: 12,
	shutterBladeOpenAmount: 0,
	shutterColor: "#4f6b47",
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

	public openingType: WindowCustomization["openingType"];

	public panelCount: WindowCustomization["panelCount"];

	public hingeSide: WindowCustomization["hingeSide"];

	public openingDirection: WindowCustomization["openingDirection"];

	public openAmount: number;

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

	public blindPlacement: WindowCustomization["blindPlacement"];

	/**
	 * Blind extension percentage: 0 is fully raised, 100 is fully lowered.
	 */
	public blindPosition: number;

	public blindSlatSpacing: number;

	public blindColor: string;

	public shuttersEnabled: boolean;

	public shutterPanelCount: WindowCustomization["shutterPanelCount"];

	public shutterOpenAmount: number;

	public shutterBladeCount: number;

	public shutterBladeOpenAmount: number;

	public shutterColor: string;

	private sashGroup: Group;

	private secondarySashGroup: Group;

	private sashFrameGroup: Group;

	private secondarySashFrameGroup: Group;

	private frameGroup: Group;

	private gridGroup: Group;

	private secondaryGridGroup: Group;

	private blindsGroup: Group;

	private shutterGroup: Group;

	private secondaryShutterGroup: Group;

	private windowMesh: Mesh;

	private secondaryWindowMesh: Mesh;

	private frameMaterial: MeshStandardMaterial;

	private sashFrameMaterial: MeshStandardMaterial;

	private gridMaterial: MeshStandardMaterial;

	private blindMaterial: MeshStandardMaterial;

	private shutterMaterial: MeshStandardMaterial;

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

		this.openingType =
			customization.openingType ?? DEFAULT_WINDOW_CUSTOMIZATION.openingType;
		this.panelCount =
			this.openingType === "sliding" || customization.panelCount === 2
				? 2
				: DEFAULT_WINDOW_CUSTOMIZATION.panelCount;
		this.hingeSide =
			customization.hingeSide ?? DEFAULT_WINDOW_CUSTOMIZATION.hingeSide;
		this.openingDirection =
			customization.openingDirection ??
			DEFAULT_WINDOW_CUSTOMIZATION.openingDirection;
		this.openAmount = Math.min(
			100,
			Math.max(
				0,
				customization.openAmount ?? DEFAULT_WINDOW_CUSTOMIZATION.openAmount,
			),
		);
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
		this.blindPlacement =
			customization.blindPlacement ??
			DEFAULT_WINDOW_CUSTOMIZATION.blindPlacement;
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
		this.shuttersEnabled =
			customization.shuttersEnabled ??
			DEFAULT_WINDOW_CUSTOMIZATION.shuttersEnabled;
		this.shutterPanelCount =
			customization.shutterPanelCount === 1
				? 1
				: DEFAULT_WINDOW_CUSTOMIZATION.shutterPanelCount;
		this.shutterOpenAmount = Math.min(
			100,
			Math.max(
				0,
				customization.shutterOpenAmount ??
					DEFAULT_WINDOW_CUSTOMIZATION.shutterOpenAmount,
			),
		);
		this.shutterBladeCount = Math.min(
			50,
			Math.max(
				1,
				Math.round(
					customization.shutterBladeCount ??
						DEFAULT_WINDOW_CUSTOMIZATION.shutterBladeCount,
				),
			),
		);
		this.shutterBladeOpenAmount = Math.min(
			100,
			Math.max(
				0,
				customization.shutterBladeOpenAmount ??
					DEFAULT_WINDOW_CUSTOMIZATION.shutterBladeOpenAmount,
			),
		);
		this.shutterColor =
			customization.shutterColor ?? DEFAULT_WINDOW_CUSTOMIZATION.shutterColor;

		this.name = "Window";
		this.userData.meshType = "window";

		this.sashGroup = markObjectInternal(new Group());
		this.sashGroup.name = "Window Sash";
		this.add(this.sashGroup);

		const material = new MeshStandardMaterial({
			color,
			transparent: true,
			opacity: 0.7,
			roughness: 0.08,
			metalness: 0.04,
		});
		this.windowMesh = markObjectInternal(
			new Mesh(new BoxGeometry(1, 1, 1), material),
		);
		this.windowMesh.name = "Window Panel";
		this.windowMesh.userData.ownerMaterialTarget = true;
		this.sashGroup.add(this.windowMesh);

		this.secondarySashGroup = markObjectInternal(new Group());
		this.secondarySashGroup.name = "Window Sash 2";
		this.add(this.secondarySashGroup);
		this.secondaryWindowMesh = markObjectInternal(
			new Mesh(new BoxGeometry(1, 1, 1), this.windowMesh.material),
		);
		this.secondaryWindowMesh.name = "Window Panel 2";
		this.secondarySashGroup.add(this.secondaryWindowMesh);

		this.sashFrameGroup = markObjectInternal(new Group());
		this.sashFrameGroup.name = "Window Sash Frame";
		this.sashGroup.add(this.sashFrameGroup);

		this.secondarySashFrameGroup = markObjectInternal(new Group());
		this.secondarySashFrameGroup.name = "Window Sash Frame 2";
		this.secondarySashGroup.add(this.secondarySashFrameGroup);

		this.frameGroup = markObjectInternal(new Group());
		this.frameGroup.name = "Window Border";
		this.add(this.frameGroup);

		this.gridGroup = markObjectInternal(new Group());
		this.gridGroup.name = "Window Grid";
		this.sashGroup.add(this.gridGroup);

		this.secondaryGridGroup = markObjectInternal(new Group());
		this.secondaryGridGroup.name = "Window Grid 2";
		this.secondarySashGroup.add(this.secondaryGridGroup);

		this.blindsGroup = markObjectInternal(new Group());
		this.blindsGroup.name = "Window Blinds";
		this.add(this.blindsGroup);

		this.shutterGroup = markObjectInternal(new Group());
		this.shutterGroup.name = "Window Shutter";
		this.add(this.shutterGroup);

		this.secondaryShutterGroup = markObjectInternal(new Group());
		this.secondaryShutterGroup.name = "Window Shutter 2";
		this.add(this.secondaryShutterGroup);

		this.frameMaterial = new MeshStandardMaterial({color: this.borderColor});
		this.sashFrameMaterial = new MeshStandardMaterial({
			color: this.borderColor,
		});
		this.gridMaterial = new MeshStandardMaterial({color: this.borderColor});
		this.blindMaterial = new MeshStandardMaterial({
			color: this.blindColor,
			roughness: 0.7,
		});
		this.shutterMaterial = new MeshStandardMaterial({
			color: this.shutterColor,
			roughness: 0.68,
		});

		this.updateGeometry();
		this.setOpenAmount(this.openAmount);
	}

	public setOpen(isOpen: boolean): void {
		this.setOpenAmount(isOpen ? 100 : 0);
	}

	public setOpenAmount(amount: number): void {
		if (!Number.isFinite(amount)) return;
		this.openAmount = Math.min(100, Math.max(0, amount));
		this.open = this.openAmount > 0;
		this.applyOpeningTransform();
	}

	public toggleOpen(): void {
		this.setOpen(!this.open);
	}

	public override update(_time: number): void {
		if (this.secondaryWindowMesh.material !== this.windowMesh.material) {
			this.secondaryWindowMesh.material = this.windowMesh.material;
		}
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

	public setShutterOpenAmount(amount: number): void {
		if (!Number.isFinite(amount)) return;
		this.shutterOpenAmount = Math.min(100, Math.max(0, amount));
		this.applyShutterOpeningTransform();
	}

	public setShutterBladeOpenAmount(amount: number): void {
		if (!Number.isFinite(amount)) return;
		this.shutterBladeOpenAmount = Math.min(100, Math.max(0, amount));
		this.updateShutterGeometry();
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
		if (attribute === "openAmount") {
			const amount = Number(value);
			if (!Number.isFinite(amount)) return false;
			this.setOpenAmount(amount);
			return true;
		}
		if (
			(attribute === "openingType" &&
				(value === "sliding" || value === "hinged")) ||
			(attribute === "hingeSide" && (value === "left" || value === "right")) ||
			(attribute === "blindPlacement" &&
				(value === "inside" || value === "outside")) ||
			(attribute === "openingDirection" &&
				(value === "inward" || value === "outward"))
		) {
			(this as any)[attribute] = value;
			if (attribute === "openingType" && value === "sliding") {
				this.panelCount = 2;
			}
			this.updateGeometry();
			return true;
		}
		if (attribute === "panelCount") {
			const count = Number(value);
			if (count !== 1 && count !== 2) return false;
			if (this.openingType === "sliding" && count !== 2) return false;
			this.panelCount = count;
			this.updateGeometry();
			return true;
		}
		if (attribute === "shutterPanelCount") {
			const count = Number(value);
			if (count !== 1 && count !== 2) return false;
			this.shutterPanelCount = count;
			this.updateShutterGeometry();
			return true;
		}
		if (attribute === "blindPosition") {
			const position = Number(value);
			if (!Number.isFinite(position)) return false;
			this.setBlindPosition(position);
			return true;
		}
		if (attribute === "shutterOpenAmount") {
			const amount = Number(value);
			if (!Number.isFinite(amount)) return false;
			this.setShutterOpenAmount(amount);
			return true;
		}
		if (attribute === "shutterBladeOpenAmount") {
			const amount = Number(value);
			if (!Number.isFinite(amount)) return false;
			this.setShutterBladeOpenAmount(amount);
			return true;
		}
		if (
			attribute === "borderEnabled" ||
			attribute === "gridEnabled" ||
			attribute === "blindsEnabled" ||
			attribute === "shuttersEnabled"
		) {
			(this as any)[attribute] = Boolean(value);
			this.updateGeometry();
			return true;
		}
		if (
			attribute === "borderColor" ||
			attribute === "blindColor" ||
			attribute === "shutterColor" ||
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
			"shutterBladeCount",
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
			attribute === "shutterBladeCount"
				? Math.min(50, Math.max(1, Math.round(number)))
				: attribute === "gridRows" || attribute === "gridColumns"
					? Math.min(20, Math.max(1, Math.round(number)))
					: number;
		this.updateGeometry();
		this.setOpenAmount(this.openAmount);
		return true;
	}

	public getWindowMaterial(): MeshStandardMaterial {
		return this.windowMesh.material as MeshStandardMaterial;
	}

	public getCustomization(): WindowCustomization {
		return {
			openingType: this.openingType,
			panelCount: this.panelCount,
			hingeSide: this.hingeSide,
			openingDirection: this.openingDirection,
			openAmount: this.openAmount,
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
			blindPlacement: this.blindPlacement,
			blindPosition: this.blindPosition,
			blindSlatSpacing: this.blindSlatSpacing,
			blindColor: this.blindColor,
			shuttersEnabled: this.shuttersEnabled,
			shutterPanelCount: this.shutterPanelCount,
			shutterOpenAmount: this.shutterOpenAmount,
			shutterBladeCount: this.shutterBladeCount,
			shutterBladeOpenAmount: this.shutterBladeOpenAmount,
			shutterColor: this.shutterColor,
		};
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		if (source instanceof WindowObject) {
			this.width = source.width;
			this.height = source.height;
			this.thickness = source.thickness;
			this.open = source.open;
			this.openAmount = source.openAmount;
			Object.assign(this, source.getCustomization());
			this.windowMesh.material = Array.isArray(source.windowMesh.material)
				? source.windowMesh.material.map((material) => material.clone())
				: source.windowMesh.material.clone();
			this.secondaryWindowMesh.material = this.windowMesh.material;
		}

		this.updateGeometry();
		this.setOpenAmount(this.openAmount);
		if (recursive) {
			for (const child of source.children) {
				if (
					child === source.sashGroup ||
					child === source.secondarySashGroup ||
					child === source.frameGroup ||
					child === source.blindsGroup ||
					child === source.shutterGroup ||
					child === source.secondaryShutterGroup ||
					child.internal === true
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
		const panelWidth = glassWidth / this.panelCount;
		const sashFrameWidth = Math.min(
			Math.max(0.025, this.borderThickness),
			panelWidth / 4,
			glassHeight / 4,
		);
		const panelGlassWidth = Math.max(0.02, panelWidth - sashFrameWidth * 2);
		const panelGlassHeight = Math.max(0.02, glassHeight - sashFrameWidth * 2);
		const geometry = new BoxGeometry(
			panelGlassWidth,
			panelGlassHeight,
			this.thickness,
		);
		this.windowMesh.geometry.dispose();
		this.windowMesh.geometry = geometry;
		this.secondaryWindowMesh.geometry.dispose();
		this.secondaryWindowMesh.geometry = new BoxGeometry(
			panelGlassWidth,
			panelGlassHeight,
			this.thickness,
		);
		this.secondaryWindowMesh.material = this.windowMesh.material;
		this.secondarySashGroup.visible = this.panelCount === 2;
		this.positionWindowPanels(glassWidth, panelWidth);

		this.updateFrameGeometry(border);
		this.updateSashFrameGeometry(panelWidth, glassHeight, sashFrameWidth);
		this.updateGridGeometry(panelGlassWidth, panelGlassHeight);
		this.updateBlindsGeometry();
		this.updateShutterGeometry();
		this.applyOpeningTransform();
		for (const group of [
			this.sashGroup,
			this.secondarySashGroup,
			this.sashFrameGroup,
			this.secondarySashFrameGroup,
			this.frameGroup,
			this.blindsGroup,
			this.shutterGroup,
			this.secondaryShutterGroup,
		]) {
			markObjectInternal(group, true);
		}
	}

	private positionWindowPanels(glassWidth: number, panelWidth: number): void {
		this.sashGroup.rotation.set(0, 0, 0);
		this.secondarySashGroup.rotation.set(0, 0, 0);
		if (this.openingType === "hinged") {
			if (this.panelCount === 2) {
				this.sashGroup.position.set(-glassWidth / 2, 0, 0);
				this.windowMesh.position.set(panelWidth / 2, this.height / 2, 0);
				this.secondarySashGroup.position.set(glassWidth / 2, 0, 0);
				this.secondaryWindowMesh.position.set(
					-panelWidth / 2,
					this.height / 2,
					0,
				);
			} else {
				const side = this.hingeSide === "left" ? -1 : 1;
				this.sashGroup.position.set(side * glassWidth / 2, 0, 0);
				this.windowMesh.position.set(
					-side * panelWidth / 2,
					this.height / 2,
					0,
				);
			}
			this.gridGroup.position.x = this.windowMesh.position.x;
			this.secondaryGridGroup.position.x =
				this.secondaryWindowMesh.position.x;
			return;
		}
		this.windowMesh.position.set(0, this.height / 2, 0);
		this.secondaryWindowMesh.position.set(0, this.height / 2, 0);
		const trackOffset = this.thickness / 2 + 0.012;
		this.sashGroup.position.set(-panelWidth / 2, 0, trackOffset);
		this.secondarySashGroup.position.set(panelWidth / 2, 0, -trackOffset);
		this.gridGroup.position.x = 0;
		this.secondaryGridGroup.position.x = 0;
	}

	private updateSashFrameGeometry(
		panelWidth: number,
		panelHeight: number,
		frameWidth: number,
	): void {
		disposeGroupGeometry(this.sashFrameGroup);
		disposeGroupGeometry(this.secondarySashFrameGroup);
		this.secondarySashFrameGroup.visible = this.panelCount === 2;
		this.sashFrameMaterial.color = new Color(this.borderColor);

		this.sashFrameGroup.position.set(
			this.windowMesh.position.x,
			this.height / 2,
			0,
		);
		this.secondarySashFrameGroup.position.set(
			this.secondaryWindowMesh.position.x,
			this.height / 2,
			0,
		);
		this.addSashFrame(
			this.sashFrameGroup,
			panelWidth,
			panelHeight,
			frameWidth,
		);
		if (this.panelCount === 2) {
			this.addSashFrame(
				this.secondarySashFrameGroup,
				panelWidth,
				panelHeight,
				frameWidth,
			);
		}
	}

	private addSashFrame(
		group: Group,
		panelWidth: number,
		panelHeight: number,
		frameWidth: number,
	): void {
		const depth = this.thickness + 0.012;
		for (const side of [-1, 1]) {
			const vertical = new Mesh(
				new BoxGeometry(frameWidth, panelHeight, depth),
				this.sashFrameMaterial,
			);
			vertical.position.x = side * (panelWidth / 2 - frameWidth / 2);
			group.add(vertical);

			const horizontal = new Mesh(
				new BoxGeometry(panelWidth - frameWidth * 2, frameWidth, depth),
				this.sashFrameMaterial,
			);
			horizontal.position.y = side * (panelHeight / 2 - frameWidth / 2);
			group.add(horizontal);
		}
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
		disposeGroupGeometry(this.secondaryGridGroup);
		this.gridGroup.visible = this.gridEnabled;
		this.secondaryGridGroup.visible =
			this.gridEnabled && this.panelCount === 2;
		if (!this.gridEnabled) return;

		this.gridMaterial.color = new Color(this.borderColor);
		this.addGridToGroup(this.gridGroup, glassWidth, glassHeight);
		if (this.panelCount === 2) {
			this.addGridToGroup(this.secondaryGridGroup, glassWidth, glassHeight);
		}
	}

	private addGridToGroup(
		group: Group,
		glassWidth: number,
		glassHeight: number,
	): void {
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
			group.add(vertical);
		}
		for (let index = 1; index < this.gridRows; index += 1) {
			const y = this.height / 2 + (index - this.gridRows / 2) * rowSpacing;
			if (y <= 0 || y >= this.height) continue;
			const horizontal = new Mesh(
				new BoxGeometry(glassWidth, bar, depth),
				this.gridMaterial,
			);
			horizontal.position.set(0, y, 0);
			group.add(horizontal);
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
			const side = this.blindPlacement === "inside" ? 1 : -1;
			slat.position.set(0, y, side * (this.thickness / 2 + 0.025));
			this.blindsGroup.add(slat);
		}
		const headRail = new Mesh(
			new BoxGeometry(innerWidth, Math.min(0.05, innerHeight), 0.04),
			this.blindMaterial,
		);
		const side = this.blindPlacement === "inside" ? 1 : -1;
		headRail.position.set(0, top, side * (this.thickness / 2 + 0.025));
		this.blindsGroup.add(headRail);
	}

	private updateShutterGeometry(): void {
		disposeGroupGeometry(this.shutterGroup);
		disposeGroupGeometry(this.secondaryShutterGroup);
		this.shutterGroup.visible = this.shuttersEnabled;
		this.secondaryShutterGroup.visible =
			this.shuttersEnabled && this.shutterPanelCount === 2;
		if (!this.shuttersEnabled) return;

		this.shutterMaterial.color = new Color(this.shutterColor);
		const border = this.borderEnabled
			? Math.min(this.borderThickness, this.width / 3, this.height / 3)
			: 0;
		const innerWidth = Math.max(0.02, this.width - border * 2);
		const innerHeight = Math.max(0.02, this.height - border * 2);
		const centerY = this.height / 2;
		const panelWidth = innerWidth / this.shutterPanelCount;
		const outsideZ = -(
			this.thickness / 2 +
			(this.borderEnabled ? this.borderDepth : 0) +
			0.035
		);

		if (this.shutterPanelCount === 2) {
			this.shutterGroup.position.set(-innerWidth / 2, 0, outsideZ);
			this.secondaryShutterGroup.position.set(innerWidth / 2, 0, outsideZ);
			this.addShutterPanel(
				this.shutterGroup,
				panelWidth,
				innerHeight,
				panelWidth / 2,
				centerY,
			);
			this.addShutterPanel(
				this.secondaryShutterGroup,
				panelWidth,
				innerHeight,
				-panelWidth / 2,
				centerY,
			);
		} else {
			const side = this.hingeSide === "left" ? -1 : 1;
			this.shutterGroup.position.set((side * innerWidth) / 2, 0, outsideZ);
			this.addShutterPanel(
				this.shutterGroup,
				panelWidth,
				innerHeight,
				(-side * panelWidth) / 2,
				centerY,
			);
		}
		this.applyShutterOpeningTransform();
	}

	private addShutterPanel(
		group: Group,
		panelWidth: number,
		panelHeight: number,
		centerX: number,
		centerY: number,
	): void {
		const rail = Math.min(0.06, panelWidth / 5, panelHeight / 8);
		const depth = 0.04;
		for (const side of [-1, 1]) {
			const vertical = new Mesh(
				new BoxGeometry(rail, panelHeight, depth),
				this.shutterMaterial,
			);
			vertical.position.set(
				centerX + side * (panelWidth / 2 - rail / 2),
				centerY,
				0,
			);
			group.add(vertical);

			const horizontal = new Mesh(
				new BoxGeometry(panelWidth - rail * 2, rail, depth),
				this.shutterMaterial,
			);
			horizontal.position.set(
				centerX,
				centerY + side * (panelHeight / 2 - rail / 2),
				0,
			);
			group.add(horizontal);
		}

		const bladeCount = Math.min(50, Math.max(1, this.shutterBladeCount));
		const bladeAreaHeight = Math.max(0.01, panelHeight - rail * 2);
		const bladeWidth = Math.max(0.01, panelWidth - rail * 2);
		const pitch = bladeAreaHeight / bladeCount;
		const bladeAngle = (this.shutterBladeOpenAmount / 100) * Math.PI * 0.45;
		for (let index = 0; index < bladeCount; index += 1) {
			const blade = new Mesh(
				new BoxGeometry(bladeWidth, pitch * 0.92, 0.012),
				this.shutterMaterial,
			);
			blade.name = "Window Shutter Blade";
			blade.position.set(
				centerX,
				centerY - bladeAreaHeight / 2 + pitch * (index + 0.5),
				0,
			);
			blade.rotation.x = bladeAngle;
			group.add(blade);
		}
	}

	private applyShutterOpeningTransform(): void {
		this.shutterGroup.rotation.set(0, 0, 0);
		this.secondaryShutterGroup.rotation.set(0, 0, 0);
		this.secondaryShutterGroup.visible =
			this.shuttersEnabled && this.shutterPanelCount === 2;
		if (!this.shuttersEnabled) return;

		const angle = (this.shutterOpenAmount / 100) * Math.PI;
		if (this.shutterPanelCount === 2) {
			this.shutterGroup.rotation.y = angle;
			this.secondaryShutterGroup.rotation.y = -angle;
		} else {
			this.shutterGroup.rotation.y =
				(this.hingeSide === "left" ? 1 : -1) * angle;
		}
	}

	private applyOpeningTransform(): void {
		const border = this.borderEnabled
			? Math.min(this.borderThickness, this.width / 3, this.height / 3)
			: 0;
		const glassWidth = Math.max(0.02, this.width - border * 2);
		const panelWidth = glassWidth / this.panelCount;
		const amount = this.openAmount / 100;
		this.secondarySashGroup.visible = this.panelCount === 2;
		this.sashGroup.rotation.set(0, 0, 0);
		this.secondarySashGroup.rotation.set(0, 0, 0);

		if (this.openingType === "hinged") {
			const directionSign = this.openingDirection === "inward" ? 1 : -1;
			if (this.panelCount === 2) {
				this.sashGroup.position.set(-glassWidth / 2, 0, 0);
				this.secondarySashGroup.position.set(glassWidth / 2, 0, 0);
				this.sashGroup.rotation.y =
					-directionSign * amount * (Math.PI / 2);
				this.secondarySashGroup.rotation.y =
					directionSign * amount * (Math.PI / 2);
			} else {
				const side = this.hingeSide === "left" ? -1 : 1;
				this.sashGroup.position.set(side * glassWidth / 2, 0, 0);
				this.sashGroup.rotation.y =
					side * directionSign * amount * (Math.PI / 2);
			}
			return;
		}

		const trackOffset = this.thickness / 2 + 0.012;
		this.sashGroup.position.set(-panelWidth / 2, 0, trackOffset);
		this.secondarySashGroup.position.set(panelWidth / 2, 0, -trackOffset);
		if (this.hingeSide === "left") {
			this.sashGroup.position.x += panelWidth * amount;
		} else {
			this.secondarySashGroup.position.x -= panelWidth * amount;
		}
	}
}
