import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	KitchenObject,
	number,
	type PlanPoint,
	rectangle,
} from "./primitives.js";

export class KitchenCountertopObject extends KitchenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc4c0b5) {
		super(
			"kitchen-countertop",
			"Kitchen countertop / island",
			"kitchenCountertopControls",
			[
				choice("style", "CountertopStyle", "straight-countertop", [
					{
						value: "straight-countertop",
						parameters: {width: 2, depth: 0.6, height: 0.04},
					},
					{
						value: "l-shaped-countertop",
						parameters: {width: 2.4, depth: 1.8, height: 0.04},
					},
					{
						value: "u-shaped-countertop",
						parameters: {width: 2.8, depth: 2.2, height: 0.04},
					},
					{
						value: "kitchen-island",
						parameters: {width: 1.5, depth: 0.9, height: 0.92},
					},
					{
						value: "peninsula",
						parameters: {width: 1.8, depth: 0.75, height: 0.92},
					},
					{
						value: "breakfast-bar",
						parameters: {width: 1.6, depth: 0.5, height: 1.05},
					},
				]),
				...dimensions(2, 0.6, 0.04),
				number("topThickness", "TopThickness", 0.04, 0.015, 0.15),
				number("runDepth", "RunDepth", 0.6, 0.15, 1.2),
				number("overhang", "Overhang", 0.05, 0, 0.3),
				boolean("supportsEnabled", "SupportsEnabled", true),
				boolean("backsplashEnabled", "BacksplashEnabled", false),
				choice("cutout", "Cutout", "none", [
					"none",
					"single-sink-cutout",
					"double-sink-cutout",
					"hob-cutout",
				]),
			],
			parameters,
			color,
			0.38,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(Number(p.topThickness), h),
			r = Math.min(Number(p.runDepth), w * 0.4, d * 0.4);
		const l = p.style === "l-shaped-countertop",
			u = p.style === "u-shaped-countertop",
			supported = ["kitchen-island", "peninsula", "breakfast-bar"].includes(
				String(p.style),
			);
		let points: PlanPoint[] = rectangle(w, d);
		if (l)
			points = [
				[-w / 2, -d / 2],
				[w / 2, -d / 2],
				[w / 2, -d / 2 + r],
				[-w / 2 + r, -d / 2 + r],
				[-w / 2 + r, d / 2],
				[-w / 2, d / 2],
			];
		if (u)
			points = [
				[-w / 2, -d / 2],
				[w / 2, -d / 2],
				[w / 2, d / 2],
				[w / 2 - r, d / 2],
				[w / 2 - r, -d / 2 + r],
				[-w / 2 + r, -d / 2 + r],
				[-w / 2 + r, d / 2],
				[-w / 2, d / 2],
			];
		const cutDepth = l || u ? r : d,
			z = l || u ? -d / 2 + r / 2 : 0,
			cutW = Math.min(w * 0.65, 0.8),
			cutD = cutDepth * 0.65;
		const holes =
			p.cutout === "none"
				? []
				: p.cutout === "double-sink-cutout"
					? [-1, 1].map((side) => ({
						x: side * cutW * 0.25,
						z,
						width: cutW * 0.45,
						depth: cutD,
					}))
					: [
						{
							x: 0,
							z,
							width: cutW,
							depth: cutD,
							rectangular: p.cutout === "hob-cutout",
						},
					];
		this.slab("Kitchen Worktop", points, t, h - t, material, holes);
		if (p.backsplashEnabled)
			this.rounded(
				"Countertop Backsplash",
				[w, t * 3, t],
				[0, h + t * 1.5, -d / 2 + t / 2],
				material,
				0.003,
			);
		if (!supported || !p.supportsEnabled || h <= t) return;
		const base = this.accent(0xdad5c9),
			metal = this.accent(0x62686c, 0.25, 0.7),
			overhang = Math.min(Number(p.overhang), w * 0.15, d * 0.2),
			bh = h - t;
		if (p.style === "kitchen-island") {
			this.rounded(
				"Island Cabinet Body",
				[w - overhang * 2, bh, d - overhang * 2],
				[0, bh / 2, 0],
				base,
				0.008,
			);
			const count = Math.max(2, Math.round(w / 0.5));
			for (let i = 0; i < count; i++) {
				const x =
						((i + 0.5) / count) * (w - overhang * 2) - (w - overhang * 2) / 2,
					dw = (w - overhang * 2) / count;
				this.rounded(
					"Island Door",
					[dw * 0.97, bh * 0.82, 0.018],
					[x, bh * 0.53, d / 2 - overhang + 0.009],
					base,
					0.003,
				);
				this.rounded(
					"Island Handle",
					[dw * 0.4, 0.012, 0.025],
					[x, bh * 0.83, d / 2 - overhang + 0.03],
					metal,
					0.003,
				);
			}
		} else {
			for (const side of [-1, 1])
				this.rounded(
					"Bar Support",
					[Math.min(w * 0.04, 0.06), bh, d * 0.7],
					[side * (w * 0.4), bh / 2, 0],
					p.style === "breakfast-bar" ? metal : base,
					0.004,
				);
			if (p.style === "peninsula")
				this.rounded(
					"Peninsula Back Panel",
					[w * 0.75, bh, d * 0.05],
					[0, bh / 2, -d * 0.25],
					base,
					0.004,
				);
		}
	}
}
