import type {Mesh} from "three";

import {
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const STANDING_DESK_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] =
	[
		furnitureNumber(
			"width",
			"furnitureWidth",
			"furnitureWidthTooltip",
			1.4,
			0.6,
			4,
		),
		furnitureNumber(
			"depth",
			"furnitureDepth",
			"furnitureDepthTooltip",
			0.7,
			0.4,
			2,
		),
		furnitureNumber(
			"height",
			"furnitureHeight",
			"furnitureHeightTooltip",
			1.1,
			0.65,
			1.5,
		),
		furnitureNumber(
			"topThickness",
			"furnitureTopThickness",
			"furnitureTopThicknessTooltip",
			0.04,
			0.02,
			0.15,
		),
		furnitureNumber(
			"legThickness",
			"furnitureLegThickness",
			"furnitureLegThicknessTooltip",
			0.08,
			0.04,
			0.2,
		),
		furnitureNumber(
			"legInset",
			"furnitureLegInset",
			"furnitureLegInsetTooltip",
			0.15,
			0,
			0.8,
		),
	];

export class StandingDeskObject extends FurnitureObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb58b5b) {
		super(
			"standing-desk",
			"Standing Desk",
			"furnitureStandingDeskParameters",
			STANDING_DESK_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const leg = Math.min(p.legThickness, p.width * 0.15, p.depth * 0.2);
		const footHeight = 0.04;
		const columnHeight = p.height - p.topThickness - footHeight;
		const legX = Math.max(leg / 2, p.width / 2 - leg * 0.75 - p.legInset);
		this.addBox(
			"Desk Top",
			[p.width, p.topThickness, p.depth],
			[0, p.height - p.topThickness / 2, 0],
			material,
		);
		for (const side of [-1, 1]) {
			this.addBox(
				"Desk Foot",
				[leg * 1.5, footHeight, p.depth * 0.85],
				[side * legX, footHeight / 2, 0],
				material,
			);
			this.addBox(
				"Desk Lower Column",
				[leg, columnHeight * 0.55, leg],
				[side * legX, footHeight + columnHeight * 0.275, 0],
				material,
			);
			this.addBox(
				"Desk Upper Column",
				[leg * 0.75, columnHeight * 0.5, leg * 0.75],
				[side * legX, footHeight + columnHeight * 0.75, 0],
				material,
			);
			this.addBox(
				"Desk Top Support",
				[leg, 0.04, p.depth * 0.8],
				[side * legX, p.height - p.topThickness - 0.02, 0],
				material,
			);
		}
		this.addBox(
			"Desk Crossbar",
			[legX * 2, leg, leg],
			[0, p.height - p.topThickness - leg / 2 - 0.04, 0],
			material,
		);
	}
}
