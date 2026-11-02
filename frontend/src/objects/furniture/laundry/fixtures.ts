import type {Mesh} from "three";
import {Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {KitchenObject, rectangle} from "../kitchen/primitives.js";
import {boolean, choice, dimensions, number} from "./primitives.js";

export class UtilitySinkObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xd8dfd9) {
		super(
			"utility-sink",
			"Utility sink / laundry basin",
			"laundrySinkControls",
			[
				choice("style", "SinkStyle", "utility-sink", [
					{
						value: "utility-sink",
						parameters: {
							width: 0.65,
							depth: 0.55,
							height: 0.9,
							standEnabled: true,
							bowlDepth: 0.28,
						},
					},
					{
						value: "laundry-basin",
						parameters: {
							width: 0.8,
							depth: 0.55,
							height: 0.3,
							standEnabled: false,
							bowlDepth: 0.25,
						},
					},
				]),
				...dimensions(0.65, 0.55, 0.9),
				number("bowlDepth", "BowlDepth", 0.28, 0.08, 0.45),
				boolean("standEnabled", "SinkStand", true),
				boolean("faucetEnabled", "SinkFaucet", true),
				boolean("trapEnabled", "SinkTrap", true),
			],
			parameters,
			color,
			0.4,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			stand = Boolean(p.standEnabled),
			bh = Math.min(Number(p.bowlDepth), h * (stand ? 0.5 : 0.95)),
			t = Math.min(w, d, bh) * 0.045,
			bw = w * 0.86,
			bd = d * 0.72,
			z = d * 0.025,
			bottom = h - bh,
			metal = this.accent(0x879d9c, 0.3, 0.7);
		this.slab("Utility Sink Rim", rectangle(w, d), t, h - t, material, [
			{x: 0, z, width: bw, depth: bd},
		]);
		const bowl = this.bowl(
			"Utility Sink Bowl",
			bw,
			bd,
			bh,
			t,
			[0, bottom, z],
			material,
		);
		this.drain(
			0,
			bottom + Number(bowl.userData.bowlFloor) + 0.001,
			z,
			Math.min(bw, bd) * 0.075,
		);
		if (stand) {
			for (const x of [-1, 1])
				for (const side of [-1, 1])
					this.rounded(
						"Utility Sink Leg",
						[t * 1.3, h - t, t * 1.3],
						[x * w * 0.44, (h - t) / 2, side * d * 0.4],
						metal,
						0.004,
					);
			for (const side of [-1, 1]) {
				this.pipe(
					"Utility Sink Brace",
					new Vector3(-w * 0.44, bottom * 0.25, side * d * 0.4),
					new Vector3(w * 0.44, bottom * 0.25, side * d * 0.4),
					t * 0.45,
					metal,
				);
				this.pipe(
					"Utility Sink Rim Support",
					new Vector3(-w * 0.44, h - t, side * d * 0.4),
					new Vector3(w * 0.44, h - t, side * d * 0.4),
					t * 0.5,
					metal,
				);
				this.pipe(
					"Utility Sink Rim Support",
					new Vector3(side * w * 0.44, h - t, -d * 0.4),
					new Vector3(side * w * 0.44, h - t, d * 0.4),
					t * 0.5,
					metal,
				);
			}
			if (p.trapEnabled) {
				this.pipe(
					"Utility Sink Drainpipe",
					new Vector3(0, bottom, 0),
					new Vector3(0, bottom * 0.55, 0),
					t * 0.7,
					metal,
				);
				this.pipe(
					"Utility Sink Trap",
					new Vector3(0, bottom * 0.55, 0),
					new Vector3(0, bottom * 0.55, -d * 0.3),
					t * 0.7,
					metal,
				);
			}
		}
		if (p.faucetEnabled)
			this.faucet(
				0,
				h,
				-d * 0.36,
				Math.min(w, d) * 0.58,
				d * 0.43,
				this.accent(0xb3c3c7, 0.2, 0.8),
			);
	}
}
