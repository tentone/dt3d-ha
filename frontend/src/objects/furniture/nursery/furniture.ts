import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {AccentChairObject} from "../living-room/seating.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	NurseryObject,
} from "./primitives.js";

export class NurseryChairObject extends AccentChairObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc0b2a2) {
		super(
			parameters,
			color,
			"nursery-chair",
			choice("style", "NurseryChairStyle", "nursing-chair", [
				{
					value: "nursing-chair",
					parameters: {
						width: 0.78,
						depth: 0.85,
						height: 1.02,
						seatHeight: 0.43,
					},
				},
				{
					value: "rocking-chair",
					parameters: {
						width: 0.75,
						depth: 0.95,
						height: 1.05,
						seatHeight: 0.43,
					},
				},
			]),
		);
	}
}

export class ChangingTableObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xbba27c) {
		super(
			"changing-table",
			"Changing table",
			"nurseryChangingControls",
			[
				...dimensions(0.85, 0.55, 0.92),
				integer("drawerRows", "ChangingDrawers", 2, 0, 4),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("padEnabled", "ChangingPad", true),
				boolean("bottomShelf", "BottomShelf", true),
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
			t = Math.min(0.025, w * 0.05, d * 0.07, h * 0.04);
		this.plate(
			"Changing Table Top",
			[w, t, d],
			[0, h - t / 2, 0],
			material,
			Math.min(w, d) * 0.06,
		);
		this.legs(w, d, h - t, Math.min(w, d) * 0.1, material);
		for (const side of [-1, 1])
			this.rounded(
				"Changing Table Side Rail",
				[t, h * 0.1, d],
				[(side * (w - t)) / 2, h + h * 0.05, 0],
				material,
				0.005,
			);
		this.rounded(
			"Changing Table Back Rail",
			[w, h * 0.1, t],
			[0, h + h * 0.05, -d / 2 + t / 2],
			material,
			0.005,
		);
		if (p.padEnabled)
			this.rounded(
				"Changing Pad",
				[w - t * 3, h * 0.055, d - t * 3],
				[0, h + h * 0.0275, 0],
				this.accent(0xdce5dc, 0.95),
				0.025,
			);
		if (p.bottomShelf)
			this.rounded(
				"Changing Table Shelf",
				[w * 0.88, t, d * 0.85],
				[0, h * 0.15, 0],
				material,
				0.004,
			);
		const rows = Number(p.drawerRows),
			rh = (h * 0.5) / Math.max(rows, 1),
			metal = this.accent(0x68736e, 0.35, 0.5);
		for (let row = 0; row < rows; row++) {
			const y = h * 0.88 - rh * (row + 0.5),
				z = d / 2 + Number(p.drawerOpen) * d * 0.6;
			this.rounded(
				"Changing Drawer Front",
				[w * 0.84, rh * 0.94, t],
				[0, y, z],
				material,
				0.004,
			);
			this.rounded(
				"Changing Drawer Handle",
				[w * 0.2, t * 0.6, t],
				[0, y, z + t],
				metal,
				0.003,
			);
			if (Number(p.drawerOpen) > 0) {
				this.addBox(
					"Changing Drawer Bottom",
					[w * 0.8, t * 0.5, d * 0.7],
					[0, y - rh * 0.35, z - d * 0.35],
					material,
				);
				for (const side of [-1, 1])
					this.addBox(
						"Changing Drawer Side",
						[t * 0.5, rh * 0.6, d * 0.7],
						[side * w * 0.4, y - rh * 0.05, z - d * 0.35],
						material,
					);
			}
		}
	}
}

export class KidsTableObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xbca27e) {
		super(
			"kids-table",
			"Kids' desk / play table",
			"nurseryTableControls",
			[
				choice("style", "TableStyle", "kids-desk", [
					{
						value: "kids-desk",
						parameters: {
							width: 0.85,
							depth: 0.5,
							height: 0.62,
							drawerEnabled: true,
							topShape: "rounded-top",
						},
					},
					{
						value: "play-table",
						parameters: {
							width: 0.7,
							depth: 0.7,
							height: 0.48,
							drawerEnabled: false,
							topShape: "round-top",
						},
					},
				]),
				...dimensions(0.85, 0.5, 0.62),
				choice("topShape", "TopShape", "rounded-top", [
					"rounded-top",
					"round-top",
				]),
				number("topThickness", "TopThickness", 0.03, 0.015, 0.1),
				boolean("drawerEnabled", "TableDrawer", true),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("shelfEnabled", "DeskShelf", false),
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
			t = Math.min(Number(p.topThickness), h * 0.2),
			round = p.topShape === "round-top",
			span = round ? Math.min(w, d) : w,
			dep = round ? span : d;
		if (round)
			this.cylinder(
				"Kids Table Top",
				span / 2,
				span / 2,
				t,
				[0, h - t / 2, 0],
				material,
				48,
			);
		else
			this.plate(
				"Kids Table Top",
				[w, t, d],
				[0, h - t / 2, 0],
				material,
				Math.min(w, d) * 0.13,
			);
		this.legs(
			span * 0.85,
			dep * 0.85,
			h - t,
			Math.min(span, dep) * 0.09,
			this.accent(0x8f9f98),
		);
		if (p.drawerEnabled) {
			const z = dep * 0.36 + Number(p.drawerOpen) * dep * 0.6;
			this.rounded(
				"Kids Desk Drawer",
				[span * 0.6, h * 0.15, t],
				[0, h - t - h * 0.09, z],
				material,
				0.005,
			);
			this.rounded(
				"Kids Desk Handle",
				[span * 0.15, t * 0.5, t],
				[0, h - t - h * 0.09, z + t],
				this.accent(0x64736c),
				0.003,
			);
			if (Number(p.drawerOpen) > 0)
				this.addBox(
					"Kids Desk Drawer Bottom",
					[span * 0.58, t * 0.5, dep * 0.6],
					[0, h - t - h * 0.16, z - dep * 0.3],
					material,
				);
		}
		if (p.shelfEnabled)
			this.rounded(
				"Kids Desk Shelf",
				[span * 0.78, t, dep * 0.4],
				[0, h * 0.25, -dep * 0.18],
				material,
				0.004,
			);
	}
}

export class KidsChairObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb7a17c) {
		super(
			"kids-chair",
			"Kids' chair",
			"nurseryKidsChairControls",
			[
				...dimensions(0.33, 0.35, 0.6),
				number("seatHeight", "SeatHeight", 0.3, 0.12, 0.6),
				integer("backSlats", "BackSlats", 3, 1, 6),
				boolean("armsEnabled", "ChairArms", false),
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
			y = Math.min(Number(p.seatHeight), h * 0.7),
			t = Math.min(w, d, h) * 0.07,
			bh = Math.max(t, h - y);
		this.plate(
			"Kids Chair Seat",
			[w, t, d],
			[0, y - t / 2, 0],
			material,
			Math.min(w, d) * 0.1,
		);
		this.legs(w, d, y - t, Math.min(w, d) * 0.1, this.accent(0x91aca2));
		for (const side of [-1, 1])
			this.rounded(
				"Kids Chair Back Post",
				[t, bh + t, t],
				[side * w * 0.4, y + (bh - t) / 2, -d * 0.36],
				material,
				0.004,
			);
		this.rounded(
			"Kids Chair Back Rail",
			[w * 0.9, t * 1.4, t],
			[0, h - t * 0.7, -d * 0.36],
			material,
			0.004,
		);
		for (let i = 0; i < Number(p.backSlats); i++)
			this.rounded(
				"Kids Chair Back Slat",
				[t * 0.65, bh * 0.8, t * 0.7],
				[
					Number(p.backSlats) === 1
						? 0
						: (i / (Number(p.backSlats) - 1) - 0.5) * w * 0.6,
					y + bh * 0.44,
					-d * 0.36,
				],
				material,
				0.003,
			);
		if (p.armsEnabled)
			for (const side of [-1, 1]) {
				this.rounded(
					"Kids Chair Arm",
					[t, t, d * 0.75],
					[side * w * 0.42, y + bh * 0.4, 0],
					material,
					0.004,
				);
				this.rounded(
					"Kids Chair Arm Support",
					[t, bh * 0.4, t],
					[side * w * 0.42, y + bh * 0.2, d * 0.25],
					material,
					0.003,
				);
			}
	}
}

export class NurseryWallShelvesObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xbca381) {
		super(
			"nursery-wall-shelves",
			"Children's wall shelves",
			"nurseryShelvesControls",
			[
				...dimensions(0.7, 0.22, 0.45),
				integer("shelfCount", "WallShelfCount", 2, 1, 5),
				boolean("backRail", "ShelfBackRail", true),
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
			count = Number(p.shelfCount),
			t = Math.min(0.022, w * 0.05, d * 0.1, h * 0.08);
		for (let i = 0; i < count; i++) {
			const y = t / 2 + (count === 1 ? 0 : i / (count - 1)) * (h - t);
			this.plate(
				"Nursery Wall Shelf",
				[w, t, d],
				[0, y, 0],
				material,
				Math.min(w, d) * 0.07,
			);
			for (const side of [-1, 1])
				this.rounded(
					"Nursery Shelf Bracket",
					[t, (h / (count + 1)) * 0.3, d * 0.7],
					[side * w * 0.35, y - (h / (count + 1)) * 0.13, -d * 0.1],
					this.accent(0x91a89e),
					0.003,
				);
			if (p.backRail)
				this.rounded(
					"Nursery Shelf Back Rail",
					[w, t * 2, t],
					[0, y + t, -d / 2 + t / 2],
					material,
					0.003,
				);
		}
	}
}
