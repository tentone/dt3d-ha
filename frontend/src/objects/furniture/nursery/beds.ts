import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	NurseryObject,
} from "./primitives.js";

export class NurseryBedObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb99b72) {
		super(
			"nursery-bed",
			"Children's bed / crib",
			"nurseryBedControls",
			[
				choice("style", "BedStyle", "crib", [
					{
						value: "crib",
						parameters: {
							width: 0.7,
							depth: 1.1,
							height: 0.95,
							platformHeight: 0.4,
						},
					},
					{
						value: "cot",
						parameters: {
							width: 0.75,
							depth: 1.4,
							height: 1.0,
							platformHeight: 0.42,
						},
					},
					{
						value: "toddler-bed",
						parameters: {
							width: 0.8,
							depth: 1.5,
							height: 0.6,
							platformHeight: 0.3,
						},
					},
					{
						value: "single-bed",
						parameters: {
							width: 0.95,
							depth: 2.05,
							height: 0.75,
							platformHeight: 0.43,
						},
					},
					{
						value: "bunk-bed",
						parameters: {
							width: 0.95,
							depth: 2.05,
							height: 1.7,
							platformHeight: 1.3,
						},
					},
					{
						value: "loft-bed",
						parameters: {
							width: 0.95,
							depth: 2.05,
							height: 1.7,
							platformHeight: 1.3,
						},
					},
					{
						value: "trundle-bed",
						parameters: {
							width: 0.95,
							depth: 2.05,
							height: 0.8,
							platformHeight: 0.48,
						},
					},
					{
						value: "cabin-bed",
						parameters: {
							width: 1,
							depth: 2.05,
							height: 1.25,
							platformHeight: 0.9,
						},
					},
				]),
				...dimensions(0.7, 1.1, 0.95),
				number("platformHeight", "PlatformHeight", 0.4, 0.15, 1.8),
				number("mattressThickness", "MattressThickness", 0.1, 0.04, 0.25),
				integer("slatCount", "SlatCount", 12, 4, 20),
				boolean("guardRails", "GuardRails", true),
				integer("ladderSteps", "LadderSteps", 5, 2, 10),
				choice("ladderSide", "LadderSide", "right-side", [
					"right-side",
					"left-side",
				]),
				number("trundleOpen", "TrundleOpen", 0, 0, 1, 0.05),
				boolean("underbedDesk", "UnderbedDesk", true),
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
			t = Math.min(w * 0.055, d * 0.035, h * 0.055),
			m = Math.min(Number(p.mattressThickness), h * 0.12),
			y = Math.max(m + t, Math.min(Number(p.platformHeight), h * 0.82));
		const crib = p.style === "crib" || p.style === "cot",
			raised = ["bunk-bed", "loft-bed", "cabin-bed"].includes(String(p.style)),
			fabric = this.accent(0xe5e1d7, 0.95),
			cover = this.accent(0x9eb8b4, 0.95);
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rounded(
					"Child Bed Post",
					[t, h, t],
					[(x * (w - t)) / 2, h / 2, (z * (d - t)) / 2],
					material,
					0.008,
				);
		const mattress = (surface: number, name = "Child Mattress", x = 0) => {
			this.rounded(
				"Child Bed Deck",
				[w, t, d - t],
				[x, surface - m - t / 2, 0],
				material,
				0.006,
			);
			this.rounded(
				name,
				[w - t * 2, m, d - t * 2],
				[x, surface - m / 2, 0],
				fabric,
				0.025,
			);
			if (!crib) {
				this.rounded(
					"Child Bed Cover",
					[w - t * 2.2, m * 0.12, (d - t * 2) * 0.66],
					[x, surface + m * 0.06, d * 0.15],
					cover,
					0.02,
				);
				this.rounded(
					"Child Bed Pillow",
					[w * 0.65, m * 0.38, d * 0.16],
					[x, surface + m * 0.19, -d * 0.32],
					fabric,
					0.025,
				);
			}
		};
		mattress(y);
		if (p.style === "bunk-bed") mattress(Math.min(h * 0.23, y * 0.4));
		if (p.guardRails && (crib || raised || p.style === "toddler-bed")) {
			const top = crib || raised ? h - t * 0.65 : Math.min(h, y + h * 0.2),
				bottom = y + t,
				gh = Math.max(t, top - bottom);
			for (const side of [-1, 1]) {
				const length = p.style === "toddler-bed" ? d * 0.48 : d - t;
				this.rounded(
					"Child Guard Top Rail",
					[t, t, length],
					[(side * (w - t)) / 2, top, p.style === "toddler-bed" ? -d * 0.2 : 0],
					material,
					0.006,
				);
				if (crib) {
					this.rounded(
						"Child Guard Bottom Rail",
						[t, t, d - t],
						[(side * (w - t)) / 2, bottom, 0],
						material,
						0.005,
					);
					for (let i = 0; i < Number(p.slatCount); i++)
						this.rounded(
							"Crib Slat",
							[t * 0.42, gh, t * 0.42],
							[
								(side * (w - t)) / 2,
								bottom + gh / 2,
								(i / (Number(p.slatCount) - 1) - 0.5) * (d - t * 2),
							],
							material,
							0.003,
						);
				} else
					for (const z of [-0.4, 0, 0.4])
						this.rounded(
							"Bed Guard Support",
							[t, gh, t],
							[
								(side * (w - t)) / 2,
								bottom + gh / 2,
								z * length + (p.style === "toddler-bed" ? -d * 0.2 : 0),
							],
							material,
							0.003,
						);
			}
		}
		for (const side of [-1, 1])
			this.rounded(
				"Child Bed End Panel",
				[w - t, crib ? h - y : Math.max(t, h - y) * 0.8, t],
				[
					0,
					crib ? y + (h - y) / 2 : y + Math.max(t, h - y) * 0.4,
					(side * (d - t)) / 2,
				],
				material,
				0.008,
			);
		if (raised) {
			const side = p.ladderSide === "left-side" ? -1 : 1,
				x = side * (w / 2 + t),
				ladderH = y - m;
			for (const z of [-d * 0.16, d * 0.06])
				this.rail(
					"Bed Ladder Upright",
					[x, 0, z],
					[x, ladderH, z],
					t * 0.35,
					material,
				);
			for (let i = 1; i <= Number(p.ladderSteps); i++)
				this.rail(
					"Bed Ladder Rung",
					[x, (ladderH * i) / (Number(p.ladderSteps) + 1), -d * 0.16],
					[x, (ladderH * i) / (Number(p.ladderSteps) + 1), d * 0.06],
					t * 0.32,
					material,
				);
			if (p.style === "loft-bed" && p.underbedDesk) {
				const dy = Math.min(y * 0.55, 0.65);
				this.plate(
					"Loft Desk Top",
					[w - t * 2, t, d * 0.42],
					[0, dy, -d * 0.24],
					material,
					0.012,
				);
				for (const side of [-1, 1])
					this.rounded(
						"Loft Desk Leg",
						[t, dy, t],
						[side * w * 0.38, dy / 2, -d * 0.08],
						material,
						0.003,
					);
			}
			if (p.style === "cabin-bed") {
				const ch = y - m - t,
					cell = (d * 0.88) / 3;
				for (let i = 0; i < 3; i++) {
					this.rounded(
						"Cabin Storage Front",
						[t, ch * 0.8, cell * 0.93],
						[w / 2, ch * 0.48, -d * 0.44 + cell * (i + 0.5)],
						this.accent(i % 2 ? 0xa8b9ad : 0xd6c1a0),
						0.006,
					);
					this.rounded(
						"Cabin Storage Handle",
						[t * 0.5, t * 0.4, cell * 0.25],
						[w / 2 + t * 0.6, ch * 0.55, -d * 0.44 + cell * (i + 0.5)],
						this.accent(0x6b726a, 0.4),
						0.003,
					);
				}
			}
		}
		if (p.style === "trundle-bed") {
			const x = Number(p.trundleOpen) * w * 0.9,
				ty = Math.min(y * 0.32, 0.18);
			this.rounded(
				"Trundle Frame",
				[w - t * 2, ty, d - t * 2],
				[x, ty / 2, 0],
				material,
				0.008,
			);
			this.rounded(
				"Trundle Mattress",
				[w - t * 3, m * 0.65, d - t * 3],
				[x, ty + m * 0.325, 0],
				fabric,
				0.02,
			);
			this.rounded(
				"Trundle Handle",
				[t * 0.5, t * 0.5, d * 0.2],
				[x + w / 2 - t * 0.4, ty * 0.5, 0],
				this.accent(0x666d68, 0.3, 0.5),
				0.003,
			);
		}
	}
}
