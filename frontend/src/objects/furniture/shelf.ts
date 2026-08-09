import type {Mesh} from "three";

import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const SHELF_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber("width", "furnitureWidth", "furnitureWidthTooltip", 1, 0.3, 4),
	furnitureNumber("depth", "furnitureDepth", "furnitureDepthTooltip", 0.32, 0.15, 1.5),
	furnitureNumber("height", "furnitureHeight", "furnitureHeightTooltip", 1.8, 0.4, 4),
	furnitureNumber("thickness", "furnitureBoardThickness", "furnitureBoardThicknessTooltip", 0.04, 0.015, 0.2),
	furnitureInteger("shelfCount", "furnitureShelfCount", "furnitureShelfCountTooltip", 5, 2, 20),
	furnitureBoolean("backEnabled", "furnitureBackEnabled", "furnitureBackEnabledTooltip", false),
];

const DEFAULT_SHELF_COLOR = 0xa7794f;

export class ShelfObject extends FurnitureObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = DEFAULT_SHELF_COLOR,
	) {
		super(
			"shelf",
			"Shelf",
			"furnitureShelfParameters",
			SHELF_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number | boolean>;
		const width = p.width as number;
		const depth = p.depth as number;
		const height = p.height as number;
		const thickness = Math.min(
			p.thickness as number,
			width * 0.3,
			depth * 0.4,
			height * 0.2,
		);
		const shelfCount = p.shelfCount as number;

		this.addBox(
			"Shelf Board",
			[width, thickness, depth],
			[0, thickness / 2, 0],
			material,
		);
		for (let index = 1; index < shelfCount; index += 1) {
			const y =
				thickness / 2 + (index / (shelfCount - 1)) * (height - thickness);
			this.addBox(
				"Shelf Board",
				[width, thickness, depth],
				[0, y, 0],
				material,
			);
		}
		for (const x of [-width / 2 + thickness / 2, width / 2 - thickness / 2]) {
			this.addBox(
				"Shelf Side",
				[thickness, height, depth],
				[x, height / 2, 0],
				material,
			);
		}
		if (p.backEnabled) {
			this.addBox(
				"Shelf Back",
				[width, height, thickness],
				[0, height / 2, -depth / 2 + thickness / 2],
				material,
			);
		}
	}
}
