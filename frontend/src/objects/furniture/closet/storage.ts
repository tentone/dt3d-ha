import type {Mesh} from "three";
import {TorusGeometry} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	ClosetObject,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export class ClosetStorageObject extends ClosetObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xbca17c) {
		super(
			"closet-storage",
			"Closet storage / organizers",
			"closetStorageControls",
			[
				choice("style", "StorageStyle", "shoe-rack", [
					{
						value: "shoe-rack",
						parameters: {
							width: 0.9,
							depth: 0.35,
							height: 1,
							shelfCount: 4,
							shelfTilt: 12,
						},
					},
					{
						value: "drawer-unit",
						parameters: {
							width: 0.8,
							depth: 0.45,
							height: 0.85,
							drawerRows: 4,
						},
					},
					{
						value: "hanging-rail",
						parameters: {width: 1.2, depth: 0.45, height: 1.6},
					},
					{
						value: "shelving-unit",
						parameters: {width: 0.9, depth: 0.4, height: 1.8, shelfCount: 5},
					},
					{
						value: "accessories-organizer",
						parameters: {
							width: 0.6,
							depth: 0.4,
							height: 0.15,
							columns: 3,
							trayRows: 3,
						},
					},
				]),
				...dimensions(0.9, 0.35, 1),
				integer("shelfCount", "StorageShelves", 4, 1, 8),
				number("shelfTilt", "ShelfTilt", 12, 0, 25, 1),
				integer("drawerRows", "DrawerRows", 4, 1, 6),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				integer("columns", "TrayColumns", 3, 1, 6),
				integer("trayRows", "TrayRows", 3, 1, 6),
				integer("itemCount", "StorageItems", 3, 0, 6),
				boolean("contentsEnabled", "StorageContents", true),
				boolean("coverEnabled", "OrganizerCover", false),
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
			t = Math.min(0.022, w * 0.04, d * 0.07, h * 0.08),
			metal = this.accent(0x777d70, 0.3, 0.65);
		if (p.style === "hanging-rail") {
			this.rounded(
				"Closet Rail Base",
				[w, t, d],
				[0, t / 2, 0],
				material,
				0.006,
			);
			for (const side of [-1, 1])
				this.rail(
					"Closet Rail Upright",
					[side * w * 0.44, t, 0],
					[side * w * 0.44, h - t, 0],
					t * 0.6,
					metal,
				);
			this.rail(
				"Standalone Hanging Rail",
				[-w * 0.44, h - t, 0],
				[w * 0.44, h - t, 0],
				t * 0.6,
				metal,
			);
			if (p.contentsEnabled)
				this.hangingClothes(0, h - t, 0, w * 0.8, h * 0.4, Number(p.itemCount));
			return;
		}
		if (p.style === "accessories-organizer") {
			this.addBox("Organizer Tray Floor", [w, t, d], [0, t / 2, 0], material);
			for (const side of [-1, 1]) {
				this.addBox(
					"Organizer Tray Side",
					[t, h, d],
					[(side * (w - t)) / 2, h / 2, 0],
					material,
				);
				this.addBox(
					"Organizer Tray Side",
					[w - t * 2, h, t],
					[0, h / 2, (side * (d - t)) / 2],
					material,
				);
			}
			const cols = Number(p.columns),
				rows = Number(p.trayRows),
				cw = (w - t * (cols + 1)) / cols,
				cd = (d - t * (rows + 1)) / rows;
			for (let i = 1; i < cols; i++)
				this.addBox(
					"Organizer Divider",
					[t, h - t, d - t * 2],
					[-w / 2 + t / 2 + i * (cw + t), (h + t) / 2, 0],
					material,
				);
			for (let i = 1; i < rows; i++)
				this.addBox(
					"Organizer Divider",
					[w - t * 2, h - t, t],
					[0, (h + t) / 2, -d / 2 + t / 2 + i * (cd + t)],
					material,
				);
			for (let col = 0; col < cols; col++)
				for (let row = 0; row < rows; row++) {
					const x = -w / 2 + t + cw / 2 + col * (cw + t),
						z = -d / 2 + t + cd / 2 + row * (cd + t);
					this.addBox(
						"Organizer Lining",
						[cw, t * 0.2, cd],
						[x, t * 1.1, z],
						this.accent(0xa9b4a9, 0.98),
					);
					if (p.contentsEnabled) {
						const r = Math.min(cw, cd) * 0.22;
						this.addGeometry(
							"Organizer Ring",
							new TorusGeometry(r, r * 0.14, 8, 24),
							[x, t * 1.3 + r * 0.15, z],
							this.accent((col + row) % 2 ? 0xb6bfc1 : 0xb49a61, 0.2, 0.8),
						).rotation.x = Math.PI / 2;
					}
				}
			if (p.coverEnabled) {
				const glass = this.rounded(
					"Organizer Glass Cover",
					[w, t * 0.3, d],
					[0, h + t * 0.2, 0],
					this.accent(0xb7d1d6, 0.12, 0.1, 0.28),
					0.002,
				);
				initializeMeshShadowSettings(glass, {
					castShadow: false,
					receiveShadow: false,
				});
			}
			return;
		}
		for (const side of [-1, 1]) {
			this.addBox(
				"Closet Storage Side",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
			);
			if (p.style !== "shoe-rack")
				this.addBox(
					"Closet Storage Board",
					[w - t * 2, t, d],
					[0, side < 0 ? t / 2 : h - t / 2, 0],
					material,
				);
		}
		if (p.style === "drawer-unit") {
			this.addBox(
				"Closet Storage Back",
				[w - t * 2, h - t * 2, t],
				[0, h / 2, -d / 2 + t / 2],
				material,
			);
			const rows = Number(p.drawerRows),
				rh = (h - t * 2) / rows;
			for (let i = 0; i < rows; i++)
				this.drawer(
					"Closet Storage Drawer",
					0,
					t + rh * (i + 0.5),
					d / 2,
					w - t * 2,
					rh,
					d,
					t,
					Number(p.drawerOpen),
					material,
				);
			return;
		}
		const shoe = p.style === "shoe-rack",
			shelves = Number(p.shelfCount),
			cellH = (h - t) / (shelves + 0.4);
		for (let i = 0; i < shelves; i++) {
			const y = t / 2 + cellH * (i + 0.15),
				before = this.partsGroup.children.length;
			this.rounded(
				"Closet Storage Shelf",
				[w - t * 2, t, d - t * 2],
				[0, y, 0],
				material,
				0.004,
			);
			if (shoe)
				this.rounded(
					"Shoe Shelf Retainer",
					[w - t * 2, t * 1.3, t],
					[0, y + t, d * 0.43],
					metal,
					0.002,
				);
			if (p.contentsEnabled)
				for (let j = 0; j < Number(p.itemCount); j++) {
					const x = ((j + 0.5) / Number(p.itemCount) - 0.5) * (w - t * 3),
						itemW = Math.min(
							((w - t * 3) / (Number(p.itemCount) + 1)) * 0.4,
							d * 0.2,
						);
					if (shoe)
						for (const side of [-1, 1]) {
							this.ellipsoid(
								"Closet Shoe",
								[itemW * 0.42, Math.min(cellH * 0.2, itemW * 0.4), d * 0.3],
								[
									x + side * itemW * 0.53,
									y + t + Math.min(cellH * 0.18, itemW * 0.36),
									0,
								],
								this.accent(j % 2 ? 0x6b7168 : 0x938575, 0.85),
							);
							this.rounded(
								"Closet Shoe Sole",
								[itemW * 0.85, t * 0.2, d * 0.58],
								[x + side * itemW * 0.53, y + t * 0.65, 0],
								metal,
								0.004,
							);
						}
					else
						for (let layer = 0; layer < 3; layer++)
							this.rounded(
								"Closet Folded Clothing",
								[itemW * 1.8, Math.min(cellH * 0.11, d * 0.08), d * 0.65],
								[
									x,
									y + t + Math.min(cellH * 0.11, d * 0.08) * (layer + 0.5),
									0,
								],
								this.accent([0xc8bda9, 0xa4b8b2, 0xb6b1c5][layer], 0.98),
								0.006,
							);
				}
			if (shoe)
				this.hingeParts(
					"Shoe Shelf Tilt",
					this.partsGroup.children.slice(before),
					[0, y, 0],
					(Number(p.shelfTilt) * Math.PI) / 180,
					"x",
				);
		}
	}
}
