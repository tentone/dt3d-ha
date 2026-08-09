import type {Mesh} from "three";

import {
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const CHAIR_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber("width", "furnitureWidth", "furnitureWidthTooltip", 0.48, 0.3, 1.5),
	furnitureNumber("depth", "furnitureDepth", "furnitureDepthTooltip", 0.52, 0.3, 1.5),
	furnitureNumber("height", "furnitureHeight", "furnitureHeightTooltip", 0.9, 0.5, 2),
	furnitureNumber("seatHeight", "furnitureSeatHeight", "furnitureSeatHeightTooltip", 0.46, 0.2, 1.2),
	furnitureNumber("seatThickness", "furnitureSeatThickness", "furnitureSeatThicknessTooltip", 0.05, 0.02, 0.3),
	furnitureNumber("legThickness", "furnitureLegThickness", "furnitureLegThicknessTooltip", 0.045, 0.02, 0.25),
	furnitureNumber("backThickness", "furnitureBackThickness", "furnitureBackThicknessTooltip", 0.05, 0.02, 0.3),
];

const DEFAULT_CHAIR_COLOR = 0x8b5e3c;

export class ChairObject extends FurnitureObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = DEFAULT_CHAIR_COLOR,
	) {
		super(
			"chair",
			"Chair",
			"furnitureChairParameters",
			CHAIR_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const seatThickness = Math.min(p.seatThickness, p.seatHeight * 0.45);
		const seatHeight = Math.min(p.seatHeight, p.height - seatThickness - 0.05);
		const legHeight = Math.max(0.02, seatHeight - seatThickness);
		const legThickness = Math.min(
			p.legThickness,
			p.width * 0.25,
			p.depth * 0.25,
		);
		const backThickness = Math.min(p.backThickness, p.depth * 0.4);
		const legX = Math.max(0, p.width / 2 - legThickness / 2 - 0.025);
		const legZ = Math.max(0, p.depth / 2 - legThickness / 2 - 0.025);

		this.addBox(
			"Chair Seat",
			[p.width, seatThickness, p.depth],
			[0, seatHeight - seatThickness / 2, 0],
			material,
		);
		for (const x of [-legX, legX]) {
			for (const z of [-legZ, legZ]) {
				this.addBox(
					"Chair Leg",
					[legThickness, legHeight, legThickness],
					[x, legHeight / 2, z],
					material,
				);
			}
		}
		const backHeight = Math.max(0.05, p.height - seatHeight);
		this.addBox(
			"Chair Back",
			[p.width, backHeight, backThickness],
			[0, seatHeight + backHeight / 2, -p.depth / 2 + backThickness / 2],
			material,
		);
	}
}
