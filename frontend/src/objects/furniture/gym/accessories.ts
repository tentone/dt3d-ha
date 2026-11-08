import type {Mesh} from "three";
import {ExtrudeGeometry, Path, Shape} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GymObject,
	number,
} from "./primitives.js";

export class ExerciseMatObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x80aaa7) {
		super(
			"exercise-mat",
			"Yoga / exercise mat",
			"gymMatControls",
			[
				choice("style", "MatStyle", "yoga-mat", [
					{
						value: "yoga-mat",
						parameters: {width: 0.61, depth: 1.83, height: 0.006},
					},
					{
						value: "exercise-mat",
						parameters: {width: 1, depth: 2, height: 0.03},
					},
				]),
				...dimensions(0.61, 1.83, 0.006, [0.3, 0.6, 0.003]).map((definition) =>
					definition.name === "height"
						? {...definition, max: 0.12, step: 0.001}
						: definition,
				),
				boolean("rolled", "MatRolled", false),
				boolean("alignmentLines", "MatLines", true),
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
			h = Number(p.height);
		if (p.rolled) {
			const core = Math.max(0.012, h * 0.8),
				r = Math.sqrt((d * h) / Math.PI + core * core),
				shape = new Shape(),
				hole = new Path();
			shape.absarc(0, 0, r, 0, Math.PI * 2, false);
			hole.absarc(0, 0, core, 0, Math.PI * 2, true);
			shape.holes.push(hole);
			const geometry = new ExtrudeGeometry(shape, {
				depth: w,
				bevelEnabled: false,
				curveSegments: 32,
			});
			geometry.rotateY(Math.PI / 2);
			geometry.translate(-w / 2, 0, 0);
			this.addGeometry("Rolled Exercise Mat", geometry, [0, r, 0], material);
			for (const side of [-1, 1])
				for (let i = 1; i < 4; i++)
					this.ring(
						"Mat Roll Layer",
						core + ((r - core) * i) / 4,
						Math.min(0.001, h * 0.08),
						[side * (w / 2 + 0.0005), r, 0],
						this.trim(),
					).rotation.y = Math.PI / 2;
		} else {
			this.plate(
				"Exercise Mat",
				[w, h, d],
				[0, h / 2, 0],
				material,
				Math.min(w, d) * 0.06,
			);
			if (p.alignmentLines) {
				const ink = this.accent(0xc2d8ce, 0.98);
				for (const side of [-1, 1])
					this.plate(
						"Mat Alignment Line",
						[w * 0.66, 0.0003, d * 0.004],
						[0, h + 0.0002, side * d * 0.27],
						ink,
						0.001,
					);
				this.plate(
					"Mat Center Line",
					[w * 0.006, 0.0003, d * 0.48],
					[0, h + 0.0002, 0],
					ink,
					0.001,
				);
			}
		}
	}
}

export class MedicineBallObject extends GymObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x7b9fa8) {
		super(
			"medicine-ball",
			"Medicine ball",
			"gymBallControls",
			[
				number("diameter", "BallDiameter", 0.28, 0.12, 0.65),
				boolean("panelLines", "BallPanels", true),
			],
			parameters,
			color,
			0.95,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			r = Number(p.diameter) / 2;
		this.ellipsoid("Medicine Ball", [r, r, r], [0, r, 0], material);
		if (p.panelLines)
			for (const axis of ["x", "y", "z"] as const) {
				const seam = this.ring(
					"Medicine Ball Seam",
					r * 0.995,
					r * 0.012,
					[0, r, 0],
					this.rubber(),
				);
				seam.rotation[axis] = Math.PI / 2;
			}
	}
}
