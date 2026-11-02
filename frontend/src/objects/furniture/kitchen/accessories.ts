import type {Mesh} from "three";
import {Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	KitchenObject,
} from "./primitives.js";

export class KitchenTrolleyObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb09163) {
		super(
			"kitchen-trolley",
			"Kitchen trolley",
			"kitchenTrolleyControls",
			[
				...dimensions(0.75, 0.45, 0.88),
				integer("shelfCount", "TrolleyShelves", 2, 1, 4),
				boolean("handleEnabled", "HandleEnabled", true),
				boolean("wheelsEnabled", "WheelsEnabled", true),
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
			t = Math.min(w, d, h) * 0.05,
			r = Math.min(w, d, h) * 0.07,
			base = p.wheelsEnabled ? r * 2 : 0,
			metal = this.accent(0x5e676d, 0.3, 0.65);
		this.plate(
			"Trolley Worktop",
			[w, t, d],
			[0, h - t / 2, 0],
			material,
			Math.min(w, d) * 0.08,
		);
		for (const x of [-1, 1])
			for (const z of [-1, 1]) {
				this.cylinder(
					"Trolley Post",
					t * 0.4,
					t * 0.4,
					h - base,
					[x * w * 0.42, base + (h - base) / 2, z * d * 0.38],
					metal,
				);
				if (p.wheelsEnabled) {
					this.cylinder(
						"Trolley Wheel",
						r,
						r,
						t * 1.1,
						[x * w * 0.42, r, z * d * 0.38],
						this.accent(0x343d43),
						24,
					).rotation.z = Math.PI / 2;
					this.rounded(
						"Caster Mount",
						[t, t * 1.5, t],
						[x * w * 0.42, r * 1.6, z * d * 0.38],
						metal,
						0.003,
					);
				}
			}
		const shelves = Number(p.shelfCount);
		for (let i = 0; i < shelves; i++)
			this.rounded(
				"Trolley Shelf",
				[w * 0.9, t * 0.65, d * 0.88],
				[0, base + (h - base) * (0.1 + (0.65 * i) / shelves), 0],
				material,
				0.004,
			);
		if (p.handleEnabled) {
			for (const side of [-1, 1])
				this.pipe(
					"Trolley Handle Support",
					new Vector3(w * 0.42, h * 0.85, side * d * 0.3),
					new Vector3(w * 0.58, h * 0.85, side * d * 0.3),
					t * 0.35,
					metal,
				);
			this.pipe(
				"Trolley Handle",
				new Vector3(w * 0.58, h * 0.85, -d * 0.3),
				new Vector3(w * 0.58, h * 0.85, d * 0.3),
				t * 0.35,
				metal,
			);
		}
	}
}

export class KitchenAccessoriesObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb49a72) {
		super(
			"kitchen-accessories",
			"Kitchen racks / shelves",
			"kitchenAccessoriesControls",
			[
				choice("style", "AccessoryStyle", "dish-rack", [
					{
						value: "dish-rack",
						parameters: {
							width: 0.45,
							depth: 0.32,
							height: 0.2,
							shelfCount: 1,
							itemCount: 6,
						},
					},
					{
						value: "spice-rack",
						parameters: {
							width: 0.4,
							depth: 0.16,
							height: 0.35,
							shelfCount: 2,
							itemCount: 4,
						},
					},
					{
						value: "kitchen-shelves",
						parameters: {
							width: 0.9,
							depth: 0.25,
							height: 0.6,
							shelfCount: 2,
							itemCount: 4,
						},
					},
				]),
				...dimensions(0.45, 0.32, 0.2),
				integer("shelfCount", "ShelfCount", 1, 1, 5),
				integer("itemCount", "RackItems", 6, 1, 12),
				boolean("contentsEnabled", "ContentsEnabled", true),
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
			t = Math.min(w, d, h) * 0.045,
			rows = Number(p.shelfCount),
			items = Number(p.itemCount),
			metal = this.accent(0x9aa8b1, 0.25, 0.8);
		if (p.style === "dish-rack") {
			this.plate(
				"Dish Rack Tray",
				[w, t, d],
				[0, t / 2, 0],
				material,
				Math.min(w, d) * 0.08,
			);
			for (const side of [-1, 1])
				this.pipe(
					"Dish Rack Rail",
					new Vector3(-w * 0.45, h * 0.55, side * d * 0.4),
					new Vector3(w * 0.45, h * 0.55, side * d * 0.4),
					t * 0.3,
					metal,
				);
			for (let i = 0; i <= items; i++) {
				const x = (i / items - 0.5) * w * 0.85;
				for (const side of [-1, 1])
					this.pipe(
						"Dish Rack Divider",
						new Vector3(x, t, side * d * 0.35),
						new Vector3(x, h * 0.65, side * d * 0.18),
						t * 0.25,
						metal,
					);
			}
			if (p.contentsEnabled)
				for (let i = 0; i < items; i++) {
					const r = Math.min(h * 0.4, d * 0.36),
						x = ((i + 0.5) / items - 0.5) * w * 0.85;
					this.cylinder(
						"Dish Rack Plate",
						r,
						r * 0.91,
						Math.min(t * 0.55, (w / (items + 1)) * 0.3),
						[x, r + t, 0],
						this.accent(0xe4e3d8, 0.3),
						40,
					).rotation.z = Math.PI / 2;
				}
		} else {
			for (let row = 0; row < rows; row++) {
				const y = t / 2 + (row * h) / rows;
				this.rounded(
					"Kitchen Rack Shelf",
					[w, t, d],
					[0, y, 0],
					material,
					0.003,
				);
				for (const side of [-1, 1])
					this.rounded(
						"Kitchen Shelf Bracket",
						[t, (h / (rows + 1)) * 0.3, d * 0.7],
						[side * w * 0.37, y - (h / (rows + 1)) * 0.12, -d * 0.1],
						metal,
						0.002,
					);
				if (p.style === "spice-rack") {
					this.pipe(
						"Spice Rack Rail",
						new Vector3(-w * 0.46, y + (h / rows) * 0.28, d * 0.4),
						new Vector3(w * 0.46, y + (h / rows) * 0.28, d * 0.4),
						t * 0.3,
						metal,
					);
					if (p.contentsEnabled)
						for (let i = 0; i < items; i++) {
							const r = Math.min(
									(w / (items + 1)) * 0.35,
									d * 0.3,
									(h / rows) * 0.2,
								),
								jh = Math.min((h / rows) * 0.65, r * 3),
								x = ((i + 0.5) / items - 0.5) * w * 0.85;
							this.cylinder(
								"Spice Jar",
								r,
								r,
								jh,
								[x, y + t / 2 + jh / 2, 0],
								this.accent([0x9d7048, 0x78834d, 0xac6845][i % 3], 0.5),
								24,
							);
							this.cylinder(
								"Spice Jar Lid",
								r * 1.05,
								r * 1.05,
								jh * 0.1,
								[x, y + t / 2 + jh * 1.05, 0],
								metal,
								24,
							);
						}
				}
			}
		}
	}
}
