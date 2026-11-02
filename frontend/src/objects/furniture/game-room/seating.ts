import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GameRoomObject,
	number,
} from "./primitives.js";

export class GamingChairObject extends GameRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x53616b) {
		super(
			"gaming-chair",
			"Gaming chair",
			"gameChairControls",
			[
				...dimensions(0.68, 0.7, 1.25),
				number("seatHeight", "SeatHeight", 0.47, 0.2, 0.85),
				number("recline", "ChairRecline", 12, 0, 45, 1),
				choice("accent", "AccentColor", "blue", [
					"blue",
					"red",
					"purple",
					"green",
				]),
				boolean("armsEnabled", "ChairArms", true),
				boolean("footrest", "ChairFootrest", false),
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
			h = Number(p.height),
			y = Math.min(Number(p.seatHeight), h * 0.65),
			t = Math.min(w, d, h) * 0.06,
			metal = this.accent(0x3d484e, 0.45, 0.6);
		this.bucketSeat(w, d, h - y, y, material, Number(p.recline));
		this.cylinder(
			"Gaming Chair Lift",
			t * 0.5,
			t * 0.7,
			y - t,
			[0, (y - t) / 2, 0],
			metal,
			24,
		);
		for (let i = 0; i < 5; i++) {
			const a = (i / 5) * Math.PI * 2,
				r = Math.min(w, d) * 0.48,
				x = Math.cos(a) * r,
				z = Math.sin(a) * r,
				wr = Math.min(y, w, d) * 0.055;
			this.rail(
				"Gaming Chair Base Spoke",
				[0, wr * 2, 0],
				[x, wr * 2, z],
				t * 0.5,
				metal,
			);
			this.cylinder(
				"Gaming Chair Caster",
				wr,
				wr,
				t,
				[x, wr, z],
				this.accent(0x2d383e, 0.85),
				16,
			).rotation.z = Math.PI / 2;
		}
		if (p.armsEnabled)
			for (const side of [-1, 1]) {
				this.rail(
					"Gaming Chair Arm Post",
					[side * w * 0.47, y - t, 0],
					[side * w * 0.47, y + (h - y) * 0.23, 0],
					t * 0.3,
					metal,
				);
				this.rounded(
					"Gaming Chair Armrest",
					[w * 0.14, t * 0.7, d * 0.55],
					[side * w * 0.47, y + (h - y) * 0.23, d * 0.03],
					metal,
					0.008,
				);
			}
		if (p.footrest) {
			this.rounded(
				"Gaming Chair Footrest",
				[w * 0.67, t, d * 0.4],
				[0, y - t, d * 0.66],
				material,
				0.015,
			);
			for (const side of [-1, 1])
				this.rail(
					"Gaming Footrest Rail",
					[side * w * 0.22, y - t * 2, d * 0.18],
					[side * w * 0.22, y - t * 2, d * 0.65],
					t * 0.25,
					metal,
				);
		}
	}
}
