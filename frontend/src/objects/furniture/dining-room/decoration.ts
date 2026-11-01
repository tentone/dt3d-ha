import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	DiningObject,
	integer,
} from "./primitives.js";

export class CenterpieceObject extends DiningObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc4ae7d) {
		super(
			"centerpiece",
			"Centerpiece",
			"diningCenterpieceControls",
			[
				choice("style", "CenterpieceStyle", "fruit-bowl", [
					{
						value: "fruit-bowl",
						parameters: {width: 0.36, depth: 0.3, height: 0.15, itemCount: 7},
					},
					{
						value: "floral-arrangement",
						parameters: {
							width: 0.32,
							depth: 0.32,
							height: 0.42,
							itemCount: 5,
						},
					},
					{
						value: "candle-arrangement",
						parameters: {
							width: 0.48,
							depth: 0.22,
							height: 0.25,
							itemCount: 3,
						},
					},
				]),
				...dimensions(0.36, 0.3, 0.15),
				integer("itemCount", "ItemCount", 7, 1, 12),
				boolean("contentsEnabled", "CenterpieceContents", true),
				boolean("candlesLit", "CandlesLit", false),
			],
			parameters,
			color,
			0.4,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			count = Number(p.itemCount),
			r = Math.min(w, d) / 2;
		if (p.style === "candle-arrangement") {
			this.plate(
				"Centerpiece Tray",
				[w, h * 0.07, d],
				[0, h * 0.035, 0],
				material,
				d * 0.16,
			);
			if (p.contentsEnabled)
				for (let i = 0; i < count; i++) {
					const radius = Math.min((w / (count + 0.5)) * 0.36, d * 0.3),
						x = count === 1 ? 0 : (i / (count - 1) - 0.5) * w * 0.75;
					const ch = h * (0.58 + (i % 3) * 0.1);
					this.cylinder(
						"Centerpiece Candle",
						radius,
						radius,
						ch,
						[x, h * 0.07 + ch / 2, 0],
						this.accent(0xeee2c8),
						32,
					);
					this.cylinder(
						"Candle Wick",
						radius * 0.05,
						radius * 0.05,
						h * 0.035,
						[x, h * 0.085 + ch, 0],
						this.accent(0x3b3028),
					);
					if (p.candlesLit)
						this.ellipsoid(
							"Candle Flame",
							[radius * 0.17, h * 0.065, radius * 0.17],
							[x, h * 0.15 + ch, 0],
							this.accent(0xffb546, 0.5, 0, 1, true),
						);
				}
		} else if (p.style === "floral-arrangement") {
			this.lathe(
				"Centerpiece Vase",
				[
					[0, 0],
					[r * 0.45, 0],
					[r * 0.52, h * 0.08],
					[r * 0.65, h * 0.3],
					[r * 0.4, h * 0.52],
					[r * 0.3, h * 0.52],
					[r * 0.53, h * 0.3],
					[r * 0.38, h * 0.08],
					[0, h * 0.05],
				],
				[0, 0, 0],
				material,
			);
			if (p.contentsEnabled)
				for (let i = 0; i < count; i++) {
					const angle = (i / count) * Math.PI * 2,
						x = Math.cos(angle) * w * 0.27,
						z = Math.sin(angle) * d * 0.27,
						y = h * (0.78 + (i % 3) * 0.05);
					this.rod(
						"Flower Stem",
						[0, h * 0.1, 0],
						[x, y, z],
						r * 0.016,
						this.accent(0x4f6b3c),
					);
					this.ellipsoid(
						"Flower Leaf",
						[r * 0.15, r * 0.045, r * 0.3],
						[x * 0.5, h * 0.57, z * 0.5],
						this.accent(0x547443),
					).rotation.z = angle;
					const petal = Math.min(r * 0.2, h * 0.08);
					for (let j = 0; j < 5; j++)
						this.ellipsoid(
							"Flower Petal",
							[petal, petal * 0.6, petal],
							[
								x + Math.cos(j * Math.PI * 0.4) * petal * 0.8,
								y,
								z + Math.sin(j * Math.PI * 0.4) * petal * 0.8,
							],
							this.accent(i % 2 ? 0xe1b2a5 : 0xe8ddca),
						);
					this.ellipsoid(
						"Flower Center",
						[petal * 0.55, petal * 0.65, petal * 0.55],
						[x, y + petal * 0.3, z],
						this.accent(0xc39b4e),
					);
				}
		} else {
			const bowlH = h * 0.55;
			const bowl = this.lathe(
				"Centerpiece Bowl",
				[
					[0, 0],
					[r * 0.35, 0],
					[r * 0.65, bowlH * 0.25],
					[r, bowlH],
					[r * 0.92, bowlH],
					[r * 0.57, bowlH * 0.3],
					[r * 0.3, bowlH * 0.12],
					[0, bowlH * 0.12],
				],
				[0, 0, 0],
				material,
			);
			bowl.scale.x = w / (r * 2);
			if (p.contentsEnabled)
				for (let i = 0; i < count; i++) {
					const angle = i * 2.39996,
						spread = count === 1 ? 0 : Math.sqrt(i / count) * r * 0.56,
						size = Math.min(r * 0.27, h * 0.32);
					const x = (Math.cos(angle) * spread * w) / (r * 2),
						z = Math.sin(angle) * spread,
						y = bowlH * 0.62 + size * (i < 3 ? 0.65 : 1);
					this.ellipsoid(
						"Centerpiece Fruit",
						[size, size * 0.9, size],
						[x, y, z],
						this.accent([0x9a4e35, 0xc99837, 0x8e9a48][i % 3], 0.55),
					);
					this.cylinder(
						"Fruit Stem",
						size * 0.045,
						size * 0.055,
						size * 0.25,
						[x, y + size * 0.95, z],
						this.accent(0x5d4931),
						8,
					);
				}
		}
	}
}
