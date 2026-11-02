import type {Mesh} from "three";
import {
	BufferGeometry,
	CircleGeometry,
	ExtrudeGeometry,
	Float32BufferAttribute,
	PointLight,
	Shape,
	TorusGeometry,
} from "three";

import type {
	FurnitureParameterDefinition,
	FurnitureParameters,
} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	integer,
	LivingRoomObject,
	number,
} from "./primitives.js";

export class RugObject extends LivingRoomObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = 0xbcb097,
		type: "rug" | "bath-mat" = "rug",
	) {
		super(
			type,
			type === "bath-mat" ? "Bath mat" : "Rug",
			type === "bath-mat" ? "bathMatControls" : "livingRugControls",
			[
				...dimensions(2, 1.4, 0.012).map((definition) =>
					definition.name === "height"
						? {...definition, min: 0.002, max: 0.1}
						: definition,
				),
				choice("shape", "TopShape", "rectangle", [
					"rectangle",
					"rounded",
					"round",
					"oval",
				]),
				boolean("borderEnabled", "BorderEnabled", true),
				boolean("fringeEnabled", "FringeEnabled", false),
			],
			parameters,
			color,
			1,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		if (p.shape === "round" || p.shape === "oval") {
			const radius = Math.min(w, d) / 2;
			const rug = this.cylinder(
				"Rug",
				radius,
				radius,
				h,
				[0, h / 2, 0],
				material,
				64,
			);
			if (p.shape === "oval") {
				rug.scale.x = w / (radius * 2);
				rug.scale.z = d / (radius * 2);
			}
			if (p.borderEnabled) {
				const border = this.addGeometry(
					"Rug Border",
					new TorusGeometry(
						radius * 0.88,
						Math.min(h * 0.35, radius * 0.04),
						6,
						64,
					),
					[0, h, 0],
					this.accent(0x8a7a63),
				);
				border.rotation.x = -Math.PI / 2;
				if (p.shape === "oval")
					border.scale.set(w / (radius * 2), d / (radius * 2), 1);
			}
		} else {
			if (p.shape === "rounded")
				this.plate(
					"Rug",
					[w, h, d],
					[0, h / 2, 0],
					material,
					Math.min(w, d) * 0.12,
				);
			else
				this.rounded(
					"Rug",
					[w, h, d],
					[0, h / 2, 0],
					material,
					p.shape === "rounded" ? 0.1 : 0.002,
				);
			if (p.borderEnabled)
				for (const side of [-1, 1]) {
					this.addBox(
						"Rug Border",
						[w * 0.9, 0.001, d * 0.025],
						[0, h + 0.001, side * d * 0.43],
						this.accent(0x8a7a63),
					);
					this.addBox(
						"Rug Border",
						[w * 0.018, 0.001, d * 0.88],
						[side * w * 0.44, h + 0.001, 0],
						this.accent(0x8a7a63),
					);
				}
			if (p.fringeEnabled)
				for (const side of [-1, 1])
					for (let i = 0; i < 24; i++)
						this.addBox(
							"Rug Fringe",
							[w * 0.018, h * 0.4, Math.min(d * 0.07, 0.07)],
							[-w * 0.46 + (i / 23) * w * 0.92, h * 0.3, side * d * 0.52],
							material,
						);
		}
	}
}

export class MirrorObject extends LivingRoomObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = 0xa08a56,
		type: "mirror" | "dressing-mirror" = "mirror",
		extraDefinitions: FurnitureParameterDefinition[] = [],
	) {
		super(
			type,
			type === "dressing-mirror" ? "Dressing mirror" : "Mirror",
			type === "dressing-mirror"
				? "closetMirrorControls"
				: "livingMirrorControls",
			[
				...(type === "mirror"
					? [
						choice("sizePreset", "MirrorSize", "standard-mirror", [
							{
								value: "standard-mirror",
								parameters: {width: 0.7, depth: 0.035, height: 1.1},
							},
							{
								value: "full-length-mirror",
								parameters: {width: 0.65, depth: 0.04, height: 1.8},
							},
						]),
					]
					: []),
				...dimensions(0.7, 0.035, 1.1),
				choice("shape", "MirrorShape", "arched", [
					"rectangle",
					"round",
					"oval",
					"arched",
				]),
				number("frameWidth", "FrameWidth", 0.035, 0.005, 0.15),
				boolean("standEnabled", "StandEnabled", false),
				...extraDefinitions,
			],
			parameters,
			color,
			0.35,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			f = Math.min(Number(p.frameWidth), w * 0.2, h * 0.2);
		const glass = this.accent(0xc3d4df, 0.1, 0.55);
		if (p.shape === "round" || p.shape === "oval") {
			const mh = p.shape === "round" ? Math.min(w, h) : h;
			const frame = this.cylinder(
				"Mirror Frame",
				1,
				1,
				d,
				[0, mh / 2, 0],
				material,
				64,
			);
			frame.scale.set(w / 2, 1, mh / 2);
			frame.rotation.x = Math.PI / 2;
			const face = this.addGeometry(
				"Mirror Glass",
				new CircleGeometry(1, 64),
				[0, mh / 2, d / 2 + 0.001],
				glass,
			);
			face.scale.set(w / 2 - f, mh / 2 - f, 1);
		} else if (p.shape === "arched") {
			const arch = (width: number, height: number, depth: number) => {
				const radius = Math.min(width / 2, height * 0.45),
					shape = new Shape();
				shape.moveTo(-width / 2, 0);
				shape.lineTo(width / 2, 0);
				shape.lineTo(width / 2, height - radius);
				shape.absellipse(
					0,
					height - radius,
					width / 2,
					radius,
					0,
					Math.PI,
					false,
					0,
				);
				shape.closePath();
				const geometry = new ExtrudeGeometry(shape, {
					depth,
					bevelEnabled: false,
					curveSegments: 24,
				});
				geometry.translate(0, 0, -depth / 2);
				return geometry;
			};
			this.addGeometry("Mirror Frame", arch(w, h, d), [0, 0, 0], material);
			this.addGeometry(
				"Mirror Glass",
				arch(w - f * 2, h - f * 2, 0.003),
				[0, f, d / 2 + 0.002],
				glass,
			);
		} else {
			this.rounded(
				"Mirror Frame",
				[w, h, d],
				[0, h / 2, 0],
				material,
				p.shape === "arched" ? Math.min(w, h) * 0.24 : 0.008,
			);
			this.rounded(
				"Mirror Glass",
				[w - f * 2, h - f * 2, 0.003],
				[0, h / 2, d / 2 + 0.002],
				glass,
				p.shape === "arched" ? Math.min(w, h) * 0.2 : 0.005,
			);
		}
		if (p.standEnabled)
			for (const side of [-1, 1]) {
				this.addBox(
					"Mirror Stand",
					[f, h * 0.75, f],
					[side * w * 0.3, h * 0.375, -w * 0.2],
					material,
				).rotation.x = -0.15;
				this.addBox(
					"Mirror Foot",
					[w * 0.25, f, w * 0.45],
					[side * w * 0.3, f / 2, -w * 0.1],
					material,
				);
			}
	}
}

export class PlantObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xbb7f59) {
		super(
			"indoor-plant",
			"Indoor plant",
			"livingPlantControls",
			[
				...dimensions(0.7, 0.7, 1.25),
				choice("style", "PlantStyle", "leafy-plant", [
					"leafy-plant",
					"palm",
					"succulent",
				]),
				integer("leafCount", "LeafCount", 12, 4, 36),
				number("potRatio", "PotRatio", 0.28, 0.15, 0.6),
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
			ph = h * Number(p.potRatio),
			pr = Math.min(w, d) * 0.25;
		this.lathe(
			"Plant Pot",
			[
				[0, 0],
				[pr * 0.7, 0],
				[pr, ph],
				[pr * 0.88, ph],
				[pr * 0.65, 0.03],
				[0, 0.03],
			],
			[0, 0, 0],
			material,
		);
		this.cylinder(
			"Plant Soil",
			pr * 0.88,
			pr * 0.88,
			Math.min(0.02, ph * 0.1),
			[0, ph * 0.91, 0],
			this.accent(0x4c3829),
		);
		const foliage = this.accent(0x4a774c, 0.9),
			stems = this.accent(0x636945, 0.9),
			n = Number(p.leafCount);
		if (p.style === "succulent") {
			for (let i = 0; i < n; i++) {
				const angle = i * 2.39996,
					radius = (((i % 3) + 1) / 3) * pr * 0.7;
				const leaf = this.ellipsoid(
					"Succulent Leaf",
					[pr * 0.28, (h - ph) * 0.45, pr * 0.16],
					[
						Math.cos(angle) * radius,
						ph + (h - ph) * 0.32,
						Math.sin(angle) * radius,
					],
					foliage,
				);
				leaf.rotation.set(Math.cos(angle) * 0.6, angle, Math.sin(angle) * 0.6);
			}
			return;
		}
		this.cylinder(
			"Plant Trunk",
			pr * 0.06,
			pr * 0.1,
			h - ph,
			[0, ph + (h - ph) / 2, 0],
			stems,
			12,
		);
		for (let i = 0; i < n; i++) {
			const angle = i * 2.39996,
				level = p.style === "palm" ? 0.8 : 0.25 + (i / n) * 0.65;
			const leaf = this.ellipsoid(
				"Plant Leaf",
				[
					w * (p.style === "palm" ? 0.3 : 0.2),
					Math.min(0.025, w * 0.04),
					d * 0.1,
				],
				[
					Math.cos(angle) * w * 0.2,
					ph + (h - ph) * level,
					Math.sin(angle) * d * 0.2,
				],
				foliage,
			);
			leaf.rotation.set(0.3, -angle, Math.sin(angle) * 0.4);
			const stem = this.cylinder(
				"Leaf Stem",
				pr * 0.018,
				pr * 0.018,
				w * 0.24,
				[
					Math.cos(angle) * w * 0.1,
					ph + (h - ph) * level,
					Math.sin(angle) * d * 0.1,
				],
				stems,
				8,
			);
			stem.rotation.set(
				(Math.sin(angle) * Math.PI) / 2,
				0,
				(-Math.cos(angle) * Math.PI) / 2,
			);
		}
	}
}

export class VaseObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xcfc2aa) {
		super(
			"vase",
			"Vase",
			"livingVaseControls",
			[
				...dimensions(0.24, 0.24, 0.4),
				choice("style", "VaseStyle", "bottle-vase", [
					"bottle-vase",
					"cylinder-vase",
					"bowl-vase",
				]),
				number("neckRatio", "NeckRatio", 0.38, 0.15, 0.9),
			],
			parameters,
			color,
			0.35,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			r = Number(p.width) / 2,
			h = Number(p.height),
			neck = Number(p.neckRatio),
			thick = Math.min(r * 0.1, 0.012);
		const profile: [number, number][] =
			p.style === "cylinder-vase"
				? [
					[0, 0],
					[r, 0],
					[r, h],
					[r - thick, h],
					[r - thick, thick],
					[0, thick],
				]
				: p.style === "bowl-vase"
					? [
						[0, 0],
						[r * 0.35, 0],
						[r * 0.75, h * 0.3],
						[r, h],
						[r - thick, h],
						[r * 0.6, h * 0.3],
						[0, thick],
					]
					: [
						[0, 0],
						[r * 0.6, 0],
						[r, h * 0.25],
						[r * 0.92, h * 0.55],
						[r * neck, h * 0.8],
						[r * neck, h],
						[Math.max(0.001, r * neck - thick), h],
						[Math.max(0.001, r * neck - thick), h * 0.82],
						[r * 0.78, h * 0.5],
						[r * 0.7, h * 0.2],
						[0, thick],
					];
		const vase = this.lathe("Vase", profile, [0, 0, 0], material);
		vase.scale.z = Number(p.depth) / Number(p.width);
	}
}

export class ArtworkObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x745238) {
		super(
			"artwork",
			"Artwork",
			"livingArtworkControls",
			[
				...dimensions(0.8, 0.035, 0.6),
				choice("style", "ArtStyle", "abstract-art", [
					"abstract-art",
					"landscape-art",
					"triptych",
				]),
				number("frameWidth", "FrameWidth", 0.03, 0.005, 0.1),
			],
			parameters,
			color,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			h = Number(p.height),
			d = Number(p.depth),
			n = p.style === "triptych" ? 3 : 1;
		const panel = (w / n) * (n > 1 ? 0.92 : 1),
			f = Math.min(Number(p.frameWidth), panel * 0.15, h * 0.15);
		for (let i = 0; i < n; i++) {
			const x = ((i - (n - 1) / 2) * w) / n;
			this.rounded(
				"Artwork Frame",
				[panel, h, d],
				[x, h / 2, 0],
				material,
				0.004,
			);
			this.addBox(
				"Artwork Canvas",
				[panel - f * 2, h - f * 2, 0.003],
				[x, h / 2, d / 2 + 0.001],
				this.accent(0xe9dfc9),
			);
			if (p.style === "landscape-art") {
				this.addBox(
					"Artwork Sky",
					[panel - f * 3, h * 0.38, 0.001],
					[x, h * 0.66, d / 2 + 0.004],
					this.accent(0x88a6b5),
				);
				this.addBox(
					"Artwork Landscape",
					[panel - f * 3, h * 0.3, 0.001],
					[x, h * 0.3, d / 2 + 0.005],
					this.accent(0x73866b),
				);
			} else {
				const disk = this.addGeometry(
					"Artwork Circle",
					new CircleGeometry(Math.min(panel, h) * 0.24, 40),
					[x + panel * 0.08, h * 0.58, d / 2 + 0.005],
					this.accent(0xbf7858),
				);
				disk.scale.y = 1.1;
				this.addBox(
					"Artwork Color Block",
					[panel * 0.5, h * 0.18, 0.001],
					[x - panel * 0.06, h * 0.27, d / 2 + 0.006],
					this.accent(0x587d7c),
				);
			}
		}
	}
}

export class WallClockObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x655345) {
		super(
			"wall-clock",
			"Wall clock",
			"livingClockControls",
			[
				...dimensions(0.4, 0.035, 0.4),
				integer("hour", "ClockHour", 10, 0, 23),
				integer("minute", "ClockMinute", 10, 0, 59),
			],
			parameters,
			color,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			r = Math.min(Number(p.width), Number(p.height)) / 2,
			d = Number(p.depth);
		const frame = this.cylinder(
			"Clock Frame",
			r,
			r,
			d,
			[0, r, 0],
			material,
			64,
		);
		frame.rotation.x = Math.PI / 2;
		this.addGeometry(
			"Clock Face",
			new CircleGeometry(r * 0.88, 64),
			[0, r, d / 2 + 0.001],
			this.accent(0xeee7d5),
		);
		const ink = this.accent(0x30363a);
		for (let i = 0; i < 12; i++) {
			const a = (i / 12) * Math.PI * 2;
			this.addBox(
				"Clock Hour Marker",
				[r * 0.025, r * 0.09, 0.002],
				[Math.sin(a) * r * 0.74, r + Math.cos(a) * r * 0.74, d / 2 + 0.004],
				ink,
			).rotation.z = -a;
		}
		for (const [length, angle] of [
			[
				r * 0.46,
				(((Number(p.hour) % 12) + Number(p.minute) / 60) / 12) * Math.PI * 2,
			],
			[r * 0.67, (Number(p.minute) / 60) * Math.PI * 2],
		]) {
			this.rounded(
				"Clock Hand",
				[r * 0.035, length, 0.004],
				[
					(Math.sin(angle) * length) / 2,
					r + (Math.cos(angle) * length) / 2,
					d / 2 + 0.008,
				],
				ink,
				0.002,
			).rotation.z = -angle;
		}
	}
}

export class FireplaceObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xbdb4a5) {
		super(
			"fireplace",
			"Fireplace",
			"livingFireplaceControls",
			[
				...dimensions(1.3, 0.32, 1.05),
				choice("style", "FireplaceStyle", "mantel-fireplace", [
					"mantel-fireplace",
					"linear-fireplace",
				]),
				boolean("enabled", "FireEnabled", true),
				number("intensity", "FireIntensity", 1.5, 0, 15, 0.1),
			],
			parameters,
			color,
			0.85,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height);
		const frame = Math.min(w * 0.12, h * 0.15);
		this.rounded(
			"Fireplace Hearth",
			[w, frame, d],
			[0, frame / 2, 0],
			material,
		);
		for (const side of [-1, 1])
			this.addBox(
				"Fireplace Surround",
				[frame, h - frame, d],
				[(side * (w - frame)) / 2, (h + frame) / 2, 0],
				material,
			);
		this.rounded(
			"Fireplace Mantel",
			[w, frame, d],
			[0, h - frame / 2, 0],
			material,
		);
		this.addBox(
			"Fireplace Interior",
			[w - frame * 2, h - frame * 2, 0.02],
			[0, h / 2, -d / 2 + 0.01],
			this.accent(0x24252a),
		);
		for (let i = 0; i < 4; i++) {
			const log = this.cylinder(
				"Fireplace Log",
				Math.min(h * 0.05, d * 0.15),
				Math.min(h * 0.05, d * 0.15),
				w * 0.17,
				[(i - 1.5) * w * 0.15, frame * 1.3, 0],
				this.accent(0x574132),
			);
			log.rotation.z = Math.PI / 2;
		}
		if (p.enabled) {
			for (let i = 0; i < 5; i++) {
				const flame = this.ellipsoid(
					"Fireplace Flame",
					[w * 0.045, h * (0.12 + (i % 3) * 0.035), d * 0.08],
					[(i - 2) * w * 0.12, frame + h * 0.15, d * 0.05],
					this.accent(i % 2 ? 0xffbe51 : 0xe97936, 0.5, 0, 1, true),
				);
				flame.rotation.z = (i % 2 ? 1 : -1) * 0.15;
			}
			const light = new PointLight(0xff9a48, Number(p.intensity), 5, 2);
			light.position.set(0, h * 0.4, d * 0.6);
			light.internal = true;
			light.name = "Fireplace Light";
			this.partsGroup.add(light);
		}
		if (p.style === "linear-fireplace")
			this.addBox(
				"Fireplace Glass",
				[w - frame * 2, h - frame * 2, 0.003],
				[0, h / 2, d / 2],
				this.accent(0xc1d0d7, 0.1, 0.3, 0.12),
			);
	}
}

export class CurtainsObject extends LivingRoomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xc9bfa9) {
		super(
			"curtains",
			"Curtains",
			"livingCurtainsControls",
			[
				...dimensions(2, 0.16, 2.3),
				number("openAmount", "CurtainOpenAmount", 0.35, 0, 0.95, 0.05),
				integer("pleats", "CurtainPleats", 14, 4, 32),
				boolean("pair", "CurtainPair", true),
				boolean("rodEnabled", "RodEnabled", true),
			],
			parameters,
			color,
			1,
		);
	}
	protected buildFurniture(material: Mesh["material"]): void {
		const p = this.parameters,
			w = Number(p.width),
			d = Number(p.depth),
			h = Number(p.height),
			pair = p.pair ? 2 : 1;
		const folds = Number(p.pleats),
			segments = folds * 6,
			panelW = (w / pair) * (1 - Number(p.openAmount) * 0.9);
		for (let panel = 0; panel < pair; panel++) {
			const offset =
				pair === 2
					? panel
						? w / 2 - panelW / 2
						: -w / 2 + panelW / 2
					: -w / 2 + panelW / 2;
			const positions: number[] = [],
				uvs: number[] = [],
				indices: number[] = [];
			for (let row = 0; row <= 8; row++)
				for (let i = 0; i <= segments; i++) {
					positions.push(
						offset + (i / segments - 0.5) * panelW,
						(row / 8) * h * 0.97,
						Math.sin(((i / segments) * Math.PI * 2 * folds) / pair) * d * 0.4,
					);
					uvs.push(i / segments, row / 8);
					if (row < 8 && i < segments) {
						const a = row * (segments + 1) + i,
							b = a + segments + 1;
						indices.push(a, b, a + 1, b, b + 1, a + 1);
					}
				}
			const geometry = new BufferGeometry();
			geometry.setAttribute(
				"position",
				new Float32BufferAttribute(positions, 3),
			);
			geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
			geometry.setIndex(indices);
			geometry.computeVertexNormals();
			this.addGeometry("Curtain Fabric", geometry, [0, 0, 0], material);
			// Reverse winding on an owned back surface so shared materials stay unchanged.
			const reverse = geometry.clone(),
				winding = reverse.index!.array;
			for (let i = 0; i < winding.length; i += 3)
				[winding[i + 1], winding[i + 2]] = [winding[i + 2], winding[i + 1]];
			reverse.computeVertexNormals();
			this.addGeometry("Curtain Fabric Back", reverse, [0, 0, 0], material);
		}
		if (p.rodEnabled) {
			const metal = this.accent(0x6c5d4d, 0.4, 0.5),
				radius = Math.min(0.014, w * 0.02);
			const rod = this.cylinder(
				"Curtain Rod",
				radius,
				radius,
				w * 1.05,
				[0, h, 0],
				metal,
			);
			rod.rotation.z = Math.PI / 2;
			for (const side of [-1, 1])
				this.ellipsoid(
					"Curtain Finial",
					[radius * 1.8, radius * 1.8, radius * 1.8],
					[side * w * 0.54, h, 0],
					metal,
				);
		}
	}
}
