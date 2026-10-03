import type {Mesh} from "three";

import {
	furnitureBoolean,
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const BED_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber(
		"width",
		"furnitureWidth",
		"furnitureWidthTooltip",
		1.6,
		0.7,
		3,
	),
	furnitureNumber(
		"depth",
		"furnitureDepth",
		"furnitureDepthTooltip",
		2.1,
		1.2,
		3,
	),
	furnitureNumber(
		"height",
		"furnitureHeight",
		"furnitureHeightTooltip",
		1,
		0.5,
		1.8,
	),
	furnitureNumber(
		"bedHeight",
		"furnitureBedHeight",
		"furnitureBedHeightTooltip",
		0.5,
		0.2,
		1,
	),
	furnitureNumber(
		"mattressThickness",
		"furnitureMattressThickness",
		"furnitureMattressThicknessTooltip",
		0.2,
		0.05,
		0.4,
	),
	furnitureNumber(
		"thickness",
		"furnitureBoardThickness",
		"furnitureBoardThicknessTooltip",
		0.05,
		0.02,
		0.15,
	),
	furnitureBoolean(
		"headboardEnabled",
		"furnitureHeadboardEnabled",
		"furnitureHeadboardEnabledTooltip",
		true,
	),
];

export class BedObject extends FurnitureObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9b8068) {
		super(
			"bed",
			"Bed",
			"furnitureBedParameters",
			BED_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const thickness = p.thickness;
		const bedHeight = Math.min(p.bedHeight, p.height - 0.08);
		const mattress = Math.min(p.mattressThickness, bedHeight * 0.6);
		const frameHeight = Math.min(0.18, (bedHeight - mattress) * 0.6);
		const legHeight = bedHeight - mattress - frameHeight;
		const mattressDepth = p.depth - thickness * 2;
		this.addBox(
			"Bed Mattress",
			[p.width - thickness * 2, mattress, mattressDepth],
			[0, bedHeight - mattress / 2, 0],
			material,
		);
		this.addBox(
			"Bed Frame",
			[p.width, frameHeight, p.depth],
			[0, legHeight + frameHeight / 2, 0],
			material,
		);
		for (const x of [-p.width / 2 + thickness, p.width / 2 - thickness]) {
			for (const z of [-p.depth / 2 + thickness, p.depth / 2 - thickness]) {
				this.addBox(
					"Bed Leg",
					[thickness, legHeight, thickness],
					[x, legHeight / 2, z],
					material,
				);
			}
		}
		if (this.parameters.headboardEnabled) {
			this.addBox(
				"Bed Headboard",
				[p.width, p.height - legHeight, thickness],
				[0, (p.height + legHeight) / 2, -p.depth / 2 + thickness / 2],
				material,
			);
		}
		const pillowHeight = Math.min(0.08, mattress * 0.4);
		const pillowCount = p.width >= 1.2 ? 2 : 1;
		const pillowWidth = ((p.width - thickness * 2) / pillowCount) * 0.8;
		for (let index = 0; index < pillowCount; index += 1) {
			const x =
				((index - (pillowCount - 1) / 2) * (p.width - thickness * 2)) /
				pillowCount;
			this.addBox(
				"Bed Pillow",
				[pillowWidth, pillowHeight, 0.35],
				[x, bedHeight + pillowHeight / 2, -mattressDepth / 2 + 0.25],
				material,
			);
		}
	}
}
