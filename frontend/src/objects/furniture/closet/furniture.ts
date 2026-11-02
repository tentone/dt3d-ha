import type {Mesh} from "three";

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

export class DressingIslandObject extends ClosetObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xbca17c) {
		super(
			"dressing-island",
			"Dressing island",
			"closetIslandControls",
			[
				...dimensions(1.2, 0.75, 0.9),
				integer("columns", "IslandColumns", 2, 1, 4),
				integer("drawerRows", "DrawerRows", 3, 1, 6),
				number("drawerOpen", "DrawerOpen", 0, 0, 1),
				boolean("bothSides", "BothSides", true),
				choice("topStyle", "IslandTop", "glass-top", [
					"solid-top",
					"glass-top",
				]),
				boolean("organizerEnabled", "IslandOrganizer", true),
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
			t = Math.min(0.025, w * 0.035, d * 0.035, h * 0.04),
			cols = Number(p.columns),
			rows = Number(p.drawerRows),
			glassTop = p.topStyle === "glass-top",
			bottom = h * 0.07,
			top = h * (glassTop ? 0.8 : 0.96),
			cw = (w - t * (cols + 1)) / cols,
			dh = (top - bottom) / rows;
		for (const s of [-1, 1])
			this.addBox(
				"Island Side",
				[t, h, d],
				[(s * (w - t)) / 2, h / 2, 0],
				material,
			);
		this.addBox(
			"Island Plinth",
			[w - t * 2, bottom, d - t * 2],
			[0, bottom / 2, 0],
			material,
		);
		this.addBox(
			"Island Center Partition",
			[w - t * 2, top - bottom, t],
			[0, (top + bottom) / 2, 0],
			material,
		);
		for (let c = 1; c < cols; c++)
			this.addBox(
				"Island Column Divider",
				[t, top - bottom, d - t * 2],
				[-w / 2 + t + c * cw + (c - 0.5) * t, (top + bottom) / 2, 0],
				material,
			);
		for (const side of p.bothSides ? [-1, 1] : [1]) {
			const before = new Set(this.partsGroup.children);
			for (let c = 0; c < cols; c++)
				for (let r = 0; r < rows; r++)
					this.drawer(
						"Island Drawer",
						-w / 2 + t + cw / 2 + c * (cw + t),
						bottom + (r + 0.5) * dh,
						d / 2 - t * 0.5,
						cw,
						dh,
						d / 2 - t,
						t,
						Number(p.drawerOpen),
						material,
					);
			if (side === -1)
				this.hingeParts(
					"Island Rear Drawers",
					this.partsGroup.children.filter((part) => !before.has(part)),
					[0, 0, 0],
					Math.PI,
				);
		}
		if (!p.bothSides)
			this.addBox(
				"Island Back",
				[w - t * 2, top - bottom, t],
				[0, (top + bottom) / 2, -d / 2 + t / 2],
				material,
			);
		if (glassTop) {
			this.addBox(
				"Island Tray Floor",
				[w - t * 2, t, d - t * 2],
				[0, top + t / 2, 0],
				material,
			);
			for (const s of [-1, 1])
				this.addBox(
					"Island Glass Rim",
					[w - t * 2, h - top, t],
					[0, (h + top) / 2, (s * (d - t)) / 2],
					material,
				);
			if (p.organizerEnabled) {
				const velvet = this.accent(0xa69c8c, 0.98),
					gold = this.accent(0xb8a06c, 0.25, 0.7),
					trayH = (h - top) * 0.5;
				this.addBox(
					"Island Tray Lining",
					[w - t * 2, t * 0.2, d - t * 2],
					[0, top + t * 1.1, 0],
					velvet,
				);
				for (let c = 1; c < cols; c++)
					this.addBox(
						"Island Tray Divider",
						[t, trayH, d - t * 2],
						[-w / 2 + (c * w) / cols, top + t + trayH / 2, 0],
						material,
					);
				this.addBox(
					"Island Tray Divider",
					[w - t * 2, trayH, t],
					[0, top + t + trayH / 2, 0],
					material,
				);
				for (let c = 0; c < cols; c++)
					for (const s of [-1, 1])
						this.ellipsoid(
							"Island Jewelry Cushion",
							[cw * 0.27, trayH * 0.22, d * 0.12],
							[
								-w / 2 + ((c + 0.5) * w) / cols,
								top + t + trayH * 0.25,
								s * d * 0.23,
							],
							gold,
						);
			}
			const glass = this.addBox(
				"Island Glass Top",
				[w, t * 0.5, d],
				[0, h - t * 0.25, 0],
				this.accent(0xd6e3e5, 0.13, 0.05, 0.28),
			);
			initializeMeshShadowSettings(glass, {
				castShadow: false,
				receiveShadow: false,
			});
		} else
			this.addBox("Island Solid Top", [w, t, d], [0, h - t / 2, 0], material);
	}
}
