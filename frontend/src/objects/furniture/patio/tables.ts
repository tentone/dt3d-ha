import type {Mesh} from "three";
import {ExtrudeGeometry, Shape} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	choice,
	dimensions,
	integer,
	number,
	PatioObject,
} from "./primitives.js";

export class OutdoorTableObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb39b75) {
		super(
			"outdoor-table",
			"Outdoor tables",
			"patioTableControls",
			[
				choice("style", "TableStyle", "outdoor-dining-table", [
					{
						value: "outdoor-dining-table",
						parameters: {
							width: 1.6,
							depth: 0.9,
							height: 0.75,
							shape: "rectangle",
							legs: "four-legs",
						},
					},
					{
						value: "coffee-table",
						parameters: {
							width: 1.1,
							depth: 0.65,
							height: 0.4,
							shape: "rectangle",
							legs: "four-legs",
						},
					},
					{
						value: "side-table",
						parameters: {
							width: 0.5,
							depth: 0.5,
							height: 0.5,
							shape: "round",
							legs: "four-legs",
						},
					},
					{
						value: "bistro-table",
						parameters: {
							width: 0.65,
							depth: 0.65,
							height: 0.72,
							shape: "round",
							legs: "pedestal",
						},
					},
				]),
				...dimensions(1.6, 0.9, 0.75),
				choice("shape", "TableShape", "rectangle", [
					"rectangle",
					"round",
					"oval",
				]),
				choice("topStyle", "TableTop", "slatted", ["slatted", "solid"]),
				choice("legs", "TableLegs", "four-legs", [
					"four-legs",
					"trestle",
					"pedestal",
				]),
				integer("slatCount", "SlatCount", 7, 4, 16),
				number("topThickness", "TopThickness", 0.035, 0.015, 0.1),
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
			t = Math.min(Number(p.topThickness), h * 0.2),
			round = p.shape !== "rectangle",
			dd = p.shape === "round" ? Math.min(w, d) : d,
			ww = p.shape === "round" ? Math.min(w, d) : w,
			n = Number(p.slatCount),
			leg = Math.min(w, d, h) * 0.06;
		if (p.topStyle === "slatted")
			for (let i = 0; i < n; i++) {
				const z = ((i + 0.5) / n) * dd - dd / 2;
				if (round) {
					const outline = new Shape();
					for (const side of [-1, 1])
						for (let j = 0; j <= 12; j++) {
							const zz =
									z +
									(((side < 0 ? j / 12 - 0.5 : 0.5 - j / 12) * dd) / n) * 0.92,
								x =
									((side * ww) / 2) *
									Math.sqrt(Math.max(0, 1 - Math.pow(zz / (dd / 2), 2)));
							if (side < 0 && j === 0) outline.moveTo(x, -zz);
							else outline.lineTo(x, -zz);
						}
					outline.closePath();
					const geometry = new ExtrudeGeometry(outline, {
						depth: t,
						bevelEnabled: false,
					});
					geometry.rotateX(-Math.PI / 2);
					this.addGeometry(
						"Outdoor Table Slat",
						geometry,
						[0, h - t, 0],
						material,
					);
				} else
					this.rounded(
						"Outdoor Table Slat",
						[ww, t, (dd / n) * 0.92],
						[0, h - t / 2, z],
						material,
						0.004,
					);
			}
		else if (round) {
			const top = this.cylinder(
				"Outdoor Table Top",
				1,
				1,
				t,
				[0, h - t / 2, 0],
				material,
				64,
			);
			top.scale.set(ww / 2, 1, dd / 2);
		} else
			this.plate(
				"Outdoor Table Top",
				[w, t, d],
				[0, h - t / 2, 0],
				material,
				Math.min(w, d) * 0.04,
			);
		if (p.legs === "pedestal") {
			this.cylinder(
				"Outdoor Table Pedestal",
				leg,
				leg * 1.3,
				h - t,
				[0, (h - t) / 2, 0],
				material,
				24,
			);
			for (const side of [-1, 1])
				this.rounded(
					"Outdoor Table Pedestal Foot",
					[side < 0 ? ww * 0.75 : leg, leg, side < 0 ? leg : dd * 0.75],
					[0, leg / 2, 0],
					material,
					0.006,
				);
		} else if (p.legs === "trestle") {
			for (const x of [-1, 1]) {
				this.rounded(
					"Outdoor Table Trestle",
					[leg, h - t, leg],
					[x * ww * 0.32, (h - t) / 2, 0],
					material,
					0.003,
				);
				this.rounded(
					"Outdoor Table Trestle Foot",
					[leg, leg, dd * 0.75],
					[x * ww * 0.32, leg / 2, 0],
					material,
					0.004,
				);
			}
			this.rounded(
				"Outdoor Table Stretcher",
				[ww * 0.7, leg, leg],
				[0, h * 0.3, 0],
				material,
				0.003,
			);
		} else this.legs(ww * 0.82, dd * 0.82, h - t, leg, material);
		for (const x of [-1, 1])
			this.rounded(
				"Outdoor Table Support",
				[leg, leg, dd * 0.8],
				[x * ww * 0.28, h - t - leg / 2, 0],
				material,
				0.003,
			);
	}
}
