import type {Mesh} from "three";
import {ExtrudeGeometry, Shape} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GarageObject,
	integer,
} from "./primitives.js";

export class GarageBinsObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x737e7d) {
		super(
			"garage-bins",
			"Recycling / waste bins",
			"garageBinsControls",
			[
				choice("style", "BinStyle", "recycling-bins", [
					{
						value: "recycling-bins",
						parameters: {width: 1.35, depth: 0.55, height: 0.9, binCount: 3},
					},
					{
						value: "waste-bins",
						parameters: {width: 0.5, depth: 0.55, height: 0.9, binCount: 1},
					},
				]),
				...dimensions(1.35, 0.55, 0.9),
				integer("binCount", "BinCount", 3, 1, 4),
				boolean("lidsOpen", "BinLids", false),
				boolean("wheelsEnabled", "BinWheels", true),
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
			n = Number(p.binCount),
			cw = w / (n + 0.12 * (n - 1)),
			gap = cw * 0.12,
			t = Math.min(cw, d, h) * 0.045,
			r = Math.min(cw, d, h) * 0.085,
			b = p.wheelsEnabled ? r * 0.7 : 0,
			bodyH = h - b - t,
			dark = this.accent(0x35403f, 0.8);
		for (let i = 0; i < n; i++) {
			const x = (i - (n - 1) / 2) * (cw + gap),
				lid = this.accent(
					p.style === "recycling-bins"
						? [0x7397b4, 0xc6b260, 0x8aa575, 0xa291b1][i]
						: 0x4a5553,
					0.7,
				);
			this.rounded(
				"Garage Bin Floor",
				[cw, t, d],
				[x, b + t / 2, 0],
				material,
				0.008,
			);
			for (const s of [-1, 1]) {
				this.rounded(
					"Garage Bin Wall",
					[t, bodyH, d],
					[x + (s * (cw - t)) / 2, b + bodyH / 2, 0],
					material,
					0.006,
				);
				this.rounded(
					"Garage Bin Wall",
					[cw - t * 2, bodyH, t],
					[x, b + bodyH / 2, (s * (d - t)) / 2],
					material,
					0.006,
				);
			}
			const before = this.partsGroup.children.length;
			this.rounded(
				"Garage Bin Lid",
				[cw * 1.02, t * 1.5, d * 1.02],
				[x, h - t / 2, 0],
				lid,
				0.008,
			);
			this.rounded(
				"Garage Bin Lid Grip",
				[cw * 0.35, t, t * 2],
				[x, h + t * 0.7, d * 0.33],
				dark,
				0.004,
			);
			this.hingeParts(
				"Garage Bin Hinge",
				this.partsGroup.children.slice(before),
				[x, h - t, -d / 2],
				p.lidsOpen ? -Math.PI * 0.62 : 0,
				"x",
			);
			this.rail(
				"Garage Bin Handle",
				[x - cw * 0.32, h * 0.88, -d * 0.53],
				[x + cw * 0.32, h * 0.88, -d * 0.53],
				t * 0.65,
				dark,
			);
			if (p.wheelsEnabled)
				for (const s of [-1, 1])
					this.wheel(
						"Garage Bin Wheel",
						[x + s * cw * 0.42, r, -d * 0.36],
						r,
						t * 1.4,
					);
			this.rounded(
				"Garage Bin Label",
				[cw * 0.47, h * 0.16, t * 0.2],
				[x, h * 0.62, d * 0.504],
				lid,
				0.004,
			);
			if (p.style === "recycling-bins") {
				const size = Math.min(cw, h) * 0.14,
					arrow = new Shape();
				arrow.moveTo(-0.4, 0.25);
				arrow.lineTo(0.05, 0.25);
				arrow.lineTo(0.05, 0.43);
				arrow.lineTo(0.48, 0);
				arrow.lineTo(0.05, -0.43);
				arrow.lineTo(0.05, -0.22);
				arrow.lineTo(-0.4, -0.22);
				arrow.closePath();
				for (let a = 0; a < 3; a++) {
					const angle = (a / 3) * Math.PI * 2,
						geo = new ExtrudeGeometry(arrow, {
							depth: 0.05,
							bevelEnabled: false,
						});
					geo.scale(size, size, t * 0.25);
					this.addGeometry(
						"Garage Recycling Arrow",
						geo,
						[
							x + Math.sin(angle) * size * 0.55,
							h * 0.62 + Math.cos(angle) * size * 0.55,
							d * 0.51 + t * 0.15,
						],
						this.accent(0xe7e8db, 0.8),
					).rotation.z = -angle;
				}
			}
		}
	}
}

export class GarageBoxesObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9ca49e) {
		super(
			"garage-boxes",
			"Storage boxes",
			"garageBoxesControls",
			[
				choice("style", "BoxStyle", "plastic-tote", [
					"plastic-tote",
					"cardboard-box",
					"wood-crate",
				]),
				...dimensions(0.6, 0.4, 0.35),
				integer("stackCount", "BoxStack", 1, 1, 4),
				boolean("lidEnabled", "BoxLid", true),
				boolean("lidOpen", "BoxOpen", false),
				boolean("handlesEnabled", "BoxHandles", true),
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
			t = Math.min(0.018, w * 0.04, d * 0.06, h * 0.06),
			wood = p.style === "wood-crate",
			card = p.style === "cardboard-box",
			detail = this.accent(card ? 0xb49a72 : 0x515d5e, 0.85);
		for (let i = 0; i < Number(p.stackCount); i++) {
			const b = i * h;
			this.addBox("Storage Box Floor", [w, t, d], [0, b + t / 2, 0], material);
			for (const s of [-1, 1]) {
				if (wood) {
					for (let row = 0; row < 4; row++) {
						this.addBox(
							"Storage Crate Slat",
							[w, h * 0.17, t],
							[0, b + (h * (row + 0.5)) / 4, (s * (d - t)) / 2],
							material,
						);
						this.addBox(
							"Storage Crate Slat",
							[t, h * 0.17, d - t * 2],
							[(s * (w - t)) / 2, b + (h * (row + 0.5)) / 4, 0],
							material,
						);
					}
					for (const z of [-1, 1])
						this.addBox(
							"Storage Crate Corner",
							[t, h, t],
							[(s * (w - t)) / 2, b + h / 2, (z * (d - t)) / 2],
							detail,
						);
				} else {
					this.rounded(
						"Storage Box Wall",
						[t, h, d],
						[(s * (w - t)) / 2, b + h / 2, 0],
						material,
						0.004,
					);
					this.rounded(
						"Storage Box Wall",
						[w - t * 2, h, t],
						[0, b + h / 2, (s * (d - t)) / 2],
						material,
						0.004,
					);
				}
				if (p.handlesEnabled)
					this.rounded(
						"Storage Box Grip",
						[t * 0.6, h * 0.13, d * 0.3],
						[(s * (w + t * 0.2)) / 2, b + h * 0.75, 0],
						detail,
						0.004,
					);
			}
			if (p.lidEnabled) {
				const before = this.partsGroup.children.length;
				this.rounded(
					"Storage Box Lid",
					[w * 1.02, t, d * 1.02],
					[0, b + h - t / 2, 0],
					card ? material : detail,
					0.005,
				);
				if (card)
					this.addBox(
						"Cardboard Box Tape",
						[w * 0.12, t * 0.2, d],
						[0, b + h + t * 0.05, 0],
						detail,
					);
				this.hingeParts(
					"Storage Box Lid Hinge",
					this.partsGroup.children.slice(before),
					[0, b + h - t, -d / 2],
					p.lidOpen && i === Number(p.stackCount) - 1 ? -Math.PI * 0.6 : 0,
					"x",
				);
			}
		}
	}
}
