import type {Mesh} from "three";

import {
	furnitureInteger,
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const CABINET_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber("width", "furnitureWidth", "furnitureWidthTooltip", 1.2, 0.4, 4),
	furnitureNumber("depth", "furnitureDepth", "furnitureDepthTooltip", 0.45, 0.2, 1.5),
	furnitureNumber("height", "furnitureHeight", "furnitureHeightTooltip", 0.9, 0.4, 3),
	furnitureNumber("thickness", "furnitureBoardThickness", "furnitureBoardThicknessTooltip", 0.04, 0.015, 0.2),
	furnitureInteger("doorCount", "furnitureDoorCount", "furnitureDoorCountTooltip", 2, 1, 4),
	furnitureInteger("shelfCount", "furnitureInteriorShelfCount", "furnitureInteriorShelfCountTooltip", 1, 0, 12),
	furnitureNumber("handleSize", "furnitureHandleSize", "furnitureHandleSizeTooltip", 0.1, 0.03, 0.3),
];

const DEFAULT_CABINET_COLOR = 0x795548;

export class CabinetObject extends FurnitureObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = DEFAULT_CABINET_COLOR,
	) {
		super(
			"cabinet",
			"Cabinet",
			"furnitureCabinetParameters",
			CABINET_PARAMETER_DEFINITIONS,
			parameters,
			color,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const thickness = Math.min(
			p.thickness,
			p.width * 0.25,
			p.depth * 0.35,
			p.height * 0.2,
		);
		const innerWidth = Math.max(0.05, p.width - thickness * 2);
		const innerHeight = Math.max(0.05, p.height - thickness * 2);
		const doorGap = Math.min(0.01, p.width / (p.doorCount * 8));
		const doorWidth = Math.max(
			0.03,
			(p.width - doorGap * (p.doorCount + 1)) / p.doorCount,
		);

		this.addBox(
			"Cabinet Door",
			[doorWidth, innerHeight, thickness],
			[
				-p.width / 2 + doorGap + doorWidth / 2,
				p.height / 2,
				p.depth / 2 + thickness / 2,
			],
			material,
		);
		for (let index = 1; index < p.doorCount; index += 1) {
			const x =
				-p.width / 2 + doorGap * (index + 1) + doorWidth * (index + 0.5);
			this.addBox(
				"Cabinet Door",
				[doorWidth, innerHeight, thickness],
				[x, p.height / 2, p.depth / 2 + thickness / 2],
				material,
			);
		}

		for (const x of [
			-p.width / 2 + thickness / 2,
			p.width / 2 - thickness / 2,
		]) {
			this.addBox(
				"Cabinet Side",
				[thickness, p.height, p.depth],
				[x, p.height / 2, 0],
				material,
			);
		}
		for (const y of [thickness / 2, p.height - thickness / 2]) {
			this.addBox(
				"Cabinet Board",
				[innerWidth, thickness, p.depth],
				[0, y, 0],
				material,
			);
		}
		this.addBox(
			"Cabinet Back",
			[innerWidth, innerHeight, thickness],
			[0, p.height / 2, -p.depth / 2 + thickness / 2],
			material,
		);
		for (let index = 1; index <= p.shelfCount; index += 1) {
			this.addBox(
				"Cabinet Shelf",
				[innerWidth, thickness, p.depth - thickness],
				[0, (index / (p.shelfCount + 1)) * p.height, 0],
				material,
			);
		}

		const handleSize = Math.min(p.handleSize, innerHeight * 0.4);
		for (let index = 0; index < p.doorCount; index += 1) {
			const centerX =
				-p.width / 2 + doorGap * (index + 1) + doorWidth * (index + 0.5);
			const handleX =
				centerX +
				(index < p.doorCount / 2 ? doorWidth * 0.32 : -doorWidth * 0.32);
			this.addBox(
				"Cabinet Handle",
				[Math.min(0.025, doorWidth * 0.15), handleSize, 0.025],
				[handleX, p.height / 2, p.depth / 2 + thickness + 0.0125],
				material,
			);
		}
	}
}
