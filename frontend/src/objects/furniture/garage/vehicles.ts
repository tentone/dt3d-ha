import type {Mesh} from "three";
import {ExtrudeGeometry, Shape} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GarageObject,
	integer,
	number,
} from "./primitives.js";

export class GarageCarObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x7f9daa) {
		super(
			"garage-car",
			"Car",
			"garageCarControls",
			[
				choice("style", "CarStyle", "sedan", [
					{
						value: "sedan",
						parameters: {width: 1.8, depth: 4.4, height: 1.5},
					},
					{
						value: "hatchback",
						parameters: {width: 1.75, depth: 4, height: 1.5},
					},
					{
						value: "suv",
						parameters: {width: 1.95, depth: 4.7, height: 1.8},
					},
				]),
				...dimensions(1.8, 4.4, 1.5).map((def) =>
					def.name === "depth" ? {...def, max: 8} : def,
				),
				number("wheelbase", "Wheelbase", 0.6, 0.45, 0.72, 0.01),
				number("steering", "Steering", 0, -35, 35, 1),
				boolean("lightsEnabled", "VehicleLights", false),
				boolean("roofRack", "RoofRack", false),
			],
			parameters,
			color,
			0.35,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			r = Math.min(h * 0.22, w * 0.22, d * 0.12),
			metal = this.accent(0xb0b8bb, 0.3, 0.75),
			dark = this.accent(0x303a40, 0.6),
			glass = this.accent(0x5c7581, 0.18, 0.3),
			longRoof = p.style !== "sedan",
			cabinD = d * (longRoof ? 0.6 : 0.5),
			roofD = cabinD * 0.64;
		this.rounded(
			"Car Body",
			[w * 0.94, h * 0.29, d * 0.94],
			[0, r + h * 0.13, 0],
			material,
			Math.min(w, h) * 0.1,
		);
		const profile = new Shape();
		profile.moveTo(-cabinD / 2, h * 0.43);
		profile.lineTo(cabinD / 2, h * 0.43);
		profile.lineTo(roofD / 2, h * 0.94);
		profile.lineTo(-roofD / 2, h * 0.94);
		profile.closePath();
		const cabin = new ExtrudeGeometry(profile, {
			depth: w * 0.79,
			bevelEnabled: false,
		});
		cabin.translate(0, 0, -w * 0.395);
		cabin.rotateY(Math.PI / 2);
		this.addGeometry("Car Cabin Glass", cabin, [0, 0, -d * 0.035], glass);
		this.rounded(
			"Car Roof",
			[w * 0.8, h * 0.035, roofD],
			[0, h * 0.955, -d * 0.035],
			material,
			0.015,
		);
		for (const s of [-1, 1]) {
			this.rounded(
				"Car Bumper",
				[w * 0.91, h * 0.08, d * 0.035],
				[0, r + h * 0.02, s * d * 0.475],
				dark,
				0.02,
			);
			for (const side of [-1, 1]) {
				this.rounded(
					s === 1 ? "Car Headlight" : "Car Tail Light",
					[w * 0.22, h * 0.07, d * 0.02],
					[side * w * 0.3, r + h * 0.22, s * d * 0.477],
					this.accent(
						s === 1 ? 0xf0ecd8 : 0xab493e,
						0.25,
						0,
						1,
						Boolean(p.lightsEnabled),
					),
					0.012,
				);
				this.rounded(
					"Car Door Handle",
					[w * 0.016, h * 0.025, d * 0.07],
					[side * w * 0.474, h * 0.48, s * d * 0.14],
					metal,
					0.004,
				);
			}
			this.rounded(
				"Car Window Pillar",
				[w * 0.025, h * 0.48, d * 0.025],
				[s * w * 0.402, h * 0.69, -d * 0.035],
				material,
				0.003,
			);
			this.rounded(
				"Car Wing Mirror",
				[w * 0.095, h * 0.07, d * 0.065],
				[s * w * 0.49, h * 0.62, d * 0.18],
				material,
				0.012,
			);
		}
		for (const x of [-1, 1])
			for (const z of [-1, 1]) {
				const center: [number, number, number] = [
					x * w * 0.455,
					r,
					(z * d * Number(p.wheelbase)) / 2,
				],
					before = this.partsGroup.children.length;
				this.wheel("Car Wheel", center, r, w * 0.11);
				if (z === 1)
					this.hingeParts(
						"Car Steering",
						this.partsGroup.children.slice(before),
						center,
						(Number(p.steering) * Math.PI) / 180,
					);
			}
		if (p.roofRack)
			for (const z of [-1, 1]) {
				this.rounded(
					"Car Roof Rack",
					[w * 0.86, h * 0.025, d * 0.025],
					[0, h * 1.02, -d * 0.035 + z * roofD * 0.32],
					dark,
					0.004,
				);
				for (const x of [-1, 1])
					this.rounded(
						"Car Rack Foot",
						[w * 0.025, h * 0.06, d * 0.025],
						[x * w * 0.35, h * 0.985, -d * 0.035 + z * roofD * 0.32],
						metal,
						0.003,
					);
			}
	}
}

export class GarageCycleObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9aa987) {
		super(
			"garage-cycle",
			"Motorcycle / bicycle / scooter",
			"garageCycleControls",
			[
				choice("style", "CycleStyle", "bicycle", [
					{
						value: "bicycle",
						parameters: {
							width: 0.65,
							depth: 1.8,
							height: 1.1,
							wheelRadius: 0.31,
							spokes: 12,
						},
					},
					{
						value: "motorcycle",
						parameters: {
							width: 0.8,
							depth: 2.1,
							height: 1.2,
							wheelRadius: 0.3,
							spokes: 6,
						},
					},
					{
						value: "scooter",
						parameters: {
							width: 0.7,
							depth: 1.8,
							height: 1.1,
							wheelRadius: 0.22,
							spokes: 5,
						},
					},
				]),
				...dimensions(0.65, 1.8, 1.1),
				number("wheelRadius", "CycleRadius", 0.31, 0.05, 0.5),
				integer("spokes", "CycleSpokes", 12, 4, 20),
				boolean("seatEnabled", "CycleSeat", true),
				boolean("kickstand", "Kickstand", true),
			],
			parameters,
			color,
			0.5,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			r = Math.min(Number(p.wheelRadius), h * 0.32, d * 0.23),
			z = d / 2 - r,
			th = Math.min(w, d, h) * 0.025,
			metal = this.accent(0xa7afb1, 0.3, 0.7),
			dark = this.accent(0x303a3e, 0.85),
			rear: [number, number, number] = [0, r, -z],
			front: [number, number, number] = [0, r, z],
			crank: [number, number, number] = [0, h * 0.32, -d * 0.05],
			seat: [number, number, number] = [0, h * 0.72, -d * 0.16],
			head: [number, number, number] = [0, h * 0.69, d * 0.22];
		if (p.style === "bicycle") {
			for (const [a, b] of [
				[rear, crank],
				[rear, seat],
				[seat, crank],
				[seat, head],
				[crank, head],
				[head, front],
			] as [typeof rear, typeof rear][])
				this.rail("Bicycle Frame", a, b, th, material);
			this.cylinder(
				"Bicycle Chainring",
				h * 0.07,
				h * 0.07,
				th,
				[th, h * 0.32, -d * 0.05],
				metal,
				24,
			).rotation.z = Math.PI / 2;
			this.rail(
				"Bicycle Chain",
				[th, h * 0.32, -d * 0.05],
				[th, r, -z],
				th * 0.3,
				dark,
			);
			for (const s of [-1, 1]) {
				this.rail(
					"Bicycle Crank",
					[0, h * 0.32, -d * 0.05],
					[s * w * 0.18, h * (0.32 + s * 0.055), -d * 0.05],
					th * 0.5,
					metal,
				);
				this.rounded(
					"Bicycle Pedal",
					[w * 0.16, th * 1.2, d * 0.055],
					[s * w * 0.2, h * (0.32 + s * 0.055), -d * 0.05],
					dark,
					0.003,
				);
			}
		} else if (p.style === "motorcycle") {
			this.ellipsoid(
				"Motorcycle Fuel Tank",
				[w * 0.27, h * 0.16, d * 0.19],
				[0, h * 0.6, d * 0.03],
				material,
			);
			this.rounded(
				"Motorcycle Engine",
				[w * 0.5, h * 0.23, d * 0.27],
				[0, h * 0.35, 0],
				metal,
				0.03,
			);
			for (let i = 0; i < 4; i++)
				this.rounded(
					"Motorcycle Engine Fin",
					[w * 0.55, h * 0.012, d * 0.29],
					[0, h * (0.29 + i * 0.045), 0],
					dark,
					0.002,
				);
			this.rail("Motorcycle Rear Frame", rear, seat, th * 1.5, material);
			this.cylinder(
				"Motorcycle Exhaust",
				th * 2,
				th * 2,
				d * 0.4,
				[w * 0.28, h * 0.24, -d * 0.2],
				metal,
				16,
			).rotation.x = Math.PI / 2;
		} else {
			this.rounded(
				"Scooter Deck",
				[w * 0.46, h * 0.09, d * 0.66],
				[0, h * 0.17, -d * 0.04],
				material,
				0.04,
			);
			this.rounded(
				"Scooter Leg Shield",
				[w * 0.65, h * 0.48, d * 0.12],
				[0, h * 0.49, d * 0.22],
				material,
				0.08,
			).rotation.x = -0.1;
			this.ellipsoid(
				"Scooter Rear Body",
				[w * 0.36, h * 0.22, d * 0.23],
				[0, h * 0.4, -d * 0.22],
				material,
			);
		}
		if (p.style !== "bicycle")
			for (const s of [-1, 1])
				this.rail(
					"Cycle Front Fork",
					[s * w * 0.1, h * 0.74, d * 0.19],
					[s * w * 0.1, r, z],
					th * 0.9,
					metal,
				);
		this.rail(
			"Cycle Handlebar Stem",
			head,
			[0, h * 0.94, d * 0.23],
			th * 0.8,
			metal,
		);
		this.rail(
			"Cycle Handlebar",
			[-w * 0.47, h * 0.94, d * 0.23],
			[w * 0.47, h * 0.94, d * 0.23],
			th * 0.8,
			metal,
		);
		for (const s of [-1, 1])
			this.rail(
				"Cycle Handle Grip",
				[s * w * 0.33, h * 0.94, d * 0.23],
				[s * w * 0.5, h * 0.94, d * 0.23],
				th * 1.4,
				dark,
			);
		if (p.seatEnabled) {
			this.rail("Cycle Seat Post", crank, seat, th, metal);
			this.rounded(
				"Cycle Saddle",
				[
					w * (p.style === "bicycle" ? 0.32 : 0.65),
					h * 0.07,
					d * (p.style === "bicycle" ? 0.13 : 0.29),
				],
				[0, h * 0.75, -d * 0.18],
				dark,
				0.03,
			);
		}
		if (p.kickstand)
			this.rail(
				"Cycle Kickstand",
				[0, h * 0.3, -d * 0.08],
				[-w * 0.38, 0, -d * 0.16],
				th * 0.7,
				metal,
			);
		this.wheel(
			"Cycle Wheel",
			rear,
			r,
			w * (p.style === "bicycle" ? 0.07 : 0.16),
			Number(p.spokes),
		);
		this.wheel(
			"Cycle Wheel",
			front,
			r,
			w * (p.style === "bicycle" ? 0.07 : 0.16),
			Number(p.spokes),
		);
	}
}
