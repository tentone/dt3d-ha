import type {Mesh} from "three";
import {
	BufferGeometry,
	CatmullRomCurve3,
	DoubleSide,
	Float32BufferAttribute,
	TubeGeometry,
	Vector3,
} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	NurseryObject,
	PLAY_COLORS,
} from "./primitives.js";

export class PlayMatObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xced2ba) {
		super(
			"play-mat",
			"Play mat",
			"nurseryMatControls",
			[
				...dimensions(1.5, 1, 0.03),
				integer("columns", "MatColumns", 3, 1, 6),
				integer("rows", "MatRows", 2, 1, 6),
				boolean("tabsEnabled", "PuzzleTabs", true),
			],
			parameters,
			color,
			0.98,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			cols = Number(p.columns),
			rows = Number(p.rows),
			cw = w / cols,
			cd = d / rows;
		this.plate(
			"Play Mat Backing",
			[w, h * 0.2, d],
			[0, h * 0.1, 0],
			material,
			Math.min(w, d) * 0.025,
		);
		for (let col = 0; col < cols; col++)
			for (let row = 0; row < rows; row++) {
				const x = -w / 2 + cw * (col + 0.5),
					z = -d / 2 + cd * (row + 0.5),
					finish = this.accent(
						PLAY_COLORS[(col + row * 2) % PLAY_COLORS.length],
						0.98,
					),
					r = Math.min(cw, cd) * 0.1;
				this.plate(
					"Play Mat Tile",
					[cw * 0.99, h * 0.8, cd * 0.99],
					[x, h * 0.6, z],
					finish,
					Math.min(cw, cd) * 0.025,
				);
				if (p.tabsEnabled) {
					if (col < cols - 1)
						this.cylinder(
							"Play Mat Puzzle Tab",
							r,
							r,
							h * 0.12,
							[x + cw / 2, h + h * 0.02, z],
							finish,
							24,
						);
					if (row < rows - 1)
						this.cylinder(
							"Play Mat Puzzle Tab",
							r,
							r,
							h * 0.12,
							[x, h + h * 0.02, z + cd / 2],
							finish,
							24,
						);
				}
			}
	}
}

export class PlaypenObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc1aa85) {
		super(
			"playpen",
			"Playpen",
			"nurseryPlaypenControls",
			[
				...dimensions(1.2, 1.2, 0.7),
				integer("slatCount", "PlaypenSlats", 10, 4, 20),
				boolean("gateOpen", "PlaypenGate", false),
				boolean("matEnabled", "PlaypenMat", true),
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
			t = Math.min(w, d, h) * 0.045,
			count = Number(p.slatCount);
		this.plate(
			"Playpen Base",
			[w, t, d],
			[0, t / 2, 0],
			material,
			Math.min(w, d) * 0.03,
		);
		if (p.matEnabled)
			this.rounded(
				"Playpen Pad",
				[w - t * 3, t, d - t * 3],
				[0, t * 1.5, 0],
				this.accent(0xb3c7bd, 0.98),
				0.025,
			);
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rounded(
					"Playpen Post",
					[t, h, t],
					[(x * (w - t)) / 2, h / 2, (z * (d - t)) / 2],
					material,
					0.008,
				);
		const panel = (front: boolean, side: number) => {
			const before = this.partsGroup.children.length,
				length = front ? w : d,
				constant = (side * ((front ? d : w) - t)) / 2;
			for (const y of [t * 1.8, h - t / 2])
				this.rounded(
					"Playpen Rail",
					front ? [w - t, t, t] : [t, t, d - t],
					front ? [0, y, constant] : [constant, y, 0],
					material,
					0.005,
				);
			for (let i = 0; i < count; i++) {
				const along = (i / (count - 1) - 0.5) * (length - t * 2);
				this.rounded(
					"Playpen Slat",
					[t * 0.45, h - t * 2, t * 0.45],
					front ? [along, h / 2, constant] : [constant, h / 2, along],
					material,
					0.003,
				);
			}
			if (front && side === 1)
				this.hingeParts(
					"Playpen Gate Hinge",
					this.partsGroup.children.slice(before),
					[-w / 2, 0, constant],
					p.gateOpen ? -Math.PI * 0.5 : 0,
				);
		};
		for (const side of [-1, 1]) {
			panel(false, side);
			panel(true, side);
		}
	}
}

export class IndoorTentObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe0d2b9) {
		super(
			"indoor-tent",
			"Indoor tent",
			"nurseryTentControls",
			[
				...dimensions(1.1, 1.1, 1.5),
				boolean("entranceOpen", "TentEntrance", true),
				boolean("floorEnabled", "TentFloor", true),
			],
			parameters,
			color,
			0.98,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			r = Math.min(w, d, h) * 0.014,
			wood = this.accent(0xa88b64);
		const cloth = Array.isArray(material) ? material[0] : material;
		cloth.side = DoubleSide;
		const face = (points: [number, number, number][]) => {
			const geometry = new BufferGeometry();
			geometry.setAttribute(
				"position",
				new Float32BufferAttribute(points.flat(), 3),
			);
			geometry.computeVertexNormals();
			this.addGeometry("Tent Fabric", geometry, [0, 0, 0], material);
		};
		const peak: [number, number, number] = [0, h * 0.94, 0],
			corners: [number, number, number][] = [
				[-w / 2, 0, -d / 2],
				[w / 2, 0, -d / 2],
				[w / 2, 0, d / 2],
				[-w / 2, 0, d / 2],
			];
		for (let i = 0; i < 4; i++) {
			const start = corners[i],
				end = corners[(i + 1) % 4];
			if (i === 2 && p.entranceOpen) {
				const left: [number, number, number] = [-w * 0.17, 0, d / 2],
					right: [number, number, number] = [w * 0.17, 0, d / 2],
					door: [number, number, number] = [0, h * 0.54, d * 0.21];
				face([start, right, door]);
				face([start, door, peak]);
				face([end, peak, door]);
				face([end, door, left]);
			} else face([start, end, peak]);
			this.rail(
				"Tent Pole",
				[start[0] * 1.04, 0, start[2] * 1.04],
				[start[0] * -0.07, h, start[2] * -0.07],
				r,
				wood,
			);
		}
		if (p.floorEnabled)
			this.plate(
				"Tent Floor",
				[w, 0.01 * h, d],
				[0, 0.005 * h, 0],
				this.accent(0xb6c6b5, 0.98),
				Math.min(w, d) * 0.02,
			);
	}
}

export class ClimbingFrameObject extends NurseryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xba9b70) {
		super(
			"climbing-frame",
			"Climbing structure",
			"nurseryClimbingControls",
			[
				choice("style", "ClimbingStyle", "triangle-ladder", [
					"triangle-ladder",
					"climbing-arch",
				]),
				...dimensions(0.8, 0.9, 0.75),
				integer("rungCount", "ClimbingRungs", 7, 3, 12),
				boolean("coloredRungs", "ColoredRungs", true),
				boolean("rampEnabled", "ClimbingRamp", false),
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
			r = Math.min(w, d, h) * 0.026,
			count = Number(p.rungCount),
			arch = p.style === "climbing-arch";
		for (const side of [-1, 1]) {
			if (arch) {
				const points = Array.from(
					{length: 25},
					(_, i) =>
						new Vector3(
							side * w * 0.43,
							h * Math.sin((i / 24) * Math.PI) + r,
							-d * 0.45 * Math.cos((i / 24) * Math.PI),
						),
				);
				this.addGeometry(
					"Climbing Arch Rail",
					new TubeGeometry(new CatmullRomCurve3(points), 48, r, 10, false),
					[0, 0, 0],
					material,
				);
			} else
				for (const end of [-1, 1])
					this.rail(
						"Triangle Climbing Rail",
						[side * w * 0.43, r, end * d * 0.45],
						[side * w * 0.43, h, 0],
						r,
						material,
					);
		}
		for (let i = 1; i <= count; i++) {
			const fraction = i / (count + 1),
				finish = p.coloredRungs
					? this.accent(PLAY_COLORS[(i - 1) % PLAY_COLORS.length])
					: material;
			if (arch) {
				const angle = fraction * Math.PI;
				this.rail(
					"Climbing Rung",
					[-w * 0.43, h * Math.sin(angle) + r, -d * 0.45 * Math.cos(angle)],
					[w * 0.43, h * Math.sin(angle) + r, -d * 0.45 * Math.cos(angle)],
					r * 0.75,
					finish,
				);
			} else
				for (const end of [-1, 1])
					this.rail(
						"Climbing Rung",
						[
							-w * 0.43,
							r + (h - r) * fraction,
							end * d * 0.45 * (1 - fraction),
						],
						[w * 0.43, r + (h - r) * fraction, end * d * 0.45 * (1 - fraction)],
						r * 0.75,
						finish,
					);
		}
		if (p.rampEnabled) {
			const rise = h * 0.7,
				run = d * 0.75,
				length = Math.hypot(rise, run),
				ramp = this.plate(
					"Climbing Ramp",
					[w * 0.6, r, length],
					[0, rise / 2 + r, d * 0.525],
					material,
					r,
				);
			ramp.rotation.x = Math.atan2(rise, run);
		}
	}
}
