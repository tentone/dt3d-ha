import type {Mesh} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GameRoomObject,
	integer,
} from "./primitives.js";

export class GameStorageObject extends GameRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa09176) {
		super(
			"game-storage",
			"Media shelving / game cabinets",
			"gameStorageControls",
			[
				choice("style", "StorageStyle", "media-shelving", [
					{
						value: "media-shelving",
						parameters: {
							width: 1.2,
							depth: 0.35,
							height: 1.6,
							columns: 2,
							shelfCount: 4,
						},
					},
					{
						value: "game-storage-cabinet",
						parameters: {
							width: 0.9,
							depth: 0.4,
							height: 1.4,
							columns: 2,
							shelfCount: 3,
						},
					},
				]),
				...dimensions(1.2, 0.35, 1.6),
				integer("columns", "StorageColumns", 2, 1, 4),
				integer("shelfCount", "StorageShelves", 4, 1, 7),
				boolean("doorsOpen", "StorageDoors", false),
				boolean("glassDoors", "StorageGlass", false),
				boolean("contentsEnabled", "StorageContents", true),
				integer("gameCount", "StorageGames", 3, 1, 5),
				boolean("backEnabled", "StorageBack", true),
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
			cols = Number(p.columns),
			shelves = Number(p.shelfCount),
			cw = (w - t * (cols + 1)) / cols,
			ch = (h - t * (shelves + 1)) / shelves,
			metal = this.accent(0x747f7b, 0.4, 0.6);
		for (const side of [-1, 1]) {
			this.addBox(
				"Game Storage Side",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
			);
			this.addBox(
				"Game Storage Board",
				[w - t * 2, t, d],
				[0, side < 0 ? t / 2 : h - t / 2, 0],
				material,
			);
		}
		if (p.backEnabled)
			this.addBox(
				"Game Storage Back",
				[w - t * 2, h - t * 2, t],
				[0, h / 2, -d / 2 + t / 2],
				material,
			);
		for (let i = 1; i < cols; i++)
			this.addBox(
				"Game Storage Divider",
				[t, h - t * 2, d - t * 2],
				[-w / 2 + t / 2 + i * (cw + t), h / 2, 0],
				material,
			);
		for (let row = 1; row < shelves; row++)
			this.addBox(
				"Game Storage Shelf",
				[w - t * 2, t, d - t * 2],
				[0, t / 2 + row * (ch + t), 0],
				material,
			);
		if (p.contentsEnabled)
			for (let col = 0; col < cols; col++)
				for (let row = 0; row < shelves; row++)
					for (let i = 0; i < Number(p.gameCount); i++) {
						const n = Number(p.gameCount),
							x = -w / 2 + t + col * (cw + t) + ((i + 0.5) * cw) / n,
							y = t + row * (ch + t) + ch * 0.36,
							bw = (cw / n) * 0.7,
							color = [0x839b9f, 0xb6a16e, 0xb08b87, 0x9293b0][(i + row) % 4];
						this.rounded(
							"Stored Game Box",
							[bw, ch * 0.7, d * 0.67],
							[x, y, -d * 0.04],
							this.accent(color, 0.9),
							0.004,
						);
						this.rounded(
							"Stored Game Label",
							[bw * 0.65, ch * 0.07, t * 0.12],
							[x, y + ch * 0.08, d * 0.3],
							this.accent(0xdbd7c6, 0.85),
							0.001,
						);
					}
		if (p.style === "game-storage-cabinet")
			for (let col = 0; col < cols; col++) {
				const x = -w / 2 + t + cw / 2 + col * (cw + t),
					before = this.partsGroup.children.length;
				if (p.glassDoors) {
					for (const side of [-1, 1]) {
						this.addBox(
							"Game Cabinet Door Frame",
							[t, h - t, t],
							[x + (side * (cw - t)) / 2, h / 2, d / 2],
							material,
						);
						this.addBox(
							"Game Cabinet Door Frame",
							[cw, t, t],
							[x, side < 0 ? t : h - t, d / 2],
							material,
						);
					}
					const pane = this.addBox(
						"Game Cabinet Glass",
						[cw - t * 2, h - t * 3, t * 0.2],
						[x, h / 2, d / 2],
						this.accent(0xb1c8c8, 0.2, 0.05, 0.3),
					);
					initializeMeshShadowSettings(pane, {
						castShadow: false,
						receiveShadow: false,
					});
				} else
					this.rounded(
						"Game Cabinet Door",
						[cw * 0.98, h - t, t],
						[x, h / 2, d / 2],
						material,
						0.005,
					);
				this.rounded(
					"Game Cabinet Handle",
					[t * 0.5, h * 0.1, t],
					[x + cw * 0.3, h * 0.5, d / 2 + t],
					metal,
					0.002,
				);
				this.hingeParts(
					"Game Cabinet Hinge",
					this.partsGroup.children.slice(before),
					[x - cw / 2, 0, d / 2],
					p.doorsOpen ? -Math.PI * 0.55 : 0,
				);
			}
	}
}
