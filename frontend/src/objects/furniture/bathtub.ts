import type {Mesh} from "three";

import {
	furnitureNumber,
	FurnitureObject,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const BATHTUB_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber("width", "furnitureWidth", "furnitureWidthTooltip", 1.7, 0.8, 3),
	furnitureNumber("depth", "furnitureDepth", "furnitureDepthTooltip", 0.75, 0.45, 2),
	furnitureNumber("height", "furnitureHeight", "furnitureHeightTooltip", 0.6, 0.3, 1.2),
	furnitureNumber("rimThickness", "furnitureRimThickness", "furnitureRimThicknessTooltip", 0.08, 0.03, 0.25),
	furnitureNumber("wallThickness", "furnitureWallThickness", "furnitureWallThicknessTooltip", 0.07, 0.03, 0.25),
	furnitureNumber("baseThickness", "furnitureBaseThickness", "furnitureBaseThicknessTooltip", 0.08, 0.03, 0.3),
];

const DEFAULT_BATHTUB_COLOR = 0xf1f3f4;

export class BathtubObject extends FurnitureObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = DEFAULT_BATHTUB_COLOR,
	) {
		super(
			"bathtub",
			"Bathtub",
			"furnitureBathtubParameters",
			BATHTUB_PARAMETER_DEFINITIONS,
			parameters,
			color,
			0.28,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters as Record<string, number>;
		const wallThickness = Math.min(
			p.wallThickness,
			p.width * 0.22,
			p.depth * 0.22,
		);
		const rimThickness = Math.min(
			p.rimThickness,
			p.width * 0.22,
			p.depth * 0.22,
		);
		const baseThickness = Math.min(p.baseThickness, p.height * 0.45);
		const wallHeight = Math.max(0.05, p.height - baseThickness);

		this.addBox(
			"Bathtub Base",
			[p.width, baseThickness, p.depth],
			[0, baseThickness / 2, 0],
			material,
		);
		for (const z of [
			-p.depth / 2 + wallThickness / 2,
			p.depth / 2 - wallThickness / 2,
		]) {
			this.addBox(
				"Bathtub Side",
				[p.width, wallHeight, wallThickness],
				[0, baseThickness + wallHeight / 2, z],
				material,
			);
		}
		const endDepth = Math.max(0.05, p.depth - wallThickness * 2);
		for (const x of [
			-p.width / 2 + wallThickness / 2,
			p.width / 2 - wallThickness / 2,
		]) {
			this.addBox(
				"Bathtub End",
				[wallThickness, wallHeight, endDepth],
				[x, baseThickness + wallHeight / 2, 0],
				material,
			);
		}

		const rimY = p.height - rimThickness / 2;
		for (const z of [
			-p.depth / 2 + rimThickness / 2,
			p.depth / 2 - rimThickness / 2,
		]) {
			this.addBox(
				"Bathtub Rim",
				[p.width, rimThickness, rimThickness],
				[0, rimY, z],
				material,
			);
		}
		const rimInnerDepth = Math.max(0.05, p.depth - rimThickness * 2);
		for (const x of [
			-p.width / 2 + rimThickness / 2,
			p.width / 2 - rimThickness / 2,
		]) {
			this.addBox(
				"Bathtub Rim",
				[rimThickness, rimThickness, rimInnerDepth],
				[x, rimY, 0],
				material,
			);
		}
	}
}
