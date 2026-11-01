import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	LivingRoomObject,
	number,
} from "./primitives.js";

export class TelevisionObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x20252b) {
		super(
			"television",
			"TV",
			"livingTelevisionControls",
			[
				...dimensions(1.25, 0.065, 0.78),
				choice("aspectRatio", "AspectRatio", "16-9", ["16-9", "21-9", "4-3"]),
				boolean("standEnabled", "StandEnabled", true),
				boolean("screenOn", "ScreenOn", true),
			],
			parameters,
			color,
			0.4,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			h = Number(p.height),
			d = Number(p.depth);
		const ratio =
			p.aspectRatio === "21-9"
				? 21 / 9
				: p.aspectRatio === "4-3"
					? 4 / 3
					: 16 / 9;
		const sh = Math.min(w / ratio, h * (p.standEnabled ? 0.84 : 1));
		const border = Math.min(0.018, w * 0.04, sh * 0.08),
			base = p.standEnabled ? h - sh : 0;
		this.rounded(
			"TV Frame",
			[w, sh, d],
			[0, base + sh / 2, 0],
			material,
			border * 0.5,
		);
		this.rounded(
			"TV Screen",
			[w - border * 2, sh - border * 2, 0.003],
			[0, base + sh / 2, d / 2 + 0.001],
			this.accent(
				p.screenOn ? 0x244f68 : 0x10161c,
				0.18,
				0.15,
				1,
				Boolean(p.screenOn),
			),
			0.004,
		);
		if (p.screenOn) {
			this.addBox(
				"TV Screen Horizon",
				[w * 0.9, sh * 0.24, 0.001],
				[0, base + sh * 0.3, d / 2 + 0.004],
				this.accent(0x638582, 0.8, 0, 1, true),
			);
		}
		if (p.standEnabled) {
			const foot = Math.min(0.025, base * 0.3);
			this.rounded(
				"TV Stand Foot",
				[w * 0.42, foot, Math.max(d * 2, w * 0.2)],
				[0, foot / 2, 0],
				material,
			);
			this.addBox(
				"TV Stand Neck",
				[w * 0.07, base, d],
				[0, base / 2, -d / 2],
				material,
			);
		}
	}
}

export class ProjectorObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xe4e3dd) {
		super(
			"projector",
			"Projector",
			"livingProjectorControls",
			[
				...dimensions(0.32, 0.25, 0.13),
				choice("mount", "ProjectorMount", "tabletop", ["tabletop", "ceiling"]),
				number("mountDrop", "MountDrop", 0.25, 0.05, 1),
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
			h = Number(p.height);
		this.rounded("Projector Body", [w, h, d], [0, h / 2, 0], material, 0.025);
		const rim = this.cylinder(
			"Projector Lens Rim",
			Math.min(w, h) * 0.32,
			Math.min(w, h) * 0.32,
			d * 0.14,
			[w * 0.22, h * 0.5, d * 0.53],
			this.accent(0x292d34),
			32,
		);
		rim.rotation.x = Math.PI / 2;
		const lens = this.cylinder(
			"Projector Lens",
			Math.min(w, h) * 0.25,
			Math.min(w, h) * 0.25,
			0.005,
			[w * 0.22, h * 0.5, d * 0.61],
			this.accent(0x6086ad, 0.1, 0.4, 1, true),
		);
		lens.rotation.x = Math.PI / 2;
		for (let i = 0; i < 7; i++)
			this.addBox(
				"Projector Vent",
				[w * 0.32, h * 0.025, 0.002],
				[-w * 0.18, h * (0.25 + i * 0.08), d / 2 + 0.002],
				this.accent(0x555b62),
			);
		if (p.mount === "ceiling") {
			const drop = Number(p.mountDrop);
			this.cylinder(
				"Projector Ceiling Stem",
				0.016,
				0.016,
				drop,
				[0, h + drop / 2, 0],
				this.accent(0x5e6268, 0.4, 0.5),
			);
			this.rounded(
				"Projector Ceiling Plate",
				[w * 0.4, 0.015, d * 0.4],
				[0, h + drop, 0],
				material,
			);
		}
	}
}

export class ProjectionScreenObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x2d3036) {
		super(
			"projection-screen",
			"Projection screen",
			"livingScreenControls",
			[
				...dimensions(2.2, 0.08, 1.4),
				choice("style", "ScreenStyle", "fixed-screen", [
					"fixed-screen",
					"pull-down",
					"tripod",
				]),
				number("extension", "ScreenExtension", 1, 0.05, 1, 0.05),
			],
			parameters,
			color,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			h = Number(p.height),
			d = Number(p.depth);
		const frame = Math.min(0.04, w * 0.06, h * 0.08),
			offset = p.style === "tripod" ? h * 0.45 : 0;
		const sh =
			(h - frame * 2) * (p.style === "pull-down" ? Number(p.extension) : 1);
		this.rounded(
			"Projection Screen Housing",
			[w, frame * 2, d],
			[0, offset + h - frame, 0],
			material,
		);
		this.addBox(
			"Projection Surface",
			[w - frame * 2, sh, 0.005],
			[0, offset + h - frame * 2 - sh / 2, 0],
			this.accent(0xeeeae0, 0.95),
		);
		this.addBox(
			"Projection Bottom Bar",
			[w, frame, d * 0.6],
			[0, offset + h - frame * 2 - sh, 0],
			material,
		);
		if (p.style === "fixed-screen")
			for (const side of [-1, 1])
				this.addBox(
					"Projection Side Frame",
					[frame, h, d * 0.5],
					[side * (w / 2 - frame / 2), h / 2, 0],
					material,
				);
		if (p.style === "tripod") {
			this.cylinder(
				"Screen Stand",
				0.016,
				0.02,
				offset + h * 0.5,
				[0, (offset + h * 0.5) / 2, -d],
				material,
			);
			for (let i = 0; i < 3; i++) {
				const foot = this.addBox(
					"Screen Tripod Foot",
					[w * 0.27, 0.025, 0.035],
					[
						Math.cos((i * Math.PI * 2) / 3) * w * 0.12,
						0.013,
						Math.sin((i * Math.PI * 2) / 3) * w * 0.12,
					],
					material,
				);
				foot.rotation.y = (-i * Math.PI * 2) / 3;
			}
		}
	}
}

export class SpeakerSystemObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x30343b) {
		super(
			"speaker-system",
			"Speakers / soundbar",
			"livingSpeakerControls",
			[
				choice("style", "SpeakerStyle", "speaker", [
					{
						value: "speaker",
						parameters: {width: 0.22, depth: 0.25, height: 0.4},
					},
					{
						value: "soundbar",
						parameters: {width: 1, depth: 0.12, height: 0.085},
					},
					{
						value: "home-cinema",
						parameters: {width: 0.2, depth: 0.24, height: 0.8},
					},
				]),
				...dimensions(0.22, 0.25, 0.4),
				integer("driverCount", "DriverCount", 2, 1, 5),
				number("systemWidth", "SystemWidth", 2.6, 0.6, 6),
				boolean("subwooferEnabled", "SubwooferEnabled", true),
			],
			parameters,
			color,
			0.8,
		);
	}
	private speaker(
		name: string,
		w: number,
		d: number,
		h: number,
		x: number,
		z: number,
		material: Mesh["material"],
		horizontal = false,
	): void {
		this.rounded(
			name,
			[w, h, d],
			[x, h / 2, z],
			material,
			Math.min(w, h) * 0.15,
		);
		const count = Number(this.parameters.driverCount),
			cone = this.accent(0x131820, 0.6),
			surround = this.accent(0x686a6b, 0.65, 0.1);
		for (let i = 0; i < count; i++) {
			const radius = Math.min(w * 0.36, (h / count) * 0.35),
				dx = horizontal ? ((i + 0.5) / count) * w - w / 2 : 0;
			const y = horizontal ? h / 2 : ((i + 0.5) / count) * h;
			const ring = this.cylinder(
				"Speaker Surround",
				radius,
				radius,
				0.008,
				[x + dx, y, z + d / 2 + 0.002],
				surround,
			);
			ring.rotation.x = Math.PI / 2;
			const driver = this.cylinder(
				"Speaker Driver",
				radius * 0.8,
				radius * 0.8,
				0.012,
				[x + dx, y, z + d / 2 + 0.01],
				cone,
			);
			driver.rotation.x = Math.PI / 2;
		}
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		if (p.style !== "home-cinema") {
			this.speaker(
				"Speaker Cabinet",
				w,
				d,
				h,
				0,
				0,
				material,
				p.style === "soundbar",
			);
			return;
		}
		const spacing = Number(p.systemWidth);
		for (const side of [-1, 1]) {
			this.speaker(
				"Cinema Front Speaker",
				w,
				d,
				h,
				(side * spacing) / 2,
				0,
				material,
			);
			this.speaker(
				"Cinema Rear Speaker",
				w * 0.7,
				d * 0.7,
				h * 0.55,
				(side * spacing) / 2,
				spacing * 0.65,
				material,
			);
		}
		this.speaker(
			"Cinema Center Speaker",
			w * 2.5,
			d,
			h * 0.18,
			0,
			0,
			material,
			true,
		);
		if (p.subwooferEnabled)
			this.speaker(
				"Cinema Subwoofer",
				w * 1.7,
				d * 1.6,
				h * 0.5,
				spacing * 0.3,
				d,
				material,
			);
	}
}
