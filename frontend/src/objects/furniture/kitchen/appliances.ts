import type {Mesh} from "three";
import {
	CylinderGeometry,
	ExtrudeGeometry,
	Shape,
	TorusGeometry,
	Vector3,
} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	KitchenObject,
} from "./primitives.js";

export class KitchenOvenObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xaeb8bf) {
		super(
			"kitchen-oven",
			"Oven / microwave",
			"kitchenOvenControls",
			[
				choice("style", "OvenStyle", "oven", [
					{
						value: "oven",
						parameters: {width: 0.6, depth: 0.58, height: 0.6},
					},
					{
						value: "microwave",
						parameters: {width: 0.5, depth: 0.4, height: 0.3},
					},
				]),
				...dimensions(0.6, 0.58, 0.6),
				boolean("doorOpen", "DoorOpen", false),
				boolean("enabled", "ApplianceEnabled", false),
			],
			parameters,
			color,
			0.3,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(w, d, h) * 0.045,
			inner = this.accent(0x283139, 0.4, 0.3);
		for (const side of [-1, 1]) {
			this.addBox(
				"Oven Side",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
			);
			this.addBox(
				"Oven Board",
				[w - t * 2, t, d],
				[0, side < 0 ? t / 2 : h - t / 2, 0],
				material,
			);
		}
		this.addBox(
			"Oven Interior Back",
			[w - t * 2, h - t * 2, t],
			[0, h / 2, -d / 2 + t / 2],
			inner,
		);
		this.addBox(
			"Oven Tray",
			[w * 0.8, t * 0.35, d * 0.75],
			[0, h * 0.25, 0],
			inner,
		);
		this.ovenFront(
			0,
			h / 2,
			d / 2,
			w,
			h,
			material,
			Boolean(p.doorOpen),
			p.style === "microwave",
		);
		this.rounded(
			"Appliance Status",
			[w * 0.08, h * 0.022, t * 0.25],
			[
				p.style === "microwave" ? w * 0.39 : 0,
				h * (p.style === "microwave" ? 0.77 : 0.91),
				d / 2 + t * 1.3,
			],
			this.accent(
				p.enabled ? 0x83c598 : 0x374348,
				0.4,
				0,
				1,
				Boolean(p.enabled),
			),
		);
	}
}

export class KitchenHobObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x343b40) {
		super(
			"kitchen-hob",
			"Kitchen hob",
			"kitchenHobControls",
			[
				choice("style", "HobStyle", "induction-hob", [
					"induction-hob",
					"gas-hob",
				]),
				...dimensions(0.6, 0.52, 0.055),
				integer("burnerCount", "BurnerCount", 4, 1, 6),
				boolean("enabled", "ApplianceEnabled", false),
			],
			parameters,
			color,
			0.25,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			count = Number(p.burnerCount),
			gas = p.style === "gas-hob",
			metal = this.accent(0x777e83, 0.25, 0.75);
		this.rounded(
			"Hob Base",
			[w, h * 0.55, d],
			[0, h * 0.275, 0],
			material,
			0.012,
		);
		this.rounded(
			"Hob Glass",
			[w * 0.98, h * 0.15, d * 0.98],
			[0, h * 0.625, 0],
			this.accent(0x152026, 0.18, 0.15),
			0.009,
		);
		const cols = count === 1 ? 1 : count <= 4 ? 2 : 3,
			rows = Math.ceil(count / cols),
			cw = w / cols,
			cd = (d * 0.82) / rows;
		for (let i = 0; i < count; i++) {
			const x = ((i % cols) + 0.5) * cw - w / 2,
				z = (Math.floor(i / cols) + 0.5) * cd - d * 0.46,
				r = Math.min(cw, cd) * 0.3;
			if (gas) {
				this.cylinder(
					"Gas Burner",
					r * 0.62,
					r * 0.7,
					h * 0.18,
					[x, h * 0.8, z],
					metal,
				);
				for (const angle of [0, Math.PI / 2]) {
					const support = this.rounded(
						"Gas Pan Support",
						[r * 2.2, h * 0.2, r * 0.14],
						[x, h * 0.94, z],
						material,
						0.002,
					);
					support.rotation.y = angle;
				}
			}
			const ring = this.addGeometry(
				gas ? "Gas Flame Ring" : "Induction Ring",
				new TorusGeometry(r, Math.max(0.0004, r * 0.025), 8, 48),
				[x, h * (gas ? 0.95 : 0.72), z],
				this.accent(
					p.enabled ? (gas ? 0x6ba8ff : 0xd6603e) : 0x8a969c,
					0.3,
					0.15,
					1,
					Boolean(p.enabled),
				),
			);
			ring.rotation.x = Math.PI / 2;
		}
		for (let i = 0; i < count; i++) {
			const x = (i - (count - 1) / 2) * Math.min(w * 0.1, w / (count + 1));
			if (gas)
				this.cylinder(
					"Hob Control",
					Math.min(w, d) * 0.025,
					Math.min(w, d) * 0.025,
					h * 0.2,
					[x, h * 0.8, d * 0.41],
					metal,
				);
			else
				this.rounded(
					"Hob Touch Control",
					[w * 0.022, h * 0.02, d * 0.015],
					[x, h * 0.71, d * 0.41],
					this.accent(0x8d9ca1),
					0.001,
				);
		}
	}
}

export class KitchenHoodObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb6bfc5) {
		super(
			"kitchen-hood",
			"Extractor hood",
			"kitchenHoodControls",
			[
				choice("style", "HoodStyle", "chimney-hood", [
					"chimney-hood",
					"box-hood",
				]),
				...dimensions(0.8, 0.5, 0.7),
				boolean("enabled", "ApplianceEnabled", false),
				boolean("lightEnabled", "HoodLightEnabled", true),
			],
			parameters,
			color,
			0.28,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			canopy = h * 0.27;
		if (p.style === "chimney-hood") {
			const shape = new Shape();
			shape.moveTo(-w / 2, 0);
			shape.lineTo(w / 2, 0);
			shape.lineTo(w * 0.22, canopy);
			shape.lineTo(-w * 0.22, canopy);
			shape.closePath();
			const geometry = new ExtrudeGeometry(shape, {
				depth: d,
				bevelEnabled: false,
			});
			geometry.translate(0, 0, -d / 2);
			this.addGeometry("Hood Canopy", geometry, [0, 0, 0], material);
		} else
			this.rounded(
				"Hood Canopy",
				[w, canopy, d],
				[0, canopy / 2, 0],
				material,
				0.008,
			);
		this.rounded(
			"Hood Chimney",
			[w * 0.3, h - canopy, d * 0.55],
			[0, canopy + (h - canopy) / 2, -d * 0.12],
			material,
			0.004,
		);
		const filter = this.accent(0x4f595e, 0.5, 0.6);
		for (let i = 0; i < 12; i++)
			this.addBox(
				"Hood Filter Slat",
				[w * 0.65, 0.001, d * 0.018],
				[0, 0.001, (i / 11 - 0.5) * d * 0.72],
				filter,
			);
		for (const side of [-1, 1])
			this.cylinder(
				"Hood Lamp",
				w * 0.035,
				w * 0.035,
				0.004,
				[side * w * 0.37, 0.001, d * 0.25],
				this.accent(
					p.lightEnabled ? 0xffdda4 : 0x6c7477,
					0.4,
					0,
					1,
					Boolean(p.lightEnabled),
				),
			);
		this.rounded(
			"Hood Status",
			[w * 0.04, canopy * 0.06, 0.002],
			[w * 0.32, canopy * 0.3, d / 2 + 0.001],
			this.accent(
				p.enabled ? 0x8bc59a : 0x424e54,
				0.4,
				0,
				1,
				Boolean(p.enabled),
			),
		);
	}
}

export class KitchenCleaningApplianceObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xd6dcdf) {
		super(
			"kitchen-cleaning-appliance",
			"Dishwasher / washing machine",
			"kitchenCleaningControls",
			[
				choice("style", "CleaningStyle", "dishwasher", [
					"dishwasher",
					"washing-machine",
				]),
				...dimensions(0.6, 0.6, 0.85),
				boolean("doorOpen", "DoorOpen", false),
				boolean("enabled", "ApplianceEnabled", false),
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
			t = Math.min(w, d, h) * 0.04,
			dish = p.style === "dishwasher",
			dark = this.accent(0x344149, 0.4);
		this.rounded(
			"Cleaning Appliance Body",
			[w, h, d],
			[0, h / 2, 0],
			material,
			0.012,
		);
		this.rounded(
			"Cleaning Control Panel",
			[w * 0.96, h * 0.12, t],
			[0, h * 0.92, d / 2],
			material,
			0.005,
		);
		this.rounded(
			"Cleaning Display",
			[w * 0.25, h * 0.05, t * 0.4],
			[w * 0.16, h * 0.92, d / 2 + t * 0.6],
			this.accent(
				p.enabled ? 0x527d80 : 0x25383d,
				0.35,
				0,
				1,
				Boolean(p.enabled),
			),
		);
		this.cylinder(
			"Cleaning Dial",
			h * 0.032,
			h * 0.032,
			t,
			[-w * 0.28, h * 0.92, d / 2 + t * 0.6],
			dark,
		).rotation.x = Math.PI / 2;
		if (dish) {
			this.rounded(
				"Dishwasher Interior",
				[w * 0.86, h * 0.78, t],
				[0, h * 0.44, d / 2 + t * 0.2],
				dark,
				0.006,
			);
			if (p.doorOpen)
				for (let row = 0; row < 2; row++) {
					for (let i = 0; i < 8; i++)
						this.addBox(
							"Dishwasher Rack",
							[w * 0.7, t * 0.15, t * 0.15],
							[0, h * (0.25 + row * 0.35), d / 2 - t * 0.2 - i * d * 0.035],
							this.accent(0xa6adb1, 0.3, 0.7),
						);
				}
			const before = this.partsGroup.children.length;
			this.rounded(
				"Dishwasher Door",
				[w * 0.96, h * 0.8, t],
				[0, h * 0.44, d / 2 + t],
				material,
				0.006,
			);
			this.rounded(
				"Dishwasher Handle",
				[w * 0.6, h * 0.025, t],
				[0, h * 0.78, d / 2 + t * 2],
				dark,
				0.003,
			);
			this.hinge(
				"Dishwasher Hinge",
				this.partsGroup.children.slice(before),
				[0, h * 0.04, d / 2 + t],
				p.doorOpen ? Math.PI * 0.47 : 0,
				"x",
			);
		} else {
			const r = Math.min(w * 0.33, h * 0.3),
				y = h * 0.46;
			this.cylinder(
				"Washing Drum",
				r * 0.85,
				r * 0.85,
				t,
				[0, y, d / 2 + t * 0.3],
				dark,
				48,
			).rotation.x = Math.PI / 2;
			const before = this.partsGroup.children.length;
			this.addGeometry(
				"Washing Door Rim",
				new TorusGeometry(r, r * 0.12, 12, 64),
				[0, y, d / 2 + t],
				this.accent(0x8f9ca5, 0.2, 0.8),
			);
			const glass = this.addGeometry(
				"Washing Door Glass",
				new CylinderGeometry(r * 0.87, r * 0.87, t * 0.7, 48),
				[0, y, d / 2 + t],
				this.accent(0x8baebb, 0.18, 0.15, 0.4),
			);
			glass.rotation.x = Math.PI / 2;
			glass.castShadow = false;
			glass.receiveShadow = false;
			glass.userData.shadowSettingsInitialized = true;
			this.hinge(
				"Washing Door Hinge",
				this.partsGroup.children.slice(before),
				[-r, 0, d / 2 + t],
				p.doorOpen ? -Math.PI * 0.48 : 0,
			);
		}
	}
}

export class KitchenCoffeeMachineObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9ba7ae) {
		super(
			"kitchen-coffee-machine",
			"Coffee machine",
			"kitchenCoffeeControls",
			[
				choice("style", "CoffeeStyle", "espresso-machine", [
					"espresso-machine",
					"pod-machine",
				]),
				...dimensions(0.3, 0.35, 0.38),
				boolean("cupEnabled", "CupEnabled", true),
				boolean("enabled", "ApplianceEnabled", false),
			],
			parameters,
			color,
			0.3,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			dark = this.accent(0x29363d, 0.4);
		this.rounded(
			"Coffee Machine Body",
			[w, h, d * 0.65],
			[0, h / 2, -d * 0.175],
			material,
			0.025,
		);
		this.rounded(
			"Coffee Base",
			[w, h * 0.08, d],
			[0, h * 0.04, 0],
			material,
			0.012,
		);
		this.rounded(
			"Coffee Drip Tray",
			[w * 0.8, h * 0.035, d * 0.38],
			[0, h * 0.095, d * 0.27],
			dark,
			0.005,
		);
		this.rounded(
			"Coffee Control Panel",
			[w * 0.75, h * 0.17, d * 0.02],
			[0, h * 0.76, d * 0.16],
			dark,
			0.008,
		);
		this.rounded(
			"Coffee Status",
			[w * 0.12, h * 0.025, d * 0.015],
			[0, h * 0.77, d * 0.175],
			this.accent(
				p.enabled ? 0x90bd9d : 0x4a595d,
				0.4,
				0,
				1,
				Boolean(p.enabled),
			),
		);
		this.rounded(
			"Coffee Brew Head",
			[w * 0.4, h * 0.15, d * 0.25],
			[0, h * 0.51, d * 0.23],
			dark,
			0.006,
		);
		for (const side of p.style === "espresso-machine" ? [-1, 1] : [0])
			this.cylinder(
				"Coffee Spout",
				w * 0.022,
				w * 0.022,
				h * 0.09,
				[side * w * 0.08, h * 0.39, d * 0.28],
				material,
			);
		if (p.style === "espresso-machine") {
			this.pipe(
				"Steam Wand",
				new Vector3(w * 0.36, h * 0.57, d * 0.13),
				new Vector3(w * 0.36, h * 0.24, d * 0.3),
				w * 0.018,
				material,
			);
		}
		if (p.cupEnabled) {
			const r = w * 0.18,
				ch = h * 0.23;
			this.lathe(
				"Coffee Cup",
				[
					[0, 0],
					[r * 0.7, 0],
					[r, ch],
					[r * 0.87, ch],
					[r * 0.6, ch * 0.1],
					[0, ch * 0.1],
				],
				[0, h * 0.12, d * 0.28],
				this.accent(0xe8dfcd, 0.3),
			);
			this.addGeometry(
				"Coffee Cup Handle",
				new TorusGeometry(r * 0.5, r * 0.12, 8, 24),
				[r, h * 0.12 + ch * 0.55, d * 0.28],
				this.accent(0xe8dfcd, 0.3),
			);
		}
	}
}
