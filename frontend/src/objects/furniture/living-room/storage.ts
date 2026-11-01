import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	LivingRoomObject,
	number,
} from "./primitives.js";

export class LivingStorageObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x987755) {
		super(
			"living-storage",
			"Living room storage",
			"livingStorageControls",
			[
				choice("style", "StorageStyle", "tv-cabinet", [
					{
						value: "tv-cabinet",
						parameters: {
							width: 1.8,
							depth: 0.42,
							height: 0.55,
							columns: 3,
							shelfCount: 1,
							doorCount: 2,
						},
					},
					{
						value: "media-console",
						parameters: {
							width: 1.6,
							depth: 0.4,
							height: 0.55,
							columns: 3,
							shelfCount: 1,
							doorCount: 0,
						},
					},
					{
						value: "bookshelf",
						parameters: {
							width: 1.1,
							depth: 0.3,
							height: 1.9,
							columns: 2,
							shelfCount: 5,
							doorCount: 0,
						},
					},
					{
						value: "display-cabinet",
						parameters: {
							width: 0.95,
							depth: 0.38,
							height: 1.8,
							columns: 2,
							shelfCount: 4,
							doorCount: 2,
						},
					},
					{
						value: "sideboard",
						parameters: {
							width: 1.5,
							depth: 0.45,
							height: 0.85,
							columns: 3,
							shelfCount: 1,
							doorCount: 3,
						},
					},
					{
						value: "shelving-unit",
						parameters: {
							width: 1.2,
							depth: 0.32,
							height: 1.6,
							columns: 3,
							shelfCount: 4,
							doorCount: 0,
						},
					},
					{
						value: "wall-shelves",
						parameters: {
							width: 1.2,
							depth: 0.25,
							height: 0.7,
							columns: 1,
							shelfCount: 3,
							doorCount: 0,
						},
					},
				]),
				...dimensions(1.8, 0.42, 0.55),
				integer("columns", "Columns", 3, 1, 6),
				integer("shelfCount", "ShelfCount", 1, 1, 10),
				integer("doorCount", "DoorCount", 2, 0, 6),
				number("thickness", "BoardThickness", 0.025, 0.008, 0.1),
				boolean("backEnabled", "BackEnabled", true),
				number("legHeight", "LegHeight", 0.1, 0, 0.4),
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
		const t = Math.min(Number(p.thickness), w * 0.08, d * 0.15, h * 0.08);
		const columns = Number(p.columns),
			shelves = Number(p.shelfCount);
		if (p.style === "wall-shelves") {
			for (let i = 0; i < shelves; i++) {
				const y = t / 2 + (i / Math.max(1, shelves - 1)) * (h - t);
				this.rounded("Wall Shelf Board", [w, t, d], [0, y, 0], material, 0.004);
				for (const side of [-1, 1])
					this.addBox(
						"Wall Shelf Bracket",
						[t, Math.min(0.12, (h / shelves) * 0.5), d * 0.7],
						[
							side * w * 0.32,
							y + Math.min(0.06, (h / shelves) * 0.25),
							-d * 0.1,
						],
						this.accent(0x323537, 0.4, 0.5),
					);
			}
			return;
		}
		const leg = Math.min(Number(p.legHeight), h * 0.25),
			innerH = h - leg,
			cellW = (w - t * (columns + 1)) / columns;
		this.rounded("Storage Top", [w, t, d], [0, h - t / 2, 0], material, 0.005);
		this.addBox("Storage Bottom", [w, t, d], [0, leg + t / 2, 0], material);
		for (let i = 0; i <= columns; i++)
			this.addBox(
				"Storage Upright",
				[t, innerH - t * 2, d],
				[-w / 2 + t / 2 + (i * (w - t)) / columns, leg + innerH / 2, 0],
				material,
			);
		if (p.backEnabled)
			this.addBox(
				"Storage Back",
				[w - t * 2, innerH - t * 2, t],
				[0, leg + innerH / 2, -d / 2 + t / 2],
				material,
			);
		for (let row = 1; row <= shelves; row++)
			for (let col = 0; col < columns; col++) {
				this.addBox(
					"Storage Shelf",
					[Math.max(0.005, cellW), t, d - t * 2],
					[
						-w / 2 + t + cellW / 2 + col * (cellW + t),
						leg + t + (row / (shelves + 1)) * (innerH - t * 2),
						0,
					],
					material,
				);
			}
		const doors = Math.min(Number(p.doorCount), columns),
			doorWidth = Math.max(0.01, (w - t) / columns - 0.008);
		for (let i = 0; i < doors; i++) {
			const col = doors === 2 && columns > 2 ? (i ? columns - 1 : 0) : i;
			const x = -w / 2 + t / 2 + ((col + 0.5) * (w - t)) / columns;
			if (p.style === "display-cabinet") {
				const frame = Math.min(0.035, doorWidth * 0.12, innerH * 0.1);
				const glass = this.accent(0x9dc8d3, 0.1, 0.15, 0.22);
				this.addBox(
					"Display Glass",
					[doorWidth - frame, innerH - t * 2, t * 0.3],
					[x, leg + innerH / 2, d / 2],
					glass,
				);
				for (const side of [-1, 1])
					this.addBox(
						"Display Frame",
						[frame, innerH - t * 2, t],
						[x + (side * (doorWidth - frame)) / 2, leg + innerH / 2, d / 2],
						material,
					);
				for (const y of [leg + t, h - t])
					this.addBox(
						"Display Frame",
						[doorWidth, frame, t],
						[x, y, d / 2],
						material,
					);
			} else
				this.rounded(
					"Storage Door",
					[doorWidth, innerH - t * 2, t],
					[x, leg + innerH / 2, d / 2],
					material,
					0.005,
				);
			this.addBox(
				"Storage Handle",
				[Math.min(0.09, doorWidth * 0.4), 0.012, 0.025],
				[x, leg + innerH * 0.65, d / 2 + t],
				this.accent(0x333638, 0.35, 0.5),
			);
		}
		if (leg)
			this.legs(
				w,
				d,
				leg,
				Math.min(w, d) * 0.12,
				this.accent(0x333638, 0.4, 0.5),
			);
	}
}
