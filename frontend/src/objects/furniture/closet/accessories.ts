import type {Mesh} from "three";
import {
	CurvePath,
	LineCurve3,
	PointLight,
	TubeGeometry,
	Vector3,
} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {MirrorObject} from "../living-room/decoration.js";
import {
	boolean,
	choice,
	ClosetObject,
	dimensions,
	integer,
	number,
} from "./primitives.js";

export class DressingMirrorObject extends MirrorObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb4a079) {
		super(parameters, color, "dressing-mirror", [
			choice("style", "MirrorStyle", "full-length-mirror", [
				{
					value: "full-length-mirror",
					parameters: {
						width: 0.65,
						depth: 0.04,
						height: 1.8,
						shape: "arched",
						standEnabled: true,
						illuminated: false,
					},
				},
				{
					value: "illuminated-mirror",
					parameters: {
						width: 0.7,
						depth: 0.05,
						height: 1.8,
						shape: "rectangle",
						standEnabled: false,
						illuminated: true,
					},
				},
			]),
			boolean("illuminated", "Illuminated", false),
			boolean("enabled", "LightEnabled", true),
			number("intensity", "LightIntensity", 0.35, 0, 5, 0.05),
			choice("temperature", "LightTemperature", "warm", [
				"warm",
				"neutral",
				"cool",
			]),
		]);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		super.buildFurniture(material);
		const p = this.parameters;
		if (!p.illuminated) return;
		const w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			f = Math.min(Number(p.frameWidth), w * 0.2, h * 0.2),
			inset = f * 0.55,
			z = d / 2 + 0.006,
			points: Vector3[] = [],
			push = (x: number, y: number) => points.push(new Vector3(x, y, z));
		if (p.shape === "round" || p.shape === "oval") {
			const mh = p.shape === "round" ? Math.min(w, h) : h;
			for (let i = 0; i < 64; i++) {
				const a = (i / 64) * Math.PI * 2;
				push(
					Math.cos(a) * (w / 2 - inset),
					mh / 2 + Math.sin(a) * (mh / 2 - inset),
				);
			}
		} else if (p.shape === "arched") {
			const r = Math.min(w / 2, h * 0.45);
			push(-w / 2 + inset, inset);
			push(w / 2 - inset, inset);
			for (let i = 0; i <= 32; i++) {
				const a = (i / 32) * Math.PI;
				push(Math.cos(a) * (w / 2 - inset), h - r + Math.sin(a) * (r - inset));
			}
		} else {
			push(-w / 2 + inset, inset);
			push(w / 2 - inset, inset);
			push(w / 2 - inset, h - inset);
			push(-w / 2 + inset, h - inset);
		}
		const path = new CurvePath<Vector3>();
		for (let i = 0; i < points.length; i++)
			path.add(new LineCurve3(points[i], points[(i + 1) % points.length]));
		const color =
				p.temperature === "cool"
					? 0xc9e5ff
					: p.temperature === "neutral"
						? 0xfff3dc
						: 0xffd29a,
			lit = Boolean(p.enabled),
			intensity = Number(p.intensity),
			led = this.accent(lit ? color : 0xe5e2d8, 0.6);
		led.emissive.setHex(lit ? color : 0x000000);
		led.emissiveIntensity = lit ? intensity : 0;
		initializeMeshShadowSettings(
			this.addGeometry(
				"Dressing Mirror LED",
				new TubeGeometry(path, 128, Math.max(0.0008, f * 0.12), 6, true),
				[0, 0, 0],
				led,
			),
			{castShadow: false, receiveShadow: false},
		);
		const light = new PointLight(
			color,
			lit ? intensity : 0,
			Math.max(w, h) * 2,
			2,
		);
		light.name = "Dressing Mirror Light";
		light.position.set(0, h * 0.7, Math.max(0.3, w * 0.65));
		this.partsGroup.add(light);
	}
}

export class ClothesStandObject extends ClosetObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa8865e) {
		super(
			"clothes-stand",
			"Clothes stand",
			"closetStandControls",
			[
				choice("style", "StandStyle", "valet-stand", [
					{
						value: "valet-stand",
						parameters: {width: 0.45, depth: 0.4, height: 1.1},
					},
					{
						value: "coat-tree",
						parameters: {width: 0.5, depth: 0.5, height: 1.65},
					},
				]),
				...dimensions(0.45, 0.4, 1.1),
				integer("hookCount", "StandHooks", 6, 3, 8),
				boolean("clothesEnabled", "StandClothes", true),
				boolean("shoeShelf", "StandShelf", true),
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
			r = Math.min(w, d) * 0.045,
			tree = p.style === "coat-tree";
		this.rounded(
			"Clothes Stand Base",
			[w, h * 0.035, d],
			[0, h * 0.0175, 0],
			material,
			Math.min(w, d) * 0.12,
		);
		this.cylinder(
			"Clothes Stand Post",
			r,
			r * 1.25,
			h * 0.94,
			[0, h * 0.5, 0],
			material,
		);
		if (tree) {
			const n = Number(p.hookCount),
				reach = Math.min(w, d) * 0.4;
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2,
					tip: [number, number, number] = [
						Math.cos(a) * reach,
						h * (0.88 + (i % 2) * 0.07),
						Math.sin(a) * reach,
					];
				this.rail(
					"Clothes Stand Hook",
					[0, h * (0.73 + (i % 2) * 0.07), 0],
					tip,
					r * 0.55,
					material,
				);
				this.ellipsoid("Clothes Stand Hook Tip", [r, r, r], tip, material);
			}
			if (p.clothesEnabled) {
				const fabric = this.accent(0xc0ac94, 0.98);
				this.rounded(
					"Clothes Stand Scarf",
					[w * 0.14, h * 0.4, r],
					[Math.min(w, d) * 0.4, h * 0.68, 0],
					fabric,
					0.008,
				);
				this.ellipsoid(
					"Clothes Stand Hat Brim",
					[w * 0.3, h * 0.015, d * 0.3],
					[0, h * 0.99, 0],
					fabric,
				);
				this.ellipsoid(
					"Clothes Stand Hat Crown",
					[w * 0.19, h * 0.055, d * 0.19],
					[0, h * 1.02, 0],
					fabric,
				);
			}
		} else {
			for (const s of [-1, 1])
				this.rail(
					"Valet Shoulder Hanger",
					[0, h * 0.98, 0],
					[s * w * 0.42, h * 0.88, 0],
					r * 0.65,
					material,
				);
			this.rail(
				"Valet Trouser Rail",
				[-w * 0.38, h * 0.65, d * 0.22],
				[w * 0.38, h * 0.65, d * 0.22],
				r * 0.6,
				material,
			);
			for (const s of [-1, 1])
				this.rail(
					"Valet Rail Support",
					[0, h * 0.6, 0],
					[s * w * 0.38, h * 0.65, d * 0.22],
					r * 0.4,
					material,
				);
			if (p.shoeShelf)
				this.rounded(
					"Valet Shoe Shelf",
					[w * 0.86, h * 0.025, d * 0.86],
					[0, h * 0.13, 0],
					material,
					0.01,
				);
			if (p.clothesEnabled) {
				this.rounded(
					"Valet Jacket",
					[w * 0.73, h * 0.33, r * 0.8],
					[0, h * 0.71, r],
					this.accent(0x7e929e, 0.98),
					0.015,
				);
				this.rounded(
					"Valet Trousers",
					[w * 0.58, h * 0.26, r * 0.7],
					[0, h * 0.52, d * 0.22],
					this.accent(0xa19583, 0.98),
					0.008,
				);
			}
		}
	}
}
