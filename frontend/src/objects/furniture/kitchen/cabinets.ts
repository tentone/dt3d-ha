import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	cornerPlan,
	dimensions,
	integer,
	KitchenObject,
	number,
	rectangle,
} from "./primitives.js";

export const basePreset = choice("style", "BaseStyle", "double-base-cabinet", [
	{
		value: "single-base-cabinet",
		parameters: {
			width: 0.6,
			depth: 0.6,
			height: 0.9,
			doorCount: 1,
			shelfCount: 1,
		},
	},
	{
		value: "double-base-cabinet",
		parameters: {
			width: 1.2,
			depth: 0.6,
			height: 0.9,
			doorCount: 2,
			shelfCount: 1,
		},
	},
	{
		value: "drawer-cabinet",
		parameters: {
			width: 0.6,
			depth: 0.6,
			height: 0.9,
			doorCount: 1,
			shelfCount: 0,
			drawerCount: 3,
		},
	},
	{
		value: "corner-cabinet",
		parameters: {
			width: 0.95,
			depth: 0.95,
			height: 0.9,
			doorCount: 1,
			shelfCount: 1,
		},
	},
	{
		value: "sink-cabinet",
		parameters: {
			width: 0.9,
			depth: 0.6,
			height: 0.9,
			doorCount: 2,
			shelfCount: 0,
			backEnabled: false,
		},
	},
]);
export const wallPreset = choice("style", "WallStyle", "double-wall-cabinet", [
	{
		value: "single-wall-cabinet",
		parameters: {
			width: 0.6,
			depth: 0.35,
			height: 0.7,
			doorCount: 1,
			shelfCount: 1,
		},
	},
	{
		value: "double-wall-cabinet",
		parameters: {
			width: 1.2,
			depth: 0.35,
			height: 0.7,
			doorCount: 2,
			shelfCount: 1,
		},
	},
	{
		value: "corner-wall-cabinet",
		parameters: {
			width: 0.65,
			depth: 0.65,
			height: 0.7,
			doorCount: 1,
			shelfCount: 1,
		},
	},
	{
		value: "open-shelving",
		parameters: {
			width: 0.9,
			depth: 0.3,
			height: 0.7,
			doorCount: 2,
			shelfCount: 2,
		},
	},
]);
export const cabinetExtras = [
	integer("drawerCount", "DrawerCount", 3, 1, 6),
	boolean("doorsOpen", "DoorsOpen", false),
	boolean("backEnabled", "BackEnabled", true),
	boolean("countertopEnabled", "CountertopEnabled", true),
];

/** Extends the original kitchen cabinet identifiers and numeric settings. */
export class KitchenCabinetObject extends KitchenObject {
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		const corner =
				p.style === "corner-cabinet" || p.style === "corner-wall-cabinet",
			sink = p.style === "sink-cabinet",
			wall = this.furnitureType === "kitchen-cabinet-top",
			openShelf = p.style === "open-shelving";
		const t = Math.min(Number(p.thickness), w * 0.1, d * 0.1, h * 0.06),
			plinth = wall ? 0 : Math.min(Number(p.plinthHeight), h * 0.2),
			top =
				wall || !p.countertopEnabled
					? 0
					: Math.min(Number(p.countertopThickness), h * 0.12),
			bodyH = h - plinth - top;
		const points = corner ? cornerPlan(w, d) : rectangle(w, d),
			metal = this.accent(0x777e82, 0.25, 0.75),
			worktop = this.accent(0xc7c2b6, 0.4);
		this.slab("Storage Board", points, t, plinth, material);
		if (!sink) this.slab("Storage Board", points, t, h - top - t, material);
		else
			for (const side of [-1, 1])
				this.addBox(
					"Sink Support Rail",
					[w - t * 2, t, d * 0.08],
					[0, h - top - t / 2, side * d * 0.43],
					material,
				);
		if (corner) {
			for (let i = 0; i < points.length; i++) {
				if (i === 2) continue;
				if (!p.backEnabled && (i === 0 || i === 4)) continue;
				const a = points[i],
					b = points[(i + 1) % points.length],
					length = Math.hypot(b[0] - a[0], b[1] - a[1]);
				this.addBox(
					i === 0 || i === 4 ? "Storage Back" : "Storage Side",
					[length, bodyH, t],
					[(a[0] + b[0]) / 2, plinth + bodyH / 2, (a[1] + b[1]) / 2],
					material,
				).rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
			}
		} else {
			for (const side of [-1, 1])
				this.addBox(
					"Storage Side",
					[t, bodyH, d - t],
					[(side * (w - t)) / 2, plinth + bodyH / 2, -t / 2],
					material,
				);
			if (p.backEnabled)
				this.addBox(
					"Storage Back",
					[w - t * 2, bodyH - t * 2, t],
					[0, plinth + bodyH / 2, -d / 2 + t / 2],
					material,
				);
		}
		const shelves =
			sink || p.style === "drawer-cabinet" ? 0 : Number(p.shelfCount);
		for (let i = 1; i <= shelves; i++)
			this.slab(
				"Storage Shelf",
				corner
					? cornerPlan(w - t * 2, d - t * 2)
					: rectangle(w - t * 2, d - t * 2),
				Math.min(t, (bodyH / (shelves + 1)) * 0.3),
				plinth + (bodyH * i) / (shelves + 1),
				material,
			);
		if (plinth)
			this.addBox(
				"Kitchen Plinth",
				[w - t * 2, plinth, d * 0.8],
				[0, plinth / 2, -d * 0.05],
				this.accent(0x66686a),
			);
		if (top)
			this.slab(
				"Kitchen Countertop",
				points,
				top,
				h - top,
				worktop,
				sink ? [{x: 0, z: 0, width: w * 0.65, depth: d * 0.65}] : [],
			);
		if (openShelf) return;
		if (p.style === "drawer-cabinet") {
			const rows = Number(p.drawerCount),
				dh = (bodyH - t * 2) / rows;
			for (let i = 0; i < rows; i++) {
				const y = plinth + t + dh * (i + 0.5),
					z = d / 2 + (p.doorsOpen ? d * 0.6 : 0);
				this.rounded(
					"Kitchen Drawer Front",
					[w - t, dh * 0.96, t],
					[0, y, z],
					material,
					0.003,
				);
				this.rounded(
					"Storage Handle",
					[Math.min(Number(p.handleSize), w * 0.6), t * 0.45, t],
					[0, y, z + t],
					metal,
					0.002,
				);
				if (p.doorsOpen) {
					this.addBox(
						"Drawer Bottom",
						[w - t * 4, t, d * 0.7],
						[0, y - dh * 0.35, z - d * 0.35],
						material,
					);
					for (const side of [-1, 1])
						this.addBox(
							"Drawer Side",
							[t, dh * 0.55, d * 0.7],
							[side * (w / 2 - t * 2), y - dh * 0.075, z - d * 0.35],
							material,
						);
				}
			}
			return;
		}
		const doors = corner ? 1 : Number(p.doorCount),
			frontW = corner ? Math.hypot(w * 0.45, d * 0.45) : w,
			doorW = frontW / doors,
			angle = corner ? Math.atan2(d, w) : 0;
		for (let i = 0; i < doors; i++) {
			const center = corner
				? [w * 0.275, d * 0.275]
				: [-w / 2 + doorW * (i + 0.5), d / 2 - t / 2];
			const before = this.partsGroup.children.length;
			const door = this.rounded(
				"Storage Door",
				[doorW * 0.98, bodyH - t, t],
				[center[0], plinth + bodyH / 2, center[1]],
				material,
				0.003,
			);
			door.rotation.y = angle;
			const handle = this.rounded(
				"Storage Handle",
				[t * 0.6, Math.min(Number(p.handleSize), bodyH * 0.5), t],
				[
					center[0] + Math.cos(angle) * doorW * 0.3,
					plinth + bodyH * 0.65,
					center[1] - Math.sin(angle) * doorW * 0.3 + t,
				],
				metal,
				0.002,
			);
			handle.rotation.y = angle;
			const meshes = this.partsGroup.children.slice(before),
				left = i % 2 === 0,
				sign = left ? -1 : 1;
			this.hinge(
				"Kitchen Cabinet Hinge",
				meshes,
				[
					center[0] + (sign * Math.cos(angle) * doorW) / 2,
					0,
					center[1] - (sign * Math.sin(angle) * doorW) / 2,
				],
				p.doorsOpen ? sign * Math.PI * 0.5 : 0,
			);
		}
	}
}

export class KitchenTallCabinetObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe3dfd4) {
		super(
			"kitchen-tall-cabinet",
			"Kitchen tall cabinet",
			"kitchenTallControls",
			[
				choice("style", "TallStyle", "pantry-cabinet", [
					{
						value: "pantry-cabinet",
						parameters: {width: 0.6, depth: 0.6, height: 2.1, shelfCount: 5},
					},
					{
						value: "oven-tower",
						parameters: {width: 0.6, depth: 0.6, height: 2.1, shelfCount: 2},
					},
					{
						value: "fridge-housing",
						parameters: {width: 0.7, depth: 0.65, height: 2.2, shelfCount: 1},
					},
					{
						value: "broom-cabinet",
						parameters: {
							width: 0.55,
							depth: 0.55,
							height: 2.1,
							shelfCount: 1,
						},
					},
				]),
				...dimensions(0.6, 0.6, 2.1),
				number("thickness", "BoardThickness", 0.022, 0.01, 0.08),
				integer("shelfCount", "ShelfCount", 5, 0, 8),
				boolean("doorsOpen", "DoorsOpen", false),
				boolean("contentsEnabled", "ContentsEnabled", true),
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
			t = Math.min(Number(p.thickness), w * 0.08, d * 0.08, h * 0.04),
			base = h * 0.045;
		for (const side of [-1, 1])
			this.addBox(
				"Tall Cabinet Side",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
			);
		this.addBox(
			"Tall Cabinet Back",
			[w - t * 2, h, t],
			[0, h / 2, -d / 2 + t / 2],
			material,
		);
		for (const y of [base, h - t])
			this.addBox(
				"Tall Cabinet Board",
				[w - t * 2, t, d - t],
				[0, y, 0],
				material,
			);
		this.addBox(
			"Tall Cabinet Plinth",
			[w * 0.9, base, d * 0.85],
			[0, base / 2, 0],
			this.accent(0x64696c),
		);
		const metal = this.accent(0xb3bdc5, 0.25, 0.75),
			dark = this.accent(0x30383e, 0.35);
		if (p.style === "oven-tower") {
			this.addBox(
				"Tower Oven Body",
				[w - t * 2, h * 0.3, d - t * 2],
				[0, h * 0.53, 0],
				dark,
			);
			this.ovenFront(
				0,
				h * 0.53,
				d / 2,
				w - t * 2,
				h * 0.3,
				metal,
				Boolean(p.doorsOpen),
			);
			for (const [y, dh] of [
				[h * 0.2, h * 0.3],
				[h * 0.83, h * 0.3],
			])
				this.tallDoor(w, d, t, y, dh, material, Boolean(p.doorsOpen));
		} else if (p.style === "fridge-housing") {
			this.rounded(
				"Housed Refrigerator",
				[w - t * 2, h * 0.8, d - t],
				[0, h * 0.46, t / 2],
				metal,
				0.015,
			);
			for (const [y, dh] of [
				[h * 0.28, h * 0.39],
				[h * 0.68, h * 0.39],
			]) {
				const before = this.partsGroup.children.length;
				this.rounded(
					"Housed Fridge Door",
					[w - t * 3, dh, t],
					[0, y, d / 2 + t],
					metal,
					0.008,
				);
				this.rounded(
					"Housed Fridge Handle",
					[t * 0.7, dh * 0.35, t],
					[w * 0.33, y, d / 2 + t * 2],
					dark,
				);
				this.hinge(
					"Housed Fridge Hinge",
					this.partsGroup.children.slice(before),
					[-w / 2 + t, 0, d / 2],
					p.doorsOpen ? -Math.PI * 0.45 : 0,
				);
			}
			this.tallDoor(w, d, t, h * 0.935, h * 0.1, material, false);
		} else {
			const shelves = Number(p.shelfCount);
			for (let i = 1; i <= shelves; i++) {
				const y =
					p.style === "broom-cabinet"
						? h * (0.75 + (0.18 * i) / (shelves + 1))
						: base + ((h - base) * i) / (shelves + 1);
				this.addBox(
					"Tall Cabinet Shelf",
					[w - t * 2, Math.min(t, (h / (shelves + 1)) * 0.2), d - t * 2],
					[0, y, 0],
					material,
				);
			}
			if (p.contentsEnabled && p.style === "broom-cabinet") {
				this.cylinder(
					"Broom Handle",
					w * 0.015,
					w * 0.015,
					h * 0.65,
					[0, h * 0.39, 0],
					this.accent(0x967451),
				);
				this.rounded(
					"Broom Head",
					[w * 0.55, h * 0.045, d * 0.22],
					[0, h * 0.07, 0],
					this.accent(0xc7aa62),
				);
			}
			this.tallDoor(
				w,
				d,
				t,
				h * 0.52,
				h * 0.93,
				material,
				Boolean(p.doorsOpen),
			);
		}
	}
	private tallDoor(
		w: number,
		d: number,
		t: number,
		y: number,
		h: number,
		material: Mesh["material"],
		open: boolean,
	): void {
		const before = this.partsGroup.children.length;
		this.rounded(
			"Tall Cabinet Door",
			[w - t * 1.2, h, t],
			[0, y, d / 2],
			material,
			0.003,
		);
		this.rounded(
			"Tall Cabinet Handle",
			[t * 0.65, Math.min(h * 0.4, 0.18), t],
			[w * 0.33, y, d / 2 + t],
			this.accent(0x6f777c, 0.3, 0.65),
		);
		this.hinge(
			"Tall Cabinet Hinge",
			this.partsGroup.children.slice(before),
			[-w / 2, 0, d / 2],
			open ? -Math.PI * 0.5 : 0,
		);
	}
}
