import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {TABLE_PARAMETER_DEFINITIONS,TableObject} from "../table.js";
import {boolean, choice, number} from "./primitives.js";

export class DiningTableObject extends TableObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa77d51) {
		super(parameters, color, "dining-table", [
			choice("style", "TableStyle", "rectangular-dining-table", [
				{
					value: "rectangular-dining-table",
					parameters: {
						width: 1.8,
						depth: 0.9,
						height: 0.76,
						topShape: "rectangle",
						legStyle: "tapered",
						legCount: 4,
					},
				},
				{
					value: "round-dining-table",
					parameters: {
						width: 1.2,
						depth: 1.2,
						height: 0.76,
						topShape: "round",
						legStyle: "pedestal",
						legCount: 4,
					},
				},
				{
					value: "oval-dining-table",
					parameters: {
						width: 2,
						depth: 1,
						height: 0.76,
						topShape: "oval",
						legStyle: "trestle",
						legCount: 4,
					},
				},
				{
					value: "square-dining-table",
					parameters: {
						width: 1.1,
						depth: 1.1,
						height: 0.76,
						topShape: "rectangle",
						legStyle: "square",
						legCount: 4,
					},
				},
				{
					value: "extendable-dining-table",
					parameters: {
						width: 1.6,
						depth: 0.9,
						height: 0.76,
						topShape: "rounded",
						legStyle: "tapered",
						legCount: 4,
						extensionEnabled: true,
						extensionLength: 0.6,
					},
				},
			]),
			...TABLE_PARAMETER_DEFINITIONS.filter(
				(item) => item.name !== "tableCount" && item.name !== "topShape",
			),
			choice("topShape", "TopShape", "rectangle", [
				"rectangle",
				"rounded",
				"round",
				"oval",
			]),
			boolean("extensionEnabled", "ExtensionEnabled", true),
			number("extensionLength", "ExtensionLength", 0.6, 0.1, 1.5),
		]);
	}
	protected override getTableWidth(): number {
		const p = this.parameters;
		return (
			Number(p.width) +
			(p.style === "extendable-dining-table" && p.extensionEnabled
				? Number(p.extensionLength)
				: 0)
		);
	}
	protected override buildFurniture(material: Mesh["material"]): void {
		super.buildFurniture(material);
		const p = this.parameters;
		if (p.style !== "extendable-dining-table" || !p.extensionEnabled) return;
		const w = this.getTableWidth(),
			d = Number(p.depth),
			leaf = Number(p.extensionLength),
			h = Number(p.height);
		// The continuous top retains a closed surface; inset lines identify the center leaf.
		for (const side of [-1, 1]) {
			const x = (side * leaf) / 2;
			const span =
				p.topShape === "round" || p.topShape === "oval"
					? (p.topShape === "round" ? Math.min(w, d) : d) *
						Math.sqrt(
							Math.max(
								0,
								1 -
									Math.pow(
										leaf / (p.topShape === "round" ? Math.min(w, d) : w),
										2,
									),
							),
						)
					: d * 0.96;
			if (span > 0.002)
				this.addBox(
					"Extension Leaf Seam",
					[0.002, 0.001, span],
					[x, h + 0.0005, 0],
					this.accent(0x62482f),
				);
		}
	}
}
