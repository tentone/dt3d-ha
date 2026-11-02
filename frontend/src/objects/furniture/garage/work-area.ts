import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GarageObject,
	integer,
	number,
} from "./primitives.js";

export class GarageWorkbenchObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x79858b) {
		super(
			"garage-workbench",
			"Workbench / workshop table",
			"garageWorkbenchControls",
			[
				choice("style", "WorkbenchStyle", "workbench", [
					{
						value: "workbench",
						parameters: {
							width: 1.6,
							depth: 0.7,
							height: 0.9,
							drawerRows: 3,
							pegboardEnabled: true,
							viceEnabled: true,
						},
					},
					{
						value: "workshop-table",
						parameters: {
							width: 1.8,
							depth: 0.8,
							height: 0.85,
							drawerRows: 0,
							pegboardEnabled: false,
							viceEnabled: false,
						},
					},
				]),
				...dimensions(1.6, 0.7, 0.9),
				number("topThickness", "BenchTop", 0.055, 0.02, 0.12),
				integer("drawerRows", "BenchDrawers", 3, 0, 6),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("lowerShelf", "BenchShelf", true),
				boolean("pegboardEnabled", "BenchPegboard", true),
				number("boardHeight", "BenchBoardHeight", 0.65, 0.2, 1.3),
				integer("toolCount", "ToolCount", 6, 0, 12),
				boolean("viceEnabled", "BenchVice", true),
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
			t = Math.min(Number(p.topThickness), h * 0.16),
			leg = Math.min(w, d, h) * 0.055,
			wood = this.accent(0xbfa67d, 0.8),
			metal = this.accent(0x9ca5a6, 0.4, 0.65);
		this.rounded(
			"Workbench Frame",
			[w * 0.9, leg, d * 0.84],
			[0, h - t - leg / 2, 0],
			material,
			0.005,
		);
		this.rounded("Workbench Top", [w, t, d], [0, h - t / 2, 0], wood, 0.012);
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rounded(
					"Workbench Leg",
					[leg, h - t, leg],
					[x * w * 0.43, (h - t) / 2, z * d * 0.4],
					material,
					0.005,
				);
		if (p.lowerShelf)
			this.rounded(
				"Workbench Lower Shelf",
				[w * 0.89, leg * 0.6, d * 0.8],
				[0, h * 0.16, 0],
				material,
				0.004,
			);
		const rows = Number(p.drawerRows),
			dw = w * 0.32,
			dh = (h * 0.58) / Math.max(1, rows),
			x = -w * 0.25;
		if (rows) {
			for (const side of [-1, 1])
				this.addBox(
					"Workbench Pedestal",
					[leg * 0.5, h * 0.6, d * 0.75],
					[x + (side * dw) / 2, h * 0.58, 0],
					material,
				);
			for (let i = 0; i < rows; i++)
				this.drawer(
					"Workbench Drawer",
					x,
					h * 0.28 + dh * (i + 0.5),
					d * 0.4,
					dw,
					dh,
					d * 0.78,
					leg * 0.5,
					Number(p.drawerOpen),
					material,
				);
		}
		if (p.pegboardEnabled) {
			const before = this.partsGroup.children.length;
			this.pegboard(
				w * 0.92,
				leg * 0.45,
				Number(p.boardHeight),
				12,
				5,
				Number(p.toolCount),
				material,
			);
			const board = this.hingeParts(
				"Workbench Pegboard",
				this.partsGroup.children.slice(before),
				[0, 0, 0],
				0,
			);
			board.position.set(0, h + 0.04, -d * 0.45);
			for (const side of [-1, 1])
				this.rounded(
					"Workbench Board Support",
					[leg, Number(p.boardHeight) + h * 0.3, leg],
					[side * w * 0.4, h * 0.85 + Number(p.boardHeight) / 2, -d * 0.45],
					material,
					0.003,
				);
		}
		if (p.viceEnabled) {
			this.rounded(
				"Bench Vice Base",
				[w * 0.12, t * 0.8, d * 0.22],
				[w * 0.29, h + t * 0.4, d * 0.32],
				material,
				0.008,
			);
			for (const z of [0.3, 0.48])
				this.rounded(
					"Bench Vice Jaw",
					[w * 0.13, t * 1.8, t],
					[w * 0.29, h + t * 1.4, z * d],
					metal,
					0.004,
				);
			this.rail(
				"Bench Vice Screw",
				[w * 0.29, h + t * 0.8, d * 0.22],
				[w * 0.29, h + t * 0.8, d * 0.6],
				leg * 0.3,
				metal,
			);
			this.rail(
				"Bench Vice Handle",
				[w * 0.29 - w * 0.05, h + t * 0.8, d * 0.6],
				[w * 0.29 + w * 0.05, h + t * 0.8, d * 0.6],
				leg * 0.18,
				metal,
			);
		}
	}
}

export class ToolPegboardObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa99b7f) {
		super(
			"tool-pegboard",
			"Tool pegboard",
			"garagePegboardControls",
			[
				...dimensions(1.2, 0.035, 0.65),
				integer("columns", "PegColumns", 12, 4, 18),
				integer("rows", "PegRows", 5, 3, 10),
				integer("toolCount", "ToolCount", 6, 0, 12),
			],
			parameters,
			color,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters;
		this.pegboard(
			Number(p.width),
			Number(p.depth),
			Number(p.height),
			Number(p.columns),
			Number(p.rows),
			Number(p.toolCount),
			material,
		);
	}
}
