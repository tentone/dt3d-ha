import type {Mesh} from "three";
import {ExtrudeGeometry, Path, Shape, TorusGeometry} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GameRoomObject,
	integer,
	number,
} from "./primitives.js";

export class GameTableObject extends GameRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x95846b) {
		super(
			"game-table",
			"Game tables",
			"gameTableControls",
			[
				choice("style", "TableStyle", "pool-table", [
					{
						value: "pool-table",
						parameters: {
							width: 2.4,
							depth: 1.3,
							height: 0.8,
							surfaceColor: "green",
							folded: false,
						},
					},
					{
						value: "foosball-table",
						parameters: {
							width: 1.4,
							depth: 0.75,
							height: 0.88,
							surfaceColor: "green",
							folded: false,
						},
					},
					{
						value: "ping-pong-table",
						parameters: {
							width: 2.74,
							depth: 1.525,
							height: 0.76,
							surfaceColor: "blue",
							folded: false,
						},
					},
					{
						value: "poker-table",
						parameters: {
							width: 1.8,
							depth: 1,
							height: 0.76,
							surfaceColor: "burgundy",
							folded: false,
						},
					},
				]),
				...dimensions(2.4, 1.3, 0.8),
				choice("surfaceColor", "TableSurface", "green", [
					"green",
					"blue",
					"burgundy",
				]),
				boolean("accessories", "TableAccessories", true),
				integer("playerCount", "PokerPlaces", 6, 2, 10),
				number("pocketSize", "PoolPocketSize", 0.075, 0.035, 0.12),
				number("rodAngle", "FoosballAngle", 0, -60, 60, 1),
				boolean("folded", "PingPongFold", false),
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
			felt = this.accent(
				p.surfaceColor === "blue"
					? 0x597d9c
					: p.surfaceColor === "burgundy"
						? 0x8b626e
						: 0x638b77,
				0.95,
			),
			dark = this.accent(0x35424a, 0.8),
			metal = this.accent(0xa7b2b4, 0.35, 0.7),
			white = this.accent(0xd7dbd1, 0.8);
		if (p.style === "ping-pong-table") {
			for (const side of [-1, 1]) {
				const before = this.partsGroup.children.length,
					x = (side * w) / 4;
				this.rounded(
					"Ping Pong Half",
					[w / 2, t, d],
					[x, h - t / 2, 0],
					material,
					0.004,
				);
				this.addBox(
					"Ping Pong Surface",
					[w / 2 - t * 0.3, t * 0.1, d - t * 0.3],
					[x, h + t * 0.05, 0],
					felt,
				);
				for (const z of [-1, 1])
					this.addBox(
						"Ping Pong Edge Line",
						[w / 2 - t, t * 0.1, t * 0.2],
						[x, h + t * 0.11, z * (d / 2 - t * 0.5)],
						white,
					);
				this.addBox(
					"Ping Pong End Line",
					[t * 0.2, t * 0.1, d - t],
					[side * (w / 2 - t * 0.5), h + t * 0.11, 0],
					white,
				);
				this.addBox(
					"Ping Pong Center Line",
					[w / 2 - t, t * 0.1, t * 0.12],
					[x, h + t * 0.11, 0],
					white,
				);
				this.hingeParts(
					"Ping Pong Folding Hinge",
					this.partsGroup.children.slice(before),
					[side * t * 0.7, h, 0],
					p.folded ? (side * Math.PI) / 2 : 0,
					"z",
				);
			}
			for (const x of [-1, 1])
				for (const z of [-1, 1])
					this.rounded(
						"Ping Pong Leg",
						[t, h - t, t],
						[x * w * (p.folded ? 0.13 : 0.4), (h - t) / 2, z * d * 0.37],
						dark,
						0.003,
					);
			for (const z of [-1, 1])
				this.rounded(
					"Ping Pong Support Beam",
					[w * (p.folded ? 0.32 : 0.85), t, t],
					[0, h - t / 2, z * d * 0.37],
					dark,
					0.003,
				);
			if (!p.folded) {
				const net = this.addBox(
					"Ping Pong Net",
					[t * 0.12, h * 0.2, d * 1.05],
					[0, h * 1.1, 0],
					this.accent(0x53646b, 0.9, 0, 0.32),
				);
				initializeMeshShadowSettings(net, {
					castShadow: false,
					receiveShadow: false,
				});
				for (const z of [-1, 1])
					this.rail(
						"Ping Pong Net Post",
						[0, h, z * d * 0.53],
						[0, h * 1.22, z * d * 0.53],
						t * 0.25,
						dark,
					);
				for (let i = 0; i < 5; i++)
					this.rail(
						"Ping Pong Net Cord",
						[0, h * (1.02 + i * 0.04), -d * 0.52],
						[0, h * (1.02 + i * 0.04), d * 0.52],
						t * 0.055,
						white,
					);
				if (p.accessories) {
					for (const side of [-1, 1]) {
						const r = Math.min(w, d) * 0.045;
						this.cylinder(
							"Ping Pong Paddle",
							r,
							r,
							t * 0.22,
							[side * w * 0.32, h + t * 0.25, d * 0.2],
							this.accent(side < 0 ? 0xb67c76 : 0x547189, 0.7),
							32,
						);
						this.rounded(
							"Ping Pong Paddle Handle",
							[r * 0.45, t * 0.2, r * 1.5],
							[side * w * 0.32, h + t * 0.25, d * 0.2 + r],
							material,
							0.003,
						);
					}
					this.ellipsoid(
						"Ping Pong Ball",
						[t * 0.35, t * 0.35, t * 0.35],
						[w * 0.18, h + t * 0.4, -d * 0.1],
						white,
					);
				}
			}
			return;
		}
		this.legs(
			w * 0.85,
			d * 0.8,
			p.style === "poker-table" ? h - t * 2 : h * 0.78,
			Math.min(w, d, h) * 0.09,
			material,
		);
		if (p.style === "poker-table") {
			const top = this.cylinder(
				"Poker Table Top",
				1,
				1,
				t * 2,
				[0, h - t, 0],
				material,
				64,
			);
			top.scale.set(w / 2, 1, d / 2);
			const face = this.cylinder(
				"Poker Felt",
				1,
				1,
				t * 0.12,
				[0, h + t * 0.05, 0],
				felt,
				64,
			);
			face.scale.set(w * 0.43, 1, d * 0.4);
			const rail = this.addGeometry(
				"Poker Padded Rail",
				new TorusGeometry(1, 0.055, 10, 64),
				[0, h - t * 0.1, 0],
				dark,
			);
			rail.rotation.x = Math.PI / 2;
			rail.scale.set(w * 0.46, d * 0.46, Math.min(w, d) * 0.5);
			if (p.accessories)
				for (let i = 0; i < Number(p.playerCount); i++) {
					const a = (i / Number(p.playerCount)) * Math.PI * 2,
						x = Math.cos(a) * w * 0.32,
						z = Math.sin(a) * d * 0.28,
						r = Math.min(w, d) * 0.018;
					for (let j = 0; j < 3; j++)
						for (let stack = 0; stack < 3; stack++)
							this.cylinder(
								"Poker Chip",
								r,
								r,
								t * 0.1,
								[x + (j - 1) * r * 2.5, h + t * (0.18 + stack * 0.11), z],
								this.accent([0xb47e76, 0x8da998, 0x91a7bd][j], 0.75),
								16,
							);
					for (const side of [-1, 1])
						this.rounded(
							"Poker Card",
							[w * 0.035, t * 0.06, d * 0.075],
							[x + side * w * 0.019, h + t * 0.12, z + Math.cos(a) * d * 0.09],
							white,
							0.001,
						).rotation.y = -a;
				}
			return;
		}
		if (p.style === "foosball-table") {
			const floorY = h * 0.78;
			this.rounded(
				"Foosball Field",
				[w * 0.94, t, d * 0.9],
				[0, floorY, 0],
				felt,
				0.003,
			);
			for (const side of [-1, 1]) {
				this.addBox(
					"Foosball Side",
					[w, h * 0.23, t],
					[0, h * 0.85, (side * (d - t)) / 2],
					material,
				);
				for (const z of [-1, 1])
					this.addBox(
						"Foosball End",
						[t, h * 0.23, d * 0.3],
						[(side * (w - t)) / 2, h * 0.85, z * d * 0.34],
						material,
					);
				this.addBox(
					"Foosball Goal Header",
					[t, h * 0.07, d * 0.38],
					[(side * (w - t)) / 2, h * 0.95, 0],
					material,
				);
				this.addBox(
					"Foosball Goal Floor",
					[w * 0.1, t, d * 0.34],
					[side * w * 0.51, floorY, 0],
					dark,
				);
				this.addBox(
					"Foosball Goal Back",
					[t, h * 0.13, d * 0.34],
					[side * w * 0.56, h * 0.84, 0],
					dark,
				);
			}
			this.addBox(
				"Foosball Center Line",
				[t * 0.15, t * 0.15, d * 0.88],
				[0, floorY + t * 0.57, 0],
				white,
			);
			const center = this.addGeometry(
				"Foosball Center Circle",
				new TorusGeometry(d * 0.16, t * 0.08, 6, 32),
				[0, floorY + t * 0.59, 0],
				white,
			);
			center.rotation.x = Math.PI / 2;
			for (let i = 0; i < 8; i++) {
				const x = ((i + 0.5) / 8 - 0.5) * w * 0.86,
					y = h * 0.94,
					team = i < 4 ? 1 : -1,
					start = this.partsGroup.children.length;
				this.rail(
					"Foosball Rod",
					[x, y, -d * 0.7],
					[x, y, d * 0.7],
					t * 0.22,
					metal,
				);
				this.rail(
					"Foosball Handle",
					[x, y, team * d * 0.55],
					[x, y, team * d * 0.73],
					t * 0.7,
					dark,
				);
				if (p.accessories) {
					const count = [1, 2, 3, 5, 5, 3, 2, 1][i],
						uniform = this.accent(i < 4 ? 0x7c9fb8 : 0xb77f77, 0.75);
					for (let j = 0; j < count; j++) {
						const z = ((j + 0.5) / count - 0.5) * d * 0.75;
						this.ellipsoid(
							"Foosball Player Head",
							[t * 0.65, t * 0.65, t * 0.65],
							[x, y + h * 0.065, z],
							uniform,
						);
						this.rounded(
							"Foosball Player Body",
							[t * 1.1, h * 0.08, t * 1.2],
							[x, y, z],
							uniform,
							0.003,
						);
						this.rounded(
							"Foosball Player Foot",
							[t * 1.3, h * 0.075, t * 1.4],
							[x, y - h * 0.07, z],
							uniform,
							0.002,
						);
					}
				}
				const rod = this.hingeParts(
					"Foosball Rod Pivot",
					this.partsGroup.children.slice(start),
					[x, y, 0],
					0,
				);
				rod.rotation.z = (Number(p.rodAngle) * Math.PI) / 180;
			}
			if (p.accessories)
				this.ellipsoid(
					"Foosball Ball",
					[t * 0.45, t * 0.45, t * 0.45],
					[w * 0.1, floorY + t * 0.98, d * 0.1],
					white,
				);
			return;
		}
		const iw = w * 0.88,
			id = d * 0.82,
			pr = Math.min(Number(p.pocketSize), iw * 0.08, id * 0.12),
			bedY = h - t * 0.6,
			shape = new Shape();
		shape.moveTo(-iw / 2, -id / 2);
		shape.lineTo(iw / 2, -id / 2);
		shape.lineTo(iw / 2, id / 2);
		shape.lineTo(-iw / 2, id / 2);
		shape.closePath();
		const pockets: [number, number][] = [];
		for (const x of [-1, 0, 1])
			for (const z of [-1, 1]) {
				const cx = x * (iw / 2 - pr * 1.1),
					cz = z * (id / 2 - pr * 1.1),
					hole = new Path();
				hole.absarc(cx, -cz, pr, 0, Math.PI * 2, true);
				shape.holes.push(hole);
				pockets.push([cx, cz]);
			}
		for (const side of [-1, 1]) {
			this.rounded(
				"Pool Table Rail",
				[w, t * 2, (d - id) / 2],
				[0, h - t, (side * (d + id)) / 4],
				material,
				0.006,
			);
			this.rounded(
				"Pool Table Rail",
				[(w - iw) / 2, t * 2, id],
				[(side * (w + iw)) / 4, h - t, 0],
				material,
				0.006,
			);
			this.addBox(
				"Pool Table Apron",
				[w, h * 0.2, t],
				[0, h * 0.82, (side * (d - t)) / 2],
				material,
			);
			this.addBox(
				"Pool Table Apron",
				[t, h * 0.2, d],
				[(side * (w - t)) / 2, h * 0.82, 0],
				material,
			);
		}
		const geometry = new ExtrudeGeometry(shape, {
			depth: t * 0.4,
			bevelEnabled: false,
			curveSegments: 24,
		});
		geometry.rotateX(-Math.PI / 2);
		this.addGeometry("Pool Table Felt", geometry, [0, bedY - t * 0.4, 0], felt);
		for (const [x, z] of pockets)
			this.lathe(
				"Pool Pocket",
				[
					[0, 0],
					[pr, 0],
					[pr, h * 0.14],
					[pr * 0.86, h * 0.14],
					[pr * 0.86, t * 0.3],
					[0, t * 0.3],
				],
				[x, bedY - h * 0.14, z],
				dark,
			);
		if (p.accessories) {
			const r = Math.min(w, d) * 0.015;
			for (let row = 0; row < 4; row++)
				for (let col = 0; col <= row; col++)
					this.ellipsoid(
						"Pool Ball",
						[r, r, r],
						[w * 0.12 + row * r * 1.8, bedY + r, (col - row / 2) * r * 2.1],
						this.accent(
							[0xc8b06c, 0x7a9fbc, 0xb97d78, 0x9890b5][(row + col) % 4],
							0.35,
						),
					);
			this.ellipsoid(
				"Pool Cue Ball",
				[r, r, r],
				[-w * 0.2, bedY + r, 0],
				white,
			);
			for (const side of [-1, 1])
				this.rail(
					"Pool Cue",
					[-w * 0.4, h + t * 0.3, side * d * 0.43],
					[w * 0.4, h + t * 0.3, side * d * 0.43],
					r * 0.15,
					this.accent(0xc2aa7e, 0.75),
				);
		}
	}
}
