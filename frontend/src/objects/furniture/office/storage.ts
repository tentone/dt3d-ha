import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	OfficeObject,
} from "./primitives.js";

export class OfficeStorageObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb2b5b0) {
		super(
			"office-storage",
			"Office storage",
			"officeStorageControls",
			[
				choice("style", "StorageStyle", "filing-cabinet", [
					{
						value: "filing-cabinet",
						parameters: {
							width: 0.45,
							depth: 0.6,
							height: 1.05,
							columns: 1,
							drawerRows: 3,
							casters: false,
						},
					},
					{
						value: "bookshelf",
						parameters: {
							width: 0.9,
							depth: 0.3,
							height: 1.8,
							columns: 2,
							shelfCount: 5,
							casters: false,
						},
					},
					{
						value: "drawer-unit",
						parameters: {
							width: 0.42,
							depth: 0.5,
							height: 0.64,
							columns: 1,
							drawerRows: 3,
							casters: true,
						},
					},
					{
						value: "storage-cabinet",
						parameters: {
							width: 0.9,
							depth: 0.4,
							height: 1.2,
							columns: 2,
							shelfCount: 3,
							casters: false,
						},
					},
					{
						value: "wall-shelving",
						parameters: {
							width: 1.2,
							depth: 0.26,
							height: 0.7,
							columns: 1,
							shelfCount: 3,
							casters: false,
						},
					},
				]),
				...dimensions(0.45, 0.6, 1.05),
				integer("columns", "StorageColumns", 1, 1, 4),
				integer("drawerRows", "DrawerRows", 3, 1, 6),
				integer("shelfCount", "ShelfCount", 3, 1, 7),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("doorsOpen", "StorageDoorsOpen", false),
				boolean("contentsEnabled", "ContentsEnabled", true),
				boolean("casters", "StorageCasters", false),
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
			t = Math.min(0.022, w * 0.05, d * 0.08, h * 0.05),
			metal = this.accent(0x515e64, 0.35, 0.6),
			shelves = Number(p.shelfCount),
			cols = Number(p.columns);
		if (p.style === "wall-shelving") {
			for (let i = 0; i < shelves; i++) {
				const y = t / 2 + (shelves === 1 ? 0 : i / (shelves - 1)) * (h - t);
				this.plate(
					"Office Wall Shelf",
					[w, t, d],
					[0, y, 0],
					material,
					Math.min(w, d) * 0.04,
				);
				for (const side of [-1, 1])
					this.rounded(
						"Office Shelf Bracket",
						[t, (h / (shelves + 1)) * 0.35, d * 0.7],
						[side * w * 0.36, y - (h / (shelves + 1)) * 0.14, -d * 0.12],
						metal,
						0.003,
					);
			}
			return;
		}
		const wheel = p.casters ? Math.min(w, d, h) * 0.045 : 0,
			base = wheel * 2,
			bh = h - base;
		for (const side of [-1, 1]) {
			this.addBox(
				"Office Storage Side",
				[t, bh, d],
				[(side * (w - t)) / 2, base + bh / 2, 0],
				material,
			);
			this.addBox(
				"Office Storage Board",
				[w - t * 2, t, d],
				[0, side < 0 ? base + t / 2 : h - t / 2, 0],
				material,
			);
		}
		this.addBox(
			"Office Storage Back",
			[w - t * 2, bh - t * 2, t],
			[0, base + bh / 2, -d / 2 + t / 2],
			material,
		);
		if (wheel)
			for (const x of [-1, 1])
				for (const z of [-1, 1])
					this.cylinder(
						"Storage Caster",
						wheel,
						wheel,
						wheel * 0.7,
						[x * w * 0.4, wheel, z * d * 0.37],
						metal,
						20,
					).rotation.x = Math.PI / 2;
		const cw = (w - t * (cols + 1)) / cols,
			filing = p.style === "filing-cabinet" || p.style === "drawer-unit";
		for (let col = 1; col < cols; col++)
			this.addBox(
				"Office Storage Divider",
				[t, bh - t * 2, d - t * 2],
				[-w / 2 + t / 2 + col * (cw + t), base + bh / 2, 0],
				material,
			);
		if (filing) {
			const rows = Number(p.drawerRows),
				rh = (bh - t * 2) / rows;
			for (let col = 0; col < cols; col++)
				for (let row = 0; row < rows; row++) {
					const x = -w / 2 + t + cw * (col + 0.5) + t * col,
						y = base + t + rh * (row + 0.5),
						z = d / 2 + Number(p.drawerOpen) * d * 0.65;
					this.rounded(
						"Office Drawer Front",
						[cw * 0.98, rh * 0.96, t],
						[x, y, z],
						material,
						0.004,
					);
					this.rounded(
						"Office Drawer Handle",
						[cw * 0.35, t * 0.6, t],
						[x, y + rh * 0.17, z + t],
						metal,
						0.003,
					);
					if (p.style === "filing-cabinet") {
						this.rounded(
							"Filing Label Frame",
							[cw * 0.36, rh * 0.14, t * 0.3],
							[x, y - rh * 0.15, z + t * 0.7],
							metal,
							0.002,
						);
						this.addBox(
							"Filing Label",
							[cw * 0.29, rh * 0.09, t * 0.1],
							[x, y - rh * 0.15, z + t * 0.92],
							this.accent(0xe0ded1),
						);
					}
					if (Number(p.drawerOpen) > 0) {
						this.addBox(
							"Office Drawer Bottom",
							[cw * 0.92, t * 0.4, d * 0.7],
							[x, y - rh * 0.35, z - d * 0.35],
							material,
						);
						for (const side of [-1, 1])
							this.addBox(
								"Office Drawer Side",
								[t * 0.5, rh * 0.65, d * 0.7],
								[x + side * cw * 0.46, y - rh * 0.025, z - d * 0.35],
								material,
							);
					}
				}
			return;
		}
		for (let i = 1; i <= shelves; i++)
			this.addBox(
				"Office Interior Shelf",
				[w - t * 2, Math.min(t, (bh / (shelves + 1)) * 0.3), d - t * 2],
				[0, base + t + ((bh - t * 2) * i) / (shelves + 1), 0],
				material,
			);
		for (let col = 0; col < cols; col++) {
			const x = -w / 2 + t + cw / 2 + col * (cw + t);
			if (p.style === "storage-cabinet") {
				const before = this.partsGroup.children.length;
				this.rounded(
					"Office Cabinet Door",
					[cw * 0.99, bh - t, t],
					[x, base + bh / 2, d / 2],
					material,
					0.004,
				);
				this.rounded(
					"Office Cabinet Handle",
					[t * 0.5, bh * 0.12, t],
					[x + (col % 2 ? -0.3 : 0.3) * cw, base + bh * 0.55, d / 2 + t],
					metal,
					0.003,
				);
				this.hingeParts(
					"Office Cabinet Hinge",
					this.partsGroup.children.slice(before),
					[x + ((col % 2 ? 1 : -1) * cw) / 2, 0, d / 2],
					p.doorsOpen ? (col % 2 ? 1 : -1) * Math.PI * 0.52 : 0,
				);
			}
			if (p.contentsEnabled)
				for (let row = 0; row <= shelves; row++) {
					const cellH = (bh - t * 2) / (shelves + 1),
						y = base + t + cellH * row + t * 0.5;
					for (let i = 0; i < 4; i++) {
						const bw = cw * 0.14,
							bh = cellH * (0.65 + (i % 2) * 0.08),
							bx = x + (i - 1.5) * cw * 0.19;
						this.rounded(
							"Office Binder",
							[bw, bh, d * 0.7],
							[bx, y + bh / 2, 0],
							this.accent([0x536c7a, 0x8b9c89, 0xb2a37e, 0x8797aa][i]),
							0.003,
						);
						this.cylinder(
							"Binder Finger Hole",
							bw * 0.12,
							bw * 0.12,
							t * 0.2,
							[bx, y + bh * 0.22, d * 0.36],
							metal,
							12,
						).rotation.x = Math.PI / 2;
					}
				}
		}
	}
}
