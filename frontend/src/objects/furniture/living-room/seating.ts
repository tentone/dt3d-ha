import type {Mesh} from "three";
import {CatmullRomCurve3, TubeGeometry, Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	LivingRoomObject,
	number,
} from "./primitives.js";

export class AccentChairObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb58969) {
		super(
			"accent-chair",
			"Accent chair",
			"livingChairControls",
			[
				choice("style", "ChairStyle", "armchair", [
					{
						value: "armchair",
						parameters: {width: 0.85, depth: 0.85, height: 0.95},
					},
					{
						value: "recliner",
						parameters: {width: 0.9, depth: 0.95, height: 1.05},
					},
					{
						value: "lounge-chair",
						parameters: {width: 0.8, depth: 1.05, height: 0.8},
					},
					{
						value: "rocking-chair",
						parameters: {width: 0.75, depth: 0.95, height: 1.05},
					},
				]),
				...dimensions(0.85, 0.85, 0.95),
				number("seatHeight", "SeatHeight", 0.43, 0.15, 0.8),
				number("recline", "Recline", 15, 0, 55, 1),
				boolean("armsEnabled", "ArmsEnabled", true),
				boolean("footrestExtended", "FootrestExtended", false),
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
			h = Number(p.height);
		const y = Math.min(Number(p.seatHeight), h * 0.65),
			t = Math.min(y * 0.35, 0.16);
		const legH = Math.max(0.01, y - t),
			arm = Math.min(w * 0.15, 0.13);
		this.rounded(
			"Chair Cushion",
			[w - arm * 2, t, d * 0.8],
			[0, y - t / 2, d * 0.1],
			material,
			0.07,
		);
		const frame = this.accent(0x664b37),
			metal = this.accent(0x343439, 0.4, 0.4);
		this.legs(
			w,
			d * 0.85,
			legH,
			Math.min(w, d) * 0.08,
			p.style === "recliner" ? metal : frame,
		);
		const angle =
			p.style === "recliner" || p.style === "lounge-chair"
				? (Number(p.recline) * Math.PI) / 180
				: 0.06;
		const bh = Math.max(0.03, h - y);
		const back = this.rounded(
			"Chair Back",
			[w - arm * 2, bh, Math.min(0.14, d * 0.15)],
			[
				0,
				y + (bh / 2) * Math.cos(angle),
				-d * 0.28 - (bh / 2) * Math.sin(angle),
			],
			material,
			0.07,
		);
		back.rotation.x = -angle;
		if (p.armsEnabled)
			for (const side of [-1, 1])
				this.rounded(
					"Chair Arm",
					[arm, Math.max(0.02, h * 0.65 - y + t), d * 0.85],
					[side * (w / 2 - arm / 2), (h * 0.65 + y - t) / 2, d * 0.07],
					material,
				);
		if (p.style === "rocking-chair")
			for (const side of [-1, 1]) {
				const curve = new CatmullRomCurve3([
					new Vector3(side * w * 0.35, 0.1, -d * 0.6),
					new Vector3(side * w * 0.35, 0.025, 0),
					new Vector3(side * w * 0.35, 0.1, d * 0.6),
				]);
				this.addGeometry(
					"Chair Rocker",
					new TubeGeometry(curve, 24, 0.025, 8, false),
					[0, 0, 0],
					frame,
				);
			}
		if (p.style === "recliner" && p.footrestExtended)
			this.rounded(
				"Recliner Footrest",
				[w - arm * 2, t, d * 0.55],
				[0, y - t / 2, d * 0.77],
				material,
				0.05,
			);
	}
}

export class OttomanObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa3ac89) {
		super(
			"ottoman",
			"Ottoman / pouf",
			"livingOttomanControls",
			[
				choice("style", "SoftSeatStyle", "ottoman", [
					"ottoman",
					"pouf",
					"bean-bag",
				]),
				...dimensions(0.75, 0.6, 0.42),
				choice("shape", "TopShape", "rounded", [
					"rectangle",
					"rounded",
					"oval",
					"round",
				]),
				boolean("tufted", "Tufted", true),
			],
			parameters,
			color,
			0.95,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		if (p.style === "bean-bag") {
			this.ellipsoid(
				"Bean Bag Base",
				[w / 2, h * 0.34, d / 2],
				[0, h * 0.34, 0],
				material,
			);
			const back = this.ellipsoid(
				"Bean Bag Back",
				[w * 0.4, h * 0.4, d * 0.32],
				[0, h * 0.6, -d * 0.18],
				material,
			);
			back.rotation.x = -0.2;
			return;
		}
		const leg = p.style === "ottoman" ? Math.min(h * 0.2, 0.09) : 0;
		if (p.shape === "round" || p.shape === "oval" || p.style === "pouf") {
			this.ellipsoid(
				"Pouf Cushion",
				[w / 2, (h - leg) / 2, d / 2],
				[0, leg + (h - leg) / 2, 0],
				material,
			);
		} else
			this.rounded(
				"Ottoman Cushion",
				[w, h - leg, d],
				[0, leg + (h - leg) / 2, 0],
				material,
				p.shape === "rounded" ? 0.1 : 0.015,
			);
		if (leg) this.legs(w, d, leg, Math.min(w, d) * 0.08, this.accent(0x514135));
		if (p.tufted)
			for (const x of [-0.22, 0.22])
				for (const z of [-0.2, 0.2]) {
					this.ellipsoid(
						"Upholstery Button",
						[0.012, 0.005, 0.012],
						[x * w, h - 0.025, z * d],
						this.accent(0x69715b),
					);
				}
	}
}
