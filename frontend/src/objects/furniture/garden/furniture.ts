import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GardenObject,
	integer,
} from "./primitives.js";

export class GardenFurnitureObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa78e67) {
		super(
			"garden-furniture",
			"Garden tables / benches / dining sets",
			"gardenFurnitureControls",
			[
				choice("style", "FurnitureStyle", "picnic-table", [
					{
						value: "picnic-table",
						parameters: {width: 1.8, depth: 1.5, height: 0.75},
					},
					{
						value: "garden-bench",
						parameters: {width: 1.5, depth: 0.55, height: 0.85},
					},
					{
						value: "outdoor-dining-set",
						parameters: {width: 1.6, depth: 0.9, height: 0.75},
					},
				]),
				...dimensions(1.8, 1.5, 0.75),
				integer("slatCount", "FurnitureSlats", 7, 4, 14),
				integer("chairCount", "DiningChairs", 6, 2, 8),
				boolean("backrest", "BenchBack", true),
				boolean("endChairs", "EndChairs", true),
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
			n = Number(p.slatCount);
		if (p.style === "garden-bench") {
			this.seat(0, 0, w, d, h * 0.55, Boolean(p.backrest), material);
			return;
		}
		const picnic = p.style === "picnic-table",
			td = picnic ? d * 0.47 : d;
		for (let i = 0; i < n; i++)
			this.rounded(
				"Garden Table Slat",
				[w, t, (td / n) * 0.92],
				[0, h - t / 2, ((i + 0.5) / n - 0.5) * td],
				material,
				0.004,
			);
		if (picnic) {
			for (const x of [-1, 1]) {
				for (const side of [-1, 1])
					this.rail(
						"Picnic A-frame Leg",
						[x * w * 0.32, 0, side * d * 0.4],
						[x * w * 0.32, h - t, side * d * 0.13],
						t * 0.55,
						material,
					);
				this.rounded(
					"Picnic Bench Support",
					[t, t * 1.5, d * 0.94],
					[x * w * 0.32, h * 0.49, 0],
					material,
					0.003,
				);
			}
			for (const side of [-1, 1])
				for (let i = 0; i < 3; i++)
					this.rounded(
						"Picnic Bench Slat",
						[w, t, d * 0.06],
						[0, h * 0.58, side * d * 0.39 + ((i + 0.5) / 3 - 0.5) * d * 0.19],
						material,
						0.003,
					);
		} else {
			this.legs(w * 0.88, d * 0.85, h - t, t, material);
			const count = Number(p.chairCount),
				perSide = Math.ceil(count / 2),
				cw = Math.min(w / (perSide + 0.4), d * 0.65),
				cd = d * 0.5;
			for (let i = 0; i < count; i++) {
				const side = i % 2 ? 1 : -1,
					index = Math.floor(i / 2),
					x = ((index + 0.5) / perSide - 0.5) * w * 0.92,
					z = side * (d / 2 + cd * 0.72),
					before = this.partsGroup.children.length;
				this.seat(0, 0, cw, cd, h * 0.6, true, material);
				const chair = this.hingeParts(
					"Garden Dining Chair",
					this.partsGroup.children.slice(before),
					[0, 0, 0],
					side < 0 ? 0 : Math.PI,
				);
				chair.position.set(x, 0, z);
			}
			if (p.endChairs)
				for (const side of [-1, 1]) {
					const before = this.partsGroup.children.length;
					this.seat(0, 0, cw, cd, h * 0.6, true, material);
					const chair = this.hingeParts(
						"Garden End Chair",
						this.partsGroup.children.slice(before),
						[0, 0, 0],
						side < 0 ? Math.PI / 2 : -Math.PI / 2,
					);
					chair.position.set(side * (w / 2 + cd * 0.72), 0, 0);
				}
		}
	}
}
