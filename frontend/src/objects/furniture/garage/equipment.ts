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

export class EVChargerObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc6cdcd) {
		super(
			"ev-charger",
			"EV charger",
			"garageChargerControls",
			[
				...dimensions(0.3, 0.16, 0.5),
				choice("mount", "ChargerMount", "wall-mounted", [
					"wall-mounted",
					"pedestal",
				]),
				number("postHeight", "ChargerPost", 1.25, 0.5, 2),
				integer("cableLoops", "CableLoops", 2, 1, 4),
				number("cableReach", "CableReach", 0.45, 0.2, 1.5),
				boolean("plugDocked", "PlugDocked", true),
				boolean("powered", "EquipmentPower", true),
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
			b = p.mount === "pedestal" ? Number(p.postHeight) : 0,
			dark = this.accent(0x303a40, 0.65),
			metal = this.accent(0x9ca7ac, 0.35, 0.65),
			green = this.accent(
				p.powered ? 0x8bd3ad : 0x65726c,
				0.35,
				0,
				1,
				Boolean(p.powered),
			),
			r = Math.min(w, d, h) * 0.045;
		this.rounded(
			"EV Charger Body",
			[w, h, d],
			[0, b + h / 2, 0],
			material,
			0.04,
		);
		this.rounded(
			"EV Charger Face",
			[w * 0.84, h * 0.82, d * 0.08],
			[0, b + h * 0.52, d * 0.52],
			dark,
			0.02,
		);
		this.rounded(
			"EV Charger Status",
			[w * 0.56, h * 0.025, d * 0.02],
			[0, b + h * 0.75, d * 0.57],
			green,
			0.003,
		);
		this.rounded(
			"EV Charger Screen",
			[w * 0.45, h * 0.18, d * 0.02],
			[0, b + h * 0.53, d * 0.57],
			this.accent(0x759ca9, 0.25),
			0.005,
		);
		if (b) {
			this.rounded(
				"EV Charger Post",
				[w * 0.32, b, d * 0.7],
				[0, b / 2, 0],
				metal,
				0.012,
			);
			this.rounded(
				"EV Charger Foot",
				[w * 1.5, Math.min(b * 0.04, 0.04), d * 2],
				[0, Math.min(b * 0.02, 0.02), 0],
				metal,
				0.01,
			);
		}
		const reach = Number(p.cableReach),
			loops = Number(p.cableLoops),
			points: [number, number, number][] = [[w * 0.25, b + h * 0.1, d * 0.55]],
			cx = w * 0.66,
			cy = b + h * 0.17,
			coilR = Math.min(reach * 0.5, h * 0.55);
		for (let i = 0; i <= loops * 40; i++) {
			const a = (i / 40) * Math.PI * 2;
			points.push([
				cx + Math.sin(a) * coilR,
				cy - Math.cos(a) * coilR,
				d * 0.7 + (i / (loops * 40)) * r * 3,
			]);
		}
		const end: [number, number, number] = p.plugDocked
			? [w * 0.52, b + h * 0.55, d * 0.65]
			: [w * 0.65 + reach, b + h * 0.18, d * 0.7];
		points.push([end[0], end[1] - h * 0.15, end[2]], end);
		this.cable("EV Charging Cable", points, r, dark);
		this.rounded(
			"EV Charging Plug",
			[w * 0.17, h * 0.19, d * 0.33],
			[end[0], end[1] + h * 0.06, end[2]],
			dark,
			0.008,
		).rotation.z = -0.3;
		this.rail(
			"EV Plug Connector",
			[end[0], end[1] + h * 0.12, end[2]],
			[end[0] - w * 0.09, end[1] + h * 0.18, end[2]],
			r * 1.2,
			metal,
		);
	}
}

export class GarageEquipmentObject extends GarageObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb47f63) {
		super(
			"garage-equipment",
			"Air compressor / pressure washer",
			"garageEquipmentControls",
			[
				choice("style", "EquipmentStyle", "air-compressor", [
					{
						value: "air-compressor",
						parameters: {width: 0.75, depth: 0.4, height: 0.7},
					},
					{
						value: "pressure-washer",
						parameters: {width: 0.4, depth: 0.35, height: 0.85},
					},
				]),
				...dimensions(0.75, 0.4, 0.7),
				boolean("hoseEnabled", "EquipmentHose", true),
				number("hoseCoil", "HoseCoil", 0.8, 0.3, 1.4),
				boolean("accessoryEnabled", "EquipmentAccessory", true),
				boolean("powered", "EquipmentPower", false),
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
			r = Math.min(w, d, h) * 0.15,
			metal = this.accent(0x939fa4, 0.35, 0.7),
			dark = this.accent(0x343c40, 0.8),
			th = Math.min(w, d, h) * 0.035;
		if (p.style === "air-compressor") {
			const tankR = Math.min(d * 0.43, h * 0.25),
				y = r + tankR;
			this.cylinder(
				"Compressor Tank",
				tankR,
				tankR,
				w * 0.69,
				[0, y, 0],
				material,
				32,
			).rotation.z = Math.PI / 2;
			for (const x of [-1, 1])
				this.ellipsoid(
					"Compressor Tank Cap",
					[w * 0.15, tankR, tankR],
					[x * w * 0.345, y, 0],
					material,
				);
			this.rounded(
				"Compressor Motor",
				[w * 0.4, h * 0.27, d * 0.65],
				[0, h * 0.68, 0],
				dark,
				0.02,
			);
			for (let i = 0; i < 5; i++)
				this.rounded(
					"Compressor Cooling Fin",
					[w * 0.42, h * 0.012, d * 0.66],
					[0, h * (0.57 + i * 0.045), 0],
					metal,
					0.002,
				);
			this.cylinder(
				"Compressor Gauge",
				h * 0.07,
				h * 0.07,
				th,
				[w * 0.19, h * 0.8, d * 0.2],
				metal,
				24,
			).rotation.x = Math.PI / 2;
			this.cylinder(
				"Compressor Dial",
				h * 0.056,
				h * 0.056,
				th * 0.2,
				[w * 0.19, h * 0.8, d * 0.2 + th * 0.6],
				this.accent(0xe2dfce, 0.8),
				24,
			).rotation.x = Math.PI / 2;
			this.rail(
				"Compressor Needle",
				[w * 0.19, h * 0.8, d * 0.2 + th * 0.8],
				[w * 0.19 + h * 0.035, h * 0.82, d * 0.2 + th * 0.8],
				th * 0.12,
				dark,
			);
			for (const x of [-1, 1])
				this.rail(
					"Compressor Handle",
					[x * w * 0.32, y, 0],
					[x * w * 0.32, h * 0.93, 0],
					th,
					metal,
				);
			this.rail(
				"Compressor Handle",
				[-w * 0.32, h * 0.93, 0],
				[w * 0.32, h * 0.93, 0],
				th * 1.5,
				dark,
			);
			if (p.accessoryEnabled)
				this.rail(
					"Compressor Air Gun",
					[w * 0.48, h * 0.35, d * 0.12],
					[w * 0.48, h * 0.62, d * 0.26],
					th * 0.6,
					metal,
				);
		} else {
			this.rounded(
				"Pressure Washer Body",
				[w * 0.8, h * 0.63, d * 0.82],
				[0, r + h * 0.31, 0],
				material,
				0.055,
			);
			this.rounded(
				"Pressure Washer Motor Cover",
				[w * 0.58, h * 0.24, d * 0.87],
				[0, h * 0.63, 0],
				dark,
				0.025,
			);
			for (let i = 0; i < 4; i++)
				this.rounded(
					"Pressure Washer Vent",
					[w * 0.37, h * 0.015, th * 0.3],
					[0, h * (0.56 + i * 0.045), d * 0.44],
					metal,
					0.002,
				);
			for (const x of [-1, 1])
				this.rail(
					"Pressure Washer Handle",
					[x * w * 0.33, h * 0.65, -d * 0.24],
					[x * w * 0.33, h * 0.98, -d * 0.24],
					th,
					metal,
				);
			this.rail(
				"Pressure Washer Handle",
				[-w * 0.33, h * 0.98, -d * 0.24],
				[w * 0.33, h * 0.98, -d * 0.24],
				th * 1.4,
				dark,
			);
			if (p.accessoryEnabled) {
				this.rail(
					"Pressure Washer Lance",
					[w * 0.54, h * 0.12, 0],
					[w * 0.54, h * 0.9, d * 0.08],
					th * 0.6,
					metal,
				);
				this.rounded(
					"Pressure Washer Trigger",
					[w * 0.09, h * 0.16, d * 0.14],
					[w * 0.54, h * 0.49, 0],
					dark,
					0.005,
				);
			}
		}
		for (const x of [-1, 1])
			this.wheel("Equipment Wheel", [x * w * 0.4, r, -d * 0.2], r, th * 2);
		this.rounded(
			"Equipment Front Foot",
			[w * 0.5, r * 0.3, d * 0.2],
			[0, r * 0.15, d * 0.28],
			dark,
			0.006,
		);
		for (const x of [-1, 1])
			this.rail(
				"Equipment Foot Support",
				[x * w * 0.19, r * 0.22, d * 0.28],
				[x * w * 0.19, h * 0.25, d * 0.18],
				th * 0.8,
				metal,
			);
		if (p.hoseEnabled) {
			const points: [number, number, number][] = [],
				coil = Math.min(w, d) * Number(p.hoseCoil) * 0.32;
			for (let i = 0; i <= 80; i++) {
				const a = (i / 20) * Math.PI;
				points.push([
					Math.sin(a) * coil,
					h * 0.42 + Math.cos(a) * coil,
					d * 0.5 + (i / 80) * th * 4,
				]);
			}
			this.cable(
				"Equipment Hose",
				points,
				th * 0.4,
				p.style === "air-compressor" ? this.accent(0xc5a55c, 0.8) : dark,
			);
		}
		this.rounded(
			"Equipment Power Indicator",
			[w * 0.08, h * 0.025, th],
			[w * 0.19, h * 0.72, d * 0.45],
			this.accent(
				p.powered ? 0x80bf8b : 0x68756a,
				0.5,
				0,
				1,
				Boolean(p.powered),
			),
			0.002,
		);
	}
}
