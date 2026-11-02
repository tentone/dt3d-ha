import type {Mesh} from "three";
import {ExtrudeGeometry, Path, Shape, TorusGeometry} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GameRoomObject,
	integer,
	number,
} from "./primitives.js";

export class GamingDeskObject extends GameRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x54616a) {
		super(
			"gaming-desk",
			"Gaming desk",
			"gameDeskControls",
			[
				choice("layout", "DeskLayout", "straight", [
					{
						value: "straight",
						parameters: {width: 1.4, depth: 0.75, height: 0.75},
					},
					{
						value: "l-shaped",
						parameters: {width: 1.8, depth: 1.5, height: 0.75},
					},
				]),
				...dimensions(1.4, 0.75, 0.75),
				number("returnDepth", "DeskReturnDepth", 0.6, 0.15, 1),
				choice("returnSide", "DeskReturnSide", "left-return", [
					"left-return",
					"right-return",
				]),
				integer("monitorCount", "DeskMonitors", 1, 0, 3),
				boolean("towerEnabled", "DeskTower", true),
				boolean("peripherals", "DeskPeripherals", true),
				boolean("lighting", "DeskLighting", true),
				boolean("cablePort", "DeskCablePort", true),
				choice("accent", "AccentColor", "blue", [
					"blue",
					"red",
					"purple",
					"green",
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
			r = Math.min(Number(p.returnDepth), w * 0.42, d * 0.42),
			l = p.layout === "l-shaped",
			mirror = l && p.returnSide === "right-return" ? -1 : 1,
			t = Math.min(w, d, h) * 0.045,
			md = l ? r : d,
			metal = this.accent(0x323e46, 0.5, 0.55),
			top = new Shape();
		let points: [number, number][] = [
			[-w / 2, -d / 2],
			[w / 2, -d / 2],
			[w / 2, d / 2],
			[-w / 2, d / 2],
		],
			supports: [number, number][] = [
				[-w * 0.42, -d * 0.36],
				[w * 0.42, -d * 0.36],
				[-w * 0.42, d * 0.36],
				[w * 0.42, d * 0.36],
			];
		if (l) {
			points = [
				[-w / 2, -d / 2],
				[w / 2, -d / 2],
				[w / 2, -d / 2 + r],
				[-w / 2 + r, -d / 2 + r],
				[-w / 2 + r, d / 2],
				[-w / 2, d / 2],
			];
			supports = [
				[-w * 0.44, -d * 0.43],
				[w * 0.44, -d * 0.43],
				[w * 0.44, -d / 2 + r * 0.75],
				[-w / 2 + r * 0.25, d * 0.43],
				[-w / 2 + r * 0.75, d * 0.43],
			];
			points = points.map(([x, z]) => [x * mirror, z]);
			supports = supports.map(([x, z]) => [x * mirror, z]);
			if (mirror < 0) points.reverse();
		}
		points.forEach(([x, z], i) => {
			if (i === 0) top.moveTo(x, -z);
			else top.lineTo(x, -z);
		});
		top.closePath();
		if (p.cablePort) {
			const hole = new Path(),
				cx = w * 0.28 * mirror,
				cz = -d / 2 + md * 0.25;
			hole.absarc(cx, -cz, Math.min(w, md) * 0.025, 0, Math.PI * 2, true);
			top.holes.push(hole);
		}
		const geometry = new ExtrudeGeometry(top, {
			depth: t,
			bevelEnabled: false,
		});
		geometry.rotateX(-Math.PI / 2);
		this.addGeometry("Gaming Desktop", geometry, [0, h - t, 0], material);
		for (const [x, z] of supports)
			this.rounded(
				"Gaming Desk Leg",
				[t * 1.3, h - t, t * 1.3],
				[x, (h - t) / 2, z],
				metal,
				0.004,
			);
		if (p.lighting)
			this.rounded(
				"Gaming Desk LED",
				[w * 0.91, t * 0.25, t * 0.2],
				[0, h - t * 0.45, -d / 2 + md],
				this.accent(this.trim().color.getHex(), 0.6, 0, 1, true),
				0.001,
			);
		const mz = -d / 2 + md * 0.23,
			monitorW = Math.min(w / (Number(p.monitorCount) + 0.4), md * 1.3),
			mh = monitorW * 0.56;
		for (let i = 0; i < Number(p.monitorCount); i++) {
			const x = ((i + 0.5) / Number(p.monitorCount) - 0.5) * w * 0.88;
			this.display(
				"Gaming Monitor",
				monitorW * 0.92,
				mh,
				t,
				x,
				h + mh * 0.72,
				mz,
				true,
			);
			this.rail(
				"Gaming Monitor Stand",
				[x, h, mz],
				[x, h + mh * 0.35, mz],
				t * 0.35,
				metal,
			);
			this.rounded(
				"Gaming Monitor Foot",
				[monitorW * 0.35, t * 0.4, md * 0.2],
				[x, h + t * 0.2, mz],
				metal,
				0.004,
			);
		}
		if (p.peripherals) {
			this.rounded(
				"Gaming Keyboard",
				[w * 0.39, t * 0.6, md * 0.19],
				[0, h + t * 0.3, -d / 2 + md * 0.7],
				metal,
				0.006,
			);
			for (let row = 0; row < 4; row++)
				for (let col = 0; col < 10; col++)
					this.rounded(
						"Gaming Keyboard Key",
						[w * 0.032, t * 0.25, md * 0.032],
						[
							((col + 0.5) / 10 - 0.5) * w * 0.37,
							h + t * 0.72,
							-d / 2 + md * (0.63 + row * 0.04),
						],
						this.trim(),
						0.001,
					);
			this.ellipsoid(
				"Gaming Mouse",
				[w * 0.025, t * 0.55, md * 0.055],
				[w * 0.29, h + t * 0.55, -d / 2 + md * 0.72],
				metal,
			);
		}
		if (p.towerEnabled) {
			this.rounded(
				"Gaming PC Tower",
				[w * 0.13, h * 0.56, md * 0.53],
				[w * 0.3, h * 0.28, -d / 2 + md * 0.48],
				material,
				0.01,
			);
			for (let i = 0; i < 2; i++)
				this.addGeometry(
					"Gaming PC Fan",
					new TorusGeometry(w * 0.035, t * 0.12, 6, 24),
					[w * 0.3, h * (0.19 + i * 0.17), -d / 2 + md * 0.75],
					this.trim(),
				);
		}
	}
}

export class ArcadeMachineObject extends GameRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x596c7b) {
		super(
			"arcade-machine",
			"Arcade machine",
			"gameArcadeControls",
			[
				choice("style", "ArcadeStyle", "upright", [
					{
						value: "upright",
						parameters: {width: 0.65, depth: 0.7, height: 1.7},
					},
					{
						value: "bartop",
						parameters: {width: 0.5, depth: 0.45, height: 0.75},
					},
				]),
				...dimensions(0.65, 0.7, 1.7),
				integer("players", "ArcadePlayers", 2, 1, 2),
				integer("buttons", "ArcadeButtons", 6, 3, 8),
				boolean("powered", "ScreenPower", true),
				boolean("marquee", "ArcadeMarquee", true),
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
			t = Math.min(w, d, h) * 0.055,
			sideShape = new Shape(),
			dark = this.accent(0x303b45, 0.7),
			metal = this.accent(0xa3afb0, 0.4, 0.5);
		[
			[d * 0.45, 0],
			[-d * 0.45, 0],
			[-d * 0.45, h],
			[d * 0.15, h],
			[d * 0.15, h * 0.8],
			[-d * 0.05, h * 0.53],
			[d * 0.45, h * 0.48],
			[d * 0.45, h * 0.38],
		].forEach(([z, y], i) => {
			if (i === 0) sideShape.moveTo(-z, y);
			else sideShape.lineTo(-z, y);
		});
		sideShape.closePath();
		for (const x of [-1, 1]) {
			const geometry = new ExtrudeGeometry(sideShape, {
				depth: t,
				bevelEnabled: false,
			});
			geometry.translate(0, 0, -t / 2);
			geometry.rotateY(Math.PI / 2);
			this.addGeometry(
				"Arcade Side Panel",
				geometry,
				[(x * (w - t)) / 2, 0, 0],
				material,
			);
		}
		this.addBox(
			"Arcade Base",
			[w - t * 2, t, d * 0.9],
			[0, t / 2, 0],
			material,
		);
		this.addBox(
			"Arcade Front",
			[w - t * 2, h * 0.38, t],
			[0, h * 0.19, d * 0.45],
			material,
		);
		this.addBox(
			"Arcade Back",
			[w - t * 2, h, t],
			[0, h / 2, -d * 0.45],
			material,
		);
		this.addBox(
			"Arcade Hood",
			[w, t, d * 0.64],
			[0, h - t / 2, -d * 0.13],
			material,
		);
		const before = this.partsGroup.children.length;
		this.display(
			"Arcade Display",
			w * 0.83,
			h * 0.3,
			t,
			0,
			h * 0.67,
			-d * 0.01,
			Boolean(p.powered),
		);
		this.hingeParts(
			"Arcade Screen Tilt",
			this.partsGroup.children.slice(before),
			[0, h * 0.67, -d * 0.01],
			-0.13,
			"x",
		);
		this.rounded(
			"Arcade Control Deck",
			[w - t, t, d * 0.43],
			[0, h * 0.48, d * 0.25],
			dark,
			0.006,
		);
		for (let i = 0; i < Number(p.players); i++) {
			const x = ((i + 0.5) / Number(p.players) - 0.5) * w * 0.75,
				cw = w / (Number(p.players) + 0.5);
			this.rail(
				"Arcade Joystick Stem",
				[x - cw * 0.22, h * 0.49, d * 0.2],
				[x - cw * 0.22, h * 0.54, d * 0.2],
				t * 0.25,
				metal,
			);
			this.ellipsoid(
				"Arcade Joystick Ball",
				[t * 0.7, t * 0.7, t * 0.7],
				[x - cw * 0.22, h * 0.55, d * 0.2],
				this.accent(0xb98079, 0.7),
			);
			for (let b = 0; b < Number(p.buttons); b++)
				this.cylinder(
					"Arcade Button",
					t * 0.43,
					t * 0.43,
					t * 0.4,
					[
						x + cw * (0.03 + (b % 4) * 0.13),
						h * 0.49,
						d * (0.16 + Math.floor(b / 4) * 0.11),
					],
					this.accent(b % 2 ? 0xa5b494 : 0x91a9bd, 0.65),
					12,
				);
			this.rounded(
				"Arcade Coin Slot",
				[cw * 0.13, h * 0.025, t * 0.25],
				[x, h * 0.24, d * 0.47],
				dark,
				0.002,
			);
		}
		this.rounded(
			"Arcade Marquee",
			[w - t * 2, h * 0.11, t],
			[0, h * 0.9, d * 0.17],
			p.marquee ? this.accent(0xc2ad7c, 0.7, 0, 1, true) : dark,
			0.003,
		);
		if (p.marquee)
			for (let i = 0; i < 3; i++)
				this.rounded(
					"Arcade Marquee Mark",
					[w * 0.1, h * 0.025, t * 0.1],
					[((i + 0.5) / 3 - 0.5) * w * 0.55, h * 0.9, d * 0.17 + t * 0.6],
					metal,
					0.002,
				);
	}
}

export class GamingConsoleObject extends GameRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x77858c) {
		super(
			"gaming-console",
			"Gaming console",
			"gameConsoleControls",
			[
				choice("style", "ConsoleStyle", "flat-console", [
					{
						value: "flat-console",
						parameters: {
							width: 0.32,
							depth: 0.25,
							height: 0.08,
							controllers: 2,
						},
					},
					{
						value: "tower-console",
						parameters: {
							width: 0.12,
							depth: 0.24,
							height: 0.32,
							controllers: 2,
						},
					},
					{
						value: "handheld",
						parameters: {
							width: 0.28,
							depth: 0.12,
							height: 0.035,
							controllers: 0,
						},
					},
				]),
				...dimensions(0.32, 0.25, 0.08),
				integer("controllers", "ConsoleControllers", 2, 0, 4),
				boolean("powered", "ScreenPower", true),
			],
			parameters,
			color,
			0.45,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			t = Math.min(w, d, h) * 0.1,
			dark = this.accent(0x35424a, 0.75),
			light = this.accent(
				p.powered ? 0x8fc4bb : 0x566d68,
				0.6,
				0,
				1,
				Boolean(p.powered),
			);
		this.rounded(
			"Gaming Console Body",
			[w, h, d],
			[0, h / 2, 0],
			material,
			0.012,
		);
		if (p.style === "handheld") {
			this.rounded(
				"Handheld Screen",
				[w * 0.61, t * 0.2, d * 0.83],
				[0, h + t * 0.1, 0],
				p.powered ? this.accent(0x6e9cba, 0.6, 0, 1, true) : dark,
				0.003,
			);
			for (const side of [-1, 1])
				for (let i = 0; i < 4; i++) {
					const a = (i / 4) * Math.PI * 2;
					this.cylinder(
						"Handheld Button",
						w * 0.015,
						w * 0.015,
						t * 0.3,
						[
							side * w * 0.4 + Math.cos(a) * w * 0.035,
							h + t * 0.2,
							Math.sin(a) * d * 0.1,
						],
						dark,
						12,
					);
				}
		} else {
			for (let i = 0; i < 8; i++)
				this.rounded(
					"Console Vent",
					[w * 0.025, t * 0.15, d * 0.38],
					[((i + 0.5) / 8 - 0.5) * w * 0.7, h + t * 0.05, -d * 0.15],
					dark,
					0.001,
				);
			this.rounded(
				"Console Disc Slot",
				[w * 0.65, h * 0.035, t * 0.2],
				[0, h * 0.55, d * 0.502],
				dark,
				0.001,
			);
			this.rounded(
				"Console Power Light",
				[w * 0.08, h * 0.035, t * 0.2],
				[w * 0.35, h * 0.22, d * 0.503],
				light,
				0.001,
			);
		}
		const cw = Math.max(w, d) * 0.55;
		for (let i = 0; i < Number(p.controllers); i++)
			this.gamepad(
				((i + 0.5) / Number(p.controllers) - 0.5) *
					Math.max(w, cw * Number(p.controllers) * 1.08),
				0,
				d * 0.8 + cw * 0.25,
				cw,
				cw * 0.65,
			);
	}
}

export class RacingSimulatorObject extends GameRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x4f5e67) {
		super(
			"racing-simulator",
			"Racing simulator",
			"gameRacingControls",
			[
				...dimensions(0.8, 1.7, 1.1),
				choice("accent", "AccentColor", "blue", [
					"blue",
					"red",
					"purple",
					"green",
				]),
				integer("monitorCount", "RacingMonitors", 1, 0, 3),
				number("seatSlide", "RacingSeatSlide", 0, 0, 1, 0.05),
				number("wheelAngle", "RacingWheelAngle", 0, -45, 45, 1),
				number("pedalAngle", "RacingPedalAngle", 25, 10, 45, 1),
				boolean("shifter", "RacingShifter", true),
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
			metal = this.accent(0x8c9a9f, 0.35, 0.7),
			dark = this.accent(0x303d45, 0.8);
		for (const side of [-1, 1]) {
			this.rounded(
				"Racing Base Rail",
				[t, t, d],
				[side * w * 0.35, t / 2, 0],
				material,
				0.005,
			);
			this.rounded(
				"Racing Crossbar",
				[w * 0.75, t, t],
				[0, t / 2, side * d * 0.35],
				material,
				0.004,
			);
			this.rail(
				"Racing Wheel Support",
				[side * w * 0.32, t, d * 0.17],
				[side * w * 0.32, h * 0.64, d * 0.12],
				t * 0.7,
				material,
			);
		}
		const before = this.partsGroup.children.length;
		this.bucketSeat(w * 0.77, d * 0.29, h * 0.58, h * 0.28, material, 15);
		const seat = this.hingeParts(
			"Racing Seat Slider",
			this.partsGroup.children.slice(before),
			[0, 0, 0],
			0,
		);
		seat.position.z = -d * 0.23 + Number(p.seatSlide) * d * 0.12;
		for (const side of [-1, 1])
			this.rail(
				"Racing Seat Mount",
				[side * w * 0.22, t, -d * 0.2],
				[side * w * 0.22, h * 0.24, -d * 0.2],
				t * 0.6,
				metal,
			);
		this.rounded(
			"Racing Wheel Deck",
			[w * 0.7, t, d * 0.17],
			[0, h * 0.65, d * 0.12],
			material,
			0.005,
		);
		const radius = Math.min(w * 0.2, h * 0.18),
			wheelY = h * 0.72,
			wheelZ = d * 0.07,
			start = this.partsGroup.children.length;
		this.addGeometry(
			"Racing Steering Wheel",
			new TorusGeometry(radius, radius * 0.1, 10, 48),
			[0, wheelY, wheelZ],
			dark,
		);
		this.cylinder(
			"Racing Wheel Hub",
			radius * 0.3,
			radius * 0.3,
			t,
			[0, wheelY, wheelZ],
			metal,
			24,
		).rotation.x = Math.PI / 2;
		for (let i = 0; i < 3; i++) {
			const a = (i / 3) * Math.PI * 2;
			this.rail(
				"Racing Wheel Spoke",
				[0, wheelY, wheelZ],
				[
					Math.cos(a) * radius * 0.9,
					wheelY + Math.sin(a) * radius * 0.9,
					wheelZ,
				],
				radius * 0.05,
				metal,
			);
		}
		const wheel = this.hingeParts(
			"Racing Wheel Turn",
			this.partsGroup.children.slice(start),
			[0, wheelY, wheelZ],
			0,
		);
		wheel.rotation.z = (Number(p.wheelAngle) * Math.PI) / 180;
		const pedalStart = this.partsGroup.children.length,
			pedalY = Math.max(
				h * 0.1,
				d * 0.105 * Math.sin((Number(p.pedalAngle) * Math.PI) / 180) + t * 0.6,
			);
		this.rounded(
			"Racing Pedal Board",
			[w * 0.55, t, d * 0.21],
			[0, pedalY, d * 0.35],
			dark,
			0.005,
		);
		for (const side of [-1, 1])
			this.rounded(
				"Racing Pedal",
				[w * 0.13, t * 0.5, d * 0.12],
				[side * w * 0.15, pedalY + t * 0.8, d * 0.35],
				metal,
				0.003,
			);
		this.hingeParts(
			"Racing Pedal Tilt",
			this.partsGroup.children.slice(pedalStart),
			[0, pedalY, d * 0.35],
			(-Number(p.pedalAngle) * Math.PI) / 180,
			"x",
		);
		for (let i = 0; i < Number(p.monitorCount); i++) {
			const count = Number(p.monitorCount),
				mw = w * (count === 1 ? 0.85 : 0.72),
				x = ((i + 0.5) / count - 0.5) * mw * count,
				mz = d * 0.43,
				screenStart = this.partsGroup.children.length;
			this.display("Racing Monitor", mw, mw * 0.56, t, 0, h * 0.98, 0, true);
			const monitor = this.hingeParts(
				"Racing Monitor Angle",
				this.partsGroup.children.slice(screenStart),
				[0, 0, 0],
				Math.PI + (i - (count - 1) / 2) * 0.25,
			);
			monitor.position.set(x, 0, mz);
			this.rail(
				"Racing Monitor Stand",
				[x, t, mz],
				[x, h * 0.88, mz],
				t * 0.6,
				material,
			);
		}
		if (p.shifter) {
			this.rail(
				"Racing Shifter Post",
				[w * 0.39, t, 0],
				[w * 0.39, h * 0.46, 0],
				t * 0.55,
				metal,
			);
			this.ellipsoid(
				"Racing Shifter Knob",
				[t, t, t],
				[w * 0.39, h * 0.48, 0],
				dark,
			);
		}
	}
}
