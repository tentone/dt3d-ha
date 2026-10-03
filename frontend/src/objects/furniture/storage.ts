import type {Mesh} from "three";

import {
	furnitureInteger,
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

function storageDefinitions(
	width: number,
	depth: number,
	height: number,
	shelves: number,
): FurnitureParameterDefinition[] {
	return [
		furnitureNumber(
			"width",
			"furnitureWidth",
			"furnitureWidthTooltip",
			width,
			0.4,
			4,
		),
		furnitureNumber(
			"depth",
			"furnitureDepth",
			"furnitureDepthTooltip",
			depth,
			0.25,
			1.2,
		),
		furnitureNumber(
			"height",
			"furnitureHeight",
			"furnitureHeightTooltip",
			height,
			0.4,
			3,
		),
		furnitureNumber(
			"thickness",
			"furnitureBoardThickness",
			"furnitureBoardThicknessTooltip",
			0.025,
			0.015,
			0.1,
		),
		furnitureInteger(
			"doorCount",
			"furnitureDoorCount",
			"furnitureDoorCountTooltip",
			2,
			1,
			6,
		),
		furnitureInteger(
			"shelfCount",
			"furnitureInteriorShelfCount",
			"furnitureInteriorShelfCountTooltip",
			shelves,
			0,
			12,
		),
		furnitureNumber(
			"handleSize",
			"furnitureHandleSize",
			"furnitureHandleSizeTooltip",
			0.12,
			0.03,
			0.4,
		),
	];
}

export const WARDROBE_PARAMETER_DEFINITIONS = storageDefinitions(
	1.5,
	0.6,
	2.1,
	3,
);
export const KITCHEN_CABINET_TOP_PARAMETER_DEFINITIONS = storageDefinitions(
	1.2,
	0.35,
	0.7,
	1,
);
export const KITCHEN_CABINET_BOTTOM_PARAMETER_DEFINITIONS = [
	...storageDefinitions(1.2, 0.6, 0.9, 1),
	furnitureNumber(
		"plinthHeight",
		"furniturePlinthHeight",
		"furniturePlinthHeightTooltip",
		0.1,
		0.03,
		0.25,
	),
	furnitureNumber(
		"countertopThickness",
		"furnitureCountertopThickness",
		"furnitureCountertopThicknessTooltip",
		0.04,
		0.02,
		0.15,
	),
];

/** Shared enclosed carcass and front doors for tall and kitchen storage. */
abstract class StorageObject extends FurnitureObject {
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const thickness = Math.min(
			p.thickness,
			p.width * 0.15,
			p.depth * 0.15,
			p.height * 0.1,
		);
		const plinth = Math.min(p.plinthHeight ?? 0, p.height * 0.25);
		const countertop = Math.min(p.countertopThickness ?? 0, p.height * 0.15);
		const height = p.height - plinth - countertop;
		const innerWidth = p.width - thickness * 2;
		const innerHeight = height - thickness * 2;
		const bodyDepth = p.depth - thickness;
		const bodyZ = -thickness / 2;
		const gap = Math.min(0.004, innerHeight * 0.05);
		const doorWidth = (p.width - gap * (p.doorCount + 1)) / p.doorCount;
		for (let index = 0; index < p.doorCount; index += 1) {
			const x = -p.width / 2 + gap + doorWidth / 2 + index * (doorWidth + gap);
			this.addBox(
				"Storage Door",
				[doorWidth, height - gap * 2, thickness],
				[x, plinth + height / 2, p.depth / 2 - thickness / 2],
				material,
			);
			const handleX = x + (index % 2 === 0 ? 1 : -1) * doorWidth * 0.3;
			this.addBox(
				"Storage Handle",
				[
					Math.min(0.02, doorWidth * 0.1),
					Math.min(p.handleSize, innerHeight * 0.5),
					0.025,
				],
				[handleX, plinth + height / 2, p.depth / 2 + 0.0125],
				material,
			);
		}
		for (const side of [-1, 1]) {
			this.addBox(
				"Storage Side",
				[thickness, height, bodyDepth],
				[side * (p.width / 2 - thickness / 2), plinth + height / 2, bodyZ],
				material,
			);
		}
		for (const y of [plinth + thickness / 2, plinth + height - thickness / 2]) {
			this.addBox(
				"Storage Board",
				[innerWidth, thickness, bodyDepth],
				[0, y, bodyZ],
				material,
			);
		}
		this.addBox(
			"Storage Back",
			[innerWidth, innerHeight, thickness],
			[0, plinth + height / 2, -p.depth / 2 + thickness / 2],
			material,
		);
		// Limit board thickness when many shelves share a short carcass.
		const shelfThickness = Math.min(
			thickness,
			(innerHeight / (p.shelfCount + 1)) * 0.5,
		);
		for (let index = 1; index <= p.shelfCount; index += 1) {
			this.addBox(
				"Storage Shelf",
				[innerWidth, shelfThickness, bodyDepth - thickness],
				[0, plinth + thickness + (innerHeight * index) / (p.shelfCount + 1), 0],
				material,
			);
		}
		if (plinth > 0) {
			this.addBox(
				"Kitchen Plinth",
				[p.width - thickness * 2, plinth, p.depth * 0.8],
				[0, plinth / 2, -p.depth * 0.05],
				material,
			);
		}
		if (countertop > 0) {
			this.addBox(
				"Kitchen Countertop",
				[p.width, countertop, p.depth],
				[0, p.height - countertop / 2, 0],
				material,
			);
		}
	}
}

export class WardrobeObject extends StorageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9c7955) {
		super(
			"wardrobe",
			"Wardrobe",
			"furnitureWardrobeParameters",
			WARDROBE_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}
}

export class KitchenCabinetTopObject extends StorageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe8e2d6) {
		super(
			"kitchen-cabinet-top",
			"Kitchen Cabinet (Top)",
			"furnitureKitchenCabinetTopParameters",
			KITCHEN_CABINET_TOP_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}
}

export class KitchenCabinetBottomObject extends StorageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe8e2d6) {
		super(
			"kitchen-cabinet-bottom",
			"Kitchen Cabinet (Bottom)",
			"furnitureKitchenCabinetBottomParameters",
			KITCHEN_CABINET_BOTTOM_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}
}
