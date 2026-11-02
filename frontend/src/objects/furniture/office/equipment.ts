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

export class DesktopComputerObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x61747d) {
		super(
			"desktop-computer",
			"Desktop computer",
			"officeComputerControls",
			[
				choice("style", "ComputerStyle", "tower-computer", [
					{
						value: "tower-computer",
						parameters: {width: 0.2, depth: 0.42, height: 0.45},
					},
					{
						value: "all-in-one-computer",
						parameters: {width: 0.6, depth: 0.2, height: 0.48},
					},
				]),
				...dimensions(0.2, 0.42, 0.45),
				boolean("enabled", "EquipmentOn", true),
				boolean("keyboardEnabled", "ComputerKeyboard", false),
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
			dark = this.accent(0x25333d, 0.45);
		if (p.style === "all-in-one-computer") {
			this.screen(
				"Computer",
				w,
				h * 0.75,
				d * 0.12,
				[0, h * 0.62, 0],
				material,
				Boolean(p.enabled),
			);
			this.rounded(
				"Computer Stand",
				[w * 0.1, h * 0.3, d * 0.15],
				[0, h * 0.15, 0],
				material,
				0.004,
			);
			this.plate(
				"Computer Foot",
				[w * 0.4, h * 0.025, d],
				[0, h * 0.0125, 0],
				material,
				d * 0.15,
			);
		} else {
			this.rounded("Computer Tower", [w, h, d], [0, h / 2, 0], material, 0.008);
			this.rounded(
				"Computer Front Panel",
				[w * 0.87, h * 0.9, d * 0.03],
				[0, h * 0.51, d * 0.51],
				dark,
				0.006,
			);
			this.cylinder(
				"Computer Power Button",
				w * 0.045,
				w * 0.045,
				d * 0.015,
				[w * 0.22, h * 0.86, d * 0.54],
				this.accent(
					p.enabled ? 0x8ebdc1 : 0x4c5a60,
					0.3,
					0,
					1,
					Boolean(p.enabled),
				),
				20,
			).rotation.x = Math.PI / 2;
			for (let i = 0; i < 6; i++)
				this.rounded(
					"Computer Front Vent",
					[w * 0.58, h * 0.012, d * 0.02],
					[0, h * (0.18 + i * 0.07), d * 0.535],
					this.accent(0x71828a),
					0.001,
				);
			for (const side of [-1, 1])
				this.rounded(
					"Computer USB Port",
					[w * 0.13, h * 0.018, d * 0.015],
					[side * w * 0.15, h * 0.75, d * 0.54],
					this.accent(0x1c292f),
					0.001,
				);
		}
		if (p.keyboardEnabled) {
			const kw = p.style === "tower-computer" ? w * 2.2 : w * 0.8;
			this.rounded(
				"Computer Keyboard",
				[kw, h * 0.025, d * 0.4],
				[0, h * 0.0125, d * 0.95],
				dark,
				0.005,
			);
			for (let i = 0; i < 10; i++)
				this.addBox(
					"Keyboard Key Strip",
					[kw * 0.065, h * 0.005, d * 0.28],
					[(i / 9 - 0.5) * kw * 0.85, h * 0.028, d * 0.95],
					this.accent(0x64747b),
				);
		}
	}
}

export class OfficeMonitorObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x4b5d68) {
		super(
			"office-monitor",
			"Monitor",
			"officeMonitorControls",
			[
				...dimensions(0.6, 0.2, 0.45),
				integer("screenCount", "ScreenCount", 1, 1, 3),
				number("screenTilt", "ScreenTilt", 0, -15, 20, 1),
				number("spacing", "ScreenSpacing", 0.06, 0, 0.3),
				boolean("enabled", "EquipmentOn", true),
			],
			parameters,
			color,
			0.4,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			count = Number(p.screenCount);
		for (let i = 0; i < count; i++) {
			const x = (i - (count - 1) / 2) * (w + Number(p.spacing)),
				before = this.partsGroup.children.length;
			this.screen(
				"Monitor",
				w,
				h * 0.7,
				d * 0.09,
				[x, h * 0.63, 0],
				material,
				Boolean(p.enabled),
			);
			this.hingeParts(
				"Monitor Tilt Hinge",
				this.partsGroup.children.slice(before),
				[x, h * 0.45, 0],
				(Number(p.screenTilt) * Math.PI) / 180,
				"x",
			);
			this.rounded(
				"Monitor Neck",
				[w * 0.07, h * 0.33, d * 0.11],
				[x, h * 0.21, -d * 0.09],
				material,
				0.004,
			);
			this.plate(
				"Monitor Base",
				[w * 0.42, h * 0.03, d],
				[x, h * 0.015, 0],
				material,
				d * 0.1,
			);
		}
	}
}

export class OfficeLaptopObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9aa6ae) {
		super(
			"office-laptop",
			"Laptop",
			"officeLaptopControls",
			[
				...dimensions(0.34, 0.24, 0.025),
				boolean("lidOpen", "LaptopOpen", true),
				number("openingAngle", "LaptopAngle", 110, 30, 150, 1),
				boolean("enabled", "EquipmentOn", true),
			],
			parameters,
			color,
			0.35,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(h * 0.25, d * 0.025, w * 0.025),
			base = h - t,
			dark = this.accent(0x33424c, 0.45);
		this.plate(
			"Laptop Base",
			[w, base, d],
			[0, base / 2, 0],
			material,
			Math.min(w, d) * 0.035,
		);
		this.rounded(
			"Laptop Keyboard Well",
			[w * 0.86, t * 0.15, d * 0.43],
			[0, base, d * -0.1],
			dark,
			0.003,
		);
		for (let row = 0; row < 4; row++)
			for (let col = 0; col < 11; col++)
				this.rounded(
					"Laptop Key",
					[w * 0.062, t * 0.15, d * 0.075],
					[(col - 5) * w * 0.073, base + t * 0.1, -d * 0.25 + row * d * 0.105],
					this.accent(0x73828c),
					0.001,
				);
		this.rounded(
			"Laptop Trackpad",
			[w * 0.35, t * 0.1, d * 0.24],
			[0, base + t * 0.05, d * 0.27],
			this.accent(0x7c8b95, 0.35),
			0.003,
		);
		const before = this.partsGroup.children.length;
		this.plate(
			"Laptop Lid",
			[w, t, d],
			[0, base + t / 2, 0],
			material,
			Math.min(w, d) * 0.035,
		);
		this.rounded(
			"Laptop Screen",
			[w * 0.9, t * 0.12, d * 0.82],
			[0, base - t * 0.09, 0],
			this.accent(
				p.enabled ? 0x345d76 : 0x192730,
				0.65,
				0,
				1,
				Boolean(p.enabled),
			),
			0.003,
		);
		this.hingeParts(
			"Laptop Lid Hinge",
			this.partsGroup.children.slice(before),
			[0, base, -d / 2],
			p.lidOpen ? (-Number(p.openingAngle) * Math.PI) / 180 : 0,
			"x",
		);
	}
}

export class OfficePrinterObject extends OfficeObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb9c0c1) {
		super(
			"office-printer",
			"Printer / scanner",
			"officePrinterControls",
			[
				choice("style", "PrinterStyle", "printer", [
					{
						value: "printer",
						parameters: {width: 0.45, depth: 0.35, height: 0.25},
					},
					{
						value: "scanner",
						parameters: {width: 0.43, depth: 0.3, height: 0.08},
					},
				]),
				...dimensions(0.45, 0.35, 0.25),
				boolean("lidOpen", "ScannerLid", false),
				boolean("paperEnabled", "PrinterPaper", true),
				boolean("enabled", "EquipmentOn", true),
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
			t = Math.min(w, d, h) * 0.07,
			printer = p.style === "printer",
			dark = this.accent(0x33434c, 0.4);
		this.rounded(
			"Printer Body",
			[w, h - t, d],
			[0, (h - t) / 2, 0],
			material,
			0.012,
		);
		this.rounded(
			"Scanner Glass",
			[w * 0.86, t * 0.15, d * 0.83],
			[0, h - t * 0.8, 0],
			this.accent(0x8aa8b4, 0.18, 0.15),
			0.005,
		);
		const before = this.partsGroup.children.length;
		this.rounded(
			"Scanner Lid",
			[w * 0.95, t, d * 0.94],
			[0, h - t / 2, 0],
			material,
			0.008,
		);
		this.hingeParts(
			"Scanner Lid Hinge",
			this.partsGroup.children.slice(before),
			[0, h - t, -d * 0.47],
			p.lidOpen ? -Math.PI * 0.42 : 0,
			"x",
		);
		if (printer) {
			this.rounded(
				"Printer Output Slot",
				[w * 0.78, h * 0.16, t],
				[0, h * 0.29, d / 2 + t * 0.1],
				dark,
				0.004,
			);
			this.plate(
				"Printer Output Tray",
				[w * 0.75, t * 0.5, d * 0.5],
				[0, h * 0.16, d * 0.53],
				material,
				0.005,
			);
			if (p.paperEnabled)
				this.rounded(
					"Printer Paper",
					[w * 0.64, t * 0.3, d * 0.48],
					[0, h * 0.18, d * 0.6],
					this.accent(0xe7e5d8),
					0.001,
				);
		} else if (p.paperEnabled)
			this.rounded(
				"Scanner Paper",
				[w * 0.65, t * 0.1, d * 0.75],
				[0, h - t * 0.65, 0],
				this.accent(0xe7e5d8),
				0.001,
			);
		this.rounded(
			"Printer Control Panel",
			[w * 0.25, h * 0.13, t],
			[w * 0.24, h * 0.7, d / 2 + t * 0.1],
			dark,
			0.003,
		);
		this.cylinder(
			"Printer Status",
			w * 0.018,
			w * 0.018,
			t * 0.3,
			[w * 0.24, h * 0.7, d / 2 + t * 0.8],
			this.accent(
				p.enabled ? 0x88bba9 : 0x53656b,
				0.4,
				0,
				1,
				Boolean(p.enabled),
			),
			16,
		).rotation.x = Math.PI / 2;
	}
}
