import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	ClosetObject,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export class ClosetWardrobeObject extends ClosetObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb79b76) {
		super(
			"closet-wardrobe",
			"Dressing room wardrobe",
			"closetWardrobeControls",
			[
				choice("style", "WardrobeStyle", "open-wardrobe", [
					{
						value: "open-wardrobe",
						parameters: {
							width: 1.8,
							depth: 0.6,
							height: 2.2,
							moduleCount: 2,
							drawerRows: 0,
							doorsEnabled: false,
						},
					},
					{
						value: "closed-wardrobe",
						parameters: {
							width: 1.8,
							depth: 0.6,
							height: 2.2,
							moduleCount: 3,
							drawerRows: 0,
							doorsEnabled: true,
						},
					},
					{
						value: "modular-wardrobe",
						parameters: {
							width: 2.4,
							depth: 0.6,
							height: 2.2,
							moduleCount: 3,
							drawerRows: 2,
							doorsEnabled: false,
						},
					},
					{
						value: "corner-wardrobe",
						parameters: {
							width: 1.5,
							depth: 1.5,
							height: 2.2,
							moduleCount: 2,
							drawerRows: 0,
							doorsEnabled: false,
						},
					},
				]),
				...dimensions(1.8, 0.6, 2.2),
				integer("moduleCount", "Modules", 2, 1, 6),
				integer("shelfCount", "WardrobeShelves", 3, 0, 7),
				integer("drawerRows", "WardrobeDrawers", 0, 0, 4),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("doorsEnabled", "WardrobeDoors", false),
				boolean("doorsOpen", "DoorsOpen", false),
				boolean("hangingEnabled", "HangingBays", true),
				integer("clothesCount", "ClothesCount", 3, 0, 8),
				boolean("backEnabled", "BackPanel", true),
				number("runDepth", "CornerRun", 0.55, 0.2, 1),
				choice("returnSide", "CornerSide", "left-return", [
					"left-return",
					"right-return",
				]),
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
			modules = Number(p.moduleCount);
		const run = (
			width: number,
			depth: number,
			x: number,
			z: number,
			angle: number,
			count: number,
		) => {
			const before = this.partsGroup.children.length;
			this.buildRun(width, depth, h, count, material);
			const group = this.hingeParts(
				"Closet Wardrobe Run",
				this.partsGroup.children.slice(before),
				[0, 0, 0],
				angle,
			);
			group.position.set(x, 0, z);
		};
		if (p.style === "corner-wardrobe") {
			const r = Math.min(Number(p.runDepth), w * 0.4, d * 0.4),
				side = p.returnSide === "right-return" ? 1 : -1;
			run(w, r, 0, -d / 2 + r / 2, 0, modules);
			run(
				d - r,
				r,
				side * (w / 2 - r / 2),
				r / 2,
				(-side * Math.PI) / 2,
				Math.min(modules, 3),
			);
		} else run(w, d, 0, 0, 0, modules);
	}
	private buildRun(
		w: number,
		d: number,
		h: number,
		modules: number,
		material: Mesh["material"],
	): void {
		const p = this.parameters,
			t = Math.min(0.025, (w / (modules + 1)) * 0.09, d * 0.08, h * 0.035),
			cw = (w - t * (modules + 1)) / modules,
			metal = this.accent(0x898b7c, 0.3, 0.7),
			drawers = Number(p.drawerRows),
			dh = drawers ? Math.min(h * 0.13, (h * 0.3) / drawers) : 0,
			drawerTop = t + drawers * dh;
		for (const side of [-1, 1]) {
			this.addBox(
				"Closet Wardrobe Side",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
			);
			this.addBox(
				"Closet Wardrobe Board",
				[w - t * 2, t, d],
				[0, side < 0 ? t / 2 : h - t / 2, 0],
				material,
			);
		}
		if (p.backEnabled)
			this.addBox(
				"Closet Wardrobe Back",
				[w - t * 2, h - t * 2, t],
				[0, h / 2, -d / 2 + t / 2],
				material,
			);
		for (let i = 1; i < modules; i++)
			this.addBox(
				"Closet Module Divider",
				[t, h - t * 2, d - t * 2],
				[-w / 2 + t / 2 + i * (cw + t), h / 2, 0],
				material,
			);
		for (let i = 0; i < modules; i++) {
			const x = -w / 2 + t + cw / 2 + i * (cw + t),
				hanging = Boolean(p.hangingEnabled) && i % 2 === 0;
			for (let row = 0; row < drawers; row++)
				this.drawer(
					"Closet Drawer",
					x,
					t + dh * (row + 0.5),
					d / 2,
					cw,
					dh,
					d,
					t,
					Number(p.drawerOpen),
					material,
				);
			if (drawers)
				this.addBox(
					"Closet Drawer Cap",
					[cw, t, d - t * 2],
					[x, drawerTop, 0],
					material,
				);
			if (hanging) {
				this.rail(
					"Closet Hanging Rail",
					[x - cw * 0.43, h * 0.82, 0],
					[x + cw * 0.43, h * 0.82, 0],
					Math.min(cw, d) * 0.016,
					metal,
				);
				this.hangingClothes(
					x,
					h * 0.82,
					0,
					cw * 0.88,
					Math.min(h * 0.36, h * 0.82 - drawerTop - h * 0.09),
					Number(p.clothesCount),
				);
				this.addBox(
					"Closet Overhead Shelf",
					[cw, t, d - t * 2],
					[x, h * 0.91, 0],
					material,
				);
			} else
				for (let row = 1; row <= Number(p.shelfCount); row++)
					this.addBox(
						"Closet Wardrobe Shelf",
						[
							cw,
							Math.min(t, (h / (Number(p.shelfCount) + 1)) * 0.25),
							d - t * 2,
						],
						[
							x,
							drawerTop +
								((h - t - drawerTop) * row) / (Number(p.shelfCount) + 1),
							0,
						],
						material,
					);
			if (p.doorsEnabled) {
				const before = this.partsGroup.children.length;
				this.rounded(
					"Closet Wardrobe Door",
					[cw * 0.99, h - t, t],
					[x, h / 2, d / 2],
					material,
					0.004,
				);
				this.rounded(
					"Closet Wardrobe Handle",
					[t * 0.6, h * 0.08, t],
					[x + (i % 2 ? -0.32 : 0.32) * cw, h * 0.48, d / 2 + t],
					metal,
					0.003,
				);
				this.hingeParts(
					"Closet Wardrobe Hinge",
					this.partsGroup.children.slice(before),
					[x + ((i % 2 ? 1 : -1) * cw) / 2, 0, d / 2],
					p.doorsOpen ? (i % 2 ? 1 : -1) * Math.PI * 0.52 : 0,
				);
			}
		}
	}
}
