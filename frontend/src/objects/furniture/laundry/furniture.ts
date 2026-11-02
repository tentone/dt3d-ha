import type {Mesh} from "three";
import {ExtrudeGeometry, Shape, Vector2} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	LaundryObject,
	number,
} from "./primitives.js";

export class LaundryWorktableObject extends LaundryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc5c7b8) {
		super(
			"laundry-worktable",
			"Folding table / ironing board",
			"laundryWorktableControls",
			[
				choice("style", "WorktableStyle", "folding-table", [
					{
						value: "folding-table",
						parameters: {width: 1.2, depth: 0.65, height: 0.9},
					},
					{
						value: "ironing-board",
						parameters: {width: 1.2, depth: 0.4, height: 0.85},
					},
				]),
				...dimensions(1.2, 0.65, 0.9),
				number("topThickness", "TopThickness", 0.035, 0.015, 0.12),
				boolean("folded", "FoldedLegs", false),
				boolean("ironRest", "IronRest", true),
			],
			parameters,
			color,
			0.9,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(Number(p.topThickness), h * 0.12),
			surface = p.folded ? Math.min(0.12, h * 0.15) : h,
			legH = surface - t,
			metal = this.accent(0x718a86, 0.35, 0.7),
			ironing = p.style === "ironing-board";
		if (ironing) {
			const points = [
					[-w / 2, -d / 2],
					[w * 0.27, -d / 2],
					[w / 2, -d * 0.14],
					[w / 2, d * 0.14],
					[w * 0.27, d / 2],
					[-w / 2, d / 2],
				],
				shape = new Shape(points.map(([x, z]) => new Vector2(x, -z))),
				geometry = new ExtrudeGeometry(shape, {
					depth: t,
					bevelEnabled: false,
				});
			geometry.rotateX(-Math.PI / 2);
			this.addGeometry(
				"Ironing Board Top",
				geometry,
				[0, surface - t, 0],
				material,
			);
		} else
			this.plate(
				"Laundry Folding Top",
				[w, t, d],
				[0, surface - t / 2, 0],
				material,
				Math.min(w, d) * 0.08,
			);
		for (const z of [-1, 1]) {
			this.rail(
				"Worktable Cross Leg",
				[-w * 0.34, 0, z * d * 0.33],
				[w * 0.28, legH, z * d * 0.33],
				t * 0.3,
				metal,
			);
			this.rail(
				"Worktable Cross Leg",
				[w * 0.34, 0, z * d * 0.33],
				[-w * 0.28, legH, z * d * 0.33],
				t * 0.3,
				metal,
			);
			for (const x of [-1, 1])
				this.cylinder(
					"Worktable Pivot",
					t * 0.5,
					t * 0.5,
					t,
					[x * w * 0.02, legH * 0.5, z * d * 0.33],
					metal,
					20,
				).rotation.x = Math.PI / 2;
		}
		for (const x of [-1, 1])
			this.rail(
				"Worktable Foot",
				[x * w * 0.34, t * 0.2, -d * 0.4],
				[x * w * 0.34, t * 0.2, d * 0.4],
				t * 0.4,
				metal,
			);
		if (ironing && p.ironRest) {
			for (const side of [-1, 1])
				this.rail(
					"Iron Rest Frame",
					[-w * 0.48, surface, side * d * 0.34],
					[-w * 0.68, surface, side * d * 0.34],
					t * 0.25,
					metal,
				);
			for (let i = 0; i < 4; i++)
				this.rail(
					"Iron Rest Bar",
					[-w * (0.5 + i * 0.05), surface, -d * 0.34],
					[-w * (0.5 + i * 0.05), surface, d * 0.34],
					t * 0.18,
					metal,
				);
		}
	}
}

export class LaundrySortingStationObject extends LaundryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x7d9590) {
		super(
			"laundry-sorting-station",
			"Laundry sorting station",
			"laundrySortingControls",
			[
				...dimensions(1.1, 0.45, 0.85),
				integer("bagCount", "BagCount", 3, 1, 4),
				number("bagsOut", "BagsOut", 0, 0, 1, 0.05),
				boolean("topEnabled", "SortingTop", true),
				boolean("contentsEnabled", "BagContents", true),
				boolean("wheelsEnabled", "SortingWheels", true),
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
			t = Math.min(w, d, h) * 0.035,
			r = Math.min(w, d, h) * 0.055,
			base = p.wheelsEnabled ? r * 2 : 0,
			metal = this.accent(0x647d78, 0.35, 0.6);
		for (const x of [-1, 1])
			for (const z of [-1, 1]) {
				this.rail(
					"Sorting Station Post",
					[x * w * 0.45, base, z * d * 0.4],
					[x * w * 0.45, h, z * d * 0.4],
					t * 0.4,
					material,
				);
				if (p.wheelsEnabled)
					this.cylinder(
						"Sorting Station Caster",
						r,
						r,
						t,
						[x * w * 0.45, r, z * d * 0.4],
						metal,
						20,
					).rotation.x = Math.PI / 2;
			}
		for (const side of [-1, 1])
			this.rail(
				"Sorting Station Rail",
				[-w * 0.45, h * 0.87, side * d * 0.4],
				[w * 0.45, h * 0.87, side * d * 0.4],
				t * 0.4,
				material,
			);
		if (p.topEnabled)
			this.plate(
				"Sorting Worktop",
				[w, t, d],
				[0, h - t / 2, 0],
				this.accent(0xb9a37f),
				Math.min(w, d) * 0.06,
			);
		const count = Number(p.bagCount),
			bw = (w * 0.88) / count,
			bh = h * 0.66,
			bagBottom = base + h * 0.07,
			z = Number(p.bagsOut) * d * 0.7;
		for (let i = 0; i < count; i++) {
			const x = (i - (count - 1) / 2) * bw,
				cloth = this.accent([0xc6bda7, 0xaebfb8, 0xa5b5c4, 0xc7b0b1][i], 0.98),
				wall = t * 0.35;
			this.rounded(
				"Sorting Bag Floor",
				[bw * 0.9, wall, d * 0.77],
				[x, bagBottom + wall / 2, z],
				cloth,
				0.005,
			);
			for (const side of [-1, 1]) {
				this.rounded(
					"Sorting Bag Wall",
					[wall, bh, d * 0.77],
					[x + side * bw * 0.45, bagBottom + bh / 2, z],
					cloth,
					0.006,
				);
				this.rounded(
					"Sorting Bag Wall",
					[bw * 0.9, bh, wall],
					[x, bagBottom + bh / 2, z + side * d * 0.385],
					cloth,
					0.006,
				);
				this.rail(
					"Sorting Bag Handle",
					[x + side * bw * 0.27, bagBottom + bh, z - d * 0.18],
					[x + side * bw * 0.27, h * 0.89, z + d * 0.18],
					t * 0.14,
					cloth,
				);
			}
			if (p.contentsEnabled)
				for (let j = 0; j < 2; j++)
					this.ellipsoid(
						"Sorting Bag Laundry",
						[bw * 0.25, h * 0.055, d * 0.23],
						[
							x + (j - 0.5) * bw * 0.18,
							bagBottom + bh * 0.9 + j * h * 0.025,
							z,
						],
						this.accent(j % 2 ? 0xe1d8c7 : 0x91a8b4, 0.98),
					);
		}
	}
}
