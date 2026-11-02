import type {Mesh} from "three";
import {TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GardenObject,
	integer,
	number,
} from "./primitives.js";

export class GardenPoolObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa3b4b3) {
		super(
			"garden-pool",
			"Swimming pool",
			"gardenPoolControls",
			[
				...dimensions(5, 3, 1.2).map((def) =>
					def.name === "width" || def.name === "depth"
						? {...def, max: 15}
						: def,
				),
				choice("shape", "PoolShape", "rectangle", ["rectangle", "round"]),
				boolean("waterEnabled", "WaterEnabled", true),
				number("waterLevel", "WaterLevel", 0.82, 0.3, 0.9),
				boolean("ladderEnabled", "PoolLadder", true),
				boolean("stepsEnabled", "PoolSteps", true),
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
			liner = this.accent(0xc0d4d0, 0.45),
			metal = this.accent(0xaab9bc, 0.3, 0.8),
			round = p.shape === "round";
		if (round) {
			const shell = this.lathe(
				"Pool Shell",
				[
					[0, 0],
					[1, 0],
					[1, h],
					[0.93, h],
					[0.93, h * 0.1],
					[0, h * 0.1],
				],
				[0, 0, 0],
				material,
			);
			shell.scale.set(w / 2, 1, d / 2);
			const inner = this.lathe(
				"Pool Liner",
				[
					[0, h * 0.11],
					[0.925, h * 0.11],
					[0.925, h * 0.96],
					[0.915, h * 0.96],
					[0.915, h * 0.12],
					[0, h * 0.12],
				],
				[0, 0, 0],
				liner,
			);
			inner.scale.set(w / 2, 1, d / 2);
		} else {
			this.addBox("Pool Floor", [w, t, d], [0, t / 2, 0], material);
			for (const side of [-1, 1]) {
				this.addBox(
					"Pool Wall",
					[t, h, d],
					[(side * (w - t)) / 2, h / 2, 0],
					material,
				);
				this.addBox(
					"Pool Wall",
					[w - t * 2, h, t],
					[0, h / 2, (side * (d - t)) / 2],
					material,
				);
				this.addBox(
					"Pool Liner Wall",
					[t * 0.2, h * 0.9, d - t * 2],
					[side * (w / 2 - t * 1.05), h * 0.53, 0],
					liner,
				);
				this.addBox(
					"Pool Liner Wall",
					[w - t * 2, h * 0.9, t * 0.2],
					[0, h * 0.53, side * (d / 2 - t * 1.05)],
					liner,
				);
				this.rounded(
					"Pool Coping",
					[w, t * 1.2, t * 2],
					[0, h, (side * (d - t)) / 2],
					material,
					0.005,
				);
				this.rounded(
					"Pool Coping",
					[t * 2, t * 1.2, d],
					[(side * (w - t)) / 2, h, 0],
					material,
					0.005,
				);
			}
			this.addBox(
				"Pool Interior Floor",
				[w - t * 2, t * 0.2, d - t * 2],
				[0, t * 1.1, 0],
				liner,
			);
		}
		if (p.waterEnabled)
			this.water(
				"Pool Water",
				round ? w * 0.91 : w - t * 2.3,
				round ? d * 0.91 : d - t * 2.3,
				h * Number(p.waterLevel),
				round,
			);
		if (p.stepsEnabled && !round)
			for (let i = 0; i < 3; i++)
				this.rounded(
					"Pool Step",
					[w * 0.28, h * (0.6 - i * 0.15), d * 0.12],
					[0, (h * (0.6 - i * 0.15)) / 2, -d / 2 + t + d * 0.06 + i * d * 0.12],
					liner,
					0.015,
				);
		if (p.ladderEnabled) {
			const x = round ? 0 : w * 0.29,
				spacing = Math.min(w, d) * 0.07;
			for (const side of [-1, 1])
				this.curve(
					"Pool Ladder Rail",
					[
						[x + side * spacing, h * 0.22, d * 0.4],
						[x + side * spacing, h * 1.25, d * 0.4],
						[x + side * spacing, h * 1.3, d * 0.53],
						[x + side * spacing, h * 0.5, d * 0.59],
					],
					t * 0.22,
					metal,
				);
			for (let i = 0; i < 5; i++)
				this.rail(
					"Pool Ladder Rung",
					[x - spacing, h * (0.25 + i * 0.16), d * 0.4],
					[x + spacing, h * (0.25 + i * 0.16), d * 0.4],
					t * 0.25,
					metal,
				);
		}
	}
}

export class GardenTrampolineObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x7b9a98) {
		super(
			"garden-trampoline",
			"Trampoline",
			"gardenTrampolineControls",
			[
				...dimensions(2.5, 2.5, 2.1),
				integer("poleCount", "TrampolinePoles", 8, 6, 12),
				boolean("netEnabled", "TrampolineNet", true),
				boolean("ladderEnabled", "TrampolineLadder", true),
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
			r = Math.min(w, d) * 0.47,
			t = Math.min(w, d, h) * 0.015,
			y = h * 0.38,
			n = Number(p.poleCount),
			metal = this.accent(0x99a8ab, 0.35, 0.75),
			dark = this.accent(0x252c2d, 0.98);
		const ring = this.addGeometry(
			"Trampoline Rim",
			new TorusGeometry(1, (t / r) * 1.8, 10, 64),
			[0, y, 0],
			material,
		);
		ring.rotation.x = Math.PI / 2;
		ring.scale.set(w * 0.46, d * 0.46, r);
		const mat = this.cylinder(
			"Trampoline Mat",
			1,
			1,
			t * 0.2,
			[0, y, 0],
			dark,
			64,
		);
		mat.scale.set(w * 0.42, 1, d * 0.42);
		for (let i = 0; i < 24; i++) {
			const a = (i / 24) * Math.PI * 2;
			this.rail(
				"Trampoline Spring",
				[Math.cos(a) * w * 0.42, y, Math.sin(a) * d * 0.42],
				[Math.cos(a) * w * 0.46, y, Math.sin(a) * d * 0.46],
				t * 0.18,
				metal,
			);
		}
		for (let i = 0; i < n; i++) {
			const a = (i / n) * Math.PI * 2,
				x = Math.cos(a) * w * 0.44,
				z = Math.sin(a) * d * 0.44;
			this.rail("Trampoline Leg", [x, 0, z], [x, y, z], t * 0.8, metal);
			if (p.netEnabled)
				this.rail("Trampoline Net Pole", [x, y, z], [x, h, z], t * 0.6, metal);
		}
		if (p.netEnabled) {
			const mesh = this.fabric(
				"Trampoline Safety Net",
				64,
				10,
				(u, v) => [
					Math.cos(u * Math.PI * 2) * w * 0.44,
					y + v * (h - y),
					Math.sin(u * Math.PI * 2) * d * 0.44,
				],
				this.accent(0x5e7374, 0.9, 0, 0.17),
			);
			mesh.castShadow = false;
		}
		if (p.ladderEnabled) {
			for (const side of [-1, 1])
				this.rail(
					"Trampoline Ladder Rail",
					[side * w * 0.07, 0, d * 0.65],
					[side * w * 0.07, y, d * 0.44],
					t * 0.55,
					metal,
				);
			for (let i = 1; i <= 3; i++)
				this.rail(
					"Trampoline Ladder Rung",
					[-w * 0.07, (y * i) / 4, d * (0.65 - (0.21 * i) / 4)],
					[w * 0.07, (y * i) / 4, d * (0.65 - (0.21 * i) / 4)],
					t * 0.5,
					metal,
				);
		}
	}
}

export class GardenSwingSetObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xa48e68) {
		super(
			"garden-swing-set",
			"Swing set",
			"gardenSwingControls",
			[
				...dimensions(2.8, 1.6, 2.2),
				integer("seatCount", "SwingSeats", 2, 1, 4),
				number("swingAngle", "SwingAngle", 0, -25, 25, 1),
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
			t = Math.min(w, d, h) * 0.025,
			n = Number(p.seatCount),
			chain = this.accent(0x8d9998, 0.35, 0.7),
			seat = this.accent(0x6f9690, 0.8);
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rail(
					"Swing A-frame",
					[x * w * 0.45, 0, z * d * 0.48],
					[x * w * 0.45, h * 0.96, 0],
					t,
					material,
				);
		this.rail(
			"Swing Top Beam",
			[-w / 2, h * 0.96, 0],
			[w / 2, h * 0.96, 0],
			t * 1.2,
			material,
		);
		for (let i = 0; i < n; i++) {
			const x = ((i + 0.5) / n - 0.5) * w * 0.75,
				sw = (w / (n + 1)) * 0.48,
				before = this.partsGroup.children.length;
			this.rounded(
				"Swing Seat",
				[sw, t * 1.2, d * 0.19],
				[x, h * 0.29, 0],
				seat,
				0.012,
			);
			for (const side of [-1, 1])
				this.rail(
					"Swing Suspension",
					[x + side * sw * 0.43, h * 0.29, 0],
					[x + side * sw * 0.43, h * 0.95, 0],
					t * 0.18,
					chain,
				);
			this.hingeParts(
				"Garden Swing Pivot",
				this.partsGroup.children.slice(before),
				[x, h * 0.95, 0],
				(Number(p.swingAngle) * Math.PI) / 180,
				"x",
			);
		}
	}
}

export class GardenSlideObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb5a56c) {
		super(
			"garden-slide",
			"Garden slide",
			"gardenSlideControls",
			[
				...dimensions(1, 2.6, 1.6),
				choice("style", "SlideStyle", "straight-slide", [
					"straight-slide",
					"wavy-slide",
				]),
				integer("rungCount", "SlideRungs", 5, 3, 8),
				boolean("handrails", "SlideRails", true),
			],
			parameters,
			color,
			0.55,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(w, d, h) * 0.03,
			frame = this.accent(0x7e9188, 0.6),
			profile = (u: number) =>
				h *
				(0.08 +
					0.72 * Math.pow(1 - u, 1.8) +
					(p.style === "wavy-slide" ? 0.04 * Math.sin(u * Math.PI * 4) : 0));
		this.fabric(
			"Garden Slide Chute",
			32,
			6,
			(u, v) => [(v - 0.5) * w * 0.7, profile(u), -d * 0.1 + u * d * 0.58],
			material,
		);
		for (const side of [-1, 1]) {
			const points: [number, number, number][] = [];
			for (let i = 0; i <= 20; i++) {
				const u = i / 20;
				points.push([
					side * w * 0.36,
					profile(u) + h * 0.045,
					-d * 0.1 + u * d * 0.58,
				]);
			}
			this.curve("Slide Raised Edge", points, t, material);
			this.rail(
				"Slide Platform Post",
				[side * w * 0.37, 0, -d * 0.17],
				[side * w * 0.37, h * 0.8, -d * 0.17],
				t,
				frame,
			);
			this.rail(
				"Slide Ladder Rail",
				[side * w * 0.37, 0, -d * 0.48],
				[side * w * 0.37, h * 0.8, -d * 0.17],
				t,
				frame,
			);
			if (p.handrails)
				this.rail(
					"Slide Handrail",
					[side * w * 0.37, h * 0.8, -d * 0.3],
					[side * w * 0.37, h * 0.99, -d * 0.15],
					t * 0.7,
					frame,
				);
		}
		this.rounded(
			"Slide Platform",
			[w * 0.8, t, d * 0.18],
			[0, h * 0.8 - t / 2, -d * 0.19],
			frame,
			0.006,
		);
		for (let i = 1; i <= Number(p.rungCount); i++) {
			const f = i / (Number(p.rungCount) + 1);
			this.rail(
				"Slide Ladder Rung",
				[-w * 0.37, h * 0.8 * f, -d * 0.48 + d * 0.31 * f],
				[w * 0.37, h * 0.8 * f, -d * 0.48 + d * 0.31 * f],
				t * 0.75,
				frame,
			);
		}
	}
}

export class GardenSandboxObject extends GardenObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb59b74) {
		super(
			"garden-sandbox",
			"Sandbox",
			"gardenSandboxControls",
			[
				...dimensions(1.6, 1.6, 0.3),
				number("sandLevel", "SandLevel", 0.6, 0.2, 0.85),
				boolean("coverClosed", "SandboxCover", false),
				boolean("benches", "SandboxBenches", true),
				integer("toyCount", "SandboxToys", 2, 0, 6),
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
			t = Math.min(w, d, h) * 0.12,
			sandY = h * Number(p.sandLevel);
		this.addBox("Sandbox Floor", [w, t, d], [0, t / 2, 0], material);
		for (const side of [-1, 1]) {
			this.addBox(
				"Sandbox Wall",
				[t, h, d],
				[(side * (w - t)) / 2, h / 2, 0],
				material,
			);
			this.addBox(
				"Sandbox Wall",
				[w - t * 2, h, t],
				[0, h / 2, (side * (d - t)) / 2],
				material,
			);
			if (p.benches && !p.coverClosed)
				this.rounded(
					"Sandbox Bench",
					[w, t, d * 0.16],
					[0, h, side * d * 0.42],
					material,
					0.006,
				);
		}
		this.addBox(
			"Sandbox Sand",
			[w - t * 2, t, d - t * 2],
			[0, sandY, 0],
			this.accent(0xd0bd8d, 0.98),
		);
		if (p.coverClosed)
			this.rounded(
				"Sandbox Cover",
				[w, t, d],
				[0, h + t / 2, 0],
				material,
				0.008,
			);
		else
			for (let i = 0; i < Number(p.toyCount); i++) {
				const r = Math.min(w, d, h) * 0.2,
					x = ((i + 0.5) / (Number(p.toyCount) + 1) - 0.5) * w * 0.7,
					z = Math.sin(i * 2.4) * d * 0.2;
				this.lathe(
					"Sandbox Bucket",
					[
						[0, 0],
						[r * 0.7, 0],
						[r, r * 1.2],
						[r * 0.85, r * 1.2],
						[r * 0.6, r * 0.2],
						[0, r * 0.2],
					],
					[x, sandY + t / 2, z],
					this.accent(i % 2 ? 0x87a7aa : 0xc3a066, 0.8),
				);
			}
	}
}
