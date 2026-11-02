import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	PatioObject,
} from "./primitives.js";

export class OutdoorPlanterObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb49570) {
		super(
			"outdoor-planter",
			"Planters / garden beds",
			"patioPlanterControls",
			[
				choice("style", "PlanterStyle", "planter", [
					{
						value: "planter",
						parameters: {width: 0.9, depth: 0.35, height: 0.45},
					},
					{
						value: "flower-pot",
						parameters: {width: 0.45, depth: 0.45, height: 0.45},
					},
					{
						value: "raised-garden-bed",
						parameters: {width: 1.4, depth: 0.8, height: 0.6},
					},
				]),
				...dimensions(0.9, 0.35, 0.45),
				choice("plants", "PlanterPlants", "flowers", [
					"flowers",
					"foliage",
					"none",
				]),
				integer("plantCount", "PlantCount", 4, 1, 10),
				number("soilLevel", "SoilLevel", 0.78, 0.3, 0.9),
				boolean("soilEnabled", "PlanterSoil", true),
				boolean("legsEnabled", "PlanterLegs", false),
			],
			parameters,
			color,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			b = p.legsEnabled ? h * 0.24 : 0,
			bh = h - b,
			t = Math.min(w, d, h) * 0.055,
			y = b + bh * Number(p.soilLevel),
			soil = this.accent(0x594a36, 0.98),
			green = this.accent(0x68825a, 0.95),
			round = p.style === "flower-pot";
		if (round) {
			const r = w / 2,
				body = this.lathe(
					"Flower Pot Body",
					[
						[0, 0],
						[r * 0.7, 0],
						[r, bh],
						[r - t, bh],
						[r * 0.7 - t, t],
						[0, t],
					],
					[0, b, 0],
					material,
				);
			body.scale.z = d / w;
			if (p.soilEnabled) {
				const fill = this.cylinder(
					"Planter Soil",
					r * (0.7 + 0.3 * Number(p.soilLevel)) - t,
					r * 0.67,
					t,
					[0, y, 0],
					soil,
					48,
				);
				fill.scale.z = d / w;
			}
		} else {
			this.addBox("Planter Floor", [w, t, d], [0, b + t / 2, 0], material);
			for (const side of [-1, 1]) {
				this.addBox(
					"Planter Wall",
					[t, bh, d],
					[(side * (w - t)) / 2, b + bh / 2, 0],
					material,
				);
				this.addBox(
					"Planter Wall",
					[w - t * 2, bh, t],
					[0, b + bh / 2, (side * (d - t)) / 2],
					material,
				);
			}
			if (p.style === "raised-garden-bed")
				for (const x of [-1, 1])
					for (const z of [-1, 1])
						this.addBox(
							"Garden Bed Corner",
							[t * 1.5, bh * 1.04, t * 1.5],
							[(x * (w - t)) / 2, b + bh * 0.52, (z * (d - t)) / 2],
							material,
						);
			if (p.soilEnabled)
				this.addBox("Planter Soil", [w - t * 2, t, d - t * 2], [0, y, 0], soil);
		}
		if (p.legsEnabled) this.legs(w * 0.88, d * 0.88, b, t, material);
		if (!p.soilEnabled || p.plants === "none") return;
		for (let i = 0; i < Number(p.plantCount); i++) {
			const a = i * 2.39996,
				n = Number(p.plantCount),
				x = round
					? Math.cos(a) * w * 0.22 * ((i + 1) / n)
					: ((i + 0.5) / n - 0.5) * w * 0.78,
				z = round
					? Math.sin(a) * d * 0.22 * ((i + 1) / n)
					: Math.sin(a) * d * 0.2,
				ph = h * (0.4 + (i % 3) * 0.1),
				r = Math.min((w / n) * 0.25, d * 0.15, h * 0.15);
			this.rail("Planter Stem", [x, y, z], [x, y + ph, z], r * 0.09, green);
			for (const side of [-1, 1])
				this.ellipsoid(
					"Planter Leaf",
					[r, ph * 0.1, r * 0.35],
					[x + side * r * 0.65, y + ph * 0.45, z],
					green,
				).rotation.z = side * 0.7;
			if (p.plants === "flowers") {
				const petals = this.accent([0xd4b276, 0xb88c97, 0xd2cba4][i % 3], 0.9);
				for (let j = 0; j < 6; j++) {
					const angle = (j / 6) * Math.PI * 2;
					this.ellipsoid(
						"Planter Flower Petal",
						[r * 0.55, r * 0.2, r * 0.55],
						[
							x + Math.cos(angle) * r * 0.55,
							y + ph,
							z + Math.sin(angle) * r * 0.55,
						],
						petals,
					);
				}
				this.ellipsoid(
					"Planter Flower Center",
					[r * 0.35, r * 0.25, r * 0.35],
					[x, y + ph + r * 0.12, z],
					this.accent(0xc6a257, 0.9),
				);
			} else
				for (let j = 0; j < 4; j++) {
					const angle = (j / 4) * Math.PI * 2;
					this.ellipsoid(
						"Planter Foliage",
						[r * 0.7, ph * 0.45, r * 0.32],
						[
							x + Math.cos(angle) * r * 0.6,
							y + ph * 0.6,
							z + Math.sin(angle) * r * 0.6,
						],
						green,
					).rotation.z = Math.cos(angle) * 0.35;
				}
		}
	}
}
