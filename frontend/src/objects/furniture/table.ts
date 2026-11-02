import type {Mesh} from "three";
import {ExtrudeGeometry, Shape} from "three";

import type {
	FurnitureParameterDefinition,
	FurnitureParameters,
} from "./furniture.js";
import {
	choice,
	dimensions,
	integer,
	LivingRoomObject,
	number,
} from "./living-room/primitives.js";

export const TABLE_PARAMETER_DEFINITIONS = [
	...dimensions(1.6, 0.8, 0.75),
	choice("topShape", "TopShape", "rectangle", [
		"rectangle",
		"rounded",
		"round",
		"oval",
		"corner",
	]),
	choice("legStyle", "LegStyle", "square", [
		"square",
		"tapered",
		"pedestal",
		"trestle",
	]),
	integer("legCount", "LegCount", 4, 1, 6),
	number("topThickness", "TopThickness", 0.045, 0.01, 0.2),
	number("legThickness", "LegThickness", 0.065, 0.015, 0.3),
	number("legInset", "LegInset", 0.07, 0, 0.8),
	integer("tableCount", "TableCount", 1, 1, 3),
];

export class TableObject extends LivingRoomObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = 0x98724e,
		type: "table" | "living-table" | "dining-table" | "meeting-table" = "table",
		definitions?: FurnitureParameterDefinition[],
	) {
		super(
			type,
			type === "meeting-table"
				? "Meeting table"
				: type === "dining-table"
					? "Dining table"
					: type === "table"
						? "Table"
						: "Living room table",
			type === "meeting-table"
				? "officeMeetingControls"
				: type === "dining-table"
					? "diningTableControls"
					: "furnitureTableParameters",
			definitions ??
				(type === "table"
					? TABLE_PARAMETER_DEFINITIONS
					: [
						choice("style", "TableStyle", "coffee-table", [
							{
								value: "coffee-table",
								parameters: {
									width: 1.1,
									depth: 0.6,
									height: 0.42,
									tableCount: 1,
									topShape: "rounded",
								},
							},
							{
								value: "side-table",
								parameters: {
									width: 0.5,
									depth: 0.5,
									height: 0.55,
									tableCount: 1,
									topShape: "round",
								},
							},
							{
								value: "nesting-tables",
								parameters: {
									width: 0.7,
									depth: 0.55,
									height: 0.5,
									tableCount: 3,
									topShape: "oval",
								},
							},
							{
								value: "console-table",
								parameters: {
									width: 1.3,
									depth: 0.32,
									height: 0.78,
									tableCount: 1,
									topShape: "rectangle",
								},
							},
							{
								value: "corner-table",
								parameters: {
									width: 0.65,
									depth: 0.65,
									height: 0.55,
									tableCount: 1,
									topShape: "corner",
									legCount: 3,
								},
							},
						]),
						...TABLE_PARAMETER_DEFINITIONS,
					]),
			parameters,
			color,
		);
	}

	protected getTableWidth(): number {
		return Number(this.parameters.width);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters;
		const count = Number(p.tableCount ?? 1),
			legMaterial = this.accent(0x38383b, 0.45, 0.35);
		for (let index = 0; index < count; index++) {
			const scale = Math.pow(0.77, index),
				w = this.getTableWidth() * scale,
				d = Number(p.depth) * scale;
			const h = Number(p.height) * (1 - index * 0.2),
				t = Math.min(Number(p.topThickness), h * 0.25);
			const x = index * Number(p.width) * 0.35,
				z = index * Number(p.depth) * 0.12;
			const lt = Math.min(Number(p.legThickness), w * 0.16, d * 0.16),
				legH = h - t;
			if (p.topShape === "round" || p.topShape === "oval") {
				const a = p.topShape === "round" ? Math.min(w, d) : w;
				const top = this.cylinder(
					"Table Top",
					a / 2,
					a / 2,
					t,
					[x, h - t / 2, z],
					material,
					48,
				);
				if (p.topShape === "oval") top.scale.z = d / a;
			} else if (p.topShape === "corner") {
				const shape = new Shape();
				shape.moveTo(-w / 2, d / 2);
				shape.lineTo(w / 2, d / 2);
				shape.lineTo(-w / 2, -d / 2);
				shape.closePath();
				const geometry = new ExtrudeGeometry(shape, {
					depth: t,
					bevelEnabled: false,
				});
				geometry.rotateX(-Math.PI / 2);
				this.addGeometry("Table Top", geometry, [x, h - t, z], material);
			} else if (p.topShape === "rounded") {
				this.plate(
					"Table Top",
					[w, t, d],
					[x, h - t / 2, z],
					material,
					Math.min(w, d) * 0.2,
				);
			} else
				this.rounded(
					"Table Top",
					[w, t, d],
					[x, h - t / 2, z],
					material,
					p.topShape === "rounded" ? 0.09 : 0.006,
				);
			if (p.legStyle === "pedestal") {
				this.cylinder(
					"Table Pedestal",
					lt,
					lt * 1.2,
					legH,
					[x, legH / 2, z],
					legMaterial,
				);
				this.cylinder(
					"Table Foot",
					Math.min(w, d) * 0.33,
					Math.min(w, d) * 0.36,
					Math.min(0.035, legH * 0.2),
					[x, Math.min(0.0175, legH * 0.1), z],
					legMaterial,
				);
				continue;
			}
			const inset = Math.min(Number(p.legInset) + lt, Math.min(w, d) * 0.4);
			const supportW = p.topShape === "round" ? Math.min(w, d) : w;
			const supportD = p.topShape === "round" ? Math.min(w, d) : d;
			if (p.legStyle === "trestle") {
				for (const side of [-1, 1])
					this.rounded(
						"Table Trestle",
						[lt, legH, Math.max(0.01, supportD - inset)],
						[x + side * supportW * 0.3, legH / 2, z],
						legMaterial,
						0.006,
					);
				this.rounded(
					"Table Stretcher",
					[supportW * 0.6, lt, lt],
					[x, legH * 0.3, z],
					legMaterial,
				);
				continue;
			}
			const legs = p.topShape === "corner" ? 3 : Number(p.legCount);
			for (let i = 0; i < legs; i++) {
				let dx = 0,
					dz = 0;
				if (p.topShape === "corner")
					[dx, dz] = [
						[-0.32 * w, -0.32 * d],
						[0.25 * w, -0.32 * d],
						[-0.32 * w, 0.25 * d],
					][i];
				else if (
					legs === 4 &&
					(p.topShape === "rectangle" || p.topShape === "rounded")
				) {
					dx = (i % 2 ? 1 : -1) * (w / 2 - inset);
					dz = (i < 2 ? -1 : 1) * (d / 2 - inset);
				} else if (legs > 1) {
					dx = Math.cos((i / legs) * Math.PI * 2) * (supportW / 2 - inset);
					dz = Math.sin((i / legs) * Math.PI * 2) * (supportD / 2 - inset);
				}
				if (p.legStyle === "tapered")
					this.cylinder(
						"Table Leg",
						lt * 0.5,
						lt * 0.28,
						legH,
						[x + dx, legH / 2, z + dz],
						legMaterial,
						16,
					);
				else
					this.rounded(
						"Table Leg",
						[lt, legH, lt],
						[x + dx, legH / 2, z + dz],
						legMaterial,
						0.003,
					);
			}
		}
	}
}

export class LivingTableObject extends TableObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xad8257) {
		super(parameters, color, "living-table");
	}
}
