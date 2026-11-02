import type {Mesh} from "three";
import {CircleGeometry, PointLight} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {LampObject} from "../living-room/lighting.js";
import {
	BedroomObject,
	boolean,
	choice,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export class BedsideObject extends BedroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xad8c64) {
		super(
			"bedside",
			"Bedside table / shelf",
			"bedroomBedsideControls",
			[
				choice("style", "BedsideStyle", "bedside-table", [
					{
						value: "bedside-table",
						parameters: {
							width: 0.5,
							depth: 0.4,
							height: 0.55,
							drawerCount: 1,
							legHeight: 0.12,
						},
					},
					{
						value: "bedside-shelf",
						parameters: {
							width: 0.45,
							depth: 0.3,
							height: 0.12,
							drawerCount: 0,
							legHeight: 0,
						},
					},
				]),
				...dimensions(0.5, 0.4, 0.55),
				integer("drawerCount", "BedsideDrawers", 1, 0, 3),
				number("legHeight", "LegHeight", 0.12, 0, 0.5),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("cubbyEnabled", "CubbyEnabled", true),
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
			t = Math.min(0.025, w * 0.07, d * 0.09, h * 0.1),
			shelf = p.style === "bedside-shelf",
			leg = shelf ? 0 : Math.min(Number(p.legHeight), h * 0.35),
			bh = h - leg,
			metal = this.accent(0x655f56, 0.3, 0.6);
		this.plate(
			"Bedside Top",
			[w, t, d],
			[0, h - t / 2, 0],
			material,
			Math.min(w, d) * 0.05,
		);
		for (const side of [-1, 1])
			this.rounded(
				"Bedside Side",
				[t, bh - t, d - t],
				[(side * (w - t)) / 2, leg + (bh - t) / 2, -t / 2],
				material,
				0.003,
			);
		this.addBox(
			"Bedside Back",
			[w - t * 2, bh - t * 2, t],
			[0, leg + bh / 2, -d / 2 + t / 2],
			material,
		);
		if (p.cubbyEnabled || shelf)
			this.rounded(
				"Bedside Shelf",
				[w - t * 2, t, d - t],
				[0, leg + t / 2, -t / 2],
				material,
				0.003,
			);
		const drawers = Number(p.drawerCount),
			dh = (bh * (p.cubbyEnabled ? 0.54 : 0.9)) / Math.max(1, drawers);
		for (let i = 0; i < drawers; i++) {
			const y = h - t - dh * (i + 0.5),
				z = d / 2 + Number(p.drawerOpen) * d * 0.65;
			this.rounded(
				"Bedside Drawer",
				[w - t * 1.5, dh * 0.95, t],
				[0, y, z],
				material,
				0.004,
			);
			this.rounded(
				"Bedside Drawer Handle",
				[w * 0.25, t * 0.6, t],
				[0, y, z + t],
				metal,
				0.003,
			);
			if (Number(p.drawerOpen) > 0) {
				this.addBox(
					"Bedside Drawer Bottom",
					[w - t * 3, t * 0.5, d * 0.7],
					[0, y - dh * 0.32, z - d * 0.35],
					material,
				);
				for (const side of [-1, 1])
					this.addBox(
						"Bedside Drawer Side",
						[t * 0.5, dh * 0.6, d * 0.7],
						[side * (w / 2 - t * 1.5), y - dh * 0.02, z - d * 0.35],
						material,
					);
			}
		}
		if (leg) this.legs(w, d, leg, Math.min(w, d) * 0.1, metal);
	}
}

export class BedsideLampObject extends LampObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xd5c6aa) {
		super({style: "table-lamp", ...parameters}, color, "bedside-lamp");
	}
}

export class BedroomBenchObject extends BedroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9b7c58) {
		super(
			"bedroom-bench",
			"Bedroom bench",
			"bedroomBenchControls",
			[
				...dimensions(1.2, 0.42, 0.46),
				boolean("upholstered", "BenchUpholstered", true),
				boolean("storageEnabled", "BenchStorage", false),
				boolean("storageOpen", "BenchStorageOpen", false),
				number("seatThickness", "BenchSeatThickness", 0.065, 0.02, 0.15),
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
			t = Math.min(Number(p.seatThickness), h * 0.25),
			leg = p.storageEnabled ? h * 0.15 : h - t,
			bodyH = h - t - leg,
			wood = Math.min(w, d) * 0.04;
		if (p.storageEnabled) {
			this.addBox(
				"Bench Storage Floor",
				[w, wood, d],
				[0, leg + wood / 2, 0],
				material,
			);
			for (const side of [-1, 1]) {
				this.addBox(
					"Bench Storage Side",
					[wood, bodyH, d],
					[(side * (w - wood)) / 2, leg + bodyH / 2, 0],
					material,
				);
				this.addBox(
					"Bench Storage Side",
					[w - wood * 2, bodyH, wood],
					[0, leg + bodyH / 2, (side * (d - wood)) / 2],
					material,
				);
			}
		} else
			this.rounded(
				"Bench Stretcher",
				[w * 0.8, wood, wood],
				[0, leg * 0.35, 0],
				material,
				0.004,
			);
		this.legs(w, d, leg, Math.min(w, d) * 0.1, material);
		const before = this.partsGroup.children.length;
		this.plate(
			"Bedroom Bench Seat",
			[w, t * 0.45, d],
			[0, h - t * 0.775, 0],
			material,
			Math.min(w, d) * 0.1,
		);
		if (p.upholstered)
			this.rounded(
				"Bedroom Bench Cushion",
				[w * 0.99, t * 0.7, d * 0.99],
				[0, h - t * 0.35, 0],
				this.accent(0xc1b09c, 0.98),
				0.035,
			);
		this.hingeParts(
			"Bench Lid Hinge",
			this.partsGroup.children.slice(before),
			[0, h - t, -d / 2],
			p.storageEnabled && p.storageOpen ? -Math.PI * 0.42 : 0,
			"x",
		);
	}
}

export class BedroomVanityObject extends BedroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb39973) {
		super(
			"bedroom-vanity",
			"Dressing table / vanity / desk",
			"bedroomVanityControls",
			[
				choice("style", "VanityStyle", "dressing-table", [
					{
						value: "dressing-table",
						parameters: {
							width: 1.2,
							depth: 0.45,
							height: 0.78,
							mirrorEnabled: true,
							mirrorShape: "oval-mirror",
							drawerRows: 1,
						},
					},
					{
						value: "vanity",
						parameters: {
							width: 1.1,
							depth: 0.5,
							height: 0.78,
							mirrorEnabled: true,
							mirrorShape: "rectangular-mirror",
							drawerRows: 3,
						},
					},
					{
						value: "bedroom-desk",
						parameters: {
							width: 1.2,
							depth: 0.6,
							height: 0.76,
							mirrorEnabled: false,
							drawerRows: 2,
						},
					},
				]),
				...dimensions(1.2, 0.45, 0.78),
				integer("drawerRows", "VanityDrawers", 1, 1, 4),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("mirrorEnabled", "VanityMirror", true),
				number("mirrorHeight", "MirrorHeight", 0.65, 0.2, 1.2),
				choice("mirrorShape", "VanityMirrorShape", "oval-mirror", [
					"oval-mirror",
					"rectangular-mirror",
				]),
				boolean("bulbsEnabled", "VanityBulbs", true),
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
			t = Math.min(0.03, w * 0.035, d * 0.07, h * 0.08),
			metal = this.accent(0x70695e, 0.3, 0.6);
		this.plate(
			"Dressing Table Top",
			[w, t, d],
			[0, h - t / 2, 0],
			material,
			Math.min(w, d) * 0.06,
		);
		this.legs(w, d, h - t, Math.min(w, d) * 0.075, material);
		const rows = Number(p.drawerRows),
			vanity = p.style === "vanity",
			desk = p.style === "bedroom-desk",
			drawerH = vanity ? (h * 0.78) / rows : (h * 0.25) / rows,
			dw = w * 0.25;
		for (const side of desk ? [-1] : [-1, 1]) {
			const x = side * w * 0.35;
			if (vanity) {
				for (const edge of [-1, 1])
					this.addBox(
						"Vanity Pedestal Side",
						[t, h * 0.8, d * 0.87],
						[x + (edge * (dw - t)) / 2, h * 0.5, 0],
						material,
					);
				this.addBox(
					"Vanity Pedestal Back",
					[dw, h * 0.8, t],
					[x, h * 0.5, -d * 0.43],
					material,
				);
			}
			for (let row = 0; row < rows; row++) {
				const y = h - t - drawerH * (row + 0.5),
					z = d / 2 + Number(p.drawerOpen) * d * 0.6;
				this.rounded(
					"Vanity Drawer",
					[dw * 0.97, drawerH * 0.96, t],
					[x, y, z],
					material,
					0.004,
				);
				this.rounded(
					"Vanity Drawer Handle",
					[dw * 0.4, t * 0.4, t],
					[x, y, z + t],
					metal,
					0.003,
				);
				if (Number(p.drawerOpen) > 0)
					this.addBox(
						"Vanity Drawer Bottom",
						[dw * 0.9, t * 0.5, d * 0.7],
						[x, y - drawerH * 0.35, z - d * 0.35],
						material,
					);
			}
		}
		if (!p.mirrorEnabled) return;
		const mh = Number(p.mirrorHeight),
			mw = Math.min(w * 0.62, mh * 0.9),
			z = -d * 0.32,
			cy = h + mh * 0.6,
			f = Math.min(mw * 0.055, 0.03),
			glass = this.accent(0xbdced9, 0.1, 0.55);
		for (const side of [-1, 1])
			this.rounded(
				"Vanity Mirror Support",
				[f, mh * 0.35, f],
				[side * mw * 0.3, h + mh * 0.14, z],
				material,
				0.003,
			);
		if (p.mirrorShape === "oval-mirror") {
			this.ellipsoid(
				"Vanity Mirror Frame",
				[mw / 2, mh / 2, t],
				[0, cy, z],
				material,
			);
			const face = this.addGeometry(
				"Vanity Mirror Glass",
				new CircleGeometry(1, 48),
				[0, cy, z + t * 1.02],
				glass,
			);
			face.scale.set(mw / 2 - f, mh / 2 - f, 1);
		} else {
			this.rounded(
				"Vanity Mirror Frame",
				[mw, mh, t],
				[0, cy, z],
				material,
				0.008,
			);
			this.rounded(
				"Vanity Mirror Glass",
				[mw - f * 2, mh - f * 2, t * 0.15],
				[0, cy, z + t * 0.6],
				glass,
				0.004,
			);
		}
		if (vanity && p.bulbsEnabled) {
			for (const side of [-1, 1])
				for (let i = 0; i < 4; i++)
					this.ellipsoid(
						"Vanity Bulb",
						[f * 0.8, f * 0.8, f * 0.8],
						[
							side * (mw / 2 - f * 0.3),
							cy + (i / 3 - 0.5) * mh * 0.82,
							z + t * 1.5,
						],
						this.accent(0xffe5bb, 0.4, 0, 1, true),
					);
			const light = new PointLight(0xffe5bb, 0.2, 3, 2);
			light.name = "Vanity Light";
			light.position.set(0, cy + mh * 0.3, z + mh * 0.65);
			light.internal = true;
			this.partsGroup.add(light);
		}
	}
}
