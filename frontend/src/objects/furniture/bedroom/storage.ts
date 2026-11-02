import type {Mesh} from "three";
import {TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	BedroomObject,
	boolean,
	choice,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export const wardrobePreset = choice(
	"style",
	"WardrobeStyle",
	"two-door-wardrobe",
	[
		{
			value: "two-door-wardrobe",
			parameters: {width: 1.5, depth: 0.6, height: 2.1, doorCount: 2},
		},
		{
			value: "three-door-wardrobe",
			parameters: {width: 1.8, depth: 0.6, height: 2.1, doorCount: 3},
		},
		{
			value: "sliding-door-wardrobe",
			parameters: {width: 2, depth: 0.65, height: 2.1, doorCount: 2},
		},
	],
);
export const wardrobeExtras = [
	boolean("doorsOpen", "WardrobeDoorsOpen", false),
	number("slidingOpen", "SlidingOpen", 0, 0, 1, 0.05),
	boolean("hangingRailEnabled", "HangingRailEnabled", true),
	boolean("mirrorDoors", "MirrorDoors", false),
];

export class BedroomWardrobeFrame extends BedroomObject {
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(Number(p.thickness), w * 0.1, d * 0.12, h * 0.06),
			innerH = h - t * 2;
		for (const side of [-1, 1]) {
			this.addBox(
				"Storage Side",
				[t, h, d - t],
				[(side * (w - t)) / 2, h / 2, -t / 2],
				material,
			);
			this.addBox(
				"Storage Board",
				[w - t * 2, t, d - t],
				[0, side < 0 ? t / 2 : h - t / 2, -t / 2],
				material,
			);
		}
		this.addBox(
			"Storage Back",
			[w - t * 2, innerH, t],
			[0, h / 2, -d / 2 + t / 2],
			material,
		);
		const shelves = Number(p.shelfCount),
			shelfW = (w - t * 2) * (p.hangingRailEnabled ? 0.34 : 1),
			shelfX = p.hangingRailEnabled ? w * 0.3 : 0;
		for (let i = 1; i <= shelves; i++)
			this.addBox(
				"Storage Shelf",
				[shelfW, Math.min(t, (innerH / (shelves + 1)) * 0.35), d - t * 2],
				[shelfX, t + (innerH * i) / (shelves + 1), 0],
				material,
			);
		const metal = this.accent(0x777e84, 0.3, 0.7);
		if (p.hangingRailEnabled) {
			this.addBox(
				"Wardrobe Interior Divider",
				[t, innerH, d - t * 2],
				[w * 0.12, h / 2, 0],
				material,
			);
			this.rail(
				"Wardrobe Hanging Rail",
				[-w / 2 + t, h * 0.82, 0],
				[w * 0.12 - t, h * 0.82, 0],
				Math.min(w, d) * 0.015,
				metal,
			);
		}
		const count = Number(p.doorCount),
			dw = w / count,
			sliding = p.style === "sliding-door-wardrobe";
		if (sliding)
			for (const y of [t * 0.5, h - t * 0.5])
				this.addBox(
					"Wardrobe Door Track",
					[w, t * 0.5, t * 2.5],
					[0, y, d / 2 - t],
					metal,
				);
		for (let i = 0; i < count; i++) {
			const dx =
					sliding && i % 2 === 0
						? (i < count - 1 ? 1 : -1) * Number(p.slidingOpen) * dw * 0.9
						: 0,
				x = -w / 2 + dw * (i + 0.5) + dx,
				z = d / 2 - t / 2 - (sliding ? (i % 2) * t * 1.2 : 0),
				before = this.partsGroup.children.length;
			this.rounded(
				"Storage Door",
				[dw * 0.985, h - t * 0.4, t],
				[x, h / 2, z],
				material,
				0.004,
			);
			if (p.mirrorDoors)
				this.rounded(
					"Wardrobe Mirror Panel",
					[dw * 0.88, h * 0.91, t * 0.15],
					[x, h / 2, z + t * 0.6],
					this.accent(0xbdced7, 0.1, 0.55),
					0.003,
				);
			this.rounded(
				"Storage Handle",
				[
					Math.min(0.02, dw * 0.1),
					Math.min(Number(p.handleSize), innerH * 0.5),
					t,
				],
				[x + (i % 2 ? -0.3 : 0.3) * dw, h * 0.48, z + t],
				metal,
				0.003,
			);
			if (!sliding)
				this.hingeParts(
					"Wardrobe Door Hinge",
					this.partsGroup.children.slice(before),
					[x + ((i % 2 ? 1 : -1) * dw) / 2, 0, z],
					p.doorsOpen ? (i % 2 ? 1 : -1) * Math.PI * 0.52 : 0,
				);
		}
	}
}

export class BedroomStorageObject extends BedroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9b805e) {
		super(
			"bedroom-storage",
			"Bedroom storage",
			"bedroomStorageControls",
			[
				choice("style", "StorageStyle", "chest-of-drawers", [
					{
						value: "chest-of-drawers",
						parameters: {
							width: 1.1,
							depth: 0.45,
							height: 0.9,
							columns: 2,
							drawerRows: 3,
						},
					},
					{
						value: "dresser",
						parameters: {
							width: 1.5,
							depth: 0.48,
							height: 0.85,
							columns: 3,
							drawerRows: 3,
						},
					},
					{
						value: "tallboy",
						parameters: {
							width: 0.6,
							depth: 0.45,
							height: 1.3,
							columns: 1,
							drawerRows: 5,
						},
					},
					{
						value: "clothes-rack",
						parameters: {width: 1.2, depth: 0.48, height: 1.65},
					},
				]),
				...dimensions(1.1, 0.45, 0.9),
				integer("columns", "Columns", 2, 1, 4),
				integer("drawerRows", "DrawerRows", 3, 1, 8),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				number("legHeight", "LegHeight", 0.1, 0, 0.35),
				choice("handleStyle", "HandleStyle", "bar-handles", [
					"bar-handles",
					"knob-handles",
					"handleless",
				]),
				integer("hangerCount", "HangerCount", 5, 0, 12),
				boolean("shoeShelfEnabled", "ShoeShelfEnabled", true),
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
			t = Math.min(0.022, w * 0.04, d * 0.08, h * 0.035),
			metal = this.accent(0x515a60, 0.3, 0.7);
		if (p.style === "clothes-rack") {
			this.rounded(
				"Clothes Rack Base",
				[w, t, d],
				[0, t / 2, 0],
				material,
				0.006,
			);
			for (const side of [-1, 1]) {
				this.rail(
					"Clothes Rack Upright",
					[side * w * 0.45, t, 0],
					[side * w * 0.45, h - t, 0],
					t * 0.5,
					metal,
				);
				this.rail(
					"Clothes Rack Foot",
					[side * w * 0.45, t, -d * 0.42],
					[side * w * 0.45, t, d * 0.42],
					t * 0.65,
					metal,
				);
			}
			this.rail(
				"Clothes Rack Rail",
				[-w * 0.45, h - t, 0],
				[w * 0.45, h - t, 0],
				t * 0.5,
				metal,
			);
			if (p.shoeShelfEnabled)
				this.rounded(
					"Clothes Rack Shoe Shelf",
					[w * 0.9, t, d * 0.8],
					[0, h * 0.12, 0],
					material,
					0.004,
				);
			const count = Number(p.hangerCount),
				size = Math.min((w / (count + 1)) * 0.7, d * 0.5, h * 0.13);
			for (let i = 0; i < count; i++) {
				const x = ((i + 0.5) / count - 0.5) * w * 0.75,
					y = h - t - size * 0.4;
				this.addGeometry(
					"Hanger Hook",
					new TorusGeometry(size * 0.15, t * 0.15, 6, 20, Math.PI * 1.55),
					[x, y + size * 0.2, 0],
					metal,
				);
				this.rail(
					"Clothes Hanger",
					[x - size, y - size * 0.55, 0],
					[x, y, 0],
					t * 0.17,
					material,
				);
				this.rail(
					"Clothes Hanger",
					[x, y, 0],
					[x + size, y - size * 0.55, 0],
					t * 0.17,
					material,
				);
				this.rail(
					"Clothes Hanger",
					[x - size, y - size * 0.55, 0],
					[x + size, y - size * 0.55, 0],
					t * 0.17,
					material,
				);
			}
			return;
		}
		const leg = Math.min(Number(p.legHeight), h * 0.2),
			bh = h - leg,
			cols = Number(p.columns),
			rows = Number(p.drawerRows),
			cw = (w - t * (cols + 1)) / cols,
			rh = (bh - t * 2) / rows;
		for (const side of [-1, 1]) {
			this.addBox(
				"Bedroom Cabinet Side",
				[t, bh, d],
				[(side * (w - t)) / 2, leg + bh / 2, 0],
				material,
			);
			this.addBox(
				"Bedroom Cabinet Board",
				[w - t * 2, t, d],
				[0, side < 0 ? leg + t / 2 : h - t / 2, 0],
				material,
			);
		}
		this.addBox(
			"Bedroom Cabinet Back",
			[w - t * 2, bh - t * 2, t],
			[0, leg + bh / 2, -d / 2 + t / 2],
			material,
		);
		for (let col = 0; col < cols; col++) {
			const x = -w / 2 + t + cw / 2 + col * (cw + t);
			if (col)
				this.addBox(
					"Bedroom Drawer Divider",
					[t, bh - t * 2, d - t],
					[x - cw / 2 - t / 2, leg + bh / 2, 0],
					material,
				);
			for (let row = 0; row < rows; row++) {
				const y = leg + t + rh * (row + 0.5),
					z = d / 2 + Number(p.drawerOpen) * d * 0.65;
				this.rounded(
					"Bedroom Drawer Front",
					[cw * 0.98, rh * 0.96, t],
					[x, y, z],
					material,
					0.004,
				);
				if (p.handleStyle !== "handleless")
					this.rounded(
						"Bedroom Drawer Handle",
						[
							p.handleStyle === "knob-handles" ? t : Math.min(cw * 0.4, 0.18),
							t * 0.6,
							t,
						],
						[x, y, z + t],
						metal,
						0.004,
					);
				if (Number(p.drawerOpen) > 0) {
					this.addBox(
						"Bedroom Drawer Bottom",
						[cw * 0.92, t * 0.5, d * 0.7],
						[x, y - rh * 0.36, z - d * 0.35],
						material,
					);
					for (const side of [-1, 1])
						this.addBox(
							"Bedroom Drawer Side",
							[t * 0.5, rh * 0.6, d * 0.7],
							[x + side * cw * 0.46, y - rh * 0.05, z - d * 0.35],
							material,
						);
				}
			}
		}
		if (leg) this.legs(w, d, leg, Math.min(w, d) * 0.1, metal);
	}
}
