import type {Mesh} from "three";
import {CircleGeometry, PointLight, TorusGeometry} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	number,
	PatioObject,
} from "./primitives.js";

export class HotTubObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x8b7e69) {
		super(
			"hot-tub",
			"Hot tub",
			"patioTubControls",
			[
				...dimensions(2, 2, 0.9),
				choice("shape", "TubShape", "square", ["square", "round"]),
				boolean("waterEnabled", "TubWater", true),
				number("waterLevel", "WaterLevel", 0.78, 0.35, 0.88),
				integer("jetCount", "TubJets", 8, 0, 16),
				boolean("stepsEnabled", "TubSteps", true),
				boolean("coverClosed", "TubCover", false),
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
			t = Math.min(w, d, h) * 0.08,
			liner = this.accent(0xcbd3c9, 0.35),
			metal = this.accent(0xb8c5c2, 0.3, 0.7),
			round = p.shape === "round";
		if (round) {
			const body = this.lathe(
				"Hot Tub Shell",
				[
					[0, 0],
					[1, 0],
					[1, h],
					[0.83, h],
					[0.83, h * 0.18],
					[0, h * 0.18],
				],
				[0, 0, 0],
				material,
			);
			body.scale.set(w / 2, 1, d / 2);
			const inner = this.lathe(
				"Hot Tub Liner",
				[
					[0, h * 0.19],
					[0.82, h * 0.19],
					[0.82, h * 0.95],
					[0.8, h * 0.95],
					[0.8, h * 0.2],
					[0, h * 0.2],
				],
				[0, 0, 0],
				liner,
			);
			inner.scale.set(w / 2, 1, d / 2);
		} else {
			this.addBox(
				"Hot Tub Floor",
				[w, h * 0.16, d],
				[0, h * 0.08, 0],
				material,
			);
			for (const side of [-1, 1]) {
				this.rounded(
					"Hot Tub Wall",
					[t, h, d],
					[(side * (w - t)) / 2, h / 2, 0],
					material,
					0.012,
				);
				this.rounded(
					"Hot Tub Wall",
					[w - t * 2, h, t],
					[0, h / 2, (side * (d - t)) / 2],
					material,
					0.012,
				);
				this.rounded(
					"Hot Tub Seat",
					[w - t * 2, h * 0.14, d * 0.13],
					[0, h * 0.3, side * d * 0.33],
					liner,
					0.025,
				);
				this.rounded(
					"Hot Tub Liner Wall",
					[w - t * 2, h * 0.7, t * 0.18],
					[0, h * 0.58, side * (d / 2 - t * 0.95)],
					liner,
					0.009,
				);
				this.rounded(
					"Hot Tub Liner Wall",
					[t * 0.18, h * 0.7, d - t * 2],
					[side * (w / 2 - t * 0.95), h * 0.58, 0],
					liner,
					0.009,
				);
			}
			this.rounded(
				"Hot Tub Interior Floor",
				[w - t * 2, t * 0.15, d - t * 2],
				[0, h * 0.17, 0],
				liner,
				0.008,
			);
		}
		if (p.waterEnabled) {
			const waterMaterial = this.accent(0x6da8ad, 0.15, 0.1, 0.62),
				y = h * Number(p.waterLevel),
				water = round
					? this.addGeometry(
						"Hot Tub Water",
						new CircleGeometry(1, 64),
						[0, y, 0],
						waterMaterial,
					)
					: this.addBox(
						"Hot Tub Water",
						[w - t * 2, t * 0.1, d - t * 2],
						[0, y, 0],
						waterMaterial,
					);
			if (round) {
				water.rotation.x = -Math.PI / 2;
				water.scale.set(w * 0.398, d * 0.398, 1);
			}
			initializeMeshShadowSettings(water, {
				castShadow: false,
				receiveShadow: false,
			});
		}
		for (let i = 0; i < Number(p.jetCount); i++) {
			const a = (i / Number(p.jetCount)) * Math.PI * 2,
				den = round
					? 1
					: Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))),
				x = (Math.cos(a) / den) * (round ? w * 0.399 : w / 2 - t * 0.99),
				z = (Math.sin(a) / den) * (round ? d * 0.399 : d / 2 - t * 0.99),
				jet = this.addGeometry(
					"Hot Tub Jet",
					new TorusGeometry(Math.min(w, d, h) * 0.025, t * 0.12, 8, 20),
					[x, h * 0.57, z],
					metal,
				);
			jet.lookAt(0, h * 0.57, 0);
		}
		if (p.coverClosed) {
			if (round) {
				const cover = this.cylinder(
					"Hot Tub Cover",
					1,
					1,
					t * 0.7,
					[0, h + t * 0.35, 0],
					material,
					64,
				);
				cover.scale.set(w / 2, 1, d / 2);
			} else
				this.rounded(
					"Hot Tub Cover",
					[w, t * 0.7, d],
					[0, h + t * 0.35, 0],
					material,
					0.025,
				);
		}
		if (p.stepsEnabled)
			for (let i = 0; i < 2; i++)
				this.rounded(
					"Hot Tub Step",
					[w * 0.42, h * (i + 1) * 0.16, d * 0.2],
					[0, h * (i + 1) * 0.08, d * (0.76 - i * 0.17)],
					material,
					0.012,
				);
	}
}

export class FirePitObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x6c7470) {
		super(
			"fire-pit",
			"Fire pit",
			"patioFirePitControls",
			[
				choice("style", "FirePitStyle", "bowl", [
					{
						value: "bowl",
						parameters: {width: 0.9, depth: 0.9, height: 0.55},
					},
					{
						value: "fire-table",
						parameters: {width: 1.1, depth: 0.9, height: 0.5},
					},
				]),
				...dimensions(0.9, 0.9, 0.55),
				boolean("lit", "FireOn", false),
				number("intensity", "FireBrightness", 0.7, 0, 4, 0.05),
				boolean("coverClosed", "FirePitCover", false),
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
			t = Math.min(w, d, h) * 0.07,
			dark = this.accent(0x3c4543, 0.85),
			table = p.style === "fire-table",
			lit = Boolean(p.lit) && !p.coverClosed;
		if (table) {
			for (const side of [-1, 1]) {
				this.rounded(
					"Fire Table Wall",
					[w, h, d * 0.16],
					[0, h / 2, side * d * 0.42],
					material,
					0.012,
				);
				this.rounded(
					"Fire Table Wall",
					[w * 0.16, h, d * 0.68],
					[side * w * 0.42, h / 2, 0],
					material,
					0.012,
				);
			}
			this.addBox(
				"Fire Table Tray",
				[w * 0.68, t, d * 0.68],
				[0, h * 0.63, 0],
				dark,
			);
		} else {
			const r = w * 0.5,
				body = this.lathe(
					"Fire Pit Bowl",
					[
						[0, 0],
						[r * 0.35, 0],
						[r * 0.5, h * 0.15],
						[r, h * 0.78],
						[r - t, h * 0.78],
						[r * 0.4, h * 0.18],
						[0, h * 0.18],
					],
					[0, 0, 0],
					material,
				);
			body.scale.z = d / w;
		}
		this.fire(
			0,
			h * (table ? 0.7 : 0.52),
			0,
			Math.min(w, d) * 0.56,
			h * 0.38,
			lit,
		);
		if (p.coverClosed) {
			if (table)
				this.rounded(
					"Fire Pit Cover",
					[w, t, d],
					[0, h + t / 2, 0],
					material,
					0.012,
				);
			else {
				const cover = this.cylinder(
					"Fire Pit Cover",
					w * 0.5,
					w * 0.5,
					t,
					[0, h * 0.8, 0],
					material,
					48,
				);
				cover.scale.z = d / w;
			}
		}
		if (lit) {
			const light = new PointLight(
				0xffbd78,
				Number(p.intensity),
				Math.max(w, d, h) * 4,
				2,
			);
			light.name = "Patio Fire Light";
			light.position.set(0, h * 1.05, 0);
			this.partsGroup.add(light);
		}
	}
}

export class OutdoorHeaterObject extends PatioObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x89968f) {
		super(
			"outdoor-heater",
			"Outdoor heater",
			"patioHeaterControls",
			[
				choice("style", "HeaterStyle", "mushroom", ["mushroom", "pyramid"]),
				...dimensions(0.65, 0.65, 2.1),
				integer("guardRods", "HeaterGuards", 10, 4, 16),
				boolean("lit", "HeaterOn", false),
				number("intensity", "HeaterBrightness", 0.6, 0, 3, 0.05),
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
			r = Math.min(w, d) * 0.5,
			t = Math.min(w, d, h) * 0.025,
			dark = this.accent(0x46514e, 0.6, 0.5),
			glow = this.accent(
				p.lit ? 0xe8a963 : 0x9a9f97,
				0.6,
				0,
				1,
				Boolean(p.lit),
			),
			n = Number(p.guardRods);
		if (p.style === "mushroom") {
			this.cylinder(
				"Heater Base",
				r * 0.62,
				r * 0.68,
				h * 0.035,
				[0, h * 0.0175, 0],
				material,
				40,
			);
			this.cylinder(
				"Heater Tank Cover",
				r * 0.38,
				r * 0.5,
				h * 0.25,
				[0, h * 0.16, 0],
				material,
				32,
			);
			this.cylinder("Heater Pole", t, t, h * 0.5, [0, h * 0.53, 0], dark, 24);
			this.cylinder(
				"Heater Emitter",
				r * 0.23,
				r * 0.23,
				h * 0.12,
				[0, h * 0.81, 0],
				glow,
				32,
			);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2;
				this.rail(
					"Heater Guard",
					[Math.cos(a) * r * 0.3, h * 0.73, Math.sin(a) * r * 0.3],
					[Math.cos(a) * r * 0.3, h * 0.89, Math.sin(a) * r * 0.3],
					t * 0.2,
					dark,
				);
			}
			const roof = this.lathe(
				"Heater Reflector",
				[
					[r * 0.16, h * 0.98],
					[r, h * 0.9],
					[r, h * 0.89],
					[r * 0.16, h * 0.97],
				],
				[0, 0, 0],
				material,
			);
			roof.scale.z = d / w;
		} else {
			this.rounded(
				"Pyramid Heater Base",
				[w * 0.85, h * 0.2, d * 0.85],
				[0, h * 0.1, 0],
				material,
				0.015,
			);
			for (const x of [-1, 1])
				for (const z of [-1, 1])
					this.rail(
						"Pyramid Heater Frame",
						[x * w * 0.4, h * 0.18, z * d * 0.4],
						[x * w * 0.08, h * 0.94, z * d * 0.08],
						t * 0.6,
						dark,
					);
			this.cylinder(
				"Pyramid Heater Emitter",
				t * 1.5,
				t * 2,
				h * 0.63,
				[0, h * 0.54, 0],
				glow,
				24,
			);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2;
				this.rail(
					"Heater Guard",
					[Math.cos(a) * r * 0.64, h * 0.22, Math.sin(a) * r * 0.64],
					[Math.cos(a) * r * 0.14, h * 0.91, Math.sin(a) * r * 0.14],
					t * 0.18,
					material,
				);
			}
			this.plate(
				"Pyramid Heater Cap",
				[w * 0.28, t, d * 0.28],
				[0, h * 0.95, 0],
				material,
				t,
			);
		}
		if (p.lit) {
			const light = new PointLight(
				0xffc58b,
				Number(p.intensity),
				Math.max(w, d, h) * 2,
				2,
			);
			light.name = "Patio Heater Light";
			light.position.set(0, h * 0.8, 0);
			this.partsGroup.add(light);
		}
	}
}
