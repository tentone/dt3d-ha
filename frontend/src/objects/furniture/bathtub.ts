import type {Mesh} from "three";

import {BathroomObject} from "./bathroom/primitives.js";
import {
	furnitureBoolean,
	furnitureNumber,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
	furnitureSelect,
} from "./furniture.js";

export const BATHTUB_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureSelect(
		"style",
		"bathTubStyle",
		"bathTubStyleHint",
		"built-in-bathtub",
		[
			{value: "built-in-bathtub", labelKey: "bathOption_built-in-bathtub"},
			{
				value: "freestanding-bathtub",
				labelKey: "bathOption_freestanding-bathtub",
			},
			{
				value: "corner-bathtub",
				labelKey: "bathOption_corner-bathtub",
				parameters: {width: 1.35, depth: 1.35, height: 0.6},
			},
		],
	),
	furnitureNumber(
		"width",
		"furnitureWidth",
		"furnitureWidthTooltip",
		1.7,
		0.8,
		3,
	),
	furnitureNumber(
		"depth",
		"furnitureDepth",
		"furnitureDepthTooltip",
		0.75,
		0.45,
		2,
	),
	furnitureNumber(
		"height",
		"furnitureHeight",
		"furnitureHeightTooltip",
		0.6,
		0.3,
		1.2,
	),
	furnitureNumber(
		"rimThickness",
		"furnitureRimThickness",
		"furnitureRimThicknessTooltip",
		0.08,
		0.03,
		0.25,
	),
	furnitureNumber(
		"wallThickness",
		"furnitureWallThickness",
		"furnitureWallThicknessTooltip",
		0.07,
		0.03,
		0.25,
	),
	furnitureNumber(
		"baseThickness",
		"furnitureBaseThickness",
		"furnitureBaseThicknessTooltip",
		0.08,
		0.03,
		0.3,
	),
	furnitureBoolean("tapEnabled", "bathTapEnabled", "bathTapEnabledHint", true),
];

const DEFAULT_BATHTUB_COLOR = 0xf1f3f4;

export class BathtubObject extends BathroomObject {
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
		if (this.parameters.style === "freestanding-bathtub") {
			this.bowl(
				"Freestanding Bathtub Shell",
				p.width,
				p.depth,
				p.height,
				wallThickness,
				[0, 0, 0],
				material,
				baseThickness,
				rimThickness,
			);
			this.drain(
				0,
				baseThickness + 0.003,
				0,
				Math.min(p.width, p.depth) * 0.035,
			);
			if (this.parameters.tapEnabled)
				this.tap(0, p.height, -p.depth * 0.4, Math.min(0.2, p.height * 0.35));
			return;
		}
		if (this.parameters.style === "corner-bathtub") {
			this.cornerBath(
				p.width,
				p.depth,
				p.height,
				baseThickness,
				wallThickness,
				material,
			);
			this.drain(
				-p.width * 0.24,
				baseThickness + 0.003,
				p.depth * 0.24,
				Math.min(p.width, p.depth) * 0.035,
			);
			if (this.parameters.tapEnabled)
				this.tap(
					-p.width * 0.4,
					p.height,
					p.depth * 0.35,
					Math.min(0.2, p.height * 0.3),
				);
			return;
		}
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
		this.drain(0, baseThickness + 0.003, 0, Math.min(p.width, p.depth) * 0.035);
		if (this.parameters.tapEnabled)
			this.tap(0, p.height, -p.depth * 0.42, Math.min(0.2, p.height * 0.3));

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
