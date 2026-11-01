import type {Mesh} from "three";
import {CatmullRomCurve3, TubeGeometry, Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	BathroomObject,
	boolean,
	choice,
	dimensions,
	integer,
} from "./primitives.js";

export class TowelRailObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa8b3bc) {
		super(
			"towel-rail",
			"Towel rail",
			"bathRailControls",
			[
				choice("style", "RailStyle", "towel-rail", [
					{
						value: "towel-rail",
						parameters: {width: 0.6, depth: 0.12, height: 0.5},
					},
					{
						value: "heated-towel-rail",
						parameters: {width: 0.5, depth: 0.12, height: 1.1},
					},
				]),
				...dimensions(0.6, 0.12, 0.5),
				integer("railCount", "RailCount", 7, 3, 16),
				boolean("towelEnabled", "TowelEnabled", true),
				boolean("heaterOn", "HeaterOn", true),
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
			h = Number(p.height),
			r = Math.min(0.016, w * 0.05, d * 0.15, h * 0.06),
			heated = p.style === "heated-towel-rail";
		const y = heated ? h * 0.88 : h - r;
		if (heated) {
			for (const side of [-1, 1])
				this.cylinder(
					"Heated Rail Upright",
					r,
					r,
					h,
					[side * (w / 2 - r), h / 2, 0],
					material,
					20,
				);
			for (let i = 0; i < Number(p.railCount); i++)
				this.pipe(
					"Heated Towel Bar",
					new Vector3(
						-w / 2,
						r + (i / (Number(p.railCount) - 1)) * (h - r * 2),
						0,
					),
					new Vector3(
						w / 2,
						r + (i / (Number(p.railCount) - 1)) * (h - r * 2),
						0,
					),
					r * 0.65,
					material,
				);
			this.rounded(
				"Heater Indicator",
				[r, r * 2, r],
				[w / 2, h * 0.08, r * 1.2],
				this.accent(p.heaterOn ? 0xd6815a : 0x55606a),
			);
		} else
			this.pipe(
				"Towel Bar",
				new Vector3(-w / 2, y, 0),
				new Vector3(w / 2, y, 0),
				r,
				material,
			);
		for (const side of [-1, 1])
			for (const mountY of heated ? [h * 0.15, h * 0.85] : [y]) {
				this.pipe(
					"Rail Wall Mount",
					new Vector3(side * w * 0.42, mountY, -d / 2),
					new Vector3(side * w * 0.42, mountY, 0),
					r * 0.6,
					material,
				);
			}
		if (p.towelEnabled) {
			const towelW = w * 0.55,
				towelH = h * (heated ? 0.36 : 0.75),
				t = Math.min(0.009, d * 0.08),
				cloth = this.accent(0x98b7b3, 0.95);
			this.rounded(
				"Hanging Towel",
				[towelW, towelH, t],
				[0, y - towelH / 2, r * 1.2],
				cloth,
				0.004,
			);
			this.rounded(
				"Towel Fold",
				[towelW, r * 1.4, r * 2.6],
				[0, y, 0],
				cloth,
				r * 0.5,
			);
			for (const z of [r * 1.2, -r * 1.2])
				this.addBox(
					"Towel Hem",
					[towelW * 0.96, Math.min(0.012, towelH * 0.08), t * 0.5],
					[0, y - towelH * 0.92, z],
					this.accent(0x6c9695),
				);
		}
	}
}

export class BathroomAccessoryObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xabb8c1) {
		super(
			"bathroom-accessory",
			"Bathroom holders / hooks",
			"bathAccessoryControls",
			[
				choice("style", "AccessoryStyle", "toilet-paper-holder", [
					{
						value: "toilet-paper-holder",
						parameters: {width: 0.19, depth: 0.14, height: 0.19},
					},
					{
						value: "soap-holder",
						parameters: {width: 0.17, depth: 0.12, height: 0.045},
					},
					{
						value: "towel-hooks",
						parameters: {width: 0.3, depth: 0.1, height: 0.12},
					},
				]),
				...dimensions(0.19, 0.14, 0.19),
				integer("hookCount", "HookCount", 3, 1, 5),
				boolean("contentsEnabled", "ContentsEnabled", true),
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
			h = Number(p.height),
			r = Math.min(0.008, w * 0.035, h * 0.08);
		if (p.style === "soap-holder") {
			this.bowl(
				"Soap Dish",
				w,
				d,
				h * 0.6,
				Math.min(w, d) * 0.04,
				[0, 0, 0],
				material,
			);
			if (p.contentsEnabled)
				this.rounded(
					"Soap Bar",
					[w * 0.62, h * 0.65, d * 0.58],
					[0, h * 0.65, 0],
					this.accent(0xd6d5b6),
					h * 0.16,
				);
			return;
		}
		this.rounded(
			"Accessory Wall Plate",
			[w, h * 0.45, r],
			[0, h * 0.65, -d * 0.45],
			material,
			0.007,
		);
		if (p.style === "towel-hooks") {
			for (let i = 0; i < Number(p.hookCount); i++) {
				const x = ((i + 0.5) / Number(p.hookCount)) * w - w / 2;
				const curve = new CatmullRomCurve3([
					new Vector3(x, h * 0.7, -d * 0.4),
					new Vector3(x, h * 0.55, 0),
					new Vector3(x, h * 0.12, d * 0.3),
					new Vector3(x, h * 0.35, d * 0.4),
				]);
				this.addGeometry(
					"Towel Hook",
					new TubeGeometry(curve, 16, r * 0.7, 8, false),
					[0, 0, 0],
					material,
				);
			}
			return;
		}
		this.pipe(
			"Paper Holder Arm",
			new Vector3(-w * 0.42, h * 0.65, -d * 0.4),
			new Vector3(-w * 0.42, h * 0.65, d * 0.1),
			r,
			material,
		);
		this.pipe(
			"Paper Spindle",
			new Vector3(-w * 0.42, h * 0.65, d * 0.1),
			new Vector3(w * 0.42, h * 0.65, d * 0.1),
			r,
			material,
		);
		if (p.contentsEnabled) {
			const radius = Math.min(h * 0.28, d * 0.38),
				length = w * 0.7,
				inner = radius * 0.3;
			const roll = this.lathe(
				"Toilet Paper Roll",
				[
					[inner, -length / 2],
					[radius, -length / 2],
					[radius, length / 2],
					[inner, length / 2],
					[inner, -length / 2],
				],
				[0, h * 0.65, d * 0.1],
				this.accent(0xf4f0df, 0.95),
			);
			roll.rotation.z = Math.PI / 2;
			this.rounded(
				"Toilet Paper Sheet",
				[length * 0.96, h * 0.46, Math.min(0.002, d * 0.02)],
				[0, h * 0.4, d * 0.1 + radius],
				this.accent(0xf4f0df, 0.95),
				0.001,
			);
		}
	}
}
