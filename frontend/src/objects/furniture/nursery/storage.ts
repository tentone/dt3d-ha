import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	NurseryObject,
	PLAY_COLORS,
} from "./primitives.js";

export class NurseryStorageObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb9a17e) {
		super(
			"nursery-storage",
			"Children's storage",
			"nurseryStorageControls",
			[
				choice("style", "StorageStyle", "childrens-wardrobe", [
					{
						value: "childrens-wardrobe",
						parameters: {
							width: 0.85,
							depth: 0.5,
							height: 1.45,
							columns: 2,
							shelfRows: 2,
						},
					},
					{
						value: "toy-chest",
						parameters: {width: 0.75, depth: 0.42, height: 0.5},
					},
					{
						value: "toy-storage-unit",
						parameters: {
							width: 1,
							depth: 0.35,
							height: 0.72,
							columns: 3,
							shelfRows: 2,
						},
					},
					{
						value: "bookshelf",
						parameters: {
							width: 0.75,
							depth: 0.3,
							height: 1.1,
							columns: 1,
							shelfRows: 3,
						},
					},
					{
						value: "chest-of-drawers",
						parameters: {
							width: 0.8,
							depth: 0.42,
							height: 0.8,
							columns: 2,
							drawerRows: 3,
						},
					},
				]),
				...dimensions(0.85, 0.5, 1.45),
				integer("columns", "Columns", 2, 1, 4),
				integer("shelfRows", "ShelfRows", 2, 1, 5),
				integer("drawerRows", "DrawerRows", 3, 1, 6),
				boolean("lidOpen", "ChestLidOpen", false),
				boolean("doorsOpen", "WardrobeOpen", false),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
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
			t = Math.min(0.022, w * 0.05, d * 0.07, h * 0.05),
			chest = p.style === "toy-chest",
			cols = Number(p.columns),
			rows = Number(p.shelfRows),
			metal = this.accent(0x6f776e, 0.35, 0.5);
		this.rounded(
			"Nursery Storage Floor",
			[w, t, d],
			[0, t / 2, 0],
			material,
			0.006,
		);
		for (const side of [-1, 1])
			this.addBox(
				"Nursery Storage Side",
				[t, h - t, d],
				[(side * (w - t)) / 2, (h - t) / 2, 0],
				material,
			);
		this.addBox(
			"Nursery Storage Back",
			[w - t * 2, h - t, t],
			[0, (h - t) / 2, -d / 2 + t / 2],
			material,
		);
		if (chest) {
			this.rounded(
				"Toy Chest Front",
				[w - t * 2, h - t, t],
				[0, (h - t) / 2, d / 2 - t / 2],
				material,
				0.006,
			);
			const before = this.partsGroup.children.length;
			this.plate(
				"Toy Chest Lid",
				[w, t, d],
				[0, h - t / 2, 0],
				material,
				Math.min(w, d) * 0.07,
			);
			this.hingeParts(
				"Toy Chest Lid Hinge",
				this.partsGroup.children.slice(before),
				[0, h - t, -d / 2],
				p.lidOpen ? -Math.PI * 0.45 : 0,
				"x",
			);
			if (p.contentsEnabled && p.lidOpen)
				for (let i = 0; i < 4; i++)
					this.rounded(
						"Toy Block",
						[w * 0.14, h * 0.2, d * 0.23],
						[
							((i % 2) - 0.5) * w * 0.35,
							h * 0.18,
							(Math.floor(i / 2) - 0.5) * d * 0.35,
						],
						this.accent(PLAY_COLORS[i]),
						0.008,
					);
			return;
		}
		this.rounded(
			"Nursery Storage Top",
			[w, t, d],
			[0, h - t / 2, 0],
			material,
			0.006,
		);
		if (p.style === "chest-of-drawers") {
			const dr = Number(p.drawerRows),
				cw = (w - t * 2) / cols,
				rh = (h - t * 2) / dr;
			for (let col = 0; col < cols; col++)
				for (let row = 0; row < dr; row++) {
					const x = -w / 2 + t + cw * (col + 0.5),
						y = t + rh * (row + 0.5),
						z = d / 2 + Number(p.drawerOpen) * d * 0.65;
					this.rounded(
						"Child Drawer Front",
						[cw * 0.97, rh * 0.95, t],
						[x, y, z],
						material,
						0.004,
					);
					this.rounded(
						"Child Drawer Handle",
						[cw * 0.25, t * 0.6, t],
						[x, y, z + t],
						metal,
						0.003,
					);
					if (Number(p.drawerOpen) > 0)
						this.addBox(
							"Child Drawer Bottom",
							[cw * 0.9, t * 0.5, d * 0.7],
							[x, y - rh * 0.35, z - d * 0.35],
							material,
						);
				}
			return;
		}
		const wardrobe = p.style === "childrens-wardrobe",
			cw = (w - t * (cols + 1)) / cols,
			rh = (h - t * 2) / rows;
		for (let col = 1; col < cols; col++)
			this.addBox(
				"Nursery Storage Divider",
				[t, h - t * 2, d - t * 2],
				[-w / 2 + t / 2 + col * (cw + t), h / 2, 0],
				material,
			);
		for (let row = 1; row < rows; row++)
			this.addBox(
				"Nursery Storage Shelf",
				[w - t * 2, t, d - t * 2],
				[0, t + rh * row, 0],
				material,
			);
		if (wardrobe) {
			for (let col = 0; col < cols; col++) {
				const x = -w / 2 + t + cw / 2 + col * (cw + t),
					before = this.partsGroup.children.length;
				this.rounded(
					"Child Wardrobe Door",
					[cw * 0.99, h - t * 1.2, t],
					[x, h / 2, d / 2],
					material,
					0.005,
				);
				this.rounded(
					"Child Wardrobe Handle",
					[t * 0.7, h * 0.09, t],
					[x + (col % 2 ? -0.3 : 0.3) * cw, h * 0.48, d / 2 + t],
					metal,
					0.003,
				);
				this.hingeParts(
					"Child Wardrobe Hinge",
					this.partsGroup.children.slice(before),
					[x + ((col % 2 ? 1 : -1) * cw) / 2, 0, d / 2],
					p.doorsOpen ? (col % 2 ? 1 : -1) * Math.PI * 0.5 : 0,
				);
			}
		} else if (p.contentsEnabled) {
			for (let col = 0; col < cols; col++)
				for (let row = 0; row < rows; row++) {
					const x = -w / 2 + t + cw / 2 + col * (cw + t),
						y = t + rh * row;
					if (p.style === "toy-storage-unit") {
						this.rounded(
							"Toy Storage Bin",
							[cw * 0.85, rh * 0.65, d * 0.8],
							[x, y + rh * 0.34, d * 0.025],
							this.accent(PLAY_COLORS[(col + row) % PLAY_COLORS.length]),
							0.018,
						);
						this.rounded(
							"Toy Bin Handle",
							[cw * 0.25, rh * 0.07, t * 0.5],
							[x, y + rh * 0.48, d * 0.44],
							metal,
							0.005,
						);
					} else
						for (let i = 0; i < 5; i++)
							this.rounded(
								"Children's Book",
								[cw * 0.1, rh * (0.5 + (i % 3) * 0.09), d * 0.65],
								[
									x + (i - 2) * cw * 0.15,
									y + rh * (0.25 + (i % 3) * 0.045) + t,
									0,
								],
								this.accent(PLAY_COLORS[(i + row) % PLAY_COLORS.length]),
								0.003,
							);
				}
		}
	}
}
