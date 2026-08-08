import {
	BoxGeometry,
	type BufferGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
} from "three";
import {mergeGeometries} from "three/examples/jsm/utils/BufferGeometryUtils.js";

import {markObjectInternal} from "../../utils/internal-object.js";
import {DTObject} from "../dt-object.js";
import {
	getHaOpeningPercentage,
	type HaEntityState,
	normalizeOpeningEntityId,
} from "./ha-opening-state.js";

export type GateDimensions = {
	width: number;
	height: number;
	thickness: number;
};

export type GateCustomization = {
	operationType: "hinged" | "sliding";
	panelCount: 1 | 2;
	style: "solid" | "verticalBars";
	openAmount: number;
	openEntityId: string;
	hingeSide: "left" | "right";
	openingDirection: "inward" | "outward";
	barWidth: number;
	barSpacing: number;
};

const DEFAULT_GATE_DIMENSIONS: GateDimensions = {
	width: 2.4,
	height: 2.0,
	thickness: 0.06,
};

const DEFAULT_GATE_CUSTOMIZATION: GateCustomization = {
	operationType: "hinged",
	panelCount: 2,
	style: "solid",
	openAmount: 0,
	openEntityId: "",
	hingeSide: "left",
	openingDirection: "inward",
	barWidth: 0.05,
	barSpacing: 0.12,
};

const DEFAULT_GATE_COLOR = 0x454b50;

/** A wall-mounted gate whose opening always continues to the top of its wall. */
export class GateObject extends DTObject {
	public width: number;

	public height: number;

	public thickness: number;

	public open = false;

	public operationType: GateCustomization["operationType"];

	public panelCount: GateCustomization["panelCount"];

	public style: GateCustomization["style"];

	/** Gate opening percentage: 0 is closed and 100 is fully open. */
	public openAmount: number;

	/** Optional Home Assistant entity that controls the gate openness. */
	public openEntityId: string;

	public hingeSide: GateCustomization["hingeSide"];

	public openingDirection: GateCustomization["openingDirection"];

	/** Width of the rails and vertical bars in a vertical-bar gate. */
	public barWidth: number;

	/** Desired clear distance between vertical bars. */
	public barSpacing: number;

	/** Primary panel and material target. */
	public gateMesh: Mesh;

	private primaryPanelGroup: Group;

	private secondaryPanelGroup: Group;

	private secondaryGateMesh: Mesh;

	constructor(
		dimensions: Partial<GateDimensions> = {},
		color = DEFAULT_GATE_COLOR,
		customization: Partial<GateCustomization> = {},
	) {
		super();

		this.width = dimensions.width ?? DEFAULT_GATE_DIMENSIONS.width;
		this.height = dimensions.height ?? DEFAULT_GATE_DIMENSIONS.height;
		this.thickness =
			dimensions.thickness ?? DEFAULT_GATE_DIMENSIONS.thickness;
		this.operationType =
			customization.operationType ?? DEFAULT_GATE_CUSTOMIZATION.operationType;
		this.panelCount = customization.panelCount === 1 ? 1 : 2;
		this.style = customization.style ?? DEFAULT_GATE_CUSTOMIZATION.style;
		this.openAmount = Math.min(
			100,
			Math.max(
				0,
				customization.openAmount ?? DEFAULT_GATE_CUSTOMIZATION.openAmount,
			),
		);
		this.openEntityId = normalizeOpeningEntityId(customization.openEntityId);
		this.hingeSide =
			customization.hingeSide ?? DEFAULT_GATE_CUSTOMIZATION.hingeSide;
		this.openingDirection =
			customization.openingDirection ??
			DEFAULT_GATE_CUSTOMIZATION.openingDirection;
		this.barWidth =
			customization.barWidth ?? DEFAULT_GATE_CUSTOMIZATION.barWidth;
		this.barSpacing =
			customization.barSpacing ?? DEFAULT_GATE_CUSTOMIZATION.barSpacing;

		this.name = "Gate";
		this.userData.meshType = "gate";

		this.primaryPanelGroup = markObjectInternal(new Group());
		this.primaryPanelGroup.name = "Gate Panel Group";
		this.add(this.primaryPanelGroup);

		const material = new MeshStandardMaterial({color});
		this.gateMesh = markObjectInternal(
			new Mesh(new BoxGeometry(1, 1, 1), material),
		);
		this.gateMesh.name = "Gate Panel";
		this.gateMesh.userData.ownerMaterialTarget = true;
		this.primaryPanelGroup.add(this.gateMesh);

		this.secondaryPanelGroup = markObjectInternal(new Group());
		this.secondaryPanelGroup.name = "Gate Secondary Panel Group";
		this.add(this.secondaryPanelGroup);
		this.secondaryGateMesh = markObjectInternal(
			new Mesh(new BoxGeometry(1, 1, 1), material),
		);
		this.secondaryGateMesh.name = "Gate Panel 2";
		this.secondaryPanelGroup.add(this.secondaryGateMesh);

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

	/** Apply the latest bound Home Assistant state, if one is configured. */
	public updateFromEntityStates(states: Record<string, HaEntityState>): boolean {
		if (!this.openEntityId) return false;
		const amount = getHaOpeningPercentage(states[this.openEntityId]);
		if (amount === null || amount === this.openAmount) return false;
		this.setOpenAmount(amount);
		return true;
	}

	public override update(_time: number): void {
		if (this.secondaryGateMesh.material !== this.gateMesh.material) {
			this.secondaryGateMesh.material = this.gateMesh.material;
		}
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
		if (attribute === "openEntityId") {
			this.openEntityId = normalizeOpeningEntityId(value);
			return true;
		}
		if (
			(attribute === "operationType" &&
				(value === "hinged" || value === "sliding")) ||
			(attribute === "style" &&
				(value === "solid" || value === "verticalBars")) ||
			(attribute === "hingeSide" && (value === "left" || value === "right")) ||
			(attribute === "openingDirection" &&
				(value === "inward" || value === "outward"))
		) {
			(this as any)[attribute] = value;
			this.updateGeometry();
			return true;
		}
		if (attribute === "panelCount") {
			const count = Number(value);
			if (count !== 1 && count !== 2) return false;
			this.panelCount = count;
			this.updateGeometry();
			return true;
		}

		if (
			attribute !== "width" &&
			attribute !== "height" &&
			attribute !== "thickness" &&
			attribute !== "barWidth" &&
			attribute !== "barSpacing"
		) {
			return false;
		}
		const number = Number(value);
		if (!Number.isFinite(number) || number <= 0) return false;
		(this as any)[attribute] = number;
		this.updateGeometry();
		return true;
	}

	public getCustomization(): GateCustomization {
		return {
			operationType: this.operationType,
			panelCount: this.panelCount,
			style: this.style,
			openAmount: this.openAmount,
			openEntityId: this.openEntityId,
			hingeSide: this.hingeSide,
			openingDirection: this.openingDirection,
			barWidth: this.barWidth,
			barSpacing: this.barSpacing,
		};
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		if (source instanceof GateObject) {
			this.width = source.width;
			this.height = source.height;
			this.thickness = source.thickness;
			this.open = source.open;
			Object.assign(this, source.getCustomization());
			this.gateMesh.material = Array.isArray(source.gateMesh.material)
				? source.gateMesh.material.map((material) => material.clone())
				: source.gateMesh.material.clone();
			this.secondaryGateMesh.material = this.gateMesh.material;
		}

		this.updateGeometry();
		this.setOpenAmount(this.openAmount);
		if (recursive) {
			for (const child of source.children) {
				if (
					child === source.primaryPanelGroup ||
					child === source.secondaryPanelGroup ||
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
		const panelWidth = this.width / this.panelCount;
		this.gateMesh.geometry.dispose();
		this.gateMesh.geometry = this.createPanelGeometry(panelWidth);
		this.secondaryGateMesh.geometry.dispose();
		this.secondaryGateMesh.geometry = this.createPanelGeometry(panelWidth);
		this.secondaryGateMesh.material = this.gateMesh.material;
		this.secondaryPanelGroup.visible = this.panelCount === 2;

		if (this.operationType === "hinged") {
			if (this.panelCount === 2) {
				this.primaryPanelGroup.position.set(-this.width / 2, this.height / 2, 0);
				this.gateMesh.position.set(panelWidth / 2, 0, 0);
				this.secondaryPanelGroup.position.set(
					this.width / 2,
					this.height / 2,
					0,
				);
				this.secondaryGateMesh.position.set(-panelWidth / 2, 0, 0);
			} else {
				const hingeX =
					this.hingeSide === "left" ? -this.width / 2 : this.width / 2;
				const panelOffset =
					this.hingeSide === "left" ? this.width / 2 : -this.width / 2;
				this.primaryPanelGroup.position.set(hingeX, this.height / 2, 0);
				this.gateMesh.position.set(panelOffset, 0, 0);
			}
		} else {
			if (this.panelCount === 2) {
				this.primaryPanelGroup.position.set(-panelWidth / 2, this.height / 2, 0);
				this.secondaryPanelGroup.position.set(
					panelWidth / 2,
					this.height / 2,
					0,
				);
			} else {
				this.primaryPanelGroup.position.set(0, this.height / 2, 0);
			}
			this.gateMesh.position.set(0, 0, 0);
			this.secondaryGateMesh.position.set(0, 0, 0);
		}
		this.applyOpeningTransform();
	}

	private createPanelGeometry(panelWidth: number): BufferGeometry {
		if (this.style === "solid") {
			return new BoxGeometry(panelWidth, this.height, this.thickness);
		}

		const barWidth = Math.min(
			Math.max(0.01, this.barWidth),
			panelWidth / 3,
			this.height / 3,
		);
		const barSpacing = Math.max(0.01, this.barSpacing);
		const parts: BoxGeometry[] = [];
		const addPart = (width: number, height: number, x: number, y: number) => {
			const geometry = new BoxGeometry(width, height, this.thickness);
			geometry.translate(x, y, 0);
			parts.push(geometry);
		};

		// Outer rails keep the individual bars together as a usable gate panel.
		addPart(panelWidth, barWidth, 0, -this.height / 2 + barWidth / 2);
		addPart(panelWidth, barWidth, 0, this.height / 2 - barWidth / 2);
		addPart(barWidth, this.height, -panelWidth / 2 + barWidth / 2, 0);
		addPart(barWidth, this.height, panelWidth / 2 - barWidth / 2, 0);

		const interiorWidth = Math.max(0, panelWidth - barWidth * 2);
		const interiorBarCount = Math.max(
			0,
			Math.floor((interiorWidth + barSpacing) / (barWidth + barSpacing)),
		);
		if (interiorBarCount > 0) {
			const interval = interiorWidth / (interiorBarCount + 1);
			for (let index = 1; index <= interiorBarCount; index += 1) {
				addPart(
					barWidth,
					this.height,
					-panelWidth / 2 + barWidth + interval * index,
					0,
				);
			}
		}

		const geometry = mergeGeometries(parts);
		for (const part of parts) part.dispose();
		return geometry;
	}

	private applyOpeningTransform(): void {
		const amount = this.openAmount / 100;
		const panelWidth = this.width / this.panelCount;
		this.secondaryPanelGroup.visible = this.panelCount === 2;
		this.primaryPanelGroup.rotation.set(0, 0, 0);
		this.secondaryPanelGroup.rotation.set(0, 0, 0);

		if (this.operationType === "hinged") {
			const directionSign = this.openingDirection === "inward" ? 1 : -1;
			if (this.panelCount === 2) {
				this.primaryPanelGroup.position.set(
					-this.width / 2,
					this.height / 2,
					0,
				);
				this.secondaryPanelGroup.position.set(
					this.width / 2,
					this.height / 2,
					0,
				);
				this.primaryPanelGroup.rotation.y =
					-directionSign * amount * (Math.PI / 2);
				this.secondaryPanelGroup.rotation.y =
					directionSign * amount * (Math.PI / 2);
			} else {
				const hingeSign = this.hingeSide === "left" ? -1 : 1;
				this.primaryPanelGroup.position.set(
					this.hingeSide === "left" ? -this.width / 2 : this.width / 2,
					this.height / 2,
					0,
				);
				this.primaryPanelGroup.rotation.y =
					hingeSign * directionSign * amount * (Math.PI / 2);
			}
			return;
		}

		if (this.panelCount === 2) {
			this.primaryPanelGroup.position.set(
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
			this.primaryPanelGroup.position.set(
				direction * this.width * amount,
				this.height / 2,
				0,
			);
		}
	}
}
