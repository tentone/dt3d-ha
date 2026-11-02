import type {Mesh} from "three";
import {TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {KitchenObject, rectangle} from "../kitchen/primitives.js";
import {boolean, dimensions} from "./primitives.js";

export class ToyKitchenObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc6ae88) {
		super(
			"toy-kitchen",
			"Toy kitchen",
			"nurseryToyKitchenControls",
			[
				...dimensions(0.9, 0.35, 1),
				boolean("ovenOpen", "ToyOvenOpen", false),
				boolean("faucetEnabled", "ToyFaucet", true),
				boolean("shelfEnabled", "ToyKitchenShelf", true),
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
			t = Math.min(w, d, h) * 0.055,
			cy = h * 0.58,
			bh = cy - t,
			metal = this.accent(0x8fa99d),
			bowlW = w * 0.35,
			bowlD = d * 0.65,
			bowlH = h * 0.11;
		for (const side of [-1, 1])
			this.addBox(
				"Toy Kitchen Side",
				[t, bh, d],
				[(side * (w - t)) / 2, bh / 2, 0],
				material,
			);
		this.addBox("Toy Kitchen Floor", [w, t, d], [0, t / 2, 0], material);
		this.addBox(
			"Toy Kitchen Back",
			[w, h, t],
			[0, h / 2, -d / 2 + t / 2],
			material,
		);
		this.slab("Toy Kitchen Countertop", rectangle(w, d), t, cy - t, metal, [
			{x: w * 0.25, z: 0, width: bowlW, depth: bowlD},
		]);
		this.bowl(
			"Toy Kitchen Sink",
			bowlW,
			bowlD,
			bowlH,
			t * 0.5,
			[w * 0.25, cy - bowlH, 0],
			this.accent(0xd8e1d8, 0.35),
		);
		this.ovenFront(
			-w * 0.24,
			bh * 0.48,
			d / 2,
			w * 0.45,
			bh * 0.88,
			material,
			Boolean(p.ovenOpen),
		);
		this.rounded(
			"Toy Sink Cabinet Door",
			[w * 0.46, bh * 0.85, t],
			[w * 0.24, bh * 0.48, d / 2],
			material,
			0.005,
		);
		this.rounded(
			"Toy Sink Handle",
			[w * 0.12, t * 0.5, t],
			[w * 0.24, bh * 0.7, d / 2 + t],
			this.accent(0x697a71),
			0.003,
		);
		for (const z of [-d * 0.19, d * 0.19])
			this.addGeometry(
				"Toy Hob Ring",
				new TorusGeometry(Math.min(w * 0.105, d * 0.16), t * 0.18, 8, 32),
				[-w * 0.24, cy + t * 0.15, z],
				this.accent(0x65766d),
			).rotation.x = Math.PI / 2;
		if (p.faucetEnabled)
			this.faucet(
				w * 0.25,
				cy,
				-d * 0.35,
				h * 0.15,
				d * 0.38,
				this.accent(0xb49c70, 0.3, 0.3),
			);
		if (p.shelfEnabled) {
			this.rounded(
				"Toy Kitchen Wall Shelf",
				[w * 0.9, t, d * 0.45],
				[0, h * 0.88, -d * 0.28],
				material,
				0.004,
			);
			for (const x of [-w * 0.25, 0, w * 0.25])
				this.cylinder(
					"Toy Kitchen Knob",
					t * 0.7,
					t * 0.7,
					t,
					[x, h * 0.75, -d / 2 + t * 1.5],
					this.accent(0xb49c70),
					16,
				).rotation.x = Math.PI / 2;
		}
	}
}
