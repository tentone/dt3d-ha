import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	PatioObject,
} from "./primitives.js";

export class OutdoorChairObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa58b65) {
		super(
			"outdoor-chair",
			"Outdoor chair / lounger",
			"patioChairControls",
			[
				choice("style", "ChairStyle", "outdoor-chair", [
					{
						value: "outdoor-chair",
						parameters: {
							width: 0.62,
							depth: 0.65,
							height: 0.9,
							recline: 12,
							armsEnabled: true,
						},
					},
					{
						value: "lounge-chair",
						parameters: {
							width: 0.78,
							depth: 1.05,
							height: 0.9,
							recline: 30,
							armsEnabled: true,
						},
					},
					{
						value: "sun-lounger",
						parameters: {
							width: 0.72,
							depth: 1.95,
							height: 0.75,
							recline: 65,
							armsEnabled: false,
						},
					},
				]),
				...dimensions(0.62, 0.65, 0.9),
				number("seatHeight", "SeatHeight", 0.42, 0.1, 0.7),
				number("recline", "Recline", 12, 0, 80, 1),
				integer("slatCount", "SlatCount", 7, 4, 16),
				boolean("cushions", "Cushions", true),
				boolean("armsEnabled", "Arms", true),
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
			y = Math.min(Number(p.seatHeight), h * 0.65),
			t = Math.min(w, d, h) * 0.045,
			n = Number(p.slatCount),
			sun = p.style === "sun-lounger",
			seatD = d * (sun ? 0.67 : 0.7),
			pivot = -d / 2 + d - seatD,
			backL = sun
				? Math.min(
					d * 0.36,
					(h - y) /
							Math.max(0.15, Math.cos((Number(p.recline) * Math.PI) / 180)),
				)
				: h - y,
			fabric = this.accent(0xd3cbb7, 0.98);
		for (let i = 0; i < n; i++)
			this.rounded(
				"Outdoor Chair Seat Slat",
				[w * 0.88, t, (seatD / n) * 0.88],
				[0, y - t / 2, pivot + ((i + 0.5) * seatD) / n],
				material,
				0.003,
			);
		for (const x of [-1, 1]) {
			this.rounded(
				"Outdoor Chair Seat Rail",
				[t, t * 1.7, seatD],
				[x * w * 0.4, y - t, pivot + seatD / 2],
				material,
				0.003,
			);
			for (const z of [pivot + seatD * 0.12, pivot + seatD * 0.86])
				this.rounded(
					"Outdoor Chair Leg",
					[t, y - t, t],
					[x * w * 0.38, (y - t) / 2, z],
					material,
					0.004,
				);
		}
		const before = this.partsGroup.children.length;
		for (let i = 0; i < n; i++)
			this.rounded(
				"Outdoor Chair Back Slat",
				[w * 0.88, (backL / n) * 0.88, t],
				[0, y + ((i + 0.5) * backL) / n, pivot],
				material,
				0.003,
			);
		for (const x of [-1, 1])
			this.rounded(
				"Outdoor Chair Back Rail",
				[t, backL, t * 1.5],
				[x * w * 0.4, y + backL / 2, pivot],
				material,
				0.003,
			);
		if (p.cushions)
			this.rounded(
				"Outdoor Chair Back Cushion",
				[w * 0.8, backL * 0.9, t * 1.5],
				[0, y + backL * 0.5, pivot + t * 1.2],
				fabric,
				0.018,
			);
		this.hingeParts(
			"Outdoor Chair Recline",
			this.partsGroup.children.slice(before),
			[0, y, pivot],
			(-Number(p.recline) * Math.PI) / 180,
			"x",
		);
		if (p.cushions)
			this.rounded(
				"Outdoor Chair Seat Cushion",
				[w * 0.8, t * 1.8, seatD * 0.94],
				[0, y + t * 0.8, pivot + seatD * 0.5],
				fabric,
				0.02,
			);
		if (p.armsEnabled)
			for (const x of [-1, 1]) {
				this.rounded(
					"Outdoor Chair Arm",
					[t * 1.7, t, seatD * 0.9],
					[x * w * 0.47, y + (h - y) * 0.35, pivot + seatD * 0.5],
					material,
					0.005,
				);
				this.rounded(
					"Outdoor Chair Arm Support",
					[t, (h - y) * 0.35, t],
					[x * w * 0.47, y + (h - y) * 0.175, pivot + seatD * 0.8],
					material,
					0.003,
				);
			}
	}
}

export class OutdoorSofaObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9d896a) {
		super(
			"outdoor-sofa",
			"Outdoor sofa / sectional",
			"patioSofaControls",
			[
				choice("layout", "SofaLayout", "straight", [
					"straight",
					"l-left",
					"l-right",
					"u-shaped",
				]),
				...dimensions(2.1, 0.85, 0.85),
				integer("seatCount", "SofaSeats", 3, 2, 6),
				integer("returnSeats", "ReturnSeats", 2, 1, 4),
				number("returnLength", "ReturnLength", 1.7, 0.4, 3),
				boolean("cushions", "Cushions", true),
				boolean("armsEnabled", "Arms", true),
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
			y = h * 0.48,
			cushion = h * 0.12,
			n = Number(p.seatCount),
			fabric = this.accent(0xcec8b6, 0.98),
			sides =
				p.layout === "u-shaped"
					? [-1, 1]
					: p.layout === "l-left"
						? [-1]
						: p.layout === "l-right"
							? [1]
							: [],
			rw = Math.min(w * 0.34, d * 0.9),
			extension = Math.max(d * 0.1, Number(p.returnLength) - d);
		this.rounded(
			"Outdoor Sofa Base",
			[w, t * 2, d],
			[0, y - cushion - t, 0],
			material,
			0.008,
		);
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rounded(
					"Outdoor Sofa Leg",
					[t, y - cushion - t * 2, t],
					[x * (w / 2 - t), (y - cushion - t * 2) / 2, z * (d / 2 - t)],
					material,
					0.003,
				);
		for (let i = 0; i < n; i++) {
			const x = -w / 2 + ((i + 0.5) * w) / n;
			this.rounded(
				"Outdoor Sofa Back Frame",
				[(w / n) * 0.95, h - y, t],
				[x, (h + y) / 2, -d / 2 + t / 2],
				material,
				0.007,
			);
			if (p.cushions) {
				this.rounded(
					"Outdoor Sofa Seat Cushion",
					[(w / n) * 0.94, cushion, d * 0.85],
					[x, y - cushion / 2, t],
					fabric,
					0.035,
				);
				this.rounded(
					"Outdoor Sofa Back Cushion",
					[(w / n) * 0.9, (h - y) * 0.84, t * 2],
					[x, y + (h - y) * 0.48, -d / 2 + t * 2],
					fabric,
					0.03,
				);
			}
		}
		for (const side of sides) {
			const x = side * (w / 2 - rw / 2),
				z = d / 2 + extension / 2;
			this.rounded(
				"Outdoor Sectional Base",
				[rw, t * 2, extension],
				[x, y - cushion - t, z],
				material,
				0.008,
			);
			this.rounded(
				"Outdoor Sectional Back",
				[t, h - y, extension],
				[(side * (w - t)) / 2, (h + y) / 2, z],
				material,
				0.006,
			);
			for (let i = 0; i < Number(p.returnSeats); i++)
				if (p.cushions)
					this.rounded(
						"Outdoor Sectional Cushion",
						[rw - t * 2, cushion, (extension / Number(p.returnSeats)) * 0.94],
						[
							x - (side * t) / 2,
							y - cushion / 2,
							d / 2 + ((i + 0.5) * extension) / Number(p.returnSeats),
						],
						fabric,
						0.025,
					);
			for (const dx of [-1, 1])
				this.rounded(
					"Outdoor Sectional Leg",
					[t, y - cushion - t * 2, t],
					[
						x + dx * rw * 0.35,
						(y - cushion - t * 2) / 2,
						d / 2 + extension * 0.9,
					],
					material,
					0.003,
				);
		}
		if (p.armsEnabled)
			for (const side of [-1, 1])
				if (!sides.includes(side))
					this.rounded(
						"Outdoor Sofa Arm",
						[t * 2, h * 0.25, d],
						[(side * (w - t * 2)) / 2, y + h * 0.08, 0],
						material,
						0.008,
					);
	}
}

export class SuspendedSeatObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9d8563) {
		super(
			"suspended-seat",
			"Hammock / hanging chair",
			"patioSuspendedControls",
			[
				choice("style", "SuspendedStyle", "hammock", [
					{
						value: "hammock",
						parameters: {width: 2.8, depth: 0.95, height: 1.1},
					},
					{
						value: "hanging-chair",
						parameters: {width: 1.1, depth: 1.1, height: 2.1},
					},
				]),
				...dimensions(2.8, 0.95, 1.1),
				boolean("standEnabled", "SuspensionStand", true),
				number("sag", "HammockSag", 0.45, 0.2, 0.7),
				integer("ribCount", "ChairRibs", 10, 6, 18),
				boolean("cushions", "Cushions", true),
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
			t = Math.min(w, d, h) * 0.025,
			fabric = this.accent(0xd1c7b2, 0.98),
			rope = this.accent(0xc4b89f, 0.9);
		if (p.style === "hammock") {
			if (p.standEnabled) {
				for (const side of [-1, 1])
					this.curve(
						"Hammock Stand",
						[
							[-w * 0.49, h * 0.99, side * d * 0.38],
							[-w * 0.3, h * 0.1, side * d * 0.38],
							[w * 0.3, h * 0.1, side * d * 0.38],
							[w * 0.49, h * 0.99, side * d * 0.38],
						],
						t * 1.5,
						material,
					);
				for (const x of [-1, 1])
					this.rounded(
						"Hammock Foot",
						[w * 0.13, t * 2, d],
						[x * w * 0.3, t, 0],
						material,
						0.008,
					);
			}
			this.fabric(
				"Hammock Fabric",
				32,
				10,
				(u, v) => [
					(u - 0.5) * w * 0.75,
					h * (0.93 - Number(p.sag) * (1 - Math.pow(2 * u - 1, 2))) +
						h * 0.03 * Math.pow(2 * v - 1, 2),
					(v - 0.5) * d * 0.85 * Math.sin(Math.PI * (u * 0.82 + 0.09)),
				],
				p.standEnabled ? fabric : material,
			);
			for (const side of [-1, 1])
				for (let i = 0; i < 7; i++)
					this.rail(
						"Hammock Suspension",
						[side * w * 0.49, h * 0.99, 0],
						[
							side * w * 0.375,
							h * 0.93 + h * 0.03 * Math.pow(i / 3 - 1, 2),
							(i / 6 - 0.5) * d * 0.85 * Math.sin(Math.PI * 0.09),
						],
						t * 0.18,
						rope,
					);
			if (p.standEnabled)
				for (const side of [-1, 1])
					this.rail(
						"Hammock End Bar",
						[side * w * 0.49, h * 0.99, -d * 0.38],
						[side * w * 0.49, h * 0.99, d * 0.38],
						t,
						material,
					);
		} else {
			if (p.standEnabled) {
				this.cylinder(
					"Hanging Chair Base",
					Math.min(w, d) * 0.45,
					Math.min(w, d) * 0.47,
					t * 2,
					[0, t, 0],
					material,
					48,
				);
				this.curve(
					"Hanging Chair Stand",
					[
						[0, t, -d * 0.34],
						[0, h * 0.7, -d * 0.42],
						[0, h * 0.98, -d * 0.2],
						[0, h, 0],
					],
					t * 1.3,
					material,
				);
			}
			const n = Number(p.ribCount),
				shell = p.standEnabled ? this.accent(0xb69d77, 0.85) : material;
			for (let i = 0; i <= n; i++) {
				const a = (i / n) * Math.PI,
					points: [number, number, number][] = [];
				for (let j = 0; j <= 20; j++) {
					const b = 0.12 + (j / 20) * Math.PI * 0.86;
					points.push([
						w * 0.43 * Math.sin(b) * Math.cos(a),
						h * 0.53 + h * 0.3 * Math.cos(b),
						-d * 0.4 * Math.sin(b) * Math.sin(a),
					]);
				}
				this.curve("Hanging Chair Rib", points, t * 0.55, shell);
			}
			for (let j = 1; j <= 6; j++) {
				const b = (j / 7) * Math.PI * 0.94,
					points: [number, number, number][] = [];
				for (let i = 0; i <= 24; i++) {
					const a = (i / 24) * Math.PI;
					points.push([
						w * 0.43 * Math.sin(b) * Math.cos(a),
						h * 0.53 + h * 0.3 * Math.cos(b),
						-d * 0.4 * Math.sin(b) * Math.sin(a),
					]);
				}
				this.curve("Hanging Chair Weave", points, t * 0.4, shell);
			}
			this.rail(
				"Hanging Chair Chain",
				[0, h, 0],
				[0, h * 0.83, 0],
				t * 0.3,
				rope,
			);
			if (p.cushions) {
				this.ellipsoid(
					"Hanging Chair Cushion",
					[w * 0.38, h * 0.045, d * 0.34],
					[0, h * 0.28, 0],
					fabric,
				);
				this.ellipsoid(
					"Hanging Chair Back Cushion",
					[w * 0.32, h * 0.14, d * 0.09],
					[0, h * 0.44, -d * 0.22],
					fabric,
				);
			}
		}
	}
}
