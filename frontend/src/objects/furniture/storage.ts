import {
	BedroomWardrobeFrame,
	wardrobeExtras,
	wardrobePreset,
} from "./bedroom/storage.js";
import {
	furnitureInteger,
	furnitureNumber,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";
import {
	basePreset,
	cabinetExtras,
	KitchenCabinetObject,
	wallPreset,
} from "./kitchen/cabinets.js";

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

export class WardrobeObject extends BedroomWardrobeFrame {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9c7955) {
		super(
			"wardrobe",
			"Wardrobe",
			"furnitureWardrobeParameters",
			[wardrobePreset, ...WARDROBE_PARAMETER_DEFINITIONS, ...wardrobeExtras],
			parameters,
			color,
		);
	}
}

export class KitchenCabinetTopObject extends KitchenCabinetObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe8e2d6) {
		super(
			"kitchen-cabinet-top",
			"Kitchen Cabinet (Top)",
			"furnitureKitchenCabinetTopParameters",
			[
				wallPreset,
				...KITCHEN_CABINET_TOP_PARAMETER_DEFINITIONS,
				...cabinetExtras.filter(
					(item) =>
						item.name !== "countertopEnabled" && item.name !== "drawerCount",
				),
			],
			parameters,
			color,
		);
	}
}

export class KitchenCabinetBottomObject extends KitchenCabinetObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe8e2d6) {
		super(
			"kitchen-cabinet-bottom",
			"Kitchen Cabinet (Bottom)",
			"furnitureKitchenCabinetBottomParameters",
			[
				basePreset,
				...KITCHEN_CABINET_BOTTOM_PARAMETER_DEFINITIONS,
				...cabinetExtras,
			],
			parameters,
			color,
		);
	}
}
