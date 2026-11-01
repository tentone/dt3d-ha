import type {Mesh} from "three";
import {TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	DiningObject,
	integer,
	number,
} from "./primitives.js";

export class DiningSeatingObject extends DiningObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x99734e) {
		super(
			"dining-seating",
			"Dining seating",
			"diningSeatingControls",
			[
				choice("style", "SeatingStyle", "dining-chair", [
					{
						value: "dining-chair",
						parameters: {
							width: 0.48,
							depth: 0.52,
							height: 0.88,
							seatHeight: 0.46,
							upholstered: false,
							backEnabled: true,
							armsEnabled: false,
							legStyle: "tapered",
						},
					},
					{
						value: "upholstered-dining-chair",
						parameters: {
							width: 0.54,
							depth: 0.58,
							height: 0.9,
							seatHeight: 0.47,
							upholstered: true,
							backEnabled: true,
							armsEnabled: false,
							legStyle: "tapered",
						},
					},
					{
						value: "dining-bench",
						parameters: {
							width: 1.4,
							depth: 0.4,
							height: 0.46,
							seatHeight: 0.46,
							upholstered: false,
							backEnabled: false,
							armsEnabled: false,
							legStyle: "square",
						},
					},
					{
						value: "bar-stool",
						parameters: {
							width: 0.43,
							depth: 0.43,
							height: 0.95,
							seatHeight: 0.75,
							upholstered: true,
							backEnabled: true,
							armsEnabled: false,
							legStyle: "pedestal",
						},
					},
				]),
				...dimensions(0.48, 0.52, 0.88),
				number("seatHeight", "SeatHeight", 0.46, 0.15, 1.1),
				number("seatThickness", "SeatThickness", 0.045, 0.015, 0.15),
				choice("legStyle", "LegStyle", "tapered", [
					"tapered",
					"square",
					"pedestal",
				]),
				integer("backSlats", "BackSlats", 4, 2, 8),
				boolean("upholstered", "Upholstered", false),
				boolean("backEnabled", "BackEnabled", true),
				boolean("armsEnabled", "ArmsEnabled", false),
				boolean("footrestEnabled", "FootrestEnabled", true),
			],
			parameters,
			color,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		const seatY = Math.min(Number(p.seatHeight), h),
			t = Math.min(Number(p.seatThickness), seatY * 0.25),
			legH = seatY - t;
		const lt = Math.min(w, d) * 0.085,
			insetX = w * 0.39,
			insetZ = d * 0.36;
		const fabric = this.accent(0xc8b7a3, 0.98),
			metal = this.accent(0x373a3d, 0.35, 0.6);
		const seat = this.plate(
			"Dining Seat",
			[w, t, d],
			[0, seatY - t / 2, 0],
			material,
			Math.min(w, d) * 0.12,
		);
		if (p.upholstered)
			this.rounded(
				"Seat Upholstery",
				[w * 0.98, t * 0.85, d * 0.98],
				[0, seatY + t * 0.15, 0],
				fabric,
				t * 0.4,
			);
		if (p.style === "bar-stool" && p.legStyle === "pedestal") {
			seat.scale.set(0.98, 1, 0.98);
		}
		if (p.legStyle === "pedestal") {
			this.cylinder(
				"Seat Pedestal",
				lt * 0.8,
				lt,
				legH,
				[0, legH / 2, 0],
				metal,
			);
			this.cylinder(
				"Seat Base",
				Math.min(w, d) * 0.38,
				Math.min(w, d) * 0.43,
				t * 0.55,
				[0, t * 0.275, 0],
				metal,
			);
			if (p.style === "bar-stool" && p.footrestEnabled) {
				this.addGeometry(
					"Stool Footrest",
					new TorusGeometry(Math.min(w, d) * 0.32, lt * 0.24, 8, 40),
					[0, legH * 0.36, 0],
					metal,
				).rotation.x = Math.PI / 2;
				this.rod(
					"Footrest Support",
					[0, legH * 0.36, 0],
					[0, legH * 0.36, d * 0.32],
					lt * 0.25,
					metal,
				);
			}
		} else {
			for (const x of [-1, 1])
				for (const z of [-1, 1]) {
					if (p.legStyle === "square")
						this.rounded(
							"Dining Seat Leg",
							[lt, legH, lt],
							[x * insetX, legH / 2, z * insetZ],
							material,
							0.003,
						);
					else
						this.cylinder(
							"Dining Seat Leg",
							lt * 0.5,
							lt * 0.3,
							legH,
							[x * insetX, legH / 2, z * insetZ],
							material,
							16,
						);
				}
			if (p.style === "bar-stool" && p.footrestEnabled)
				for (const z of [-1, 1])
					this.rod(
						"Stool Footrest",
						[-insetX, legH * 0.35, z * insetZ],
						[insetX, legH * 0.35, z * insetZ],
						lt * 0.3,
						material,
					);
			if (p.style === "dining-bench")
				this.rounded(
					"Bench Stretcher",
					[insetX * 2, lt, lt],
					[0, legH * 0.35, 0],
					material,
				);
		}
		const bh = Math.max(0.02, h - seatY);
		if (p.backEnabled) {
			for (const side of [-1, 1])
				this.rounded(
					"Back Post",
					[lt, bh + t, lt],
					[side * insetX, seatY + (bh - t) / 2, -insetZ],
					material,
				);
			if (p.upholstered)
				this.rounded(
					"Back Upholstery",
					[w * 0.88, bh * 0.88, Math.min(d * 0.13, 0.065)],
					[0, seatY + bh * 0.55, -insetZ],
					fabric,
					0.035,
				);
			else {
				this.rounded(
					"Back Top Rail",
					[w * 0.9, bh * 0.16, lt],
					[0, h - bh * 0.08, -insetZ],
					material,
				);
				for (let i = 0; i < Number(p.backSlats); i++)
					this.rounded(
						"Back Slat",
						[w * 0.045, bh * 0.76, lt * 0.7],
						[
							(i / (Number(p.backSlats) - 1) - 0.5) * w * 0.65,
							seatY + bh * 0.48,
							-insetZ,
						],
						material,
					);
			}
		}
		if (p.armsEnabled)
			for (const side of [-1, 1]) {
				const armY = seatY + Math.max(t * 2, Math.min(bh * 0.5, 0.22));
				this.rod(
					"Dining Arm Post",
					[side * insetX, seatY, d * 0.2],
					[side * insetX, armY, d * 0.2],
					lt * 0.4,
					material,
				);
				this.rounded(
					"Dining Arm",
					[lt * 1.3, lt, d * 0.78],
					[side * insetX, armY, -d * 0.03],
					material,
				);
			}
	}
}
