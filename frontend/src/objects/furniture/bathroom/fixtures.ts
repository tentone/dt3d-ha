import type {Mesh} from "three";
import {TorusGeometry, Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	BathroomObject,
	boolean,
	choice,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export class SanitaryFixtureObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xf0eeea) {
		super(
			"sanitary-fixture",
			"Sanitary fixture",
			"bathSanitaryControls",
			[
				choice("style", "SanitaryStyle", "toilet", [
					{
						value: "toilet",
						parameters: {
							width: 0.4,
							depth: 0.7,
							height: 0.8,
							seatHeight: 0.43,
						},
					},
					{
						value: "wall-hung-toilet",
						parameters: {
							width: 0.38,
							depth: 0.55,
							height: 0.4,
							seatHeight: 0.4,
						},
					},
					{
						value: "bidet",
						parameters: {
							width: 0.38,
							depth: 0.58,
							height: 0.4,
							seatHeight: 0.4,
						},
					},
					{
						value: "urinal",
						parameters: {width: 0.35, depth: 0.3, height: 0.58},
					},
				]),
				...dimensions(0.4, 0.7, 0.8),
				number("seatHeight", "SeatHeight", 0.43, 0.15, 0.8),
				boolean("lidOpen", "LidOpen", false),
				boolean("lidEnabled", "LidEnabled", true),
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
			h = Number(p.height);
		const chrome = this.accent(0xb8c3ca, 0.18, 0.8);
		if (p.style === "urinal") {
			const shell = this.bowl(
				"Urinal Shell",
				w,
				h,
				d,
				Math.min(w, d) * 0.08,
				[0, h / 2, -d * 0.45],
				material,
			);
			shell.rotation.x = Math.PI / 2;
			this.rounded(
				"Urinal Back",
				[w * 0.6, h * 0.85, d * 0.1],
				[0, h / 2, -d * 0.45],
				material,
			);
			this.cylinder(
				"Urinal Flush Valve",
				w * 0.05,
				w * 0.05,
				h * 0.18,
				[0, h * 0.92, -d * 0.25],
				chrome,
			);
			this.drain(0, h * 0.12, d * 0.3, w * 0.065);
			return;
		}
		const wallHung = p.style === "wall-hung-toilet",
			bidet = p.style === "bidet";
		const seatY = Math.min(
			Number(p.seatHeight),
			h * (wallHung || bidet ? 0.96 : 0.65),
		);
		const bowlH = seatY * (wallHung ? 0.95 : 0.52),
			bowlBottom = wallHung ? 0 : seatY - bowlH;
		const bowlD = d * (p.style === "toilet" ? 0.78 : 0.95),
			z = d * (p.style === "toilet" ? 0.1 : 0);
		const bowl = this.bowl(
			bidet ? "Bidet Bowl" : "Toilet Bowl",
			w,
			bowlD,
			bowlH,
			w * 0.065,
			[0, bowlBottom, z],
			material,
		);
		if (!wallHung) {
			this.rounded(
				"Fixture Pedestal",
				[w * 0.55, Math.max(0.01, bowlBottom + bowlH * 0.18), bowlD * 0.58],
				[0, (bowlBottom + bowlH * 0.18) / 2, z - bowlD * 0.08],
				material,
				w * 0.1,
			);
		}
		this.drain(
			0,
			bowlBottom + Number(bowl.userData.bowlFloor) + 0.001,
			z,
			w * 0.065,
		);
		if (bidet) {
			this.rounded(
				"Bidet Tap Deck",
				[w * 0.55, bowlH * 0.12, bowlD * 0.2],
				[0, seatY - bowlH * 0.06, z - bowlD * 0.34],
				material,
			);
			this.tap(0, seatY, z - bowlD * 0.35, Math.min(w * 0.3, h * 0.2));
		} else {
			const ring = this.addGeometry(
				"Toilet Seat",
				new TorusGeometry(w * 0.43, w * 0.045, 10, 48),
				[0, seatY + w * 0.012, z],
				this.accent(0xf8f7f1, 0.3),
			);
			ring.rotation.x = Math.PI / 2;
			ring.scale.y = bowlD / w;
			if (p.lidEnabled) {
				const length = bowlD * 0.88,
					angle = p.lidOpen ? Math.PI * 0.49 : 0;
				const lid = this.ellipsoid(
					"Toilet Lid",
					[w * 0.47, Math.min(0.018, w * 0.04), length / 2],
					[
						0,
						seatY + w * 0.06 + (Math.sin(angle) * length) / 2,
						z - length / 2 + (Math.cos(angle) * length) / 2,
					],
					this.accent(0xf8f7f1, 0.3),
				);
				lid.rotation.x = -angle;
			}
		}
		if (p.style === "toilet") {
			const tankH = Math.max(0.01, h - seatY),
				tankD = d * 0.2;
			this.rounded(
				"Toilet Cistern Support",
				[w * 0.55, seatY, tankD],
				[0, seatY / 2, -d / 2 + tankD / 2],
				material,
				0.02,
			);
			const deck = Math.min(0.06, seatY * 0.15);
			this.rounded(
				"Toilet Rear Deck",
				[w * 0.86, deck, d * 0.32],
				[0, seatY - deck / 2, -d * 0.34],
				material,
				0.015,
			);
			this.rounded(
				"Toilet Cistern",
				[w * 0.86, tankH, tankD],
				[0, seatY + tankH / 2, -d / 2 + tankD / 2],
				material,
				0.025,
			);
			this.cylinder(
				"Flush Button",
				w * 0.055,
				w * 0.055,
				0.005,
				[0, h + 0.002, -d / 2 + tankD / 2],
				chrome,
			);
		} else if (wallHung)
			this.rounded(
				"Wall Flush Plate",
				[w * 0.5, h * 0.22, Math.min(0.015, d * 0.04)],
				[0, h + h * 0.35, -d / 2],
				chrome,
			);
	}
}

export class WashbasinObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xf0eeea) {
		super(
			"washbasin",
			"Washbasin / vanity",
			"bathBasinControls",
			[
				choice("style", "BasinStyle", "pedestal-basin", [
					{
						value: "pedestal-basin",
						parameters: {
							width: 0.6,
							depth: 0.47,
							height: 0.85,
							basinCount: 1,
						},
					},
					{
						value: "wall-mounted-basin",
						parameters: {width: 0.6, depth: 0.45, height: 0.2, basinCount: 1},
					},
					{
						value: "countertop-basin",
						parameters: {width: 0.5, depth: 0.4, height: 0.16, basinCount: 1},
					},
					{
						value: "double-basin",
						parameters: {width: 1.3, depth: 0.5, height: 0.85, basinCount: 2},
					},
					{
						value: "vanity-unit",
						parameters: {
							width: 0.85,
							depth: 0.5,
							height: 0.85,
							basinCount: 1,
						},
					},
				]),
				...dimensions(0.6, 0.47, 0.85),
				integer("basinCount", "BasinCount", 1, 1, 2),
				number("bowlDepth", "BowlDepth", 0.16, 0.04, 0.3),
				boolean("tapEnabled", "TapEnabled", true),
				choice("cabinetFinish", "CabinetFinish", "oak", [
					"oak",
					"white",
					"charcoal",
				]),
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
			h = Number(p.height);
		const vanity = p.style === "vanity-unit" || p.style === "double-basin";
		const bowlH = Math.min(
			Number(p.bowlDepth),
			h * (vanity || p.style === "pedestal-basin" ? 0.35 : 0.95),
		);
		const count = Number(p.basinCount),
			cell = w / count;
		const bowlW = cell * (vanity ? 0.82 : 0.98),
			bowlD = d * 0.85,
			baseY = h - bowlH;
		for (let i = 0; i < count; i++) {
			const x = (i - (count - 1) / 2) * cell;
			const bowl = this.bowl(
				"Washbasin Bowl",
				bowlW,
				bowlD,
				bowlH,
				Math.min(0.025, bowlW * 0.06),
				[x, baseY, d * 0.06],
				material,
			);
			this.drain(
				x,
				baseY + Number(bowl.userData.bowlFloor) + 0.001,
				d * 0.06,
				Math.min(0.022, bowlW * 0.08),
			);
			if (p.tapEnabled) {
				this.rounded(
					"Basin Tap Deck",
					[bowlW * 0.6, bowlH * 0.12, d * 0.14],
					[x, h - bowlH * 0.06, -d * 0.37],
					material,
				);
				this.tap(x, h, -d * 0.37, Math.min(0.14, cell * 0.25, h * 0.6));
			}
		}
		if (p.style === "pedestal-basin") {
			this.lathe(
				"Basin Pedestal",
				[
					[0, 0],
					[w * 0.18, 0],
					[w * 0.14, baseY * 0.2],
					[w * 0.12, baseY * 0.9],
					[w * 0.2, baseY],
					[0, baseY],
				],
				[0, 0, -d * 0.12],
				material,
			);
		} else if (p.style === "wall-mounted-basin") {
			this.pipe(
				"Basin Waste Pipe",
				new Vector3(0, baseY, 0),
				new Vector3(0, baseY * 0.2, -d * 0.25),
				Math.min(0.025, w * 0.04),
				this.accent(0xbac3ca, 0.2, 0.75),
			);
		}
		if (vanity) {
			const finish = this.accent(
					p.cabinetFinish === "white"
						? 0xe5e1d9
						: p.cabinetFinish === "charcoal"
							? 0x465057
							: 0xa78661,
				),
				t = Math.min(0.025, w * 0.05, h * 0.05, d * 0.08);
			const cabinetH = Math.max(0.01, baseY - t),
				foot = Math.min(0.07, cabinetH * 0.2);
			for (const side of [-1, 1])
				this.addBox(
					"Vanity Counter Edge",
					[w, t, d * 0.08],
					[0, baseY + t / 2, side * d * 0.46],
					material,
				);
			for (let i = 0; i <= count; i++)
				this.addBox(
					"Vanity Counter Divider",
					[cell * 0.08, t, d],
					[
						Math.max(
							-w / 2 + cell * 0.04,
							Math.min(w / 2 - cell * 0.04, -w / 2 + i * cell),
						),
						baseY + t / 2,
						0,
					],
					material,
				);
			this.addBox(
				"Vanity Back",
				[w, cabinetH - foot, t],
				[0, foot + (cabinetH - foot) / 2, -d / 2 + t / 2],
				finish,
			);
			for (const side of [-1, 1])
				this.addBox(
					"Vanity Side",
					[t, cabinetH - foot, d],
					[side * (w / 2 - t / 2), foot + (cabinetH - foot) / 2, 0],
					finish,
				);
			this.addBox("Vanity Bottom", [w, t, d], [0, foot + t / 2, 0], finish);
			const doors = Math.max(2, count * 2),
				doorW = w / doors;
			for (let i = 0; i < doors; i++) {
				const x = -w / 2 + doorW * (i + 0.5);
				this.rounded(
					"Vanity Door",
					[doorW * 0.97, Math.max(0.005, cabinetH - foot - t), t],
					[x, foot + (cabinetH - foot) / 2, d / 2 - t / 2],
					finish,
					0.004,
				);
				this.addBox(
					"Vanity Handle",
					[doorW * 0.35, t * 0.3, t],
					[x, cabinetH * 0.78, d / 2 + t / 2],
					this.accent(0xb5bfc7, 0.2, 0.8),
				);
			}
			this.legs(w, d, foot, Math.min(w, d) * 0.08, finish);
		}
	}
}
