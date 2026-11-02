import type {Mesh} from "three";
import {ExtrudeGeometry, PointLight, Shape} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	number,
	NurseryObject,
} from "./primitives.js";

export class NightLightObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xd6c298) {
		super(
			"night-light",
			"Night light",
			"nurseryNightLightControls",
			[
				...dimensions(0.22, 0.1, 0.24),
				choice("style", "NightLightStyle", "star-light", [
					"star-light",
					"cloud-light",
				]),
				boolean("enabled", "NightLightEnabled", true),
				number("intensity", "NightLightIntensity", 0.3, 0, 3, 0.05),
				choice("lightColor", "NightLightColor", "warm-white", [
					"warm-white",
					"soft-blue",
					"soft-pink",
				]),
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
			color =
				p.lightColor === "soft-blue"
					? 0xb1d6ff
					: p.lightColor === "soft-pink"
						? 0xf2c2d0
						: 0xffdf9f;
		this.plate(
			"Night Light Base",
			[w * 0.7, h * 0.07, d],
			[0, h * 0.035, 0],
			material,
			Math.min(w, d) * 0.1,
		);
		const glow = this.accent(
			p.enabled ? color : 0xd4d7cc,
			0.6,
			0,
			1,
			Boolean(p.enabled),
		);
		if (p.style === "star-light") {
			const shape = new Shape();
			for (let i = 0; i < 10; i++) {
				const angle = Math.PI / 2 + (i * Math.PI) / 5,
					r = i % 2 ? 0.48 : 1,
					x = Math.cos(angle) * w * 0.47 * r,
					y = Math.sin(angle) * h * 0.44 * r + h * 0.55;
				if (i === 0) shape.moveTo(x, y);
				else shape.lineTo(x, y);
			}
			shape.closePath();
			const geometry = new ExtrudeGeometry(shape, {
				depth: d * 0.45,
				bevelEnabled: false,
			});
			geometry.translate(0, 0, -d * 0.225);
			this.addGeometry("Night Light Star", geometry, [0, 0, 0], material);
			const face = geometry.clone();
			face.scale(0.87, 0.87, 0.12);
			face.translate(0, h * 0.07, d * 0.25);
			this.addGeometry("Night Light Glow", face, [0, 0, 0], glow);
		} else {
			for (const [x, y, r] of [
				[-0.25, 0.48, 0.25],
				[0, 0.64, 0.34],
				[0.28, 0.5, 0.24],
			])
				this.ellipsoid(
					"Night Light Cloud",
					[w * r, h * r, d * 0.35],
					[w * x, h * y, 0],
					glow,
				);
			this.rounded(
				"Cloud Light Body",
				[w * 0.86, h * 0.21, d * 0.6],
				[0, h * 0.4, 0],
				glow,
				0.025,
			);
		}
		this.rounded(
			"Night Light Switch",
			[w * 0.12, h * 0.02, d * 0.1],
			[0, h * 0.08, d * 0.3],
			this.accent(0x8b968a),
			0.002,
		);
		const light = new PointLight(
			color,
			p.enabled ? Number(p.intensity) : 0,
			3,
			2,
		);
		light.name = "Night Light Source";
		light.position.set(0, h * 0.55, d * 0.6);
		light.internal = true;
		this.partsGroup.add(light);
	}
}
