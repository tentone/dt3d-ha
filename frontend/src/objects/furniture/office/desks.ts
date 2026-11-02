import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {TABLE_PARAMETER_DEFINITIONS, TableObject} from "../table.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	OfficeObject,
} from "./primitives.js";

export class OfficeDeskObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xaf8c5d) {
		super(
			"office-desk",
			"Office desk",
			"officeDeskControls",
			[
				choice("style", "DeskStyle", "writing-desk", [
					{
						value: "writing-desk",
						parameters: {
							width: 1.2,
							depth: 0.6,
							height: 0.75,
							keyboardTray: false,
							pedestals: false,
						},
					},
					{
						value: "computer-desk",
						parameters: {
							width: 1.4,
							depth: 0.7,
							height: 0.75,
							keyboardTray: true,
							pedestals: false,
						},
					},
					{
						value: "l-shaped-desk",
						parameters: {
							width: 1.8,
							depth: 1.5,
							height: 0.75,
							keyboardTray: false,
							pedestals: false,
						},
					},
					{
						value: "corner-desk",
						parameters: {
							width: 1.2,
							depth: 1.2,
							height: 0.75,
							keyboardTray: false,
							pedestals: false,
						},
					},
					{
						value: "executive-desk",
						parameters: {
							width: 1.9,
							depth: 0.85,
							height: 0.76,
							keyboardTray: false,
							pedestals: true,
						},
					},
				]),
				...dimensions(1.2, 0.6, 0.75),
				number("topThickness", "TopThickness", 0.04, 0.015, 0.15),
				number("returnDepth", "ReturnDepth", 0.6, 0.15, 1.2),
				choice("returnSide", "ReturnSide", "left-return", [
					"left-return",
					"right-return",
				]),
				boolean("keyboardTray", "KeyboardTray", false),
				number("trayOpen", "TrayOpen", 0, 0, 1, 0.05),
				boolean("pedestals", "Pedestals", false),
				integer("drawerRows", "DrawerRows", 3, 1, 5),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
				boolean("cablePort", "CablePort", true),
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
			t = Math.min(Number(p.topThickness), h * 0.15),
			legH = h - t,
			lt = Math.min(w, d) * 0.045,
			r = Math.min(Number(p.returnDepth), w * 0.42, d * 0.42),
			l = p.style === "l-shaped-desk",
			corner = p.style === "corner-desk",
			mirror = l && p.returnSide === "right-return" ? -1 : 1;
		let points: [number, number][] = [
			[-w / 2, -d / 2],
			[w / 2, -d / 2],
			[w / 2, d / 2],
			[-w / 2, d / 2],
		];
		let supports: [number, number][] = [
			[-w * 0.42, -d * 0.36],
			[w * 0.42, -d * 0.36],
			[w * 0.42, d * 0.36],
			[-w * 0.42, d * 0.36],
		];
		if (l) {
			points = [
				[-w / 2, -d / 2],
				[w / 2, -d / 2],
				[w / 2, -d / 2 + r],
				[-w / 2 + r, -d / 2 + r],
				[-w / 2 + r, d / 2],
				[-w / 2, d / 2],
			];
			supports = [
				[-w / 2 + lt * 2, -d / 2 + lt * 2],
				[w / 2 - lt * 2, -d / 2 + lt * 2],
				[w / 2 - lt * 2, -d / 2 + r - lt * 2],
				[-w / 2 + r - lt * 2, d / 2 - lt * 2],
				[-w / 2 + lt * 2, d / 2 - lt * 2],
			];
			points = points.map(([x, z]) => [x * mirror, z]);
			supports = supports.map(([x, z]) => [x * mirror, z]);
			if (mirror < 0) points.reverse();
		} else if (corner) {
			points = [
				[-w / 2, -d / 2],
				[w / 2, -d / 2],
				[w / 2, d * 0.05],
				[w * 0.05, d / 2],
				[-w / 2, d / 2],
			];
			supports = [
				[-w * 0.4, -d * 0.4],
				[w * 0.4, -d * 0.4],
				[w * 0.4, 0],
				[0, d * 0.4],
				[-w * 0.4, d * 0.4],
			];
		}
		const hole = p.cablePort
			? {
				x: 0,
				z: -d / 2 + (l ? r : d) * 0.23,
				radius: Math.min(w, l ? r : d) * 0.025,
			}
			: undefined;
		this.planTop("Office Desk Top", points, t, h - t, material, hole);
		const metal = this.accent(0x525b60, 0.35, 0.6);
		if (p.pedestals && !l && !corner) {
			const pw = w * 0.23;
			for (const side of [-1, 1]) {
				const x = side * w * 0.35,
					rows = Number(p.drawerRows),
					rh = (legH * 0.9) / rows;
				this.rounded(
					"Desk Pedestal Body",
					[pw, legH, d * 0.85],
					[x, legH / 2, 0],
					material,
					0.006,
				);
				for (let i = 0; i < rows; i++) {
					const y = legH * 0.05 + rh * (i + 0.5),
						z = d * 0.43 + Number(p.drawerOpen) * d * 0.6;
					this.rounded(
						"Desk Drawer Front",
						[pw * 0.96, rh * 0.94, t * 0.5],
						[x, y, z],
						material,
						0.004,
					);
					this.rounded(
						"Desk Drawer Handle",
						[pw * 0.4, t * 0.2, t * 0.4],
						[x, y, z + t * 0.5],
						metal,
						0.003,
					);
					if (Number(p.drawerOpen) > 0)
						this.addBox(
							"Desk Drawer Bottom",
							[pw * 0.9, t * 0.2, d * 0.65],
							[x, y - rh * 0.35, z - d * 0.325],
							material,
						);
				}
			}
			this.rounded(
				"Executive Modesty Panel",
				[w * 0.55, legH * 0.65, t * 0.5],
				[0, legH * 0.6, -d * 0.34],
				material,
				0.004,
			);
		} else
			for (const [x, z] of supports)
				this.rounded(
					"Office Desk Leg",
					[lt, legH, lt],
					[x, legH / 2, z],
					metal,
					0.003,
				);
		if (p.keyboardTray) {
			const z =
					(l ? -d / 2 + r * 0.7 : d * 0.26) +
					Number(p.trayOpen) * Math.min(d, 0.8) * 0.45,
				y = h - t - legH * 0.15;
			this.plate(
				"Keyboard Tray",
				[w * 0.54, t * 0.45, Math.min(d, 0.7) * 0.46],
				[0, y, z],
				material,
				Math.min(w, d) * 0.04,
			);
			for (const side of [-1, 1])
				this.rounded(
					"Keyboard Tray Runner",
					[lt * 0.3, legH * 0.14, Math.min(d, 0.7) * 0.4],
					[side * w * 0.25, y + legH * 0.06, z],
					metal,
					0.002,
				);
		}
	}
}

export class MeetingTableObject extends TableObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa28058) {
		super(
			{
				width: 2.2,
				depth: 1.1,
				height: 0.75,
				topShape: "oval",
				legStyle: "trestle",
				...parameters,
			},
			color,
			"meeting-table",
			TABLE_PARAMETER_DEFINITIONS.filter((item) => item.name !== "tableCount"),
		);
	}
}
