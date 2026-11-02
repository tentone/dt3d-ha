import type {Mesh} from "three";
import {TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GarageObject,
	integer,
	number,
} from "./primitives.js";

export class GarageStorageObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x75818a) {
		super(
			"garage-storage",
			"Garage storage / racks",
			"garageStorageControls",
			[
				choice("style", "StorageStyle", "garage-shelving", [
					{
						value: "garage-shelving",
						parameters: {width: 1.2, depth: 0.5, height: 1.8, shelfCount: 4},
					},
					{
						value: "tool-cabinet",
						parameters: {
							width: 0.9,
							depth: 0.5,
							height: 1,
							drawerRows: 5,
							casters: true,
						},
					},
					{
						value: "wall-storage-rack",
						parameters: {width: 1.2, depth: 0.25, height: 0.8, shelfCount: 2},
					},
					{
						value: "bike-rack",
						parameters: {width: 1.2, depth: 0.55, height: 0.45, slotCount: 3},
					},
					{
						value: "tire-rack",
						parameters: {
							width: 1.4,
							depth: 0.55,
							height: 1.5,
							shelfCount: 2,
							slotCount: 3,
						},
					},
				]),
				...dimensions(1.2, 0.5, 1.8),
				integer("shelfCount", "StorageShelves", 4, 1, 7),
				integer("drawerRows", "StorageDrawers", 5, 1, 8),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				integer("slotCount", "RackSlots", 3, 1, 6),
				boolean("contentsEnabled", "StorageContents", true),
				boolean("casters", "CabinetCasters", true),
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
			t = Math.min(0.035, w * 0.04, d * 0.09, h * 0.06),
			metal = this.accent(0xaab0ad, 0.4, 0.6),
			dark = this.accent(0x343b40, 0.8),
			shelves = Number(p.shelfCount),
			slots = Number(p.slotCount);
		if (p.style === "bike-rack") {
			for (const z of [-1, 1])
				this.rounded(
					"Bike Rack Base",
					[w, t, d * 0.06],
					[0, t / 2, z * d * 0.4],
					material,
					0.006,
				);
			for (let i = 0; i < slots; i++)
				for (const side of [-1, 1]) {
					const x =
						((i + 0.5) / slots - 0.5) * w * 0.87 + ((side * w) / slots) * 0.12;
					this.rail(
						"Bike Rack Cradle",
						[x, t, -d * 0.4],
						[x, h, -d * 0.15],
						t * 0.45,
						material,
					);
					this.rail(
						"Bike Rack Cradle",
						[x, h, -d * 0.15],
						[x, h, d * 0.15],
						t * 0.45,
						material,
					);
					this.rail(
						"Bike Rack Cradle",
						[x, h, d * 0.15],
						[x, t, d * 0.4],
						t * 0.45,
						material,
					);
				}
			return;
		}
		if (p.style === "wall-storage-rack") {
			for (const x of [-1, 1])
				this.rounded(
					"Wall Rack Upright",
					[t, h, t],
					[x * w * 0.4, h / 2, -d / 2 + t / 2],
					material,
					0.004,
				);
			for (let i = 0; i < shelves; i++) {
				const y = (h * (i + 1)) / (shelves + 1);
				this.rounded("Wall Rack Shelf", [w, t, d], [0, y, 0], metal, 0.003);
				for (const x of [-1, 1])
					this.rail(
						"Wall Rack Brace",
						[x * w * 0.4, y - (h / (shelves + 1)) * 0.4, -d * 0.45],
						[x * w * 0.4, y, d * 0.4],
						t * 0.25,
						material,
					);
			}
			for (let i = 0; i < slots; i++) {
				const x = ((i + 0.5) / slots - 0.5) * w * 0.8;
				this.rail(
					"Wall Rack Hook",
					[x, h * 0.93, -d * 0.4],
					[x, h * 0.93, d * 0.25],
					t * 0.3,
					material,
				);
				this.rail(
					"Wall Rack Hook",
					[x, h * 0.93, d * 0.25],
					[x, h * 0.98, d * 0.25],
					t * 0.3,
					material,
				);
			}
			return;
		}
		if (p.style === "tool-cabinet") {
			const r = p.casters ? Math.min(w, d, h) * 0.065 : 0,
				b = r * 2,
				bodyH = h - b;
			for (const s of [-1, 1]) {
				this.addBox(
					"Tool Cabinet Side",
					[t, bodyH, d],
					[(s * (w - t)) / 2, b + bodyH / 2, 0],
					material,
				);
				this.addBox(
					"Tool Cabinet Board",
					[w - t * 2, t, d],
					[0, s < 0 ? b + t / 2 : h - t / 2, 0],
					material,
				);
			}
			this.addBox(
				"Tool Cabinet Back",
				[w - t * 2, bodyH - t * 2, t],
				[0, b + bodyH / 2, -d / 2 + t / 2],
				material,
			);
			const rows = Number(p.drawerRows),
				dh = (bodyH - t * 2) / rows;
			for (let i = 0; i < rows; i++)
				this.drawer(
					"Tool Cabinet Drawer",
					0,
					b + t + dh * (i + 0.5),
					d / 2,
					w - t * 2,
					dh,
					d,
					t,
					Number(p.drawerOpen),
					material,
				);
			if (r)
				for (const x of [-1, 1])
					for (const z of [-1, 1])
						this.wheel(
							"Tool Cabinet Caster",
							[x * w * 0.39, r, z * d * 0.35],
							r,
							t * 1.4,
						);
			return;
		}
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rounded(
					"Garage Rack Post",
					[t, h, t],
					[(x * (w - t)) / 2, h / 2, (z * (d - t)) / 2],
					material,
					0.004,
				);
		const tire = p.style === "tire-rack",
			r = Math.min(d * 0.44, (h / (shelves + 0.3)) * 0.43),
			supportZ = Math.min(d * 0.3, r * 0.7),
			first = tire ? Math.min(h * 0.1, r * 0.5) : t / 2;
		for (let i = 0; i < shelves; i++) {
			const y =
				first +
				(i / (shelves === 1 ? 1 : shelves - 1)) *
					(h - (tire ? h / (shelves + 0.3) : t / 2) - first);
			if (tire) {
				for (const z of [-1, 1])
					this.rounded(
						"Tire Rack Rail",
						[w, t, t],
						[0, y, z * supportZ],
						material,
						0.003,
					);
				if (p.contentsEnabled)
					for (let j = 0; j < slots; j++) {
						const mesh = this.addGeometry(
							"Stored Tire",
							new TorusGeometry(r * 0.8, r * 0.2, 10, 32),
							[
								((j + 0.5) / slots - 0.5) * w * 0.88,
								y + t / 2 + Math.sqrt(r * r - supportZ * supportZ),
								0,
							],
							dark,
						);
						mesh.rotation.y = Math.PI / 2;
						mesh.scale.z = Math.min(((w / slots) * 0.6) / (r * 0.4), 2);
					}
			} else {
				this.rounded(
					"Garage Storage Shelf",
					[w - t * 2, t, d - t * 2],
					[0, y, 0],
					metal,
					0.003,
				);
				if (p.contentsEnabled && i < shelves - 1)
					for (const x of [-1, 1]) {
						const bh = (h / (shelves + 1)) * 0.45;
						this.rounded(
							"Garage Stored Box",
							[w * 0.32, bh, d * 0.7],
							[x * w * 0.23, y + t / 2 + bh / 2, 0],
							this.accent(0xa9a69a, 0.85),
							0.015,
						);
					}
			}
		}
	}
}
