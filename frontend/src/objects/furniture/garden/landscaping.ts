import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GardenObject,
	integer,
	number,
} from "./primitives.js";

export class GardenVegetationObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x8e7657) {
		super(
			"garden-vegetation",
			"Trees / shrubs",
			"gardenVegetationControls",
			[
				choice("style", "VegetationStyle", "tree", [
					{value: "tree", parameters: {width: 2, depth: 2, height: 3.5}},
					{
						value: "conifer",
						parameters: {width: 1.6, depth: 1.6, height: 3.2},
					},
					{
						value: "shrub",
						parameters: {width: 0.9, depth: 0.8, height: 0.7},
					},
				]),
				...dimensions(2, 2, 3.5).map((def) =>
					def.name === "height" ? {...def, max: 12} : def,
				),
				integer("clumpCount", "LeafClumps", 9, 4, 18),
				number("trunkRatio", "TrunkRatio", 0.35, 0.2, 0.6),
				choice("foliage", "FoliageColor", "green", ["green", "autumn"]),
				boolean("leavesEnabled", "TreeLeaves", true),
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
			shrub = p.style === "shrub",
			trunk = h * (shrub ? 0.2 : Number(p.trunkRatio)),
			r = Math.min(w, d, h) * 0.04,
			leaves = this.accent(p.foliage === "autumn" ? 0xb29a58 : 0x6e8b5b, 0.98);
		this.cylinder(
			"Garden Trunk",
			r * 0.55,
			r,
			trunk * 1.4,
			[0, trunk * 0.7, 0],
			material,
			20,
		);
		if (p.style === "conifer") {
			if (p.leavesEnabled)
				for (let i = 0; i < 4; i++) {
					const crown = this.cylinder(
						"Conifer Crown",
						0,
						Math.min(w, d) * (0.5 - i * 0.09),
						h * 0.35,
						[0, trunk + ((h - trunk) * (i + 0.6)) / 4, 0],
						leaves,
						16,
					);
					crown.scale.z = d / w;
				}
			return;
		}
		const n = Number(p.clumpCount);
		for (let i = 0; i < n; i++) {
			const a = i * 2.39996,
				spread = shrub ? 0.27 : 0.3,
				x = Math.cos(a) * w * spread * Math.sqrt((i + 1) / n),
				z = Math.sin(a) * d * spread * Math.sqrt((i + 1) / n),
				y = shrub
					? h * (0.45 + (i % 3) * 0.08)
					: trunk + (h - trunk) * (0.35 + (i % 4) * 0.13);
			this.rail(
				"Garden Branch",
				[0, trunk * 0.9, 0],
				[x, y, z],
				r * 0.35,
				material,
			);
			if (p.leavesEnabled)
				this.ellipsoid(
					"Garden Foliage",
					[
						w * (shrub ? 0.3 : 0.24),
						(h - trunk) * (shrub ? 0.4 : 0.28),
						d * (shrub ? 0.3 : 0.24),
					],
					[x, y, z],
					leaves,
				);
		}
	}
}

export class GardenPathObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa6a394) {
		super(
			"garden-path",
			"Garden path",
			"gardenPathControls",
			[
				choice("style", "PathStyle", "paving-slabs", [
					"paving-slabs",
					"stepping-stones",
					"gravel",
				]),
				...dimensions(1, 3, 0.08).map((def) =>
					def.name === "height"
						? {...def, min: 0.01, max: 0.4}
						: def.name === "depth"
							? {...def, max: 15}
							: def,
				),
				integer("stepCount", "PathRows", 6, 1, 16),
				integer("columns", "PathColumns", 2, 1, 4),
				number("gap", "PathGap", 0.1, 0, 0.4, 0.02),
				number("curve", "PathCurve", 0, 0, 1, 0.05),
				boolean("edging", "PathEdging", false),
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
			n = Number(p.stepCount),
			cols = Number(p.columns),
			cw = w / cols,
			cd = d / n,
			gap = 1 - Number(p.gap),
			curve = Number(p.curve),
			shift = (u: number) => Math.sin(u * Math.PI * 2) * w * 0.35 * curve;
		if (p.style === "gravel") {
			for (let i = 0; i < n; i++)
				this.rounded(
					"Garden Gravel Bed",
					[w, h * 0.7, cd * 1.02],
					[shift((i + 0.5) / n), h * 0.35, ((i + 0.5) / n - 0.5) * d],
					material,
					0.015,
				);
			for (let i = 0; i < n * cols * 3; i++) {
				const u = (i + 0.5) / (n * cols * 3),
					r = Math.min(cw, cd) * 0.1;
				this.ellipsoid(
					"Garden Gravel Stone",
					[r, h * 0.3, r * 0.7],
					[shift(u) + Math.sin(i * 2.4) * w * 0.42, h * 0.7, (u - 0.5) * d],
					this.accent(i % 2 ? 0xb5b0a0 : 0x91968c, 0.95),
				);
			}
		} else
			for (let i = 0; i < n; i++)
				for (let j = 0; j < cols; j++) {
					const u = (i + 0.5) / n,
						x = ((j + 0.5) / cols - 0.5) * w + shift(u),
						z = (u - 0.5) * d;
					if (p.style === "stepping-stones") {
						const stone = this.cylinder(
							"Garden Stepping Stone",
							1,
							1,
							h,
							[x, h / 2, z],
							material,
							8,
						);
						stone.scale.set((cw * gap) / 2, 1, (cd * gap) / 2);
						stone.rotation.y = ((i + j) % 2) * 0.2;
					} else
						this.rounded(
							"Garden Paving Slab",
							[cw * gap, h, cd * gap],
							[x, h / 2, z],
							material,
							0.008,
						);
				}
		if (p.edging)
			for (const side of [-1, 1]) {
				const points: [number, number, number][] = [];
				for (let i = 0; i <= 32; i++)
					points.push([
						side * w * 0.51 + shift(i / 32),
						h * 0.7,
						(i / 32 - 0.5) * d,
					]);
				this.curve(
					"Garden Path Edge",
					points,
					h * 0.35,
					this.accent(0x797f70, 0.9),
				);
			}
	}
}

export class GardenWaterFeatureObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa6a68f) {
		super(
			"garden-water-feature",
			"Fountains / ponds",
			"gardenWaterControls",
			[
				choice("style", "WaterStyle", "fountain", [
					{
						value: "fountain",
						parameters: {width: 0.9, depth: 0.9, height: 1.1},
					},
					{
						value: "pond",
						parameters: {width: 1.8, depth: 1.3, height: 0.2},
					},
				]),
				...dimensions(0.9, 0.9, 1.1),
				boolean("waterEnabled", "WaterEnabled", true),
				boolean("pumpOn", "FountainPump", true),
				integer("streamCount", "FountainStreams", 6, 3, 12),
				integer("stoneCount", "PondStones", 16, 8, 28),
				integer("plantCount", "PondPlants", 3, 0, 6),
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
			pond = p.style === "pond",
			r = w * 0.5,
			bh = pond ? h : h * 0.23,
			t = Math.min(w, d, bh) * 0.09;
		const basin = this.lathe(
			"Garden Water Basin",
			[
				[0, 0],
				[r, 0],
				[r, bh],
				[r - t, bh],
				[r - t, t],
				[0, t],
			],
			[0, 0, 0],
			material,
		);
		basin.scale.z = d / w;
		if (p.waterEnabled)
			this.water(
				"Garden Feature Water",
				w - t * 2.5,
				((w - t * 2.5) * d) / w,
				bh * 0.72,
				true,
			);
		if (pond) {
			for (let i = 0; i < Number(p.stoneCount); i++) {
				const a = (i / Number(p.stoneCount)) * Math.PI * 2;
				this.ellipsoid(
					"Pond Border Stone",
					[w * 0.065, h * 0.35, d * 0.065],
					[Math.cos(a) * w * 0.48, h * 0.9, Math.sin(a) * d * 0.48],
					this.accent(i % 2 ? 0xa4a08c : 0x929784, 0.9),
				);
			}
			if (p.waterEnabled)
				for (let i = 0; i < Number(p.plantCount); i++) {
					const a = i * 2.4,
						x = Math.cos(a) * w * 0.22,
						z = Math.sin(a) * d * 0.22;
					this.ellipsoid(
						"Pond Lily Pad",
						[w * 0.07, h * 0.035, d * 0.07],
						[x, bh * 0.74, z],
						this.accent(0x7e965e, 0.9),
					);
					this.ellipsoid(
						"Pond Flower",
						[w * 0.025, h * 0.13, d * 0.025],
						[x, bh * 0.85, z],
						this.accent(0xd0baac, 0.95),
					);
				}
		} else {
			this.cylinder(
				"Fountain Pedestal",
				r * 0.12,
				r * 0.2,
				h * 0.55,
				[0, h * 0.4, 0],
				material,
				24,
			);
			const bowl = this.lathe(
				"Fountain Upper Bowl",
				[
					[0, 0],
					[r * 0.2, 0],
					[r * 0.58, h * 0.15],
					[r * 0.54, h * 0.15],
					[r * 0.16, t],
					[0, t],
				],
				[0, h * 0.55, 0],
				material,
			);
			bowl.scale.z = d / w;
			this.ellipsoid(
				"Fountain Finial",
				[r * 0.14, h * 0.13, r * 0.14],
				[0, h * 0.82, 0],
				material,
			);
			if (p.waterEnabled && p.pumpOn) {
				const water = this.accent(0x8dbac0, 0.2, 0.05, 0.65);
				for (let i = 0; i < Number(p.streamCount); i++) {
					const a = (i / Number(p.streamCount)) * Math.PI * 2;
					this.curve(
						"Fountain Water Stream",
						[
							[Math.cos(a) * w * 0.2, h * 0.68, Math.sin(a) * d * 0.2],
							[Math.cos(a) * w * 0.3, h * 0.59, Math.sin(a) * d * 0.3],
							[Math.cos(a) * w * 0.35, h * 0.18, Math.sin(a) * d * 0.35],
						],
						t * 0.25,
						water,
					);
				}
			}
		}
	}
}
