import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	KitchenObject,
} from "./primitives.js";

export class KitchenRefrigeratorObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb8c1c8) {
		super(
			"kitchen-refrigerator",
			"Refrigerator / freezer",
			"kitchenRefrigeratorControls",
			[
				choice("style", "RefrigeratorStyle", "refrigerator", [
					{
						value: "refrigerator",
						parameters: {
							width: 0.65,
							depth: 0.65,
							height: 1.85,
							shelfCount: 4,
						},
					},
					{
						value: "american-style-refrigerator",
						parameters: {
							width: 0.95,
							depth: 0.75,
							height: 1.85,
							shelfCount: 4,
						},
					},
					{
						value: "freezer",
						parameters: {width: 0.6, depth: 0.62, height: 1.7, shelfCount: 5},
					},
				]),
				...dimensions(0.65, 0.65, 1.85),
				integer("shelfCount", "ShelfCount", 4, 1, 8),
				boolean("doorsOpen", "DoorsOpen", false),
				boolean("dispenserEnabled", "DispenserEnabled", true),
			],
			parameters,
			color,
			0.3,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(w, d, h) * 0.045,
			american = p.style === "american-style-refrigerator",
			freezer = p.style === "freezer";
		const liner = this.accent(0xe1e6e5, 0.4),
			metal = this.accent(0x646d73, 0.25, 0.8);
		for (const side of [-1, 1]) {
			this.rounded(
				"Fridge Side",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
				0.012,
			);
			this.rounded(
				"Fridge Board",
				[w - t * 2, t, d],
				[0, side < 0 ? t / 2 : h - t / 2, 0],
				material,
				0.006,
			);
		}
		this.addBox(
			"Fridge Back",
			[w - t * 2, h - t * 2, t],
			[0, h / 2, -d / 2 + t / 2],
			liner,
		);
		const shelves = Number(p.shelfCount);
		for (let i = 1; i <= shelves; i++) {
			const y = t + ((h - t * 2) * i) / (shelves + 1);
			this.addBox(
				"Refrigerator Shelf",
				[w - t * 2, t * 0.3, d - t * 3],
				[0, y, -t / 2],
				liner,
			);
			if (freezer)
				this.rounded(
					"Freezer Drawer",
					[w - t * 3, (h / (shelves + 1)) * 0.65, t * 0.6],
					[0, y - (h / (shelves + 1)) * 0.32, d / 2 - t * 2],
					this.accent(0xb7d2de, 0.2, 0, 0.55),
					0.008,
				);
		}
		const count = freezer ? 1 : 2;
		for (let i = 0; i < count; i++) {
			const dw = american ? w * 0.496 : w,
				dh = freezer ? h : american ? h : h * (i === 0 ? 0.69 : 0.3),
				x = american ? (i - 0.5) * w * 0.5 : 0,
				y = freezer || american ? h / 2 : i === 0 ? h * 0.65 : h * 0.15;
			const before = this.partsGroup.children.length;
			this.rounded(
				"Refrigerator Door",
				[dw * 0.985, dh * 0.985, t],
				[x, y, d / 2],
				material,
				0.013,
			);
			this.rounded(
				"Refrigerator Handle",
				[t * 0.6, Math.min(dh * 0.45, h * 0.24), t * 1.3],
				[x + (american ? (i === 0 ? 1 : -1) : 1) * dw * 0.32, y, d / 2 + t],
				metal,
				0.008,
			);
			if (american && i === 0 && p.dispenserEnabled) {
				this.rounded(
					"Ice Dispenser",
					[dw * 0.45, dh * 0.18, t * 0.4],
					[x, y + h * 0.07, d / 2 + t * 0.7],
					this.accent(0x263239, 0.4),
					0.01,
				);
				this.rounded(
					"Dispenser Tray",
					[dw * 0.38, t * 0.4, t * 2],
					[x, y - h * 0.01, d / 2 + t],
					metal,
					0.003,
				);
			}
			this.hinge(
				"Refrigerator Door Hinge",
				this.partsGroup.children.slice(before),
				[american && i === 1 ? w / 2 : -w / 2, 0, d / 2],
				p.doorsOpen ? (american && i === 1 ? 1 : -1) * Math.PI * 0.48 : 0,
			);
		}
	}
}
