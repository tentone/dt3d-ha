import type {Mesh} from "three";

import {
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const COUCH_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber("width", "furnitureWidth", "furnitureWidthTooltip", 2.1, 0.8, 6),
	furnitureNumber("depth", "furnitureDepth", "furnitureDepthTooltip", 0.9, 0.5, 2),
	furnitureNumber("height", "furnitureHeight", "furnitureHeightTooltip", 0.85, 0.5, 2),
	furnitureNumber("seatHeight", "furnitureSeatHeight", "furnitureSeatHeightTooltip", 0.43, 0.2, 1),
	furnitureNumber("armWidth", "furnitureArmWidth", "furnitureArmWidthTooltip", 0.16, 0.05, 0.5),
	furnitureNumber("cushionThickness", "furnitureCushionThickness", "furnitureCushionThicknessTooltip", 0.14, 0.04, 0.4),
	furnitureNumber("backThickness", "furnitureBackThickness", "furnitureBackThicknessTooltip", 0.16, 0.04, 0.5),
];

const DEFAULT_COUCH_COLOR = 0x5d7180;

export class CouchObject extends FurnitureObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = DEFAULT_COUCH_COLOR,
	) {
		super(
			"couch",
			"Couch",
			"furnitureCouchParameters",
			COUCH_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const armWidth = Math.min(p.armWidth, p.width * 0.3);
		const backThickness = Math.min(p.backThickness, p.depth * 0.4);
		const cushionThickness = Math.min(p.cushionThickness, p.seatHeight * 0.6);
		const seatHeight = Math.min(p.seatHeight, p.height - 0.08);
		const baseThickness = Math.max(0.08, seatHeight - cushionThickness - 0.07);
		const innerWidth = Math.max(0.1, p.width - armWidth * 2);
		const seatDepth = Math.max(0.1, p.depth - backThickness - 0.06);
		const baseY = 0.07 + baseThickness / 2;

		this.addBox(
			"Couch Seat Cushion",
			[innerWidth, cushionThickness, seatDepth],
			[0, seatHeight - cushionThickness / 2, (p.depth - seatDepth) / 2],
			material,
		);
		this.addBox(
			"Couch Base",
			[innerWidth, baseThickness, seatDepth],
			[0, baseY, (p.depth - seatDepth) / 2],
			material,
		);
		const armHeight = Math.max(0.1, Math.min(p.height * 0.72, p.height - 0.07));
		for (const side of [-1, 1]) {
			this.addBox(
				"Couch Arm",
				[armWidth, armHeight, p.depth],
				[side * (p.width / 2 - armWidth / 2), 0.07 + armHeight / 2, 0],
				material,
			);
		}
		const backHeight = Math.max(0.1, p.height - seatHeight + cushionThickness);
		this.addBox(
			"Couch Back",
			[innerWidth, backHeight, backThickness],
			[0, p.height - backHeight / 2, -p.depth / 2 + backThickness / 2],
			material,
		);
		const legSize = Math.min(0.08, armWidth * 0.5);
		for (const x of [-p.width / 2 + armWidth / 2, p.width / 2 - armWidth / 2]) {
			for (const z of [-p.depth / 2 + 0.1, p.depth / 2 - 0.1]) {
				this.addBox(
					"Couch Leg",
					[legSize, 0.07, legSize],
					[x, 0.035, z],
					material,
				);
			}
		}
	}
}
