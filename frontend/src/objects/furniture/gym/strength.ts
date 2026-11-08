import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GymObject,
	integer,
	number,
} from "./primitives.js";

export class WeightBenchObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x536873) {
		super(
			"weight-bench",
			"Weight bench",
			"gymBenchControls",
			[
				...dimensions(0.65, 1.45, 0.48, [0.35, 0.8, 0.25]),
				number("backAngle", "BenchBackAngle", 0, 0, 75, 5),
				number("seatAngle", "BenchSeatAngle", 0, 0, 20, 5),
				boolean("legRollers", "BenchLegRollers", false),
			],
			parameters,
			color,
			0.88,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(w, d, h) * 0.12,
			steel = this.steel(),
			y = h - t,
			back = (Number(p.backAngle) * Math.PI) / 180,
			seat = (Number(p.seatAngle) * Math.PI) / 180;
		for (const z of [-d * 0.33, d * 0.33]) {
			this.foot(0, z, w, t * 2, t);
			this.rail("Bench Leg", [0, t, z], [0, y - t, z * 0.6], t * 0.6, steel);
		}
		this.rail(
			"Bench Spine",
			[0, y - t, -d * 0.4],
			[0, y - t, d * 0.33],
			t * 0.55,
			steel,
		);
		let before = this.partsGroup.children.length;
		this.rounded(
			"Bench Back Pad",
			[w * 0.63, t * 2, d * 0.65],
			[0, y, -d * 0.335],
			material,
			0.025,
		);
		this.rounded(
			"Bench Back Support",
			[w * 0.24, t * 0.6, d * 0.62],
			[0, y - t * 1.2, -d * 0.335],
			steel,
			0.004,
		);
		this.hingeParts(
			"Bench Back Pivot",
			this.partsGroup.children.slice(before),
			[0, y, -d * 0.015],
			back,
			"x",
		);
		before = this.partsGroup.children.length;
		this.rounded(
			"Bench Seat Pad",
			[w * 0.63, t * 2, d * 0.3],
			[0, y, d * 0.17],
			material,
			0.02,
		);
		this.hingeParts(
			"Bench Seat Pivot",
			this.partsGroup.children.slice(before),
			[0, y, d * 0.02],
			-seat,
			"x",
		);
		this.rail(
			"Bench Adjustment Strut",
			[0, h * 0.16, -d * 0.25],
			[
				0,
				y + Math.sin(back) * d * 0.4 - t * 1.2,
				-d * 0.015 - Math.cos(back) * d * 0.4,
			],
			t * 0.28,
			steel,
		);
		if (p.legRollers) {
			this.rail(
				"Bench Roller Post",
				[0, y - t, d * 0.3],
				[0, h * 0.65, d * 0.46],
				t * 0.4,
				steel,
			);
			for (const side of [-1, 1])
				this.axle(
					"Bench Leg Roller",
					t * 1.2,
					w * 0.33,
					[side * w * 0.22, h * 0.65, d * 0.46],
					this.rubber(),
				);
		}
	}
}

export class SquatRackObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x586c76) {
		super(
			"squat-rack",
			"Squat rack",
			"gymSquatControls",
			[
				choice("style", "SquatStyle", "power-rack", [
					{
						value: "power-rack",
						parameters: {width: 1.25, depth: 1.2, height: 2.2},
					},
					{
						value: "half-rack",
						parameters: {width: 1.25, depth: 0.95, height: 2.1},
					},
				]),
				...dimensions(1.25, 1.2, 2.2, [0.75, 0.6, 1.2]),
				number("barHeight", "BarHeight", 1.35, 0.4, 2.5),
				number("safetyHeight", "SafetyHeight", 0.75, 0.2, 1.8),
				boolean("barbellEnabled", "BarbellEnabled", true),
				integer("platePairs", "PlatePairs", 2, 0, 4),
				boolean("pullupBar", "PullupBar", true),
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
			full = p.style === "power-rack",
			x = w * 0.44,
			rear = -d * 0.34,
			front = d * 0.3,
			barY = Math.max(h * 0.2, Math.min(Number(p.barHeight), h * 0.85)),
			safetyY = Math.min(Number(p.safetyHeight), barY - t * 2),
			steel = this.steel();
		for (const side of [-1, 1]) {
			this.foot(side * x, 0, t * 1.8, d, t);
			for (const z of full ? [rear, front] : [rear]) {
				this.rounded(
					"Squat Rack Upright",
					[t, h - t, t],
					[side * x, (h + t) / 2, z],
					material,
					0.006,
				);
				for (let i = 0; i < 15; i++)
					this.cylinder(
						"Squat Rack Adjustment Hole",
						t * 0.15,
						t * 0.15,
						t * 0.03,
						[side * x, h * (0.15 + i * 0.046), z + t * 0.515],
						this.rubber(),
						12,
					).rotation.x = Math.PI / 2;
			}
			this.rail(
				"Squat Rack Safety",
				[side * x, safetyY, rear],
				[side * x, safetyY, front + t],
				t * 0.4,
				steel,
			);
			this.rounded(
				"Squat Rack Safety Pad",
				[t, t * 0.35, d * 0.64],
				[side * x, safetyY + t * 0.45, -d * 0.015],
				this.rubber(),
				0.003,
			);
			const jz = full ? front : rear;
			this.rounded(
				"Squat Rack J Hook",
				[t * 1.2, t * 0.5, t * 1.6],
				[side * x, barY - t * 0.35, jz + t],
				steel,
				0.004,
			);
			this.rounded(
				"Squat Rack J Hook Lip",
				[t * 1.2, t * 1.2, t * 0.4],
				[side * x, barY, jz + t * 1.6],
				steel,
				0.003,
			);
			if (full)
				this.rail(
					"Squat Rack Top Side",
					[side * x, h - t, rear],
					[side * x, h - t, front],
					t * 0.4,
					material,
				);
			else
				this.rail(
					"Squat Rack Brace",
					[side * x, t, -d * 0.48],
					[side * x, h * 0.37, rear],
					t * 0.35,
					steel,
				);
		}
		this.rail(
			"Squat Rack Rear Crossbar",
			[-x, h * 0.12, rear],
			[x, h * 0.12, rear],
			t * 0.45,
			material,
		);
		this.rail(
			"Squat Rack Top Crossbar",
			[-x, h - t, rear],
			[x, h - t, rear],
			t * 0.45,
			material,
		);
		if (p.pullupBar) {
			this.rail(
				"Squat Rack Pullup Bar",
				[-x, h - t * 0.5, full ? front : rear + d * 0.18],
				[x, h - t * 0.5, full ? front : rear + d * 0.18],
				t * 0.3,
				this.rubber(),
			);
			if (!full)
				for (const side of [-1, 1])
					this.rail(
						"Half Rack Pullup Support",
						[side * x, h - t * 0.5, rear],
						[side * x, h - t * 0.5, rear + d * 0.18],
						t * 0.4,
						material,
					);
		}
		if (p.barbellEnabled) {
			const z = (full ? front : rear) + t;
			this.axle("Rack Barbell", t * 0.24, w * 1.64, [0, barY, z], steel);
			for (const side of [-1, 1]) {
				this.axle(
					"Rack Barbell Sleeve",
					t * 0.4,
					w * 0.3,
					[side * w * 0.65, barY, z],
					steel,
				);
				for (let i = 0; i < Number(p.platePairs); i++) {
					const px = side * w * (0.53 + i * 0.045),
						radius = Math.min(w * 0.18, barY * 0.4);
					this.axle(
						"Rack Weight Plate",
						radius,
						w * 0.035,
						[px, barY, z],
						this.rubber(),
					);
					this.axle(
						"Rack Plate Hub",
						radius * 0.28,
						w * 0.037,
						[px, barY, z],
						this.trim(),
					);
				}
			}
		}
	}
}

export class CableMachineObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x5a6f7a) {
		super(
			"cable-machine",
			"Cable machine / multi-gym",
			"gymCableControls",
			[
				choice("style", "CableStyle", "cable-machine", [
					{
						value: "cable-machine",
						parameters: {
							width: 1.6,
							depth: 0.85,
							height: 2.1,
							seatEnabled: false,
						},
					},
					{
						value: "multi-gym",
						parameters: {
							width: 1.5,
							depth: 1.5,
							height: 2.1,
							seatEnabled: true,
						},
					},
				]),
				...dimensions(1.6, 0.85, 2.1, [0.8, 0.6, 1.3]),
				number("pulleyHeight", "PulleyHeight", 1.2, 0.3, 2.3),
				number("handleReach", "HandleReach", 0.2, 0.05, 0.6),
				integer("stackPlates", "StackPlates", 10, 4, 20),
				boolean("guardsEnabled", "StackGuards", true),
				boolean("seatEnabled", "GymSeat", false),
				number("pressAngle", "PressAngle", 0, 0, 50, 5),
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
			x = w * 0.4,
			z = -d * 0.24,
			py = Math.max(h * 0.18, Math.min(Number(p.pulleyHeight), h * 0.85)),
			hz = z + Math.min(Number(p.handleReach), d * 0.55),
			count = Number(p.stackPlates),
			multi = p.style === "multi-gym";
		for (const side of [-1, 1]) {
			this.foot(side * x, 0, t * 2.2, d, t);
			for (const dz of [-t * 2, t * 2])
				this.rail(
					"Cable Tower Upright",
					[side * x, t, z + dz],
					[side * x, h - t, z + dz],
					t * 0.48,
					material,
				);
			this.rounded(
				"Cable Tower Cap",
				[w * 0.19, t, t * 5],
				[side * x, h - t / 2, z],
				material,
				0.01,
			);
			for (let i = 0; i < count; i++)
				this.rounded(
					"Cable Stack Plate",
					[w * 0.16, ((h * 0.32) / count) * 0.88, t * 2.6],
					[side * x, h * (0.1 + ((i + 0.5) * 0.32) / count), z],
					this.rubber(),
					0.003,
				);
			for (const dx of [-w * 0.045, w * 0.045])
				this.rail(
					"Cable Stack Guide",
					[side * x + dx, h * 0.06, z],
					[side * x + dx, h * 0.89, z],
					t * 0.12,
					steel,
				);
			if (p.guardsEnabled)
				this.rounded(
					"Cable Stack Guard",
					[t * 0.5, h * 0.7, t * 5],
					[side * (x + w * 0.1), h * 0.42, z],
					material,
					0.008,
				);
			for (const y of [py, h * 0.92]) {
				this.cylinder(
					"Cable Pulley",
					t * 0.9,
					t * 0.9,
					t * 0.5,
					[side * x, y, z + t * 2.5],
					this.rubber(),
					24,
				).rotation.x = Math.PI / 2;
				this.rounded(
					"Cable Pulley Bracket",
					[t * 2.4, t * 2.4, t * 0.3],
					[side * x, y, z + t * 2.8],
					steel,
					0.004,
				);
			}
			this.rail(
				"Cable Stack Line",
				[side * x, h * 0.43, z],
				[side * x, h * 0.92, z + t * 2.5],
				t * 0.07,
				steel,
			);
			this.rail(
				"Cable Vertical Line",
				[side * x + t * 0.6, h * 0.92, z + t * 2.5],
				[side * x + t * 0.6, py, z + t * 2.5],
				t * 0.07,
				steel,
			);
			this.rail(
				"Cable Handle Line",
				[side * x, py, z + t * 2.5],
				[side * x * 0.8, py - h * 0.06, hz + t * 3],
				t * 0.07,
				steel,
			);
			const hx = side * x * 0.8,
				hy = py - h * 0.06,
				handleZ = hz + t * 3;
			for (const sign of [-1, 1])
				this.rail(
					"Cable Handle Frame",
					[hx, hy, handleZ],
					[hx + sign * w * 0.055, hy - h * 0.07, handleZ],
					t * 0.17,
					steel,
				);
			this.rail(
				"Cable Handle Grip",
				[hx - w * 0.055, hy - h * 0.07, handleZ],
				[hx + w * 0.055, hy - h * 0.07, handleZ],
				t * 0.28,
				this.rubber(),
			);
		}
		for (const y of [t * 1.5, h * 0.94])
			this.rail(
				"Cable Machine Crossbar",
				[-x, y, z],
				[x, y, z],
				t * 0.6,
				material,
			);
		if (p.seatEnabled) {
			this.rail("Gym Seat Base", [0, t, z], [0, t, d * 0.4], t * 0.6, steel);
			this.rail(
				"Gym Seat Post",
				[0, t, d * 0.18],
				[0, h * 0.22, d * 0.18],
				t * 0.55,
				steel,
			);
			this.rounded(
				"Gym Seat Pad",
				[w * 0.3, h * 0.045, d * 0.26],
				[0, h * 0.24, d * 0.18],
				this.rubber(),
				0.025,
			);
			this.rounded(
				"Gym Back Pad",
				[w * 0.26, h * 0.32, t * 1.2],
				[0, h * 0.42, d * 0.01],
				this.rubber(),
				0.03,
			);
			this.rail(
				"Gym Back Support",
				[0, t, z],
				[0, h * 0.58, -t],
				t * 0.5,
				steel,
			);
		}
		if (multi) {
			const before = this.partsGroup.children.length;
			for (const side of [-1, 1]) {
				this.rail(
					"Multi Gym Press Arm",
					[side * w * 0.3, h * 0.72, z],
					[side * w * 0.3, h * 0.5, d * 0.32],
					t * 0.35,
					steel,
				);
				this.rail(
					"Multi Gym Press Grip",
					[side * w * 0.3, h * 0.5, d * 0.32],
					[side * w * 0.18, h * 0.5, d * 0.32],
					t * 0.4,
					this.rubber(),
				);
			}
			this.hingeParts(
				"Multi Gym Press Pivot",
				this.partsGroup.children.slice(before),
				[0, h * 0.72, z],
				(-Number(p.pressAngle) * Math.PI) / 180,
				"x",
			);
			this.rail(
				"Multi Gym Lat Bar Cable",
				[0, h * 0.94, z],
				[0, h * 0.83, d * 0.28],
				t * 0.07,
				steel,
			);
			this.axle(
				"Multi Gym Lat Bar",
				t * 0.3,
				w * 0.7,
				[0, h * 0.83, d * 0.28],
				steel,
			);
			if (p.seatEnabled) {
				this.rail(
					"Multi Gym Leg Lever",
					[0, h * 0.24, d * 0.3],
					[0, h * 0.13, d * 0.43],
					t * 0.4,
					steel,
				);
				for (const side of [-1, 1])
					this.axle(
						"Multi Gym Leg Roller",
						t,
						w * 0.18,
						[side * w * 0.12, h * 0.13, d * 0.43],
						this.rubber(),
					);
			}
		}
	}
}
