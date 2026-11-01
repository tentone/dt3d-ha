import type {Mesh} from "three";
import {PointLight} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	LivingRoomObject,
	number,
} from "./primitives.js";

export class LampObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xd5c6aa) {
		super(
			"lamp",
			"Living room lamp",
			"livingLampControls",
			[
				choice("style", "LampStyle", "floor-lamp", [
					{
						value: "floor-lamp",
						parameters: {width: 0.42, depth: 0.42, height: 1.65},
					},
					{
						value: "table-lamp",
						parameters: {width: 0.3, depth: 0.3, height: 0.55},
					},
					{
						value: "pendant-light",
						parameters: {width: 0.45, depth: 0.45, height: 0.85},
					},
					{
						value: "wall-light",
						parameters: {width: 0.22, depth: 0.3, height: 0.35},
					},
				]),
				...dimensions(0.42, 0.42, 1.65),
				choice("shadeStyle", "ShadeStyle", "tapered-shade", [
					"tapered-shade",
					"drum-shade",
					"globe-shade",
				]),
				boolean("enabled", "LightEnabled", true),
				number("intensity", "LightIntensity", 2, 0, 30, 0.1),
				choice("temperature", "LightTemperature", "warm", [
					"warm",
					"neutral",
					"cool",
				]),
			],
			parameters,
			color,
			0.85,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		const radius = Math.min(w, d) / 2,
			sh = Math.min(h * 0.42, radius * 1.3),
			stem = Math.min(0.014, radius * 0.08);
		const pendant = p.style === "pendant-light",
			wall = p.style === "wall-light";
		const shadeY = pendant ? sh / 2 : h - sh / 2,
			z = wall ? d * 0.2 : 0;
		if (p.shadeStyle === "globe-shade")
			this.ellipsoid(
				"Lamp Globe",
				[radius, sh / 2, radius],
				[0, shadeY, z],
				material,
			);
		else
			this.cylinder(
				"Lamp Shade",
				p.shadeStyle === "drum-shade" ? radius : radius * 0.5,
				radius,
				sh,
				[0, shadeY, z],
				material,
				48,
				true,
			);
		const metal = this.accent(0x595047, 0.35, 0.65),
			lightColor =
				p.temperature === "cool"
					? 0xc5e3ff
					: p.temperature === "neutral"
						? 0xfff5df
						: 0xffca7d;
		const glow = this.accent(
			p.enabled ? lightColor : 0xe0ddd3,
			0.45,
			0,
			1,
			Boolean(p.enabled),
		);
		this.ellipsoid(
			"Lamp Bulb",
			[radius * 0.3, sh * 0.25, radius * 0.3],
			[0, shadeY - sh * 0.12, z],
			glow,
		);
		if (wall) {
			this.rounded(
				"Wall Light Plate",
				[w * 0.35, h * 0.6, d * 0.08],
				[0, h * 0.45, -d * 0.35],
				metal,
			);
			const arm = this.cylinder(
				"Wall Light Arm",
				stem,
				stem,
				d * 0.55,
				[0, h * 0.4, -d * 0.075],
				metal,
			);
			arm.rotation.x = Math.PI / 2;
			this.cylinder(
				"Wall Light Stem",
				stem,
				stem,
				h * 0.4,
				[0, h * 0.6, z],
				metal,
			);
		} else if (pendant) {
			this.cylinder(
				"Pendant Cable",
				stem * 0.35,
				stem * 0.35,
				Math.max(0.001, h - sh),
				[0, sh + (h - sh) / 2, 0],
				metal,
			);
			this.cylinder(
				"Pendant Canopy",
				radius * 0.25,
				radius * 0.25,
				Math.min(0.025, h * 0.1),
				[0, h, 0],
				metal,
			);
		} else {
			this.cylinder(
				"Lamp Stem",
				stem,
				stem,
				h - sh / 2,
				[0, (h - sh / 2) / 2, 0],
				metal,
			);
			const baseH = Math.min(0.035, h * 0.08);
			this.cylinder(
				"Lamp Base",
				radius * 0.63,
				radius * 0.7,
				baseH,
				[0, baseH / 2, 0],
				metal,
			);
		}
		const light = new PointLight(
			lightColor,
			p.enabled ? Number(p.intensity) : 0,
			7,
			2,
		);
		light.name = "Lamp Light";
		light.position.set(0, shadeY - sh * 0.25, z);
		light.internal = true;
		this.partsGroup.add(light);
	}
}
