import type {Mesh} from "three";

import type {FurnitureParameters} from "./furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	LivingRoomObject,
	number,
} from "./living-room/primitives.js";

export const COUCH_PARAMETER_DEFINITIONS = [
	choice("layout", "SofaLayout", "straight", [
		"straight",
		"l-left",
		"l-right",
		"u-shaped",
		"sofa-bed",
	]),
	...dimensions(2.1, 0.9, 0.85),
	integer("seatCount", "SeatCount", 3, 2, 8),
	number("seatHeight", "SeatHeight", 0.43, 0.18, 1),
	number("armWidth", "ArmWidth", 0.16, 0.04, 0.5),
	number("cushionThickness", "CushionThickness", 0.14, 0.03, 0.4),
	number("backThickness", "BackThickness", 0.16, 0.03, 0.5),
	number("returnLength", "ReturnLength", 1.7, 0.5, 4),
	integer("returnSeats", "ReturnSeats", 2, 1, 4),
	boolean("armsEnabled", "ArmsEnabled", true),
	boolean("bedExtended", "BedExtended", false),
];

export class CouchObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x657b8b) {
		super(
			"couch",
			"Couch",
			"furnitureCouchParameters",
			COUCH_PARAMETER_DEFINITIONS,
			parameters,
			color,
			0.9,
		);
	}

	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters;
		const w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		const arm = p.armsEnabled ? Math.min(Number(p.armWidth), w * 0.16) : 0;
		const back = Math.min(Number(p.backThickness), d * 0.25);
		const seatY = Math.min(Number(p.seatHeight), h * 0.7);
		const cushion = Math.min(Number(p.cushionThickness), seatY * 0.55);
		const leg = Math.min(0.09, seatY * 0.2);
		const baseH = Math.max(0.01, seatY - cushion - leg);
		const inner = w - arm * 2;
		const seatD = Math.max(0.02, d - back);
		const seats = Number(p.seatCount);
		this.rounded("Sofa Base", [w, baseH, d], [0, leg + baseH / 2, 0], material);
		for (let i = 0; i < seats; i++) {
			this.rounded(
				"Sofa Seat Cushion",
				[(inner / seats) * 0.97, cushion, seatD * 0.97],
				[
					-inner / 2 + (inner / seats) * (i + 0.5),
					seatY - cushion / 2,
					back / 2,
				],
				material,
				0.06,
			);
			this.rounded(
				"Sofa Back Cushion",
				[(inner / seats) * 0.97, h - seatY, back],
				[
					-inner / 2 + (inner / seats) * (i + 0.5),
					seatY + (h - seatY) / 2,
					-d / 2 + back / 2,
				],
				material,
				0.06,
			);
		}
		const legMaterial = this.accent(0x343339, 0.45, 0.3);
		this.legs(w, d, leg, Math.min(0.08, w * 0.08, d * 0.1), legMaterial);
		const sides =
			p.layout === "u-shaped"
				? [-1, 1]
				: p.layout === "l-left"
					? [-1]
					: p.layout === "l-right"
						? [1]
						: [];
		const returnW = Math.min(inner * 0.33, Math.max(0.25, seatD));
		const extension = Math.max(0.15, Number(p.returnLength) - d);
		for (const side of sides) {
			const x = side * (w / 2 - returnW / 2);
			const z = d / 2 + extension / 2;
			this.rounded(
				"Sofa Return Base",
				[returnW, baseH, extension],
				[x, leg + baseH / 2, z],
				material,
			);
			for (let i = 0; i < Number(p.returnSeats); i++) {
				this.rounded(
					"Sofa Return Cushion",
					[returnW - back, cushion, (extension / Number(p.returnSeats)) * 0.97],
					[
						x - (side * back) / 2,
						seatY - cushion / 2,
						d / 2 + (extension / Number(p.returnSeats)) * (i + 0.5),
					],
					material,
				);
			}
			this.rounded(
				"Sofa Return Back",
				[back, h - seatY, extension],
				[side * (w / 2 - back / 2), seatY + (h - seatY) / 2, z],
				material,
			);
			for (const dx of [-1, 1])
				this.cylinder(
					"Sofa Return Leg",
					0.03,
					0.03,
					leg,
					[x + dx * returnW * 0.35, leg / 2, d / 2 + extension * 0.9],
					legMaterial,
					16,
				);
		}
		if (arm)
			for (const side of [-1, 1]) {
				if (sides.includes(side)) continue;
				const armH = Math.max(0.02, h * 0.72 - leg);
				this.rounded(
					"Sofa Arm",
					[arm, armH, d],
					[side * (w / 2 - arm / 2), leg + armH / 2, 0],
					material,
					0.05,
				);
			}
		if (p.layout === "sofa-bed" && p.bedExtended) {
			this.rounded(
				"Sofa Bed Frame",
				[inner, baseH, seatD],
				[0, leg + baseH / 2, d / 2 + seatD / 2],
				material,
			);
			this.rounded(
				"Sofa Bed Mattress",
				[inner * 0.98, cushion, seatD],
				[0, seatY - cushion / 2, d / 2 + seatD / 2],
				this.accent(0xe6ded2),
				0.06,
			);
			for (const x of [-inner * 0.4, inner * 0.4])
				this.cylinder(
					"Sofa Bed Leg",
					0.03,
					0.03,
					leg,
					[x, leg / 2, d / 2 + seatD * 0.9],
					legMaterial,
				);
		}
	}
}
