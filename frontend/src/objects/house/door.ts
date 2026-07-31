import {
	BoxGeometry,
	Color,
	CylinderGeometry,
	ExtrudeGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
	Path,
	Shape,
	SphereGeometry,
} from "three";

import {markObjectInternal} from "../../utils/internal-object.js";
import {DTObject} from "../dt-object.js";

export type DoorDimensions = {
	width: number;
	height: number;
	thickness: number;
};

export type DoorCustomization = {
	operationType: "hinged" | "sliding";
	panelCount: 1 | 2;
	openAmount: number;
	hingeSide: "left" | "right";
	openingDirection: "inward" | "outward";
	knobStyle: "none" | "round" | "lever" | "bar";
	knobColor: string;
	borderEnabled: boolean;
	borderWidth: number;
	borderDepth: number;
	borderColor: string;
	windowEnabled: boolean;
	windowWidth: number;
	windowHeight: number;
	windowPositionX: number;
	windowPositionY: number;
	windowBorderWidth: number;
	windowColor: string;
	windowOpacity: number;
};

const DEFAULT_DOOR_DIMENSIONS: DoorDimensions = {
	width: 0.9,
	height: 2.1,
	thickness: 0.08,
};

const DEFAULT_DOOR_CUSTOMIZATION: DoorCustomization = {
	operationType: "hinged",
	panelCount: 1,
	openAmount: 0,
	hingeSide: "left",
	openingDirection: "inward",
	knobStyle: "round",
	knobColor: "#b8a06a",
	borderEnabled: true,
	borderWidth: 0.08,
	borderDepth: 0.04,
	borderColor: "#f2f0e9",
	windowEnabled: false,
	windowWidth: 0.35,
	windowHeight: 0.55,
	windowPositionX: 0,
	windowPositionY: 1.45,
	windowBorderWidth: 0.035,
	windowColor: "#8fc7e8",
	windowOpacity: 0.55,
};

const DEFAULT_DOOR_COLOR = 0x7a4e2f;

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

export class DoorObject extends DTObject {
	public width: number;

	public height: number;

	public thickness: number;

	public open = false;

	public operationType: DoorCustomization["operationType"];

	public panelCount: DoorCustomization["panelCount"];

	/**
	 * Door opening percentage: 0 is closed and 100 is fully open.
	 */
	public openAmount: number;

	public hingeSide: DoorCustomization["hingeSide"];

	public openingDirection: DoorCustomization["openingDirection"];

	public knobStyle: DoorCustomization["knobStyle"];

	public knobColor: string;

	public borderEnabled: boolean;

	public borderWidth: number;

	public borderDepth: number;

	public borderColor: string;

	public windowEnabled: boolean;

	public windowWidth: number;

	public windowHeight: number;

	public windowPositionX: number;

	public windowPositionY: number;

	public windowBorderWidth: number;

	public windowColor: string;

	public windowOpacity: number;

	/**
	 * Group whose origin is the configured hinge edge.
	 */
	public hingeGroup: Group;

	/**
	 * Main door panel mesh. It remains the primary material target.
	 */
	public doorMesh: Mesh;

	private secondaryPanelGroup: Group;

	private secondaryDoorMesh: Mesh;

	private borderGroup: Group;

	private hardwareGroup: Group;

	private secondaryHardwareGroup: Group;

	private doorWindowGroup: Group;

	private secondaryDoorWindowGroup: Group;

	private borderMaterial: MeshStandardMaterial;

	private knobMaterial: MeshStandardMaterial;

	private windowBorderMaterial: MeshStandardMaterial;

	private windowMaterial: MeshStandardMaterial;

	constructor(
		dimensions: Partial<DoorDimensions> = {},
		color = DEFAULT_DOOR_COLOR,
		customization: Partial<DoorCustomization> = {},
	) {
		super();

		this.width = dimensions.width ?? DEFAULT_DOOR_DIMENSIONS.width;
		this.height = dimensions.height ?? DEFAULT_DOOR_DIMENSIONS.height;
		this.thickness = dimensions.thickness ?? DEFAULT_DOOR_DIMENSIONS.thickness;

		this.operationType =
			customization.operationType ?? DEFAULT_DOOR_CUSTOMIZATION.operationType;
		this.panelCount =
			customization.panelCount === 2 ? 2 : DEFAULT_DOOR_CUSTOMIZATION.panelCount;
		this.openAmount = Math.min(
			100,
			Math.max(
				0,
				customization.openAmount ?? DEFAULT_DOOR_CUSTOMIZATION.openAmount,
			),
		);
		this.hingeSide =
			customization.hingeSide ?? DEFAULT_DOOR_CUSTOMIZATION.hingeSide;
		this.openingDirection =
			customization.openingDirection ??
			DEFAULT_DOOR_CUSTOMIZATION.openingDirection;
		this.knobStyle =
			customization.knobStyle ?? DEFAULT_DOOR_CUSTOMIZATION.knobStyle;
		this.knobColor =
			customization.knobColor ?? DEFAULT_DOOR_CUSTOMIZATION.knobColor;
		this.borderEnabled =
			customization.borderEnabled ?? DEFAULT_DOOR_CUSTOMIZATION.borderEnabled;
		this.borderWidth =
			customization.borderWidth ?? DEFAULT_DOOR_CUSTOMIZATION.borderWidth;
		this.borderDepth =
			customization.borderDepth ?? DEFAULT_DOOR_CUSTOMIZATION.borderDepth;
		this.borderColor =
			customization.borderColor ?? DEFAULT_DOOR_CUSTOMIZATION.borderColor;
		this.windowEnabled =
			customization.windowEnabled ?? DEFAULT_DOOR_CUSTOMIZATION.windowEnabled;
		this.windowWidth =
			customization.windowWidth ?? DEFAULT_DOOR_CUSTOMIZATION.windowWidth;
		this.windowHeight =
			customization.windowHeight ?? DEFAULT_DOOR_CUSTOMIZATION.windowHeight;
		this.windowPositionX =
			customization.windowPositionX ??
			DEFAULT_DOOR_CUSTOMIZATION.windowPositionX;
		this.windowPositionY =
			customization.windowPositionY ??
			DEFAULT_DOOR_CUSTOMIZATION.windowPositionY;
		this.windowBorderWidth =
			customization.windowBorderWidth ??
			DEFAULT_DOOR_CUSTOMIZATION.windowBorderWidth;
		this.windowColor =
			customization.windowColor ?? DEFAULT_DOOR_CUSTOMIZATION.windowColor;
		this.windowOpacity =
			customization.windowOpacity ?? DEFAULT_DOOR_CUSTOMIZATION.windowOpacity;

		this.name = "Door";
		this.userData.meshType = "door";

		this.hingeGroup = markObjectInternal(new Group());
		this.hingeGroup.name = "Door Hinge";
		this.add(this.hingeGroup);

		const material = new MeshStandardMaterial({color});
		this.doorMesh = markObjectInternal(
			new Mesh(new BoxGeometry(1, 1, 1), material),
		);
		this.doorMesh.name = "Door Panel";
		this.doorMesh.userData.ownerMaterialTarget = true;
		this.hingeGroup.add(this.doorMesh);

		this.secondaryPanelGroup = markObjectInternal(new Group());
		this.secondaryPanelGroup.name = "Door Secondary Panel";
		this.add(this.secondaryPanelGroup);
		this.secondaryDoorMesh = markObjectInternal(
			new Mesh(new BoxGeometry(1, 1, 1), this.doorMesh.material),
		);
		this.secondaryDoorMesh.name = "Door Panel 2";
		this.secondaryPanelGroup.add(this.secondaryDoorMesh);

		this.borderGroup = markObjectInternal(new Group());
		this.borderGroup.name = "Door Border";
		this.add(this.borderGroup);

		this.hardwareGroup = markObjectInternal(new Group());
		this.hardwareGroup.name = "Door Hardware";
		this.hingeGroup.add(this.hardwareGroup);

		this.secondaryHardwareGroup = markObjectInternal(new Group());
		this.secondaryHardwareGroup.name = "Door Hardware 2";
		this.secondaryPanelGroup.add(this.secondaryHardwareGroup);

		this.doorWindowGroup = markObjectInternal(new Group());
		this.doorWindowGroup.name = "Door Window";
		this.hingeGroup.add(this.doorWindowGroup);

		this.secondaryDoorWindowGroup = markObjectInternal(new Group());
		this.secondaryDoorWindowGroup.name = "Door Window 2";
		this.secondaryPanelGroup.add(this.secondaryDoorWindowGroup);

		this.borderMaterial = new MeshStandardMaterial({color: this.borderColor});
		this.knobMaterial = new MeshStandardMaterial({
			color: this.knobColor,
			metalness: 0.65,
			roughness: 0.28,
		});
		this.windowBorderMaterial = new MeshStandardMaterial({
			color: this.borderColor,
		});
		this.windowMaterial = new MeshStandardMaterial({
			color: this.windowColor,
			transparent: true,
			opacity: this.windowOpacity,
			roughness: 0.1,
			metalness: 0.05,
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
		if (this.secondaryDoorMesh.material !== this.doorMesh.material) {
			this.secondaryDoorMesh.material = this.doorMesh.material;
		}
	}

	/**
	 * Apply one inspector setting and rebuild the dependent geometry.
	 */
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
			(attribute === "operationType" &&
				(value === "hinged" || value === "sliding")) ||
			(attribute === "hingeSide" && (value === "left" || value === "right")) ||
			(attribute === "openingDirection" &&
				(value === "inward" || value === "outward")) ||
			(attribute === "knobStyle" &&
				(value === "none" ||
					value === "round" ||
					value === "lever" ||
					value === "bar"))
		) {
			(this as any)[attribute] = value;
			this.updateGeometry();
			this.setOpenAmount(this.openAmount);
			return true;
		}
		if (attribute === "panelCount") {
			const count = Number(value);
			if (count !== 1 && count !== 2) return false;
			this.panelCount = count;
			this.updateGeometry();
			this.setOpenAmount(this.openAmount);
			return true;
		}

		if (attribute === "borderEnabled" || attribute === "windowEnabled") {
			(this as any)[attribute] = Boolean(value);
			this.updateGeometry();
			return true;
		}

		if (
			attribute === "knobColor" ||
			attribute === "borderColor" ||
			attribute === "windowColor"
		) {
			if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
				return false;
			}
			(this as any)[attribute] = value;
			this.updateGeometry();
			return true;
		}

		const numericAttributes = new Set([
			"width",
			"height",
			"thickness",
			"borderWidth",
			"borderDepth",
			"windowWidth",
			"windowHeight",
			"windowPositionX",
			"windowPositionY",
			"windowBorderWidth",
			"windowOpacity",
			"openAmount",
		]);
		if (!numericAttributes.has(attribute)) {
			return false;
		}
		const number = Number(value);
		if (!Number.isFinite(number)) {
			return false;
		}
		if (
			(attribute === "width" ||
				attribute === "height" ||
				attribute === "thickness" ||
				attribute === "windowWidth" ||
				attribute === "windowHeight") &&
			number <= 0
		) {
			return false;
		}
		if (
			attribute !== "windowPositionX" &&
			attribute !== "windowPositionY" &&
			number < 0
		) {
			return false;
		}
		(this as any)[attribute] =
			attribute === "windowOpacity" ? Math.min(1, Math.max(0, number)) : number;
		this.updateGeometry();
		this.setOpenAmount(this.openAmount);
		return true;
	}

	public getCustomization(): DoorCustomization {
		return {
			operationType: this.operationType,
			panelCount: this.panelCount,
			openAmount: this.openAmount,
			hingeSide: this.hingeSide,
			openingDirection: this.openingDirection,
			knobStyle: this.knobStyle,
			knobColor: this.knobColor,
			borderEnabled: this.borderEnabled,
			borderWidth: this.borderWidth,
			borderDepth: this.borderDepth,
			borderColor: this.borderColor,
			windowEnabled: this.windowEnabled,
			windowWidth: this.windowWidth,
			windowHeight: this.windowHeight,
			windowPositionX: this.windowPositionX,
			windowPositionY: this.windowPositionY,
			windowBorderWidth: this.windowBorderWidth,
			windowColor: this.windowColor,
			windowOpacity: this.windowOpacity,
		};
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		if (source instanceof DoorObject) {
			this.width = source.width;
			this.height = source.height;
			this.thickness = source.thickness;
			this.open = source.open;
			this.openAmount = source.openAmount;
			Object.assign(this, source.getCustomization());
			this.doorMesh.material = Array.isArray(source.doorMesh.material)
				? source.doorMesh.material.map((material) => material.clone())
				: source.doorMesh.material.clone();
			this.secondaryDoorMesh.material = this.doorMesh.material;
		}

		this.updateGeometry();
		this.setOpenAmount(this.openAmount);
		if (recursive) {
			for (const child of source.children) {
				if (
					child === source.hingeGroup ||
					child === source.secondaryPanelGroup ||
					child === source.borderGroup ||
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
		this.clampWindow();
		this.updatePanelGeometry();
		this.updateBorderGeometry();
		this.updateHardwareGeometry();
		this.updateWindowGeometry();
		this.applyOpeningTransform();
		for (const group of [
			this.hingeGroup,
			this.secondaryPanelGroup,
			this.borderGroup,
		]) {
			markObjectInternal(group, true);
		}
	}

	private clampWindow(): void {
		const margin = 0.08;
		const panelWidth = this.width / this.panelCount;
		this.windowWidth = Math.min(
			Math.max(0.05, this.windowWidth),
			Math.max(0.05, panelWidth - margin * 2),
		);
		this.windowHeight = Math.min(
			Math.max(0.05, this.windowHeight),
			Math.max(0.05, this.height - margin * 2),
		);
		const halfAvailableX = Math.max(
			0,
			(panelWidth - this.windowWidth) / 2 - margin,
		);
		this.windowPositionX = Math.min(
			halfAvailableX,
			Math.max(-halfAvailableX, this.windowPositionX),
		);
		const halfWindow = this.windowHeight / 2;
		this.windowPositionY = Math.min(
			this.height - margin - halfWindow,
			Math.max(margin + halfWindow, this.windowPositionY),
		);
	}

	private updatePanelGeometry(): void {
		const panelWidth = this.width / this.panelCount;
		const primaryGeometry = this.createPanelGeometry(panelWidth);
		this.doorMesh.geometry.dispose();
		this.doorMesh.geometry = primaryGeometry;
		this.secondaryDoorMesh.geometry.dispose();
		this.secondaryDoorMesh.geometry = this.createPanelGeometry(panelWidth);
		this.secondaryDoorMesh.material = this.doorMesh.material;
		this.secondaryPanelGroup.visible = this.panelCount === 2;

		if (this.operationType === "hinged") {
			if (this.panelCount === 2) {
				this.hingeGroup.position.set(-this.width / 2, this.height / 2, 0);
				this.doorMesh.position.set(panelWidth / 2, 0, 0);
				this.secondaryPanelGroup.position.set(
					this.width / 2,
					this.height / 2,
					0,
				);
				this.secondaryDoorMesh.position.set(-panelWidth / 2, 0, 0);
			} else {
				const hingeX =
					this.hingeSide === "left" ? -this.width / 2 : this.width / 2;
				const panelOffset =
					this.hingeSide === "left" ? this.width / 2 : -this.width / 2;
				this.hingeGroup.position.set(hingeX, this.height / 2, 0);
				this.doorMesh.position.set(panelOffset, 0, 0);
			}
		} else {
			if (this.panelCount === 2) {
				this.hingeGroup.position.set(-panelWidth / 2, this.height / 2, 0);
				this.secondaryPanelGroup.position.set(
					panelWidth / 2,
					this.height / 2,
					0,
				);
			} else {
				this.hingeGroup.position.set(0, this.height / 2, 0);
			}
			this.doorMesh.position.set(0, 0, 0);
			this.secondaryDoorMesh.position.set(0, 0, 0);
		}
	}

	private createPanelGeometry(panelWidth: number) {
		if (this.windowEnabled) {
			const shape = new Shape();
			shape.moveTo(-panelWidth / 2, -this.height / 2);
			shape.lineTo(panelWidth / 2, -this.height / 2);
			shape.lineTo(panelWidth / 2, this.height / 2);
			shape.lineTo(-panelWidth / 2, this.height / 2);
			shape.closePath();

			const windowY = this.windowPositionY - this.height / 2;
			const hole = new Path();
			hole.moveTo(
				this.windowPositionX - this.windowWidth / 2,
				windowY - this.windowHeight / 2,
			);
			hole.lineTo(
				this.windowPositionX + this.windowWidth / 2,
				windowY - this.windowHeight / 2,
			);
			hole.lineTo(
				this.windowPositionX + this.windowWidth / 2,
				windowY + this.windowHeight / 2,
			);
			hole.lineTo(
				this.windowPositionX - this.windowWidth / 2,
				windowY + this.windowHeight / 2,
			);
			hole.closePath();
			shape.holes.push(hole);
			const geometry = new ExtrudeGeometry(shape, {
				depth: this.thickness,
				bevelEnabled: false,
			});
			geometry.translate(0, 0, -this.thickness / 2);
			return geometry;
		}
		return new BoxGeometry(panelWidth, this.height, this.thickness);
	}

	private updateBorderGeometry(): void {
		disposeGroupGeometry(this.borderGroup);
		this.borderGroup.visible = this.borderEnabled;
		if (!this.borderEnabled) {
			return;
		}
		this.borderMaterial.color = new Color(this.borderColor);
		const depth = this.thickness + this.borderDepth * 2;
		const sideGeometry = new BoxGeometry(
			this.borderWidth,
			this.height + this.borderWidth,
			depth,
		);
		for (const side of [-1, 1]) {
			const mesh = new Mesh(sideGeometry.clone(), this.borderMaterial);
			mesh.position.set(
				side * (this.width / 2 + this.borderWidth / 2),
				this.height / 2,
				0,
			);
			this.borderGroup.add(mesh);
		}
		sideGeometry.dispose();
		const top = new Mesh(
			new BoxGeometry(
				this.width + this.borderWidth * 2,
				this.borderWidth,
				depth,
			),
			this.borderMaterial,
		);
		top.position.set(0, this.height + this.borderWidth / 2, 0);
		this.borderGroup.add(top);
	}

	private updateHardwareGeometry(): void {
		disposeGroupGeometry(this.hardwareGroup);
		disposeGroupGeometry(this.secondaryHardwareGroup);
		if (this.knobStyle === "none") {
			return;
		}
		this.knobMaterial.color = new Color(this.knobColor);
		const panelWidth = this.width / this.panelCount;
		const primaryPanelCenter =
			this.operationType === "hinged"
				? this.panelCount === 2
					? panelWidth / 2
					: this.hingeSide === "left"
						? this.width / 2
						: -this.width / 2
				: 0;
		const primaryHandleSide =
			this.panelCount === 2 ? 1 : this.hingeSide === "left" ? 1 : -1;
		this.addHardwareToGroup(
			this.hardwareGroup,
			primaryPanelCenter,
			panelWidth,
			primaryHandleSide,
		);
		if (this.panelCount === 2) {
			const secondaryPanelCenter =
				this.operationType === "hinged" ? -panelWidth / 2 : 0;
			this.addHardwareToGroup(
				this.secondaryHardwareGroup,
				secondaryPanelCenter,
				panelWidth,
				-1,
			);
		}
	}

	private addHardwareToGroup(
		group: Group,
		panelCenter: number,
		panelWidth: number,
		handleSide: number,
	): void {
		const x =
			panelCenter +
			handleSide * Math.max(0.04, panelWidth / 2 - Math.min(0.16, panelWidth / 4));
		const y = Math.min(1, this.height * 0.48) - this.height / 2;
		for (const face of [-1, 1]) {
			const z = face * (this.thickness / 2 + 0.035);
			const stem = new Mesh(
				new CylinderGeometry(0.014, 0.014, 0.07, 12),
				this.knobMaterial,
			);
			stem.rotation.x = Math.PI / 2;
			stem.position.set(x, y, z - face * 0.025);
			group.add(stem);

			let handle: Mesh;
			if (this.knobStyle === "round") {
				handle = new Mesh(new SphereGeometry(0.045, 16, 12), this.knobMaterial);
			} else if (this.knobStyle === "lever") {
				handle = new Mesh(
					new CylinderGeometry(0.016, 0.016, 0.13, 12),
					this.knobMaterial,
				);
				handle.rotation.z = Math.PI / 2;
			} else {
				handle = new Mesh(
					new BoxGeometry(0.16, 0.025, 0.028),
					this.knobMaterial,
				);
			}
			handle.position.set(x, y, z);
			group.add(handle);
		}
	}

	private updateWindowGeometry(): void {
		disposeGroupGeometry(this.doorWindowGroup);
		disposeGroupGeometry(this.secondaryDoorWindowGroup);
		this.doorWindowGroup.visible = this.windowEnabled;
		this.secondaryDoorWindowGroup.visible =
			this.windowEnabled && this.panelCount === 2;
		if (!this.windowEnabled) {
			return;
		}

		this.windowMaterial.color = new Color(this.windowColor);
		this.windowMaterial.opacity = this.windowOpacity;
		this.windowMaterial.needsUpdate = true;
		this.windowBorderMaterial.color = new Color(this.borderColor);

		const panelWidth = this.width / this.panelCount;
		const primaryPanelCenter =
			this.operationType === "hinged"
				? this.panelCount === 2
					? panelWidth / 2
					: this.hingeSide === "left"
						? this.width / 2
						: -this.width / 2
				: 0;
		this.addWindowToGroup(
			this.doorWindowGroup,
			primaryPanelCenter + this.windowPositionX,
		);
		if (this.panelCount === 2) {
			const secondaryPanelCenter =
				this.operationType === "hinged" ? -panelWidth / 2 : 0;
			this.addWindowToGroup(
				this.secondaryDoorWindowGroup,
				secondaryPanelCenter + this.windowPositionX,
			);
		}
	}

	private addWindowToGroup(group: Group, centerX: number): void {
		const centerY = this.windowPositionY - this.height / 2;
		const glass = new Mesh(
			new BoxGeometry(
				this.windowWidth,
				this.windowHeight,
				Math.max(0.01, this.thickness * 0.35),
			),
			this.windowMaterial,
		);
		glass.name = "Door Window Glass";
		glass.position.set(centerX, centerY, 0);
		group.add(glass);

		const border = Math.min(
			this.windowBorderWidth,
			this.windowWidth / 3,
			this.windowHeight / 3,
		);
		const borderDepth = this.thickness + 0.015;
		if (border <= 0) {
			return;
		}
		for (const side of [-1, 1]) {
			const vertical = new Mesh(
				new BoxGeometry(border, this.windowHeight + border * 2, borderDepth),
				this.windowBorderMaterial,
			);
			vertical.position.set(
				centerX + side * (this.windowWidth / 2 + border / 2),
				centerY,
				0,
			);
			group.add(vertical);

			const horizontal = new Mesh(
				new BoxGeometry(this.windowWidth, border, borderDepth),
				this.windowBorderMaterial,
			);
			horizontal.position.set(
				centerX,
				centerY + side * (this.windowHeight / 2 + border / 2),
				0,
			);
			group.add(horizontal);
		}
	}

	private applyOpeningTransform(): void {
		const amount = this.openAmount / 100;
		const panelWidth = this.width / this.panelCount;
		this.secondaryPanelGroup.visible = this.panelCount === 2;
		this.hingeGroup.rotation.set(0, 0, 0);
		this.secondaryPanelGroup.rotation.set(0, 0, 0);

		if (this.operationType === "hinged") {
			const directionSign = this.openingDirection === "inward" ? 1 : -1;
			if (this.panelCount === 2) {
				this.hingeGroup.position.set(-this.width / 2, this.height / 2, 0);
				this.secondaryPanelGroup.position.set(
					this.width / 2,
					this.height / 2,
					0,
				);
				this.hingeGroup.rotation.y =
					-directionSign * amount * (Math.PI / 2);
				this.secondaryPanelGroup.rotation.y =
					directionSign * amount * (Math.PI / 2);
			} else {
				const hingeSign = this.hingeSide === "left" ? -1 : 1;
				this.hingeGroup.position.set(
					this.hingeSide === "left" ? -this.width / 2 : this.width / 2,
					this.height / 2,
					0,
				);
				this.hingeGroup.rotation.y =
					hingeSign * directionSign * amount * (Math.PI / 2);
			}
			return;
		}

		if (this.panelCount === 2) {
			this.hingeGroup.position.set(
				-panelWidth / 2 - panelWidth * amount,
				this.height / 2,
				0,
			);
			this.secondaryPanelGroup.position.set(
				panelWidth / 2 + panelWidth * amount,
				this.height / 2,
				0,
			);
		} else {
			const direction = this.hingeSide === "left" ? -1 : 1;
			this.hingeGroup.position.set(
				direction * this.width * amount,
				this.height / 2,
				0,
			);
		}
	}
}
