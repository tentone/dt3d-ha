import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	PatioObject,
} from "./primitives.js";

export class ParasolObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc7b58b) {
		super(
			"parasol",
			"Parasol",
			"patioParasolControls",
			[
				...dimensions(2.6, 2.6, 2.4),
				choice("style", "ParasolStyle", "center-pole", [
					"center-pole",
					"cantilever",
				]),
				boolean("open", "ParasolOpen", true),
				number("tilt", "ParasolTilt", 0, 0, 30, 1),
				integer("ribs", "ParasolRibs", 8, 6, 12),
			],
			parameters,
			color,
			0.95,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			n = Number(p.ribs),
			open = Boolean(p.open),
			rx = w * (open ? 0.5 : 0.055),
			rz = d * (open ? 0.5 : 0.055),
			drop = h * (open ? 0.14 : 0.48),
			t = Math.min(w, d, h) * 0.012,
			metal = this.accent(0x6d746a, 0.4, 0.4),
			before = this.partsGroup.children.length;
		this.fabric(
			"Parasol Canopy",
			n * 4,
			4,
			(u, v) => {
				const a = u * Math.PI * 2;
				return [
					Math.cos(a) * rx * v,
					h - drop * v + Math.sin(u * n * Math.PI * 2) * t * v,
					Math.sin(a) * rz * v,
				];
			},
			material,
		);
		this.rail(
			"Parasol Crown Stem",
			[0, h * 0.94, 0],
			[0, h, 0],
			t * 0.6,
			metal,
		);
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2;
			this.rail(
				"Parasol Rib",
				[0, h - t, 0],
				[Math.cos(a) * rx, h - drop, Math.sin(a) * rz],
				t * 0.3,
				metal,
			);
		}
		const canopy = this.hingeParts(
			"Parasol Tilt",
			this.partsGroup.children.slice(before),
			[0, h * 0.94, 0],
			0,
		);
		canopy.rotation.z = (Number(p.tilt) * Math.PI) / 180;
		const x = p.style === "cantilever" ? -w * 0.52 : 0;
		this.cylinder(
			"Parasol Base",
			Math.min(w, d) * 0.14,
			Math.min(w, d) * 0.17,
			h * 0.035,
			[x, h * 0.0175, 0],
			this.accent(0x73776d, 0.8),
			40,
		);
		this.rail(
			"Parasol Pole",
			[x, h * 0.03, 0],
			[x, h * 0.94, 0],
			t * 0.7,
			metal,
		);
		if (x)
			this.rail(
				"Parasol Cantilever Arm",
				[x, h * 0.94, 0],
				[0, h * 0.94, 0],
				t,
				metal,
			);
	}
}

export class PergolaObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa38c68) {
		super(
			"pergola",
			"Pergola",
			"patioPergolaControls",
			[
				...dimensions(3, 2.5, 2.4),
				choice("mount", "PergolaMount", "freestanding", [
					"freestanding",
					"wall-mounted",
				]),
				choice("roofStyle", "PergolaRoof", "slats", ["slats", "fabric"]),
				integer("rafterCount", "PergolaRafters", 8, 3, 16),
				number("slatAngle", "PergolaAngle", 0, 0, 85, 1),
				boolean("curtains", "PergolaCurtains", false),
				number("curtainOpen", "CurtainOpen", 1, 0, 1, 0.05),
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
			n = Number(p.rafterCount),
			fabric = this.accent(0xd4cbb6, 0.98);
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				if (p.mount !== "wall-mounted" || z > 0)
					this.rounded(
						"Pergola Post",
						[t, h, t],
						[(x * (w - t)) / 2, h / 2, (z * (d - t)) / 2],
						material,
						0.006,
					);
		for (const side of [-1, 1]) {
			this.rounded(
				"Pergola Beam",
				[w, t * 1.4, t],
				[0, h - t, (side * (d - t)) / 2],
				material,
				0.005,
			);
			this.rounded(
				"Pergola Beam",
				[t, t * 1.4, d],
				[(side * (w - t)) / 2, h - t, 0],
				material,
				0.005,
			);
		}
		if (p.roofStyle === "slats")
			for (let i = 0; i < n; i++) {
				this.rounded(
					"Pergola Roof Slat",
					[w - t * 2, t * 0.35, ((d - t * 2) / n) * 0.78],
					[0, h - t * 0.3, -d / 2 + t + ((i + 0.5) * (d - t * 2)) / n],
					material,
					0.003,
				).rotation.x = (Number(p.slatAngle) * Math.PI) / 180;
			}
		else
			this.fabric(
				"Pergola Fabric Roof",
				12,
				8,
				(u, v) => [
					(u - 0.5) * (w - t),
					h - t * 0.3 - h * 0.02 * Math.sin(v * Math.PI * 8),
					(v - 0.5) * (d - t),
				],
				fabric,
			);
		if (p.curtains)
			for (const side of [-1, 1]) {
				const cw = ((w - t * 2) / 2) * (1 - Number(p.curtainOpen) * 0.88),
					cx = side * (w / 2 - t - cw / 2);
				this.fabric(
					"Pergola Curtain",
					12,
					12,
					(u, v) => [
						cx + (u - 0.5) * cw,
						h * 0.04 + v * h * 0.88,
						d / 2 - t + Math.sin(u * Math.PI * 12) * t * 0.6,
					],
					fabric,
				);
			}
	}
}

export class RetractableAwningObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xd2c39b) {
		super(
			"retractable-awning",
			"Retractable awning",
			"patioAwningControls",
			[
				...dimensions(3, 2, 0.5),
				number("extension", "AwningExtension", 1, 0, 1, 0.05),
				number("pitch", "AwningPitch", 12, 0, 35, 1),
				integer("armCount", "AwningArms", 2, 2, 4),
				boolean("striped", "AwningStripes", true),
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
			t = Math.min(w, d, h) * 0.06,
			length = d * Number(p.extension),
			a = (Number(p.pitch) * Math.PI) / 180,
			projection = length * Math.cos(a),
			drop = length * Math.sin(a),
			metal = this.accent(0x979f98, 0.4, 0.6),
			stripe = this.accent(0x84988b, 0.95);
		this.rounded(
			"Awning Cassette",
			[w, h * 0.22, t * 2],
			[0, h - h * 0.11, -d / 2],
			material,
			0.025,
		);
		if (length < 0.001) return;
		for (let i = 0; i < 10; i++)
			this.rounded(
				"Awning Fabric",
				[(w / 10) * 0.999, t * 0.15, length],
				[((i + 0.5) / 10 - 0.5) * w, h - drop / 2, -d / 2 + projection / 2],
				p.striped && i % 2 ? stripe : material,
				0.001,
			).rotation.x = a;
		this.rail(
			"Awning Front Bar",
			[-w / 2, h - drop, -d / 2 + projection],
			[w / 2, h - drop, -d / 2 + projection],
			t * 0.6,
			metal,
		);
		this.rounded(
			"Awning Valance",
			[w, h * 0.15, t * 0.12],
			[0, h - drop - h * 0.075, -d / 2 + projection],
			material,
			0.002,
		);
		for (let i = 0; i < Number(p.armCount); i++) {
			const x = ((i + 0.5) / Number(p.armCount) - 0.5) * w * 0.85,
				side = i % 2 ? 1 : -1,
				elbow: [number, number, number] = [
					x + side * w * 0.09,
					h - drop * 0.5 - t,
					-d / 2 + projection * 0.5,
				];
			this.rail(
				"Awning Folding Arm",
				[x, h - t, -d / 2],
				elbow,
				t * 0.4,
				metal,
			);
			this.rail(
				"Awning Folding Arm",
				elbow,
				[x, h - drop - t, -d / 2 + projection],
				t * 0.4,
				metal,
			);
		}
	}
}
