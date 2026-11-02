import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	LaundryObject,
} from "./primitives.js";

export class LaundryStorageObject extends LaundryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc9c9bd) {
		super(
			"laundry-storage",
			"Laundry storage",
			"laundryStorageControls",
			[
				choice("style", "StorageStyle", "laundry-cabinet", [
					{
						value: "laundry-cabinet",
						parameters: {
							width: 0.9,
							depth: 0.45,
							height: 0.9,
							shelfCount: 2,
							doorCount: 2,
						},
					},
					{
						value: "broom-cupboard",
						parameters: {
							width: 0.5,
							depth: 0.55,
							height: 1.85,
							shelfCount: 1,
							doorCount: 1,
						},
					},
					{
						value: "wall-shelves",
						parameters: {width: 1, depth: 0.25, height: 0.7, shelfCount: 3},
					},
					{
						value: "storage-rack",
						parameters: {width: 1, depth: 0.45, height: 1.8, shelfCount: 5},
					},
				]),
				...dimensions(0.9, 0.45, 0.9),
				integer("shelfCount", "Shelves", 2, 1, 8),
				integer("doorCount", "DoorCount", 2, 1, 4),
				boolean("doorsOpen", "CabinetOpen", false),
				boolean("contentsEnabled", "Contents", true),
				boolean("backEnabled", "CabinetBack", true),
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
			t = Math.min(0.022, w * 0.05, d * 0.08, h * 0.05),
			shelves = Number(p.shelfCount),
			wall = p.style === "wall-shelves",
			rack = p.style === "storage-rack",
			broom = p.style === "broom-cupboard",
			metal = this.accent(0x708682, 0.35, 0.65);
		if (wall || rack) {
			for (let i = 0; i < shelves; i++) {
				const y = t / 2 + (shelves === 1 ? 0 : i / (shelves - 1)) * (h - t);
				this.rounded(
					"Laundry Storage Shelf",
					[w, t, d],
					[0, y, 0],
					material,
					0.004,
				);
				if (wall)
					for (const side of [-1, 1])
						this.rounded(
							"Laundry Shelf Bracket",
							[t, (h / (shelves + 1)) * 0.35, d * 0.72],
							[side * w * 0.36, y - (h / (shelves + 1)) * 0.14, -d * 0.1],
							metal,
							0.003,
						);
			}
			if (rack)
				for (const x of [-1, 1])
					for (const z of [-1, 1])
						this.rail(
							"Laundry Rack Post",
							[x * w * 0.45, 0, z * d * 0.42],
							[x * w * 0.45, h, z * d * 0.42],
							t * 0.55,
							metal,
						);
			if (rack && p.contentsEnabled)
				for (let i = 1; i < Math.min(shelves, 5); i++) {
					const y = (shelves === 1 ? 0 : i / (shelves - 1)) * (h - t) + t;
					this.rounded(
						"Rack Storage Box",
						[w * 0.38, Math.min((h / shelves) * 0.4, d * 0.3), d * 0.68],
						[
							w * (i % 2 ? 0.22 : -0.22),
							y + Math.min((h / shelves) * 0.2, d * 0.15),
							0,
						],
						this.accent(i % 2 ? 0xb6c9c1 : 0xcbbda1),
						0.008,
					);
				}
			return;
		}
		for (const side of [-1, 1]) {
			this.addBox(
				"Laundry Cabinet Side",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
			);
			this.addBox(
				"Laundry Cabinet Board",
				[w - t * 2, t, d],
				[0, side < 0 ? t / 2 : h - t / 2, 0],
				material,
			);
		}
		if (p.backEnabled)
			this.addBox(
				"Laundry Cabinet Back",
				[w - t * 2, h - t * 2, t],
				[0, h / 2, -d / 2 + t / 2],
				material,
			);
		for (let i = 1; i <= shelves; i++)
			this.addBox(
				"Laundry Interior Shelf",
				[w - t * 2, Math.min(t, (h / (shelves + 1)) * 0.3), d - t * 2],
				[
					0,
					broom
						? h * (0.76 + (0.18 * i) / (shelves + 1))
						: t + ((h - t * 2) * i) / (shelves + 1),
					0,
				],
				material,
			);
		const count = Number(p.doorCount),
			dw = w / count;
		for (let i = 0; i < count; i++) {
			const x = -w / 2 + dw * (i + 0.5),
				before = this.partsGroup.children.length;
			this.rounded(
				"Laundry Cabinet Door",
				[dw * 0.985, h - t, t],
				[x, h / 2, d / 2],
				material,
				0.004,
			);
			this.rounded(
				"Laundry Cabinet Handle",
				[t * 0.5, h * 0.1, t],
				[x + (i % 2 ? -0.3 : 0.3) * dw, h * 0.53, d / 2 + t],
				metal,
				0.003,
			);
			this.hingeParts(
				"Laundry Cabinet Hinge",
				this.partsGroup.children.slice(before),
				[x + ((i % 2 ? 1 : -1) * dw) / 2, 0, d / 2],
				p.doorsOpen ? (i % 2 ? 1 : -1) * Math.PI * 0.52 : 0,
			);
		}
		if (broom && p.contentsEnabled) {
			this.rail(
				"Laundry Broom Handle",
				[0, h * 0.1, 0],
				[0, h * 0.72, 0],
				w * 0.015,
				this.accent(0xa98d64),
			);
			this.rounded(
				"Laundry Broom Head",
				[w * 0.6, h * 0.045, d * 0.2],
				[0, h * 0.08, 0],
				this.accent(0xc9b17e),
				0.005,
			);
		}
	}
}
