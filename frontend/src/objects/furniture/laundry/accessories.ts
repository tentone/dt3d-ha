import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	LaundryObject,
} from "./primitives.js";

export class ClothesDryingRackObject extends LaundryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x8daba3) {
		super(
			"clothes-drying-rack",
			"Clothes drying rack",
			"laundryDryingControls",
			[
				choice("style", "DryingStyle", "winged-airer", [
					{
						value: "winged-airer",
						parameters: {width: 1.4, depth: 0.55, height: 1},
					},
					{
						value: "tower-airer",
						parameters: {width: 0.65, depth: 0.65, height: 1.4},
					},
				]),
				...dimensions(1.4, 0.55, 1),
				integer("rodCount", "RodCount", 8, 3, 16),
				integer("tiers", "DryingTiers", 3, 1, 4),
				boolean("folded", "DryingFolded", false),
				boolean("wingsEnabled", "DryingWings", true),
				boolean("towelsEnabled", "DryingTowels", false),
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
			r = Math.min(w, d, h) * 0.012,
			count = Number(p.rodCount),
			tower = p.style === "tower-airer",
			folded = Boolean(p.folded);
		const panel = (y: number, span: number) => {
			const before = this.partsGroup.children.length;
			for (const side of [-1, 1])
				this.rail(
					"Drying Panel Frame",
					[(side * span) / 2, y, -d * 0.45],
					[(side * span) / 2, y, d * 0.45],
					r,
					material,
				);
			for (let i = 0; i < count; i++)
				this.rail(
					"Clothes Drying Rod",
					[-span / 2, y, (i / (count - 1) - 0.5) * d * 0.9],
					[span / 2, y, (i / (count - 1) - 0.5) * d * 0.9],
					r * 0.6,
					material,
				);
			if (folded)
				this.hingeParts(
					"Folded Drying Panel",
					this.partsGroup.children.slice(before),
					[0, y, 0],
					Math.PI / 2,
					"x",
				);
		};
		if (tower) {
			for (const x of [-1, 1])
				for (const side of [-1, 1])
					this.rail(
						"Drying Tower Post",
						[x * w * 0.45, 0, side * d * (folded ? 0.05 : 0.42)],
						[x * w * 0.45, h, side * d * (folded ? 0.05 : 0.42)],
						r * 1.2,
						material,
					);
			for (let i = 0; i < Number(p.tiers); i++)
				panel(
					h * (0.25 + (0.65 * i) / Math.max(1, Number(p.tiers) - 1)),
					w * 0.9,
				);
		} else {
			const y = h * 0.8;
			for (const x of [-1, 1]) {
				this.rail(
					"Drying Rack Cross Leg",
					[x * w * 0.23, 0, -d * (folded ? 0.05 : 0.4)],
					[x * w * 0.23, y, d * (folded ? 0.03 : 0.36)],
					r * 1.2,
					material,
				);
				this.rail(
					"Drying Rack Cross Leg",
					[x * w * 0.23, 0, d * (folded ? 0.05 : 0.4)],
					[x * w * 0.23, y, -d * (folded ? 0.03 : 0.36)],
					r * 1.2,
					material,
				);
			}
			panel(y, w * 0.55);
			if (p.wingsEnabled && !folded)
				for (const side of [-1, 1]) {
					for (const end of [-1, 1])
						this.rail(
							"Drying Wing Frame",
							[side * w * 0.275, y, end * d * 0.45],
							[side * w * 0.5, h, end * d * 0.45],
							r,
							material,
						);
					for (let i = 0; i < count; i++)
						this.rail(
							"Drying Wing Rod",
							[
								side * w * (0.29 + (0.2 * i) / (count - 1)),
								y + (h * 0.2 * i) / (count - 1),
								-d * 0.45,
							],
							[
								side * w * (0.29 + (0.2 * i) / (count - 1)),
								y + (h * 0.2 * i) / (count - 1),
								d * 0.45,
							],
							r * 0.6,
							material,
						);
				}
		}
		if (p.towelsEnabled)
			for (const side of [-1, 1])
				this.rounded(
					"Drying Towel",
					[w * (tower ? 0.32 : 0.2), h * 0.3, d * 0.015],
					[side * w * 0.17, h * 0.64, 0],
					this.accent(side < 0 ? 0xc9c4ae : 0xa5bcb2, 0.98),
					0.008,
				);
	}
}

export class CleaningTrolleyObject extends LaundryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x8ca39c) {
		super(
			"cleaning-trolley",
			"Cleaning trolley",
			"laundryTrolleyControls",
			[
				...dimensions(0.8, 0.45, 0.9),
				integer("shelfCount", "TrolleyShelves", 2, 1, 4),
				boolean("suppliesEnabled", "CleaningSupplies", true),
				boolean("mopEnabled", "CleaningMop", true),
				boolean("wheelsEnabled", "TrolleyWheels", true),
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
			r = Math.min(w, d, h) * 0.055,
			t = Math.min(w, d, h) * 0.035,
			base = p.wheelsEnabled ? r * 2 : 0,
			metal = this.accent(0x637c77, 0.35, 0.65),
			count = Number(p.shelfCount);
		for (const x of [-1, 1])
			for (const z of [-1, 1]) {
				this.rail(
					"Cleaning Cart Post",
					[x * w * 0.42, base, z * d * 0.38],
					[x * w * 0.42, h * 0.83, z * d * 0.38],
					t * 0.5,
					material,
				);
				if (p.wheelsEnabled)
					this.cylinder(
						"Cleaning Trolley Caster",
						r,
						r,
						t,
						[x * w * 0.42, r, z * d * 0.38],
						metal,
						20,
					).rotation.x = Math.PI / 2;
			}
		for (let i = 0; i < count; i++)
			this.plate(
				"Cleaning Trolley Shelf",
				[w, t, d],
				[0, base + h * (0.06 + (0.55 * i) / Math.max(1, count - 1)), 0],
				material,
				Math.min(w, d) * 0.05,
			);
		for (const side of [-1, 1])
			this.rail(
				"Cleaning Trolley Handle Support",
				[w * 0.42, h * 0.8, side * d * 0.3],
				[w * 0.55, h * 0.94, side * d * 0.3],
				t * 0.45,
				metal,
			);
		this.rail(
			"Cleaning Trolley Handle",
			[w * 0.55, h * 0.94, -d * 0.3],
			[w * 0.55, h * 0.94, d * 0.3],
			t * 0.45,
			metal,
		);
		if (p.suppliesEnabled) {
			const br = Math.min(w * 0.18, d * 0.35),
				bh = h * 0.32,
				y = base + h * 0.06 + t / 2;
			this.lathe(
				"Cleaning Bucket",
				[
					[0, 0],
					[br * 0.7, 0],
					[br, bh],
					[br - t, bh],
					[br * 0.7 - t, t],
					[0, t],
				],
				[-w * 0.23, y, 0],
				this.accent(0x9fb7c6, 0.55),
			);
			this.rail(
				"Bucket Handle",
				[-w * 0.23 - br * 0.9, y + bh, 0],
				[-w * 0.23 + br * 0.9, y + bh, 0],
				t * 0.3,
				metal,
			);
			const sy = base + h * (count === 1 ? 0.06 : 0.61) + t / 2;
			for (let i = 0; i < 3; i++) {
				const x = (i - 1) * w * 0.17,
					bottleH = h * (0.19 + (i % 2) * 0.04),
					bottleR = Math.min(w * 0.055, d * 0.15);
				this.cylinder(
					"Cleaning Bottle",
					bottleR,
					bottleR,
					bottleH,
					[x, sy + bottleH / 2, 0],
					this.accent([0xb8c79a, 0xb4c9cb, 0xc7b195][i], 0.55),
					24,
				);
				this.cylinder(
					"Cleaning Bottle Cap",
					bottleR * 0.45,
					bottleR * 0.45,
					bottleH * 0.15,
					[x, sy + bottleH * 1.075, 0],
					metal,
					16,
				);
			}
		}
		if (p.mopEnabled) {
			this.rail(
				"Cleaning Mop Handle",
				[-w * 0.5, base + h * 0.09, 0],
				[-w * 0.48, h * 0.96, 0],
				t * 0.3,
				metal,
			);
			this.rounded(
				"Cleaning Mop Head",
				[w * 0.23, h * 0.05, d * 0.3],
				[-w * 0.5, base + h * 0.06, 0],
				this.accent(0xd5d5c5, 0.95),
				0.008,
			);
		}
	}
}
