import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	BathroomObject,
	boolean,
	choice,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export class BathroomStorageObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe4e3dd) {
		super(
			"bathroom-storage",
			"Bathroom storage",
			"bathStorageControls",
			[
				choice("style", "StorageStyle", "medicine-cabinet", [
					{
						value: "medicine-cabinet",
						parameters: {
							width: 0.6,
							depth: 0.16,
							height: 0.7,
							shelfCount: 2,
							doorCount: 2,
							legHeight: 0,
						},
					},
					{
						value: "bathroom-cabinet",
						parameters: {
							width: 0.65,
							depth: 0.4,
							height: 0.85,
							shelfCount: 2,
							doorCount: 2,
							legHeight: 0.07,
						},
					},
					{
						value: "tall-cabinet",
						parameters: {
							width: 0.4,
							depth: 0.35,
							height: 1.8,
							shelfCount: 5,
							doorCount: 1,
							legHeight: 0.07,
						},
					},
					{
						value: "wall-shelf",
						parameters: {
							width: 0.65,
							depth: 0.2,
							height: 0.4,
							shelfCount: 2,
							doorCount: 0,
							legHeight: 0,
						},
					},
					{
						value: "under-sink-cabinet",
						parameters: {
							width: 0.7,
							depth: 0.45,
							height: 0.65,
							shelfCount: 1,
							doorCount: 2,
							legHeight: 0.07,
						},
					},
				]),
				...dimensions(0.6, 0.16, 0.7),
				integer("shelfCount", "ShelfCount", 2, 1, 8),
				integer("doorCount", "DoorCount", 2, 0, 4),
				number("thickness", "BoardThickness", 0.02, 0.008, 0.08),
				number("legHeight", "LegHeight", 0, 0, 0.3),
				boolean("doorsOpen", "DoorsOpen", false),
				boolean("backEnabled", "BackEnabled", true),
			],
			parameters,
			color,
			0.55,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(Number(p.thickness), w * 0.12, d * 0.12, h * 0.12);
		const shelves = Number(p.shelfCount),
			chrome = this.accent(0xb5bfc6, 0.2, 0.8);
		if (p.style === "wall-shelf") {
			for (let i = 0; i < shelves; i++) {
				const y = t / 2 + (i / Math.max(1, shelves - 1)) * (h - t);
				this.rounded(
					"Bathroom Shelf Board",
					[w, t, d],
					[0, y, 0],
					material,
					0.005,
				);
				for (const side of [-1, 1])
					this.addBox(
						"Bathroom Shelf Support",
						[t, Math.min(h * 0.12, 0.04), d * 0.6],
						[side * w * 0.32, y + Math.min(h * 0.06, 0.02), -d * 0.15],
						chrome,
					);
			}
			return;
		}
		const leg = Math.min(Number(p.legHeight), h * 0.25),
			bodyH = h - leg;
		this.rounded(
			"Bathroom Cabinet Bottom",
			[w, t, d],
			[0, leg + t / 2, 0],
			material,
			0.005,
		);
		for (const side of [-1, 1])
			this.addBox(
				"Bathroom Cabinet Side",
				[t, bodyH - t * 2, d],
				[side * (w / 2 - t / 2), leg + bodyH / 2, 0],
				material,
			);
		if (p.style === "under-sink-cabinet") {
			for (const side of [-1, 1])
				this.addBox(
					"Sink Cutout Side",
					[w * 0.32, t, d],
					[side * w * 0.34, h - t / 2, 0],
					material,
				);
			this.addBox(
				"Sink Cutout Front",
				[w * 0.36, t, d * 0.3],
				[0, h - t / 2, d * 0.35],
				material,
			);
		} else
			this.addBox(
				"Bathroom Cabinet Top",
				[w, t, d],
				[0, h - t / 2, 0],
				material,
			);
		if (p.backEnabled && p.style !== "under-sink-cabinet")
			this.addBox(
				"Bathroom Cabinet Back",
				[w - t * 2, bodyH - t * 2, t],
				[0, leg + bodyH / 2, -d / 2 + t / 2],
				material,
			);
		for (let i = 1; i <= shelves; i++)
			this.addBox(
				"Bathroom Cabinet Shelf",
				[w - t * 2, t, d - t * 2],
				[0, leg + t + (i / (shelves + 1)) * (bodyH - t * 2), 0],
				material,
			);
		const doors = Number(p.doorCount),
			doorW = w / Math.max(doors, 1),
			doorH = bodyH - t * 2;
		for (let i = 0; i < doors; i++) {
			const x = -w / 2 + doorW * (i + 0.5),
				face =
					p.style === "medicine-cabinet"
						? this.accent(0xc2d2dc, 0.1, 0.55)
						: material;
			if (p.doorsOpen) {
				const hinge = -w / 2 + doorW * i;
				this.rounded(
					"Bathroom Cabinet Door",
					[t, doorH, doorW * 0.97],
					[hinge, leg + bodyH / 2, d / 2 + doorW * 0.48],
					face,
					0.004,
				);
				this.addBox(
					"Bathroom Cabinet Handle",
					[t, Math.min(0.1, doorH * 0.3), t],
					[hinge + t, leg + bodyH * 0.5, d / 2 + doorW * 0.85],
					chrome,
				);
			} else {
				this.rounded(
					"Bathroom Cabinet Door",
					[doorW * 0.97, doorH, t],
					[x, leg + bodyH / 2, d / 2],
					face,
					0.004,
				);
				this.addBox(
					"Bathroom Cabinet Handle",
					[Math.min(doorW * 0.3, 0.1), t * 0.4, t],
					[x, leg + bodyH * 0.5, d / 2 + t],
					chrome,
				);
			}
		}
		if (leg) this.legs(w, d, leg, Math.min(w, d) * 0.1, chrome);
	}
}
