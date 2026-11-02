import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	KitchenObject,
	number,
	rectangle,
} from "./primitives.js";

export class KitchenSinkObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb8c4ca) {
		super(
			"kitchen-sink",
			"Kitchen sink",
			"kitchenSinkControls",
			[
				choice("style", "SinkStyle", "single-sink", [
					{
						value: "single-sink",
						parameters: {width: 0.65, depth: 0.5, height: 0.22, bowlCount: 1},
					},
					{
						value: "double-sink",
						parameters: {width: 0.95, depth: 0.5, height: 0.22, bowlCount: 2},
					},
				]),
				...dimensions(0.65, 0.5, 0.22),
				integer("bowlCount", "BowlCount", 1, 1, 2),
				boolean("faucetEnabled", "FaucetEnabled", true),
			],
			parameters,
			color,
			0.22,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			count = Number(p.bowlCount),
			cell = w / count,
			bw = cell * 0.87,
			bd = d * 0.69,
			z = d * 0.04,
			t = Math.min(h * 0.06, Math.min(w, d) * 0.025);
		const holes = Array.from({length: count}, (_, i) => ({
			x: -w / 2 + cell * (i + 0.5),
			z,
			width: bw,
			depth: bd,
		}));
		this.slab("Sink Rim", rectangle(w, d), t, h - t, material, holes);
		for (const hole of holes) {
			const bowl = this.bowl(
				"Kitchen Sink Bowl",
				bw,
				bd,
				h,
				t,
				[hole.x, 0, z],
				material,
			);
			this.drain(
				hole.x,
				Number(bowl.userData.bowlFloor) + 0.001,
				z,
				Math.min(bw, bd) * 0.075,
			);
		}
		if (p.faucetEnabled)
			this.faucet(
				0,
				h,
				-d * 0.36,
				Math.min(w, d) * 0.62,
				d * 0.43,
				this.accent(0xb9c6ce, 0.18, 0.85),
			);
	}
}

export class KitchenFaucetObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xaebec7) {
		super(
			"kitchen-faucet",
			"Kitchen faucet",
			"kitchenFaucetControls",
			[
				...dimensions(0.1, 0.25, 0.35),
				choice("style", "FaucetStyle", "gooseneck-faucet", [
					"gooseneck-faucet",
					"straight-faucet",
				]),
				number("pullOut", "PullOut", 0, 0, 0.3),
			],
			parameters,
			color,
			0.2,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		this.rounded(
			"Faucet Mount",
			[w, h * 0.025, d * 0.16],
			[0, h * 0.0125, -d * 0.35],
			material,
			0.003,
		);
		this.faucet(
			0,
			h * 0.025,
			-d * 0.35,
			h * 0.96,
			d * 0.8 + Number(p.pullOut),
			material,
			p.style === "gooseneck-faucet",
		);
	}
}

export class KitchenBinObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9da8af) {
		super(
			"kitchen-bin",
			"Waste bin",
			"kitchenBinControls",
			[
				...dimensions(0.32, 0.35, 0.55),
				choice("shape", "BinShape", "rectangular", ["rectangular", "round"]),
				boolean("lidOpen", "LidOpen", false),
				boolean("pedalEnabled", "PedalEnabled", true),
			],
			parameters,
			color,
			0.35,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(w, d, h) * 0.04,
			round = p.shape === "round",
			r = Math.min(w, d) / 2;
		if (round)
			this.lathe(
				"Waste Bin Body",
				[
					[0, 0],
					[r * 0.85, 0],
					[r, h - t],
					[r - t, h - t],
					[r * 0.85 - t, t],
					[0, t],
				],
				[0, 0, 0],
				material,
			);
		else {
			this.addBox("Waste Bin Body", [w, t, d], [0, t / 2, 0], material);
			for (const side of [-1, 1]) {
				this.rounded(
					"Waste Bin Side",
					[t, h - t, d],
					[(side * (w - t)) / 2, (h - t) / 2, 0],
					material,
					0.006,
				);
				this.rounded(
					"Waste Bin Side",
					[w - t * 2, h - t, t],
					[0, (h - t) / 2, (side * (d - t)) / 2],
					material,
					0.006,
				);
			}
		}
		const before = this.partsGroup.children.length;
		if (round)
			this.cylinder("Waste Bin Lid", r, r, t, [0, h - t / 2, 0], material);
		else
			this.plate(
				"Waste Bin Lid",
				[w, t, d],
				[0, h - t / 2, 0],
				material,
				Math.min(w, d) * 0.12,
			);
		this.hinge(
			"Waste Bin Lid Hinge",
			this.partsGroup.children.slice(before),
			[0, h - t, round ? -r : -d / 2],
			p.lidOpen ? -Math.PI * 0.48 : 0,
			"x",
		);
		if (p.pedalEnabled)
			this.rounded(
				"Waste Bin Pedal",
				[w * 0.4, t, d * 0.18],
				[0, t * 0.8, d * 0.49],
				this.accent(0x4f5a62, 0.3, 0.5),
				0.004,
			);
	}
}
