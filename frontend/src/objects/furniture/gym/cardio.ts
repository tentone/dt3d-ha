import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GymObject,
	number,
} from "./primitives.js";

export class TreadmillObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x53616b) {
		super(
			"treadmill",
			"Treadmill",
			"gymTreadmillControls",
			[
				...dimensions(0.85, 1.85, 1.35, [0.5, 1, 0.8]),
				number("incline", "TreadmillIncline", 0, 0, 15, 1),
				boolean("folded", "TreadmillFolded", false),
				boolean("handrails", "Handrails", true),
				boolean("screenOn", "ScreenOn", true),
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
			t = Math.min(w, d, h) * 0.07,
			deckY = t * 1.6,
			front = -d * 0.36,
			angle = (Number(p.incline) * Math.PI) / 180;
		for (const z of [-d * 0.34, d * (p.folded ? -0.12 : 0.35)]) {
			this.foot(0, z, w * 0.98, t * 2, t);
			this.rail(
				"Treadmill Base Crossbar",
				[-w * 0.42, t * 1.1, z],
				[w * 0.42, t * 1.1, z],
				t * 0.45,
				this.steel(),
			);
		}
		for (const side of [-1, 1])
			this.rail(
				"Treadmill Base Side",
				[side * w * 0.42, t * 1.1, -d * 0.34],
				[side * w * 0.42, t * 1.1, d * (p.folded ? -0.12 : 0.35)],
				t * 0.4,
				this.steel(),
			);
		const before = this.partsGroup.children.length;
		this.rounded(
			"Treadmill Deck",
			[w * 0.96, t, d * 0.84],
			[0, deckY, 0],
			material,
			0.02,
		);
		this.rounded(
			"Treadmill Belt",
			[w * 0.71, t * 0.18, d * 0.73],
			[0, deckY + t * 0.58, d * 0.02],
			this.rubber(),
			0.005,
		);
		for (const side of [-1, 1])
			this.rounded(
				"Treadmill Foot Rail",
				[w * 0.1, t * 0.25, d * 0.78],
				[side * w * 0.425, deckY + t * 0.6, 0],
				this.steel(),
				0.005,
			);
		for (let i = 0; i < 12; i++)
			this.addBox(
				"Treadmill Belt Tread",
				[w * 0.67, t * 0.025, d * 0.003],
				[0, deckY + t * 0.68, d * (-0.31 + i * 0.06)],
				this.accent(0x4d5a60, 0.95),
			);
		this.rounded(
			"Treadmill Motor Cover",
			[w * 0.72, t * 1.4, d * 0.1],
			[0, deckY + t * 0.55, -d * 0.36],
			material,
			0.025,
		);
		this.hingeParts(
			"Treadmill Deck Pivot",
			this.partsGroup.children.slice(before),
			[0, deckY, p.folded ? -d * 0.43 : d * 0.39],
			p.folded ? -Math.PI * 0.4 : angle,
			"x",
		);
		for (const side of [-1, 1]) {
			this.rail(
				"Treadmill Upright",
				[side * w * 0.43, t, front],
				[side * w * 0.43, h * 0.9, front - d * 0.03],
				t * 0.55,
				material,
			);
			if (p.handrails) {
				this.rail(
					"Treadmill Handrail",
					[side * w * 0.43, h * 0.75, front],
					[side * w * 0.43, h * 0.68, d * 0.04],
					t * 0.45,
					this.rubber(),
				);
				this.rail(
					"Treadmill Handrail Brace",
					[side * w * 0.43, h * 0.68, d * 0.04],
					[side * w * 0.43, deckY + t, front],
					t * 0.25,
					this.steel(),
				);
			}
		}
		this.console(w * 0.76, h * 0.17, 0, h * 0.9, front, Boolean(p.screenOn));
		this.rounded(
			"Treadmill Safety Key",
			[t * 0.8, t * 0.5, t * 0.7],
			[0, h * 0.79, front + t],
			this.accent(0xc48075, 0.7),
			0.003,
		);
	}
}

export class ExerciseBikeObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x63747c) {
		super(
			"exercise-bike",
			"Exercise bike",
			"gymBikeControls",
			[
				choice("style", "BikeStyle", "upright-bike", [
					{
						value: "upright-bike",
						parameters: {
							width: 0.65,
							depth: 1.1,
							height: 1.25,
							seatHeight: 0.8,
						},
					},
					{
						value: "spin-bike",
						parameters: {
							width: 0.6,
							depth: 1.2,
							height: 1.15,
							seatHeight: 0.82,
						},
					},
					{
						value: "recumbent-bike",
						parameters: {
							width: 0.75,
							depth: 1.65,
							height: 1.05,
							seatHeight: 0.48,
						},
					},
				]),
				...dimensions(0.65, 1.1, 1.25, [0.4, 0.7, 0.65]),
				number("seatHeight", "BikeSeatHeight", 0.8, 0.3, 1.2),
				number("pedalAngle", "PedalAngle", 0, 0, 360, 5),
				boolean("displayEnabled", "DisplayEnabled", true),
				boolean("screenOn", "ScreenOn", true),
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
			t = Math.min(w, d, h) * 0.07,
			recumbent = p.style === "recumbent-bike",
			cy = h * 0.26,
			cz = recumbent ? -d * 0.2 : d * 0.02,
			sy = Math.min(Number(p.seatHeight), h * 0.77),
			sz = d * (recumbent ? 0.28 : 0.19),
			steel = this.steel();
		for (const z of [-d * 0.38, d * 0.38]) this.foot(0, z, w * 0.98, t * 2, t);
		this.rail(
			"Bike Base Rail",
			[0, t * 1.5, -d * 0.4],
			[0, t * 1.5, d * 0.4],
			t * 0.65,
			material,
		);
		this.rail("Bike Seat Tube", [0, cy, cz], [0, sy - t, sz], t * 0.6, steel);
		this.rail(
			"Bike Frame",
			[0, t * 1.5, d * 0.35],
			[0, cy, cz],
			t * 0.8,
			material,
		);
		this.rail(
			"Bike Frame",
			[0, cy, cz],
			[0, h * 0.66, -d * 0.3],
			t * 0.8,
			material,
		);
		this.rail(
			"Bike Frame",
			[0, h * 0.66, -d * 0.3],
			[0, t * 1.5, -d * 0.35],
			t * 0.65,
			material,
		);
		const fr = Math.min(w * 0.35, h * 0.22),
			fz = p.style === "spin-bike" ? -d * 0.27 : cz;
		this.axle(
			"Bike Flywheel",
			fr,
			w * 0.28,
			[0, Math.max(fr + t, cy), fz],
			this.rubber(),
		);
		this.axle(
			"Bike Flywheel Hub",
			fr * 0.55,
			w * 0.3,
			[0, Math.max(fr + t, cy), fz],
			this.trim(),
		);
		this.rounded(
			"Bike Saddle",
			[w * (recumbent ? 0.72 : 0.5), t * 1.5, d * (recumbent ? 0.22 : 0.2)],
			[0, sy - t * 0.75, sz],
			this.rubber(),
			0.025,
		);
		if (recumbent) {
			this.rounded(
				"Bike Seat Back",
				[w * 0.7, h * 0.4, t * 1.7],
				[0, sy + h * 0.16, sz + d * 0.12],
				this.rubber(),
				0.03,
			).rotation.x = 0.12;
			for (const side of [-1, 1])
				this.rail(
					"Bike Seat Handle",
					[side * w * 0.4, sy - t, sz],
					[side * w * 0.4, sy + t, sz - d * 0.14],
					t * 0.35,
					steel,
				);
		}
		this.rail(
			"Bike Handlebar Post",
			[0, h * 0.6, -d * 0.3],
			[0, h * 0.9, -d * 0.33],
			t * 0.45,
			steel,
		);
		for (const side of [-1, 1]) {
			this.rail(
				"Bike Handlebar",
				[0, h * 0.86, -d * 0.31],
				[side * w * 0.4, h * 0.86, -d * 0.22],
				t * 0.32,
				this.rubber(),
			);
			const angle =
					(Number(p.pedalAngle) * Math.PI) / 180 + (side === 1 ? Math.PI : 0),
				r = Math.min(cy * 0.65, d * 0.13),
				y = cy + Math.cos(angle) * r,
				z = cz + Math.sin(angle) * r;
			this.rail(
				"Bike Crank",
				[side * w * 0.19, cy, cz],
				[side * w * 0.19, y, z],
				t * 0.2,
				steel,
			);
			this.rounded(
				"Bike Pedal",
				[w * 0.22, t * 0.45, d * 0.1],
				[side * w * 0.3, y, z],
				this.rubber(),
				0.003,
			);
		}
		if (p.displayEnabled)
			this.console(
				w * 0.36,
				h * 0.14,
				0,
				h * 0.94,
				-d * 0.33,
				Boolean(p.screenOn),
			);
	}
}

export class RowingMachineObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x62737d) {
		super(
			"rowing-machine",
			"Rowing machine",
			"gymRowerControls",
			[
				...dimensions(0.62, 2.25, 0.95, [0.4, 1.2, 0.6]),
				number("seatPosition", "RowerSeatPosition", 0.65, 0, 1, 0.05),
				number("handlePull", "RowerHandlePull", 0.25, 0, 1, 0.05),
				boolean("displayEnabled", "DisplayEnabled", true),
				boolean("screenOn", "ScreenOn", true),
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
			t = Math.min(w, d, h) * 0.07,
			r = Math.min(w * 0.4, h * 0.32),
			steel = this.steel(),
			fz = -d * 0.33,
			fy = r + t,
			ry = h * 0.2,
			sz = d * (-0.02 + Number(p.seatPosition) * 0.36);
		for (const z of [fz, d * 0.43]) {
			this.foot(0, z, w * 0.95, t * 2, t);
			this.rail(
				"Rower Rail Support",
				[0, t, z],
				[0, ry, z],
				t * 0.65,
				material,
			);
		}
		this.rounded(
			"Rower Sliding Rail",
			[w * 0.15, t, d * 0.7],
			[0, ry, d * 0.12],
			steel,
			0.004,
		);
		this.axle("Rower Flywheel", r, w * 0.54, [0, fy, fz], material);
		for (const side of [-1, 1]) {
			this.ring(
				"Rower Flywheel Rim",
				r * 0.81,
				t * 0.3,
				[side * w * 0.28, fy, fz],
				this.rubber(),
			).rotation.y = Math.PI / 2;
			for (let i = 0; i < 8; i++) {
				const a = (i * Math.PI) / 4;
				this.rail(
					"Rower Fan Spoke",
					[side * w * 0.28, fy, fz],
					[
						side * w * 0.28,
						fy + Math.cos(a) * r * 0.74,
						fz + Math.sin(a) * r * 0.74,
					],
					t * 0.1,
					steel,
				);
			}
			this.rounded(
				"Rower Footplate",
				[w * 0.26, t * 0.7, d * 0.12],
				[side * w * 0.27, ry + t, -d * 0.12],
				this.rubber(),
				0.008,
			).rotation.x = -0.45;
			this.rounded(
				"Rower Foot Strap",
				[w * 0.28, t * 0.35, d * 0.02],
				[side * w * 0.27, ry + t * 1.7, -d * 0.12],
				this.trim(),
				0.002,
			).rotation.x = -0.45;
		}
		this.rounded(
			"Rower Seat Carriage",
			[w * 0.29, t, d * 0.1],
			[0, ry + t, sz],
			steel,
			0.005,
		);
		this.rounded(
			"Rower Seat",
			[w * 0.65, t * 1.3, d * 0.14],
			[0, ry + t * 2, sz],
			this.rubber(),
			0.02,
		);
		const hz = d * (-0.16 + Number(p.handlePull) * 0.42),
			hy = h * 0.55;
		this.rail(
			"Rower Pull Cable",
			[0, fy + r * 0.3, fz],
			[0, hy, hz],
			t * 0.08,
			steel,
		);
		this.axle("Rower Handle", t * 0.35, w * 0.68, [0, hy, hz], this.rubber());
		if (p.displayEnabled) {
			this.rail(
				"Rower Console Arm",
				[0, fy, fz],
				[0, h * 0.86, fz + d * 0.03],
				t * 0.3,
				steel,
			);
			this.console(
				w * 0.4,
				h * 0.2,
				0,
				h * 0.89,
				fz + d * 0.03,
				Boolean(p.screenOn),
			);
		}
	}
}

export class EllipticalTrainerObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x62747b) {
		super(
			"elliptical-trainer",
			"Elliptical trainer",
			"gymEllipticalControls",
			[
				...dimensions(0.75, 1.4, 1.6, [0.5, 0.9, 1]),
				number("stridePosition", "StridePosition", 35, 0, 360, 5),
				boolean("movingHandles", "MovingHandles", true),
				boolean("displayEnabled", "DisplayEnabled", true),
				boolean("screenOn", "ScreenOn", true),
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
			t = Math.min(w, d, h) * 0.06,
			steel = this.steel(),
			phase = (Number(p.stridePosition) * Math.PI) / 180,
			fz = d * 0.29,
			fy = h * 0.24,
			r = Math.min(w * 0.3, h * 0.18),
			front = -d * 0.3;
		for (const z of [-d * 0.4, d * 0.4]) this.foot(0, z, w, t * 2, t);
		this.rail(
			"Elliptical Base",
			[0, t * 1.7, -d * 0.4],
			[0, t * 1.7, d * 0.4],
			t * 0.7,
			material,
		);
		this.rail(
			"Elliptical Mast",
			[0, t * 1.7, front],
			[0, h * 0.84, front],
			t * 0.65,
			material,
		);
		this.rail("Elliptical Drive Support", [0, t, fz], [0, fy, fz], t, material);
		this.axle("Elliptical Flywheel", r, w * 0.35, [0, fy, fz], material);
		this.axle(
			"Elliptical Drive Hub",
			r * 0.6,
			w * 0.37,
			[0, fy, fz],
			this.trim(),
		);
		for (const side of [-1, 1]) {
			const a = phase + (side === 1 ? Math.PI : 0),
				py = h * (0.18 + Math.cos(a) * 0.035),
				pz = d * (0.02 + Math.sin(a) * 0.13),
				x = side * w * 0.32,
				jy = fy + Math.cos(a) * r * 0.65,
				jz = fz + Math.sin(a) * r * 0.65;
			this.rail("Elliptical Crank", [x, fy, fz], [x, jy, jz], t * 0.35, steel);
			this.rail(
				"Elliptical Pedal Link",
				[x, jy, jz],
				[x, py, pz - d * 0.16],
				t * 0.35,
				steel,
			);
			this.rounded(
				"Elliptical Pedal",
				[w * 0.26, t * 0.7, d * 0.29],
				[x, py, pz],
				this.rubber(),
				0.015,
			);
			this.rounded(
				"Elliptical Pedal Toe",
				[w * 0.26, t * 1.2, t],
				[x, py + t * 0.5, pz - d * 0.13],
				this.trim(),
				0.003,
			);
			this.rail(
				"Elliptical Lower Arm",
				[x, py, pz - d * 0.16],
				[x, h * 0.59, front],
				t * 0.35,
				steel,
			);
			const before = this.partsGroup.children.length;
			this.rail(
				"Elliptical Moving Handle",
				[x, h * 0.59, front],
				[x, h * 0.94, front - d * 0.03],
				t * 0.35,
				steel,
			);
			this.rail(
				"Elliptical Handle Grip",
				[x, h * 0.85, front - d * 0.02],
				[x, h * 0.98, front - d * 0.03],
				t * 0.48,
				this.rubber(),
			);
			this.hingeParts(
				"Elliptical Handle Pivot",
				this.partsGroup.children.slice(before),
				[x, h * 0.59, front],
				p.movingHandles ? Math.sin(a) * 0.2 : 0,
				"x",
			);
			this.rail(
				"Elliptical Fixed Handle",
				[0, h * 0.73, front],
				[side * w * 0.2, h * 0.73, front + d * 0.1],
				t * 0.3,
				this.rubber(),
			);
		}
		if (p.displayEnabled)
			this.console(w * 0.4, h * 0.12, 0, h * 0.83, front, Boolean(p.screenOn));
	}
}
