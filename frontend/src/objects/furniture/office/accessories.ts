import type {Mesh} from "three";
import {PointLight} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	number,
	OfficeObject,
} from "./primitives.js";

export class OfficeDeskLampObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x718f8a) {
		super(
			"office-desk-lamp",
			"Desk lamp",
			"officeLampControls",
			[
				...dimensions(0.2, 0.2, 0.5),
				number("reach", "LampReach", 0.15, 0.03, 0.5),
				number("headTilt", "LampTilt", 0, -35, 35, 1),
				boolean("enabled", "LampOn", true),
				number("intensity", "LampIntensity", 1, 0, 15, 0.1),
				choice("temperature", "LampTemperature", "warm-light", [
					"warm-light",
					"neutral-light",
					"cool-light",
				]),
			],
			parameters,
			color,
			0.45,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			radius = Math.min(w, d) * 0.45,
			r = Math.min(w, d, h) * 0.035,
			reach = Number(p.reach),
			metal = this.accent(0x44565b, 0.3, 0.65),
			color =
				p.temperature === "cool-light"
					? 0xc8e2ff
					: p.temperature === "neutral-light"
						? 0xfff3dc
						: 0xffd59d;
		this.cylinder(
			"Desk Lamp Base",
			radius,
			radius * 1.05,
			h * 0.05,
			[0, h * 0.025, 0],
			material,
			40,
		);
		this.rail(
			"Desk Lamp Lower Arm",
			[0, h * 0.05, 0],
			[0, h * 0.55, -reach * 0.35],
			r,
			metal,
		);
		this.rail(
			"Desk Lamp Upper Arm",
			[0, h * 0.55, -reach * 0.35],
			[0, h * 0.9, reach * 0.65],
			r,
			metal,
		);
		for (const [y, z] of [
			[h * 0.55, -reach * 0.35],
			[h * 0.9, reach * 0.65],
		])
			this.cylinder(
				"Desk Lamp Joint",
				r * 1.8,
				r * 1.8,
				r * 2.2,
				[0, y, z],
				material,
				24,
			).rotation.z = Math.PI / 2;
		const before = this.partsGroup.children.length,
			shadeR = Math.min(w, d) * 0.32,
			shadeH = Math.min(h * 0.22, shadeR * 1.4),
			z = reach * 0.65;
		this.cylinder(
			"Desk Lamp Shade",
			shadeR * 0.35,
			shadeR,
			shadeH,
			[0, h * 0.9 - shadeH / 2, z],
			material,
			40,
			true,
		);
		this.cylinder(
			"Desk Lamp Glow",
			shadeR * 0.86,
			shadeR * 0.86,
			shadeH * 0.035,
			[0, h * 0.9 - shadeH * 0.85, z],
			this.accent(p.enabled ? color : 0xd7d8ca, 0.65, 0, 1, Boolean(p.enabled)),
			40,
		);
		const light = new PointLight(
			color,
			p.enabled ? Number(p.intensity) : 0,
			5,
			2,
		);
		light.name = "Desk Lamp Light";
		light.position.set(0, h * 0.9 - shadeH, z);
		light.internal = true;
		this.partsGroup.add(light);
		this.hingeParts(
			"Desk Lamp Head Hinge",
			this.partsGroup.children.slice(before),
			[0, h * 0.9, z],
			(Number(p.headTilt) * Math.PI) / 180,
			"x",
		);
	}
}

export class MonitorStandObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb29268) {
		super(
			"monitor-stand",
			"Monitor stand",
			"officeStandControls",
			[
				...dimensions(0.55, 0.23, 0.12),
				boolean("drawerEnabled", "StandDrawer", false),
				number("drawerOpen", "DrawerOpen", 0, 0, 1, 0.05),
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
			t = Math.min(0.02, w * 0.04, d * 0.08, h * 0.15);
		this.plate(
			"Monitor Stand Top",
			[w, t, d],
			[0, h - t / 2, 0],
			material,
			Math.min(w, d) * 0.1,
		);
		for (const side of [-1, 1])
			this.rounded(
				"Monitor Stand Support",
				[t, h - t, d * 0.86],
				[side * w * 0.43, (h - t) / 2, 0],
				material,
				0.004,
			);
		if (p.drawerEnabled) {
			const z = d / 2 + Number(p.drawerOpen) * d * 0.65;
			this.rounded(
				"Monitor Stand Drawer",
				[w * 0.76, h * 0.55, t],
				[0, h * 0.49, z],
				material,
				0.004,
			);
			this.rounded(
				"Monitor Stand Handle",
				[w * 0.2, t * 0.4, t],
				[0, h * 0.49, z + t],
				this.accent(0x56675f, 0.35, 0.4),
				0.002,
			);
			if (Number(p.drawerOpen) > 0)
				this.addBox(
					"Monitor Stand Drawer Bottom",
					[w * 0.73, t * 0.4, d * 0.7],
					[0, h * 0.24, z - d * 0.35],
					material,
				);
		}
	}
}

export class OfficeBoardObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x6b7c82) {
		super(
			"office-board",
			"Whiteboard / noticeboard",
			"officeBoardControls",
			[
				choice("style", "BoardStyle", "whiteboard", [
					"whiteboard",
					"noticeboard",
				]),
				...dimensions(1.2, 0.04, 0.8),
				boolean("standEnabled", "BoardStand", false),
				boolean("contentsEnabled", "BoardContents", true),
				boolean("trayEnabled", "BoardTray", true),
			],
			parameters,
			color,
			0.45,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			offset = p.standEnabled ? h * 0.55 : 0,
			f = Math.min(w, h) * 0.025,
			notice = p.style === "noticeboard",
			faceZ = d / 2 + 0.001;
		this.rounded(
			"Office Board Frame",
			[w, h, d],
			[0, offset + h / 2, 0],
			material,
			0.008,
		);
		this.rounded(
			"Office Board Surface",
			[w - f * 2, h - f * 2, d * 0.1],
			[0, offset + h / 2, faceZ],
			this.accent(notice ? 0xb69b6f : 0xe0e4dc, notice ? 0.95 : 0.55),
			0.003,
		);
		if (p.contentsEnabled) {
			for (let i = 0; i < 4; i++) {
				const x = ((i % 2) - 0.5) * w * 0.42,
					y = offset + h * (0.35 + Math.floor(i / 2) * 0.31),
					color = [0xd8c28b, 0xaac3b2, 0xadb9cf, 0xd4aaa0][i];
				this.rounded(
					"Board Note",
					[w * 0.19, h * 0.2, d * 0.035],
					[x, y, faceZ + d * 0.08],
					this.accent(color),
					0.001,
				);
				if (notice)
					this.cylinder(
						"Noticeboard Pin",
						f * 0.2,
						f * 0.2,
						d * 0.1,
						[x, y + h * 0.075, faceZ + d * 0.15],
						this.accent(0x6b7e7c),
						12,
					).rotation.x = Math.PI / 2;
			}
			if (!notice)
				for (let i = 0; i < 3; i++)
					this.addBox(
						"Whiteboard Mark",
						[w * 0.16, h * 0.008, d * 0.02],
						[-w * 0.18, offset + h * (0.86 - i * 0.04), faceZ + d * 0.08],
						this.accent(0x496a78),
					);
		}
		if (p.trayEnabled && !notice)
			this.plate(
				"Whiteboard Tray",
				[w * 0.65, f * 0.4, d * 2.5],
				[0, offset - f * 0.4, d * 0.9],
				material,
				f * 0.2,
			);
		if (p.standEnabled)
			for (const side of [-1, 1]) {
				this.rounded(
					"Board Stand Upright",
					[f, offset + h * 0.7, f],
					[side * w * 0.35, (offset + h * 0.7) / 2, -d],
					material,
					0.003,
				);
				this.rounded(
					"Board Stand Foot",
					[w * 0.2, f, w * 0.3],
					[side * w * 0.35, f / 2, 0],
					material,
					0.003,
				);
			}
	}
}
