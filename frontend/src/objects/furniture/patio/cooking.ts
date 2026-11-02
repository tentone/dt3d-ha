import type {Mesh} from "three";
import {ExtrudeGeometry, Path, Shape, SphereGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	PatioObject,
} from "./primitives.js";

export class OutdoorGrillObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x586462) {
		super(
			"outdoor-grill",
			"Barbecue grill",
			"patioGrillControls",
			[
				choice("style", "GrillStyle", "gas-grill", [
					{
						value: "gas-grill",
						parameters: {width: 0.95, depth: 0.55, height: 1.1},
					},
					{
						value: "kettle-grill",
						parameters: {width: 0.65, depth: 0.65, height: 1},
					},
				]),
				...dimensions(0.95, 0.55, 1.1),
				boolean("lidOpen", "GrillLid", false),
				boolean("sideShelves", "GrillShelves", true),
				integer("burners", "Burners", 3, 1, 5),
				boolean("lit", "FireOn", false),
			],
			parameters,
			color,
			0.4,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(w, d, h) * 0.04,
			metal = this.accent(0xb3b8b5, 0.35, 0.75),
			dark = this.accent(0x343b3c, 0.8),
			kettle = p.style === "kettle-grill",
			r = Math.min(w, d) * 0.46,
			y = h * 0.72;
		if (kettle) {
			const bowl = this.lathe(
				"Kettle Grill Bowl",
				[
					[0, 0],
					[r * 0.4, 0],
					[r, h * 0.2],
					[r - t, h * 0.2],
					[r * 0.35, t],
					[0, t],
				],
				[0, h * 0.52, 0],
				material,
			);
			bowl.scale.z = d / w;
		} else {
			this.rounded(
				"Gas Grill Floor",
				[w, t, d],
				[0, h * 0.51, 0],
				material,
				0.01,
			);
			for (const side of [-1, 1]) {
				this.rounded(
					"Gas Grill Wall",
					[t, h * 0.2, d],
					[(side * (w - t)) / 2, h * 0.61, 0],
					material,
					0.005,
				);
				this.rounded(
					"Gas Grill Wall",
					[w - t * 2, h * 0.2, t],
					[0, h * 0.61, (side * (d - t)) / 2],
					material,
					0.005,
				);
			}
			for (let i = 0; i < Number(p.burners); i++)
				this.cylinder(
					"Grill Control Knob",
					h * 0.023,
					h * 0.023,
					t,
					[
						((i + 0.5) / Number(p.burners) - 0.5) * w * 0.65,
						h * 0.58,
						d * 0.52,
					],
					metal,
					16,
				).rotation.x = Math.PI / 2;
		}
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rail(
					"Grill Leg",
					[x * w * 0.3, 0, z * d * 0.3],
					[x * w * 0.35, h * 0.54, z * d * 0.35],
					t * 0.7,
					metal,
				);
		this.rounded(
			"Grill Lower Shelf",
			[w * 0.72, t, d * 0.65],
			[0, h * 0.2, 0],
			dark,
			0.006,
		);
		for (let i = 0; i < 12; i++) {
			const x = ((i + 0.5) / 12 - 0.5) * (kettle ? r * 1.8 : w * 0.85),
				length = kettle
					? 2 * Math.sqrt(Math.max(0.00001, r * r - x * x)) * 0.9
					: d * 0.85;
			this.rail(
				"Grill Grate",
				[x, y, -length / 2],
				[x, y, length / 2],
				t * 0.18,
				metal,
			);
		}
		const before = this.partsGroup.children.length,
			lid = this.addGeometry(
				"Barbecue Lid",
				new SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
				[0, y, 0],
				material,
			);
		lid.scale.set(
			kettle ? r : w * 0.5,
			h * 0.24,
			kettle ? (r * d) / w : d * 0.5,
		);
		this.rail(
			"Grill Lid Handle",
			[-w * 0.14, y + h * 0.15, d * 0.34],
			[w * 0.14, y + h * 0.15, d * 0.34],
			t * 0.65,
			dark,
		);
		this.hingeParts(
			"Barbecue Lid Hinge",
			this.partsGroup.children.slice(before),
			[0, y, -d * 0.45],
			p.lidOpen ? -Math.PI * 0.62 : 0,
			"x",
		);
		if (p.sideShelves && !kettle)
			for (const side of [-1, 1]) {
				this.rounded(
					"Grill Side Shelf",
					[w * 0.25, t, d * 0.7],
					[side * w * 0.625, h * 0.69, 0],
					metal,
					0.006,
				);
				this.rail(
					"Grill Shelf Bracket",
					[side * w * 0.43, h * 0.5, 0],
					[side * w * 0.7, h * 0.68, 0],
					t * 0.4,
					dark,
				);
			}
		if (p.lit)
			this.fire(0, y - h * 0.1, 0, Math.min(w, d) * 0.6, h * 0.12, true);
	}
}

export class OutdoorKitchenObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9a9d8c) {
		super(
			"outdoor-kitchen",
			"Outdoor kitchen",
			"patioKitchenControls",
			[
				...dimensions(2.4, 0.7, 0.92),
				integer("modules", "KitchenModules", 3, 1, 6),
				boolean("doorsOpen", "KitchenDoors", false),
				boolean("sinkEnabled", "KitchenSink", true),
				boolean("grillEnabled", "KitchenGrill", true),
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
			t = Math.min(w, d, h) * 0.035,
			n = Number(p.modules),
			cw = w / n,
			stone = this.accent(0x555e5c, 0.65),
			metal = this.accent(0xa4b1b2, 0.3, 0.75),
			sx = w / 2 - cw / 2,
			sw = cw * 0.64,
			sd = d * 0.58,
			sy = h * 0.76;
		for (const side of [-1, 1]) {
			this.addBox(
				"Outdoor Kitchen Side",
				[t, h - t, d],
				[(side * (w - t)) / 2, (h - t) / 2, 0],
				material,
			);
			if (side < 0 || !p.sinkEnabled)
				this.addBox(
					"Outdoor Kitchen Board",
					[w - t * 2, t, d],
					[0, side < 0 ? t / 2 : h - t * 1.5, 0],
					material,
				);
		}
		this.addBox(
			"Outdoor Kitchen Back",
			[w - t * 2, h - t * 2, t],
			[0, h / 2, -d / 2 + t / 2],
			material,
		);
		for (let i = 0; i < n; i++) {
			const x = -w / 2 + (i + 0.5) * cw,
				before = this.partsGroup.children.length;
			this.rounded(
				"Outdoor Kitchen Door",
				[cw * 0.96, h * 0.9, t],
				[x, h * 0.48, d / 2],
				material,
				0.005,
			);
			this.rounded(
				"Outdoor Kitchen Handle",
				[cw * 0.3, t * 0.5, t],
				[x, h * 0.82, d / 2 + t],
				metal,
				0.003,
			);
			this.hingeParts(
				"Outdoor Kitchen Hinge",
				this.partsGroup.children.slice(before),
				[x - cw * 0.48, 0, d / 2],
				p.doorsOpen ? -Math.PI * 0.5 : 0,
			);
			if (i > 0)
				this.addBox(
					"Outdoor Kitchen Divider",
					[t, h * 0.7, d - t * 2],
					[-w / 2 + i * cw, h * 0.4, 0],
					material,
				);
		}
		if (p.sinkEnabled) {
			const left = sx - sw / 2 + w / 2,
				right = w / 2 - (sx + sw / 2);
			this.addBox(
				"Outdoor Kitchen Counter",
				[left, t, d],
				[-w / 2 + left / 2, h - t / 2, 0],
				stone,
			);
			this.addBox(
				"Outdoor Kitchen Counter",
				[right, t, d],
				[w / 2 - right / 2, h - t / 2, 0],
				stone,
			);
			for (const side of [-1, 1])
				this.addBox(
					"Outdoor Kitchen Counter",
					[sw, t, (d - sd) / 2],
					[sx, h - t / 2, (side * (d + sd)) / 4],
					stone,
				);
			this.addBox("Outdoor Sink Floor", [sw, t, sd], [sx, sy, 0], metal);
			for (const side of [-1, 1]) {
				this.addBox(
					"Outdoor Sink Wall",
					[t, h - sy, sd],
					[sx + (side * (sw - t)) / 2, (h + sy) / 2, 0],
					metal,
				);
				this.addBox(
					"Outdoor Sink Wall",
					[sw - t * 2, h - sy, t],
					[sx, (h + sy) / 2, (side * (sd - t)) / 2],
					metal,
				);
			}
			this.curve(
				"Outdoor Sink Faucet",
				[
					[sx, h, -d * 0.4],
					[sx, h + h * 0.24, -d * 0.4],
					[sx, h + h * 0.26, -d * 0.1],
					[sx, h + h * 0.17, 0],
				],
				t * 0.35,
				metal,
			);
		} else
			this.addBox(
				"Outdoor Kitchen Counter",
				[w, t, d],
				[0, h - t / 2, 0],
				stone,
			);
		if (p.grillEnabled) {
			const x = n > 1 ? -w / 2 + cw / 2 : 0,
				grillW = n > 1 ? cw * 0.72 : w * 0.27,
				z = n > 1 ? 0 : d * 0.4;
			this.rounded(
				"Outdoor Kitchen Grill",
				[grillW, t * 0.3, d * (n > 1 ? 0.65 : 0.13)],
				[x, h + t * 0.15, z],
				metal,
				0.003,
			);
			for (let i = 0; i < 9; i++)
				this.addBox(
					"Outdoor Kitchen Grill Bar",
					[grillW * 0.025, t * 0.3, d * (n > 1 ? 0.6 : 0.11)],
					[x + ((i + 0.5) / 9 - 0.5) * grillW, h + t * 0.4, z],
					stone,
				);
		}
	}
}

export class PizzaOvenObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb78964) {
		super(
			"pizza-oven",
			"Pizza oven",
			"patioPizzaControls",
			[
				...dimensions(0.9, 0.85, 0.6),
				boolean("standEnabled", "OvenStand", true),
				number("standHeight", "OvenStandHeight", 0.8, 0.25, 1.4),
				boolean("doorClosed", "OvenDoor", false),
				boolean("lit", "FireOn", false),
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
			b = p.standEnabled ? Number(p.standHeight) : 0,
			t = Math.min(w, d, h) * 0.06,
			stone = this.accent(0xa9a795, 0.85),
			dark = this.accent(0x434e50, 0.45, 0.5),
			shape = new Shape();
		shape.moveTo(-w / 2, 0);
		shape.lineTo(w / 2, 0);
		shape.lineTo(w / 2, h * 0.3);
		shape.absellipse(0, h * 0.3, w / 2, h * 0.65, 0, Math.PI, false, 0);
		shape.closePath();
		const backShape = shape.clone();
		const hole = new Path();
		hole.moveTo(-w * 0.25, h * 0.04);
		hole.lineTo(w * 0.25, h * 0.04);
		hole.lineTo(w * 0.25, h * 0.3);
		hole.absellipse(0, h * 0.3, w * 0.25, h * 0.36, 0, Math.PI, false, 0);
		hole.closePath();
		shape.holes.push(hole);
		const geometry = new ExtrudeGeometry(shape, {
			depth: d * 0.82,
			bevelEnabled: false,
			curveSegments: 32,
		});
		geometry.translate(0, 0, -d * 0.41);
		this.addGeometry("Pizza Oven Arch", geometry, [0, b + t, 0], material);
		this.rounded(
			"Pizza Baking Stone",
			[w * 1.08, t, d * 1.1],
			[0, b + t / 2, d * 0.04],
			stone,
			0.01,
		);
		this.addGeometry(
			"Pizza Oven Back",
			new ExtrudeGeometry(backShape, {
				depth: t,
				bevelEnabled: false,
				curveSegments: 32,
			}),
			[0, b + t, -d * 0.43],
			material,
		);
		this.cylinder(
			"Pizza Oven Chimney",
			w * 0.065,
			w * 0.065,
			h * 0.55,
			[0, b + h * 1.08, -d * 0.2],
			dark,
			24,
		);
		this.cylinder(
			"Pizza Oven Chimney Cap",
			w * 0.09,
			w * 0.09,
			t,
			[0, b + h * 1.36, -d * 0.2],
			dark,
			24,
		);
		if (b) {
			for (const x of [-1, 1])
				for (const z of [-1, 1])
					this.addBox(
						"Pizza Oven Stand",
						[t, b, t],
						[x * w * 0.4, b / 2, z * d * 0.35],
						dark,
					);
			this.addBox("Pizza Oven Shelf", [w, t, d * 0.8], [0, b * 0.24, 0], dark);
		}
		if (p.doorClosed) {
			const door = new Shape();
			door.moveTo(-w * 0.25, h * 0.04);
			door.lineTo(w * 0.25, h * 0.04);
			door.lineTo(w * 0.25, h * 0.3);
			door.absellipse(0, h * 0.3, w * 0.25, h * 0.36, 0, Math.PI, false, 0);
			door.closePath();
			this.addGeometry(
				"Pizza Oven Door",
				new ExtrudeGeometry(door, {
					depth: t * 0.3,
					bevelEnabled: false,
					curveSegments: 24,
				}),
				[0, b + t, d * 0.42],
				dark,
			);
			this.rail(
				"Pizza Oven Door Handle",
				[-w * 0.1, b + h * 0.3, d * 0.46],
				[w * 0.1, b + h * 0.3, d * 0.46],
				t * 0.3,
				stone,
			);
		}
		this.fire(
			0,
			b + t * 1.3,
			-d * 0.18,
			w * 0.32,
			h * 0.2,
			Boolean(p.lit) && !p.doorClosed,
		);
	}
}
