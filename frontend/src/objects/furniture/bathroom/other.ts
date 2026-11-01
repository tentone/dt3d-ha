import type {Mesh} from "three";
import {TorusGeometry, Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {RugObject} from "../living-room/decoration.js";
import {
	BathroomObject,
	boolean,
	choice,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export class LaundryBasketObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb49d79) {
		super(
			"laundry-basket",
			"Laundry basket",
			"bathBasketControls",
			[
				...dimensions(0.42, 0.35, 0.6),
				choice("shape", "BasketShape", "oval", ["oval", "rectangular"]),
				choice("style", "BasketStyle", "woven", ["woven", "slatted"]),
				integer("slatCount", "SlatCount", 24, 12, 48),
				boolean("lidEnabled", "LidEnabled", false),
				boolean("contentsEnabled", "LaundryEnabled", true),
			],
			parameters,
			color,
			0.9,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(0.014, w * 0.08, d * 0.08, h * 0.1),
			round = p.shape === "oval";
		const trim = this.accent(0x8e7a5b, 0.9);
		if (round) {
			if (p.style === "woven") {
				const r = w / 2;
				const shell = this.lathe(
					"Laundry Basket Shell",
					[
						[0, 0],
						[r * 0.8, 0],
						[r, h],
						[r - t, h],
						[Math.max(t, r * 0.8 - t), t],
						[0, t],
					],
					[0, 0, 0],
					material,
				);
				shell.scale.z = d / w;
			} else {
				const base = this.cylinder(
					"Laundry Basket Base",
					w * 0.4,
					w * 0.4,
					t,
					[0, t / 2, 0],
					material,
				);
				base.scale.z = d / w;
				for (let i = 0; i < Number(p.slatCount); i++) {
					const a = (i / Number(p.slatCount)) * Math.PI * 2;
					this.pipe(
						"Basket Slat",
						new Vector3(Math.cos(a) * w * 0.39, t, Math.sin(a) * d * 0.39),
						new Vector3(Math.cos(a) * w * 0.49, h - t, Math.sin(a) * d * 0.49),
						t * 0.35,
						material,
					);
				}
			}
			for (let i = 0; i < 8; i++) {
				const y = t + (i / 7) * (h - t * 2),
					radius = w * (0.4 + (0.1 * y) / h);
				const band = this.addGeometry(
					"Basket Weave Band",
					new TorusGeometry(radius, t * 0.25, 6, 48),
					[0, y, 0],
					trim,
				);
				band.rotation.x = Math.PI / 2;
				band.scale.y = d / w;
			}
		} else {
			this.rounded("Laundry Basket Base", [w, t, d], [0, t / 2, 0], material);
			if (p.style === "woven")
				for (const side of [-1, 1]) {
					this.rounded(
						"Laundry Basket Wall",
						[w, h - t, t],
						[0, (h + t) / 2, side * (d / 2 - t / 2)],
						material,
					);
					this.rounded(
						"Laundry Basket Wall",
						[t, h - t, d - t * 2],
						[side * (w / 2 - t / 2), (h + t) / 2, 0],
						material,
					);
				}
			else {
				const n = Math.ceil(Number(p.slatCount) / 4);
				for (const side of [-1, 1])
					for (let i = 0; i < n; i++) {
						this.addBox(
							"Basket Slat",
							[(w / n) * 0.5, h - t, t],
							[-w / 2 + ((i + 0.5) / n) * w, (h + t) / 2, (side * (d - t)) / 2],
							material,
						);
						this.addBox(
							"Basket Slat",
							[t, h - t, (d / n) * 0.5],
							[(side * (w - t)) / 2, (h + t) / 2, -d / 2 + ((i + 0.5) / n) * d],
							material,
						);
					}
			}
			for (const side of [-1, 1])
				for (const y of [h * 0.15, h * 0.85]) {
					this.addBox(
						"Basket Trim",
						[w, t * 0.5, t * 0.5],
						[0, y, (side * d) / 2],
						trim,
					);
					this.addBox(
						"Basket Trim",
						[t * 0.5, t * 0.5, d],
						[(side * w) / 2, y, 0],
						trim,
					);
				}
		}
		for (const side of [-1, 1]) {
			const handle = this.addGeometry(
				"Basket Handle",
				new TorusGeometry(Math.min(d * 0.18, h * 0.08), t * 0.35, 8, 24),
				[side * w * 0.48, h * 0.85, 0],
				trim,
			);
			handle.rotation.y = Math.PI / 2;
		}
		if (p.lidEnabled) {
			if (round) {
				const lid = this.cylinder(
					"Laundry Basket Lid",
					w / 2,
					w / 2,
					t,
					[0, h + t / 2, 0],
					material,
					48,
				);
				lid.scale.z = d / w;
			} else
				this.rounded(
					"Laundry Basket Lid",
					[w, t, d],
					[0, h + t / 2, 0],
					material,
				);
		} else if (p.contentsEnabled)
			for (let i = 0; i < 3; i++)
				this.ellipsoid(
					"Laundry",
					[w * 0.21, h * 0.08, d * 0.24],
					[(i - 1) * w * 0.18, h * (0.82 + (i % 2) * 0.05), 0],
					this.accent([0xb8c5c4, 0xe6dbce, 0xa8b6c6][i], 1),
				);
	}
}

export class BathroomStoolObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb89a71) {
		super(
			"bathroom-stool",
			"Bathroom stool",
			"bathStoolControls",
			[
				...dimensions(0.38, 0.32, 0.42),
				choice("seatShape", "SeatShape", "rounded", ["rounded", "round"]),
				integer("legCount", "LegCount", 4, 3, 4),
				number("seatThickness", "SeatThickness", 0.035, 0.015, 0.1),
			],
			parameters,
			color,
			0.8,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(Number(p.seatThickness), h * 0.3),
			round = p.seatShape === "round";
		const a = round ? Math.min(w, d) : w,
			b = round ? a : d;
		if (round)
			this.cylinder(
				"Stool Seat",
				a / 2,
				a / 2,
				t,
				[0, h - t / 2, 0],
				material,
				48,
			);
		else
			this.plate(
				"Stool Seat",
				[w, t, d],
				[0, h - t / 2, 0],
				material,
				Math.min(w, d) * 0.18,
			);
		const radius = Math.min(0.02, a * 0.08, b * 0.08),
			footH = Math.min(0.015, h * 0.1),
			n = Number(p.legCount);
		for (let i = 0; i < n; i++) {
			const angle = (i / n) * Math.PI * 2 + Math.PI / 4,
				x = Math.cos(angle) * a * 0.35,
				z = Math.sin(angle) * b * 0.35;
			this.pipe(
				"Stool Leg",
				new Vector3(x, footH, z),
				new Vector3(x * 0.78, h - t, z * 0.78),
				radius,
				material,
			);
			this.cylinder(
				"Stool Non-slip Foot",
				radius * 1.2,
				radius * 1.2,
				footH,
				[x, footH / 2, z],
				this.accent(0x555b5c),
			);
		}
	}
}

export class BathMatObject extends RugObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x94b2ae) {
		super(
			{
				width: 0.75,
				depth: 0.5,
				height: 0.012,
				borderEnabled: false,
				...parameters,
			},
			color,
			"bath-mat",
		);
	}
}
