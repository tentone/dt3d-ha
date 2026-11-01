import type {Mesh} from "three";
import {Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	BathroomObject,
	boolean,
	choice,
	dimensions,
	number,
} from "./primitives.js";

export class ShowerObject extends BathroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xeaece8) {
		super(
			"shower",
			"Shower",
			"bathShowerControls",
			[
				choice("style", "ShowerStyle", "walk-in-shower", [
					{
						value: "shower-tray",
						parameters: {width: 0.9, depth: 0.9, height: 0.055},
					},
					{
						value: "walk-in-shower",
						parameters: {width: 1.2, depth: 0.9, height: 2},
					},
					{
						value: "shower-enclosure",
						parameters: {width: 0.9, depth: 0.9, height: 2},
					},
				]),
				...dimensions(1.2, 0.9, 2),
				number("trayHeight", "TrayHeight", 0.055, 0.015, 0.2),
				boolean("showerHeadEnabled", "ShowerHeadEnabled", true),
				number("glassOpacity", "GlassOpacity", 0.22, 0.05, 0.8, 0.05),
				number("doorOpen", "ShowerDoorOpen", 0, 0, 1, 0.05),
				boolean("frameEnabled", "FrameEnabled", true),
			],
			parameters,
			color,
			0.3,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			trayOnly = p.style === "shower-tray";
		const tray = trayOnly ? h : Math.min(Number(p.trayHeight), h * 0.2),
			rim = Math.min(0.025, w * 0.04, d * 0.04, tray * 0.35);
		this.plate(
			"Shower Tray",
			[w, Math.max(0.002, tray - rim), d],
			[0, (tray - rim) / 2, 0],
			material,
			Math.min(w, d) * 0.04,
		);
		for (const side of [-1, 1]) {
			this.addBox(
				"Shower Tray Rim",
				[w, rim, rim],
				[0, tray - rim / 2, side * (d / 2 - rim / 2)],
				material,
			);
			this.addBox(
				"Shower Tray Rim",
				[rim, rim, Math.max(0.002, d - rim * 2)],
				[side * (w / 2 - rim / 2), tray - rim / 2, 0],
				material,
			);
		}
		this.drain(w * 0.25, tray - rim + 0.002, -d * 0.28, Math.min(w, d) * 0.035);
		if (trayOnly) return;
		const glassH = h - tray,
			g = Math.min(0.008, w * 0.012, d * 0.012),
			opacity = Number(p.glassOpacity),
			chrome = this.accent(0x9facb6, 0.2, 0.75);
		this.glass(
			"Shower Side Glass",
			[g, glassH, d * 0.95],
			[-w / 2 + g, tray + glassH / 2, 0],
			opacity,
		);
		if (p.style === "shower-enclosure") {
			this.glass(
				"Shower Back Glass",
				[w, glassH, g],
				[0, tray + glassH / 2, -d / 2 + g],
				opacity,
			);
			this.glass(
				"Shower Right Glass",
				[g, glassH, d * 0.95],
				[w / 2 - g, tray + glassH / 2, 0],
				opacity,
			);
			this.glass(
				"Shower Fixed Front Glass",
				[w * 0.49, glassH, g],
				[-w * 0.25, tray + glassH / 2, d / 2 - g],
				opacity,
			);
			const doorX = w * (0.25 - Number(p.doorOpen) * 0.48);
			this.glass(
				"Shower Sliding Door",
				[w * 0.49, glassH, g],
				[doorX, tray + glassH / 2, d / 2 - g * 2.5],
				opacity,
			);
			this.addBox(
				"Shower Door Handle",
				[g * 2, Math.min(0.16, glassH * 0.2), g * 4],
				[doorX + w * 0.17, tray + glassH * 0.5, d / 2 + g],
				chrome,
			);
		}
		if (p.frameEnabled) {
			for (const z of [-d / 2, d / 2])
				this.addBox(
					"Shower Upright",
					[g * 2, glassH, g * 2],
					[-w / 2 + g, tray + glassH / 2, z],
					chrome,
				);
			this.addBox(
				"Shower Top Rail",
				[g * 2, g * 2, d],
				[-w / 2 + g, h - g, 0],
				chrome,
			);
			if (p.style === "shower-enclosure")
				for (const y of [tray + g, h - g])
					this.addBox(
						"Shower Door Track",
						[w, g * 2, g * 2],
						[0, y, d / 2],
						chrome,
					);
		}
		if (p.showerHeadEnabled) {
			const x = w * 0.15,
				z = -d * 0.43,
				headY = tray + glassH * 0.9,
				radius = Math.min(w, d) * 0.014;
			this.pipe(
				"Shower Riser",
				new Vector3(x, tray + glassH * 0.35, z),
				new Vector3(x, headY, z),
				radius,
				chrome,
			);
			this.pipe(
				"Shower Arm",
				new Vector3(x, headY, z),
				new Vector3(x, headY, z + d * 0.26),
				radius,
				chrome,
			);
			this.cylinder(
				"Rain Shower Head",
				Math.min(w, d) * 0.13,
				Math.min(w, d) * 0.13,
				radius,
				[x, headY - radius, z + d * 0.26],
				chrome,
				32,
			);
			this.rounded(
				"Shower Mixer",
				[w * 0.18, glassH * 0.035, radius * 4],
				[x, tray + glassH * 0.38, z],
				chrome,
			);
		}
	}
}
