import type {Mesh} from "three";
import {CatmullRomCurve3, PointLight, TubeGeometry, Vector3} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	DiningObject,
	integer,
	number,
} from "./primitives.js";

export class DiningLightObject extends DiningObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb1975d) {
		super(
			"dining-light",
			"Dining room lighting",
			"diningLightControls",
			[
				choice("style", "LightStyle", "chandelier", [
					{
						value: "chandelier",
						parameters: {
							width: 0.85,
							depth: 0.85,
							height: 0.85,
							lightCount: 6,
							shadeStyle: "candle",
						},
					},
					{
						value: "pendant-light",
						parameters: {
							width: 0.6,
							depth: 0.6,
							height: 0.9,
							lightCount: 1,
							shadeStyle: "dome",
						},
					},
					{
						value: "wall-light",
						parameters: {
							width: 0.26,
							depth: 0.25,
							height: 0.4,
							lightCount: 1,
							shadeStyle: "globe",
						},
					},
				]),
				...dimensions(0.85, 0.85, 0.85),
				integer("lightCount", "LightCount", 6, 1, 10),
				choice("shadeStyle", "ShadeStyle", "candle", [
					"candle",
					"globe",
					"dome",
				]),
				boolean("enabled", "LightEnabled", true),
				number("intensity", "LightIntensity", 6, 0, 40, 0.1),
				choice("temperature", "Temperature", "warm", [
					"warm",
					"neutral",
					"cool",
				]),
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
			count = Number(p.lightCount);
		const r = Math.min(w, d),
			tube = Math.min(r * 0.018, h * 0.025),
			wall = p.style === "wall-light",
			chandelier = p.style === "chandelier";
		const lightColor =
			p.temperature === "cool"
				? 0xc5e3ff
				: p.temperature === "neutral"
					? 0xfff5df
					: 0xffca7d;
		const glow = this.accent(
			p.enabled ? lightColor : 0xe5dfd2,
			0.35,
			0,
			1,
			Boolean(p.enabled),
		);
		if (wall) {
			this.rounded(
				"Dining Sconce Plate",
				[w * 0.4, h * 0.7, d * 0.08],
				[0, h * 0.45, -d * 0.4],
				material,
			);
		} else {
			this.cylinder(
				"Ceiling Canopy",
				r * 0.12,
				r * 0.12,
				h * 0.035,
				[0, h * 0.98, 0],
				material,
			);
			this.cylinder(
				"Suspension Stem",
				tube * 0.5,
				tube * 0.5,
				h * 0.67,
				[0, h * 0.63, 0],
				material,
				16,
			);
		}
		if (chandelier)
			this.ellipsoid(
				"Chandelier Hub",
				[r * 0.09, h * 0.13, r * 0.09],
				[0, h * 0.32, 0],
				material,
			);
		for (let i = 0; i < count; i++) {
			const angle = (i * Math.PI * 2) / count,
				radius = chandelier ? r * 0.37 : count > 1 ? r * 0.25 : 0;
			const x = wall
				? ((i - (count - 1) / 2) * w * 0.7) / count
				: Math.cos(angle) * radius;
			const z = wall ? d * 0.2 : Math.sin(angle) * radius,
				y = wall ? h * 0.55 : chandelier ? h * 0.26 : h * 0.16;
			if (chandelier || wall) {
				const curve = new CatmullRomCurve3([
					new Vector3(0, h * 0.4, wall ? -d * 0.38 : 0),
					new Vector3(x * 0.55, h * 0.12, z * 0.55),
					new Vector3(x, y, z),
				]);
				this.addGeometry(
					"Light Arm",
					new TubeGeometry(curve, 20, tube, 8, false),
					[0, 0, 0],
					material,
				);
			} else
				this.rod(
					"Pendant Cable",
					[x, y, z],
					[0, h * 0.93, 0],
					tube * 0.35,
					material,
				);
			const size = Math.min(
				(r * (chandelier ? 0.1 : wall ? 0.3 : 0.45)) /
					Math.sqrt(count > 1 && !chandelier ? count : 1),
				h * 0.22,
			);
			if (p.shadeStyle === "candle") {
				this.cylinder(
					"Candle Socket",
					size * 0.85,
					size,
					size * 0.15,
					[x, y, z],
					material,
				);
				this.cylinder(
					"Light Candle",
					size * 0.3,
					size * 0.3,
					size * 1.9,
					[x, y + size, z],
					this.accent(0xece3cf),
				);
				this.ellipsoid(
					"Light Bulb",
					[size * 0.3, size * 0.55, size * 0.3],
					[x, y + size * 2.1, z],
					glow,
				);
			} else if (p.shadeStyle === "globe")
				this.ellipsoid(
					"Light Globe",
					[size, size, size],
					[x, y + size, z],
					glow,
				);
			else {
				this.lathe(
					"Pendant Shade",
					[
						[size, 0],
						[size * 0.97, size * 0.3],
						[size * 0.7, size * 0.8],
						[size * 0.15, size],
						[size * 0.14, size * 0.91],
						[size * 0.63, size * 0.72],
						[size * 0.88, size * 0.25],
						[size * 0.9, 0],
						[size, 0],
					],
					[x, y, z],
					material,
				);
				this.ellipsoid(
					"Light Bulb",
					[size * 0.24, size * 0.27, size * 0.24],
					[x, y + size * 0.25, z],
					glow,
				);
			}
			const light = new PointLight(
				lightColor,
				p.enabled ? Number(p.intensity) / count : 0,
				7,
				2,
			);
			light.name = "Dining Light";
			light.position.set(
				x,
				y + size * (p.shadeStyle === "candle" ? 2.1 : 0.5),
				z,
			);
			light.internal = true;
			this.partsGroup.add(light);
		}
	}
}
