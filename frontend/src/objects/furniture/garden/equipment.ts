import type {Mesh} from "three";
import {TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GardenObject,
	integer,
} from "./primitives.js";

export class GardenEquipmentObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x8c997d) {
		super(
			"garden-equipment",
			"Compost / rainwater / mower storage",
			"gardenEquipmentControls",
			[
				choice("style", "EquipmentStyle", "compost-bin", [
					{
						value: "compost-bin",
						parameters: {width: 0.8, depth: 0.8, height: 1},
					},
					{
						value: "rainwater-tank",
						parameters: {width: 0.75, depth: 0.75, height: 1.2},
					},
					{
						value: "lawn-mower-storage",
						parameters: {width: 1.5, depth: 0.9, height: 1.2},
					},
				]),
				...dimensions(0.8, 0.8, 1),
				integer("slatCount", "EquipmentSlats", 7, 4, 12),
				boolean("lidOpen", "EquipmentLid", false),
				boolean("hatchOpen", "CompostHatch", false),
				boolean("doorsOpen", "MowerDoors", false),
				boolean("contentsEnabled", "EquipmentContents", true),
				boolean("tapEnabled", "TankTap", true),
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
			t = Math.min(w, d, h) * 0.04,
			n = Number(p.slatCount),
			dark = this.accent(0x53625b, 0.6),
			metal = this.accent(0x9ba7a5, 0.35, 0.7);
		if (p.style === "rainwater-tank") {
			const r = w * 0.5,
				tank = this.lathe(
					"Rainwater Tank",
					[
						[0, 0],
						[r * 0.9, 0],
						[r, h * 0.92],
						[r * 0.95, h],
						[r - t, h],
						[r * 0.9 - t, t],
						[0, t],
					],
					[0, 0, 0],
					material,
				);
			tank.scale.z = d / w;
			for (let i = 1; i < n; i++) {
				const ring = this.addGeometry(
					"Rainwater Tank Rib",
					new TorusGeometry(r * 0.96, t * 0.3, 8, 48),
					[0, (h * i) / n, 0],
					material,
				);
				ring.rotation.x = Math.PI / 2;
				ring.scale.y = d / w;
			}
			const before = this.partsGroup.children.length,
				cap = this.cylinder(
					"Rainwater Tank Lid",
					r * 0.95,
					r * 0.95,
					t,
					[0, h, 0],
					material,
					48,
				);
			cap.scale.z = d / w;
			this.hingeParts(
				"Rainwater Lid Hinge",
				this.partsGroup.children.slice(before),
				[0, h, -d * 0.45],
				p.lidOpen ? -Math.PI * 0.6 : 0,
				"x",
			);
			if (p.contentsEnabled)
				this.water(
					"Tank Stored Water",
					(w - t * 2) * 0.9,
					(d - (t * 2 * d) / w) * 0.9,
					h * 0.7,
					true,
				);
			this.curve(
				"Rainwater Downpipe",
				[
					[w * 0.48, h * 1.18, -d * 0.3],
					[w * 0.48, h * 0.95, -d * 0.3],
					[w * 0.25, h * 0.9, -d * 0.2],
				],
				t * 0.55,
				this.accent(0xb2bdb3, 0.7),
			);
			if (p.tapEnabled) {
				this.rail(
					"Rainwater Tap",
					[0, h * 0.2, d * 0.47],
					[0, h * 0.2, d * 0.65],
					t * 0.6,
					metal,
				);
				this.rail(
					"Rainwater Tap Spout",
					[0, h * 0.2, d * 0.65],
					[0, h * 0.13, d * 0.65],
					t * 0.6,
					metal,
				);
				this.rail(
					"Rainwater Tap Handle",
					[-w * 0.07, h * 0.25, d * 0.58],
					[w * 0.07, h * 0.25, d * 0.58],
					t * 0.3,
					metal,
				);
			}
			return;
		}
		this.addBox("Garden Equipment Floor", [w, t, d], [0, t / 2, 0], material);
		if (p.style === "compost-bin") {
			for (const x of [-1, 1])
				for (const z of [-1, 1])
					this.addBox(
						"Compost Corner Post",
						[t, h, t],
						[(x * (w - t)) / 2, h / 2, (z * (d - t)) / 2],
						material,
					);
			for (let i = 0; i < n; i++)
				for (const side of [-1, 1]) {
					this.addBox(
						"Compost Side Slat",
						[t, (h / n) * 0.72, d],
						[(side * (w - t)) / 2, ((i + 0.5) * h) / n, 0],
						material,
					);
					if (side < 0 || i >= 2)
						this.addBox(
							"Compost Front Back Slat",
							[w - t * 2, (h / n) * 0.72, t],
							[0, ((i + 0.5) * h) / n, (side * (d - t)) / 2],
							material,
						);
				}
			const hatchStart = this.partsGroup.children.length;
			this.addBox(
				"Compost Access Hatch",
				[w - t * 2, (h / n) * 1.9, t],
				[0, h / n, d / 2],
				material,
			);
			this.hingeParts(
				"Compost Hatch Hinge",
				this.partsGroup.children.slice(hatchStart),
				[0, t, d / 2],
				p.hatchOpen ? Math.PI * 0.55 : 0,
				"x",
			);
			if (p.contentsEnabled)
				this.addBox(
					"Compost Contents",
					[w - t * 2, h * 0.55, d - t * 2],
					[0, h * 0.3, 0],
					this.accent(0x756349, 0.98),
				);
		} else {
			for (const side of [-1, 1])
				this.addBox(
					"Mower Storage Side",
					[t, h, d],
					[(side * (w - t)) / 2, h / 2, 0],
					material,
				);
			this.addBox(
				"Mower Storage Back",
				[w - t * 2, h, t],
				[0, h / 2, -d / 2],
				material,
			);
			for (const side of [-1, 1]) {
				const before = this.partsGroup.children.length,
					x = side * w * 0.245;
				this.rounded(
					"Mower Storage Door",
					[w * 0.48, h * 0.96, t],
					[x, h * 0.48, d / 2],
					material,
					0.004,
				);
				this.rounded(
					"Mower Storage Handle",
					[t, h * 0.13, t],
					[side * w * 0.05, h * 0.5, d / 2 + t],
					dark,
					0.002,
				);
				this.hingeParts(
					"Mower Storage Door Hinge",
					this.partsGroup.children.slice(before),
					[(side * (w - t)) / 2, 0, d / 2],
					p.doorsOpen ? side * Math.PI * 0.6 : 0,
				);
			}
			if (p.contentsEnabled) {
				const mower = this.accent(0x7e9c72, 0.65),
					r = Math.min(w, d, h) * 0.09;
				this.rounded(
					"Stored Mower Body",
					[w * 0.48, h * 0.17, d * 0.6],
					[0, r + h * 0.08, 0],
					mower,
					0.025,
				);
				this.rounded(
					"Stored Mower Motor",
					[w * 0.24, h * 0.13, d * 0.24],
					[0, r + h * 0.22, 0],
					dark,
					0.012,
				);
				for (const x of [-1, 1])
					for (const z of [-1, 1])
						this.cylinder(
							"Stored Mower Wheel",
							r,
							r,
							t,
							[x * w * 0.25, r, z * d * 0.23],
							dark,
							20,
						).rotation.z = Math.PI / 2;
				for (const x of [-1, 1])
					this.rail(
						"Stored Mower Handle",
						[x * w * 0.17, h * 0.2, -d * 0.17],
						[x * w * 0.17, h * 0.73, -d * 0.37],
						t * 0.35,
						metal,
					);
				this.rail(
					"Stored Mower Handle",
					[-w * 0.17, h * 0.73, -d * 0.37],
					[w * 0.17, h * 0.73, -d * 0.37],
					t * 0.35,
					metal,
				);
			}
		}
		const before = this.partsGroup.children.length;
		this.rounded(
			"Garden Equipment Lid",
			[w * 1.04, t, d * 1.04],
			[0, h + t / 2, 0],
			p.style === "compost-bin" ? material : dark,
			0.006,
		);
		this.hingeParts(
			"Garden Equipment Lid Hinge",
			this.partsGroup.children.slice(before),
			[0, h, -d / 2],
			p.lidOpen ? -Math.PI * 0.6 : 0,
			"x",
		);
	}
}
