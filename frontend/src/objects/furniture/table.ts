import type {Mesh} from "three";

import {
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const TABLE_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber("width", "furnitureWidth", "furnitureWidthTooltip", 1.6, 0.4, 6),
	furnitureNumber("depth", "furnitureDepth", "furnitureDepthTooltip", 0.8, 0.3, 3),
	furnitureNumber("height", "furnitureHeight", "furnitureHeightTooltip", 0.75, 0.3, 1.5),
	furnitureNumber("topThickness", "furnitureTopThickness", "furnitureTopThicknessTooltip", 0.06, 0.02, 0.3),
	furnitureNumber("legThickness", "furnitureLegThickness", "furnitureLegThicknessTooltip", 0.08, 0.02, 0.4),
	furnitureNumber("legInset", "furnitureLegInset", "furnitureLegInsetTooltip", 0.08, 0, 0.8),
];

const DEFAULT_TABLE_COLOR = 0x8b5e3c;

export class TableObject extends FurnitureObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = DEFAULT_TABLE_COLOR,
	) {
		super(
			"table",
			"Table",
			"furnitureTableParameters",
			TABLE_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const topThickness = Math.min(p.topThickness, p.height * 0.45);
		const legHeight = Math.max(0.02, p.height - topThickness);
		const legThickness = Math.min(p.legThickness, p.width * 0.3, p.depth * 0.3);
		const insetX = Math.min(
			p.legInset,
			Math.max(0, p.width / 2 - legThickness / 2),
		);
		const insetZ = Math.min(
			p.legInset,
			Math.max(0, p.depth / 2 - legThickness / 2),
		);
		const legX = Math.max(0, p.width / 2 - legThickness / 2 - insetX);
		const legZ = Math.max(0, p.depth / 2 - legThickness / 2 - insetZ);

		this.addBox(
			"Table Top",
			[p.width, topThickness, p.depth],
			[0, p.height - topThickness / 2, 0],
			material,
		);
		for (const x of [-legX, legX]) {
			for (const z of [-legZ, legZ]) {
				this.addBox(
					"Table Leg",
					[legThickness, legHeight, legThickness],
					[x, legHeight / 2, z],
					material,
				);
			}
		}
	}
}
