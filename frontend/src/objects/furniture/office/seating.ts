import type {Mesh} from "three";
import {TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	number,
	OfficeObject,
} from "./primitives.js";

export class OfficeChairObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x657780) {
		super(
			"office-chair",
			"Office seating",
			"officeChairControls",
			[
				choice("style", "ChairStyle", "office-chair", [
					{
						value: "office-chair",
						parameters: {
							width: 0.62,
							depth: 0.62,
							height: 1.05,
							seatHeight: 0.47,
							armsEnabled: true,
							casters: true,
						},
					},
					{
						value: "ergonomic-chair",
						parameters: {
							width: 0.65,
							depth: 0.65,
							height: 1.25,
							seatHeight: 0.48,
							armsEnabled: true,
							casters: true,
							headrest: true,
						},
					},
					{
						value: "visitor-chair",
						parameters: {
							width: 0.54,
							depth: 0.58,
							height: 0.85,
							seatHeight: 0.46,
							armsEnabled: false,
							casters: false,
						},
					},
					{
						value: "office-stool",
						parameters: {
							width: 0.42,
							depth: 0.42,
							height: 0.65,
							seatHeight: 0.62,
							armsEnabled: false,
							casters: false,
						},
					},
				]),
				...dimensions(0.62, 0.62, 1.05),
				number("seatHeight", "SeatHeight", 0.47, 0.2, 0.9),
				number("backTilt", "BackTilt", 10, 0, 35, 1),
				boolean("armsEnabled", "ArmsEnabled", true),
				boolean("headrest", "Headrest", true),
				boolean("meshBack", "MeshBack", true),
				boolean("casters", "Casters", true),
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
			h = Number(p.height),
			stool = p.style === "office-stool",
			visitor = p.style === "visitor-chair",
			erg = p.style === "ergonomic-chair",
			y = Math.min(Number(p.seatHeight), h * (stool ? 0.92 : 0.67)),
			t = Math.min(w, d, y) * 0.12,
			legH = y - t,
			metal = this.accent(0x3f4a51, 0.4, 0.6),
			r = Math.min(w, d) * 0.47;
		if (stool)
			this.cylinder(
				"Office Stool Seat",
				w * 0.46,
				w * 0.43,
				t,
				[0, y - t / 2, 0],
				material,
				40,
			);
		else
			this.rounded(
				"Office Chair Seat",
				[w * 0.87, t, d * 0.86],
				[0, y - t / 2, d * 0.03],
				material,
				0.04,
			);
		if (visitor) {
			this.legs(w * 0.88, d * 0.8, legH, Math.min(w, d) * 0.07, metal);
		} else {
			this.cylinder(
				"Office Seat Column",
				w * 0.045,
				w * 0.065,
				legH,
				[0, legH / 2, 0],
				metal,
			);
			if (p.casters) {
				const wheel = Math.min(0.03, y * 0.12);
				for (let i = 0; i < 5; i++) {
					const angle = (i * Math.PI * 2) / 5,
						x = Math.cos(angle) * r,
						z = Math.sin(angle) * r;
					this.rail(
						"Office Star Base Arm",
						[0, wheel * 2, 0],
						[x, wheel * 1.6, z],
						Math.min(w, d) * 0.025,
						metal,
					);
					this.cylinder(
						"Office Caster",
						wheel,
						wheel,
						wheel * 0.65,
						[x, wheel, z],
						this.accent(0x283238),
						20,
					).rotation.x = Math.PI / 2;
				}
			} else
				this.cylinder(
					"Office Seat Foot",
					r * 0.72,
					r * 0.85,
					Math.min(t * 0.4, legH * 0.2),
					[0, Math.min(t * 0.2, legH * 0.1), 0],
					metal,
				);
			if (stool) {
				this.addGeometry(
					"Office Stool Footrest",
					new TorusGeometry(r * 0.65, w * 0.015, 8, 40),
					[0, legH * 0.35, 0],
					metal,
				).rotation.x = Math.PI / 2;
			}
		}
		if (stool) return;
		const bh = Math.max(t, h - y),
			backH = bh * (erg && p.headrest ? 0.76 : 1),
			z = -d * 0.33,
			before = this.partsGroup.children.length;
		this.rounded(
			"Office Back Support",
			[w * 0.12, backH, t * 0.5],
			[0, y + backH / 2, z - t * 0.6],
			metal,
			0.008,
		);
		if (erg && p.meshBack) {
			for (const side of [-1, 1]) {
				this.rounded(
					"Ergonomic Back Frame",
					[w * 0.045, backH, t * 0.7],
					[side * w * 0.4, y + backH / 2, z],
					metal,
					0.01,
				);
				this.rounded(
					"Ergonomic Back Frame",
					[w * 0.84, t * 0.6, t * 0.7],
					[0, y + (side < 0 ? 0.02 : 1) * backH, z],
					metal,
					0.01,
				);
			}
			for (let i = 0; i < 9; i++)
				this.rounded(
					"Ergonomic Mesh Band",
					[w * 0.76, backH * 0.065, t * 0.25],
					[0, y + backH * (0.08 + i * 0.1), z],
					material,
					0.004,
				);
		} else
			this.rounded(
				"Office Chair Back",
				[w * 0.84, backH, t],
				[0, y + backH / 2, z],
				material,
				0.04,
			);
		if (erg) {
			this.rounded(
				"Lumbar Support",
				[w * 0.65, bh * 0.16, t * 1.2],
				[0, y + bh * 0.23, z + t * 0.6],
				material,
				0.025,
			);
			if (p.headrest)
				this.rounded(
					"Office Headrest",
					[w * 0.58, bh * 0.2, t * 1.2],
					[0, h - bh * 0.08, z],
					material,
					0.035,
				);
		}
		this.hingeParts(
			"Office Back Hinge",
			this.partsGroup.children.slice(before),
			[0, y, z],
			(-Number(p.backTilt) * Math.PI) / 180,
			"x",
		);
		if (p.armsEnabled)
			for (const side of [-1, 1]) {
				this.rounded(
					"Office Arm Post",
					[w * 0.035, bh * 0.35, t * 0.5],
					[side * w * 0.45, y + bh * 0.175, d * 0.02],
					metal,
					0.004,
				);
				this.rounded(
					"Office Arm Pad",
					[w * 0.12, t * 0.45, d * 0.56],
					[side * w * 0.45, y + bh * 0.35, d * 0.02],
					metal,
					0.015,
				);
			}
	}
}
