import type {Mesh} from "three";
import {Group} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	DiningObject,
	integer,
	number,
} from "./primitives.js";

export class DiningStorageObject extends DiningObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x94704b) {
		super(
			"dining-storage",
			"Dining room storage",
			"diningStorageControls",
			[
				choice("style", "StorageStyle", "sideboard", [
					{
						value: "sideboard",
						parameters: {
							width: 1.6,
							depth: 0.45,
							height: 0.85,
							columns: 3,
							shelfCount: 1,
							drawerCount: 0,
							legHeight: 0.14,
							doorsOpen: false,
						},
					},
					{
						value: "buffet-cabinet",
						parameters: {
							width: 1.7,
							depth: 0.48,
							height: 0.95,
							columns: 3,
							shelfCount: 1,
							drawerCount: 2,
							legHeight: 0.1,
							doorsOpen: false,
						},
					},
					{
						value: "china-cabinet",
						parameters: {
							width: 1.15,
							depth: 0.42,
							height: 1.9,
							columns: 2,
							shelfCount: 3,
							drawerCount: 0,
							legHeight: 0.09,
							doorsOpen: false,
						},
					},
					{
						value: "display-cabinet",
						parameters: {
							width: 0.95,
							depth: 0.4,
							height: 1.8,
							columns: 2,
							shelfCount: 4,
							drawerCount: 0,
							legHeight: 0.09,
							doorsOpen: false,
						},
					},
					{
						value: "drinks-cabinet",
						parameters: {
							width: 1,
							depth: 0.45,
							height: 1.25,
							columns: 2,
							shelfCount: 2,
							drawerCount: 0,
							legHeight: 0.16,
							doorsOpen: true,
						},
					},
					{
						value: "wine-rack",
						parameters: {
							width: 0.72,
							depth: 0.34,
							height: 0.95,
							columns: 4,
							shelfCount: 4,
							drawerCount: 0,
							legHeight: 0.06,
							doorsOpen: false,
						},
					},
				]),
				...dimensions(1.6, 0.45, 0.85),
				integer("columns", "Columns", 3, 1, 6),
				integer("shelfCount", "ShelfCount", 1, 0, 7),
				integer("drawerCount", "DrawerCount", 0, 0, 4),
				number("boardThickness", "BoardThickness", 0.022, 0.01, 0.08),
				number("legHeight", "LegHeight", 0.14, 0, 0.4),
				number("glassOpacity", "GlassOpacity", 0.2, 0.08, 0.8),
				boolean("doorsOpen", "DoorsOpen", false),
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
			h = Number(p.height);
		const t = Math.min(Number(p.boardThickness), w * 0.06, d * 0.12, h * 0.05),
			leg = Math.min(Number(p.legHeight), h * 0.25),
			bodyH = h - leg;
		const columns = Number(p.columns),
			shelves = Number(p.shelfCount),
			wine = p.style === "wine-rack",
			china = p.style === "china-cabinet",
			display = p.style === "display-cabinet";
		const innerH = bodyH - t * 2,
			cellW = (w - t * (columns + 1)) / columns;
		const drawers = wine || china || display ? 0 : Number(p.drawerCount),
			drawerH = drawers ? (innerH * 0.26) / drawers : 0;
		const usableH = innerH - drawerH * drawers,
			floor = leg + t;
		for (const side of [-1, 1]) {
			this.rounded(
				"Cabinet Side",
				[t, bodyH, d],
				[(side * (w - t)) / 2, leg + bodyH / 2, 0],
				material,
				0.003,
			);
			this.rounded(
				"Cabinet Horizontal",
				[w - t * 2, t, d],
				[0, side < 0 ? leg + t / 2 : h - t / 2, 0],
				material,
				0.003,
			);
		}
		this.addBox(
			"Cabinet Back",
			[w - t * 2, bodyH - t * 2, t * 0.6],
			[0, leg + bodyH / 2, -d / 2 + t * 0.3],
			material,
		);
		for (let col = 1; col < columns; col++)
			this.addBox(
				"Cabinet Divider",
				[t, innerH, d - t * 2],
				[-w / 2 + t / 2 + col * (cellW + t), floor + innerH / 2, 0],
				material,
			);
		const shelfBottom = floor + (china ? usableH * 0.34 : 0),
			shelfH = china ? usableH * 0.66 : usableH;
		if (china)
			this.addBox(
				"China Cabinet Divider",
				[w - t * 2, t, d - t],
				[0, shelfBottom, 0],
				material,
			);
		for (let row = 1; row <= shelves; row++)
			this.addBox(
				"Dining Storage Shelf",
				[w - t * 2, t, d - t * 2],
				[0, shelfBottom + (shelfH * row) / (shelves + 1), 0],
				material,
			);
		if (drawers)
			this.addBox(
				"Drawer Divider",
				[w - t * 2, t, d - t],
				[0, floor + usableH, 0],
				material,
			);
		const metal = this.accent(0x3f4143, 0.35, 0.65);
		for (let col = 0; col < columns; col++) {
			const x = -w / 2 + t + cellW / 2 + col * (cellW + t);
			for (let row = 0; row < drawers; row++) {
				const y = floor + usableH + drawerH * (row + 0.5);
				this.rounded(
					"Buffet Drawer",
					[cellW * 0.98, drawerH * 0.95, t],
					[x, y, d / 2],
					material,
					0.004,
				);
				this.rounded(
					"Drawer Handle",
					[Math.min(0.12, cellW * 0.4), Math.min(0.012, drawerH * 0.1), t],
					[x, y, d / 2 + t],
					metal,
					0.003,
				);
			}
			if (!wine) {
				const before = this.partsGroup.children.length,
					doorW = cellW * 0.98,
					doorH = usableH * 0.98,
					y = floor + usableH / 2;
				const frame = Math.min(0.035, cellW * 0.1, usableH * 0.05);
				if (display || china) {
					const glassH = china ? doorH * 0.64 : doorH,
						glassY = china ? y + doorH * 0.18 : y;
					this.glass(
						"Dining Cabinet Glass",
						[doorW - frame * 2, glassH - frame * 2, t * 0.3],
						[x, glassY, d / 2],
						Number(p.glassOpacity),
					);
					for (const side of [-1, 1]) {
						this.rounded(
							"Glass Door Frame",
							[frame, doorH, t],
							[x + (side * (doorW - frame)) / 2, y, d / 2],
							material,
							0.002,
						);
						this.rounded(
							"Glass Door Frame",
							[doorW, frame, t],
							[x, glassY + (side * (glassH - frame)) / 2, d / 2],
							material,
							0.002,
						);
					}
					if (china)
						this.rounded(
							"China Cabinet Lower Door",
							[doorW, doorH * 0.36, t],
							[x, y - doorH * 0.32, d / 2],
							material,
							0.003,
						);
				} else
					this.rounded(
						"Dining Cabinet Door",
						[doorW, doorH, t],
						[x, y, d / 2],
						material,
						0.004,
					);
				const left = col % 2 === 0;
				this.rounded(
					"Dining Cabinet Handle",
					[frame * 0.35, Math.min(0.12, doorH * 0.18), t],
					[x + (left ? 1 : -1) * doorW * 0.36, y, d / 2 + t],
					metal,
				);
				const meshes = this.partsGroup.children.slice(before),
					hinge = new Group();
				hinge.name = "Dining Door Hinge";
				hinge.position.set(x + ((left ? -1 : 1) * doorW) / 2, 0, d / 2);
				this.partsGroup.add(hinge);
				for (const mesh of meshes) {
					mesh.position.sub(hinge.position);
					hinge.add(mesh);
				}
				hinge.rotation.y = p.doorsOpen ? (left ? -1 : 1) * Math.PI * 0.52 : 0;
			}
			if (!p.contentsEnabled) continue;
			if (wine) {
				for (let row = 0; row <= shelves; row++)
					this.bottle(
						x,
						floor + (usableH * (row + 0.5)) / (shelves + 1),
						d,
						Math.min(cellW * 0.31, (usableH / (shelves + 1)) * 0.32),
					);
			} else if (display || china) {
				for (let row = 0; row <= shelves; row++) {
					const y = shelfBottom + (shelfH * row) / (shelves + 1) + t / 2;
					const radius = Math.min(cellW * 0.35, d * 0.36),
						plateH = Math.min(0.012, (shelfH / (shelves + 1)) * 0.045);
					for (let stack = 0; stack < 3; stack++)
						this.cylinder(
							"Display Plate",
							radius,
							radius * 0.83,
							plateH,
							[x, y + plateH * (stack + 0.5), 0],
							this.accent(0xe7e2d5, 0.3),
						);
				}
			} else if (p.style === "drinks-cabinet") {
				this.bottle(
					x,
					floor + usableH * 0.17,
					d,
					Math.min(cellW * 0.18, usableH * 0.12),
				);
				const r = Math.min(cellW * 0.16, d * 0.18),
					base = floor + usableH / (shelves + 1) + t / 2;
				this.cylinder(
					"Stemware Base",
					r * 0.7,
					r * 0.7,
					r * 0.08,
					[x, base + r * 0.04, 0],
					this.accent(0xd3e2e6, 0.12, 0.1, 0.5),
				);
				this.cylinder(
					"Stemware Stem",
					r * 0.09,
					r * 0.09,
					r,
					[x, base + r * 0.58, 0],
					this.accent(0xd3e2e6, 0.12, 0.1, 0.5),
				);
				this.lathe(
					"Stemware Bowl",
					[
						[0, 0],
						[r * 0.6, 0.2 * r],
						[r, r],
						[r * 0.85, r * 1.7],
						[r * 0.78, r * 1.7],
						[r * 0.9, r],
						[r * 0.5, r * 0.3],
						[0, r * 0.15],
					],
					[x, base + r, 0],
					this.accent(0xd3e2e6, 0.12, 0.1, 0.5),
				);
			}
		}
		if (leg > 0) this.legs(w, d, leg, Math.min(w, d) * 0.12, metal);
	}
	private bottle(x: number, y: number, depth: number, r: number): void {
		const length = depth * 0.82,
			glass = this.accent(0x365344, 0.22, 0.12);
		const bottle = this.lathe(
			"Wine Bottle",
			[
				[0, 0],
				[r * 0.8, 0],
				[r, length * 0.06],
				[r, length * 0.65],
				[r * 0.38, length * 0.78],
				[r * 0.32, length],
				[0, length],
			],
			[x, y, -length / 2],
			glass,
		);
		bottle.rotation.x = Math.PI / 2;
		const label = this.cylinder(
			"Bottle Label",
			r * 1.01,
			r * 1.01,
			length * 0.26,
			[x, y, -length * 0.08],
			this.accent(0xd9cba3),
			24,
		);
		label.rotation.x = Math.PI / 2;
	}
}
