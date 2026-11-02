import type {Mesh} from "three";

import {
	BedroomObject,
	boolean,
	choice,
	integer,
	number,
} from "./bedroom/primitives.js";
import {
	furnitureBoolean,
	furnitureNumber,
	type FurnitureParameterDefinition,
	type FurnitureParameters,
} from "./furniture.js";

export const BED_PARAMETER_DEFINITIONS: FurnitureParameterDefinition[] = [
	furnitureNumber(
		"width",
		"furnitureWidth",
		"furnitureWidthTooltip",
		1.6,
		0.7,
		3,
	),
	furnitureNumber(
		"depth",
		"furnitureDepth",
		"furnitureDepthTooltip",
		2.1,
		1.2,
		3,
	),
	furnitureNumber(
		"height",
		"furnitureHeight",
		"furnitureHeightTooltip",
		1,
		0.5,
		1.8,
	),
	furnitureNumber(
		"bedHeight",
		"furnitureBedHeight",
		"furnitureBedHeightTooltip",
		0.5,
		0.2,
		1,
	),
	furnitureNumber(
		"mattressThickness",
		"furnitureMattressThickness",
		"furnitureMattressThicknessTooltip",
		0.2,
		0.05,
		0.4,
	),
	furnitureNumber(
		"thickness",
		"furnitureBoardThickness",
		"furnitureBoardThicknessTooltip",
		0.05,
		0.02,
		0.15,
	),
	furnitureBoolean(
		"headboardEnabled",
		"furnitureHeadboardEnabled",
		"furnitureHeadboardEnabledTooltip",
		true,
	),
];

export class BedObject extends BedroomObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x9b8068) {
		super(
			"bed",
			"Bed",
			"furnitureBedParameters",
			[
				choice("sizePreset", "BedSize", "queen-bed", [
					{value: "single-bed", parameters: {width: 0.95, depth: 2.1}},
					{value: "double-bed", parameters: {width: 1.45, depth: 2.1}},
					{value: "queen-bed", parameters: {width: 1.6, depth: 2.1}},
					{value: "king-bed", parameters: {width: 1.9, depth: 2.1}},
					{value: "super-king-bed", parameters: {width: 2.1, depth: 2.1}},
				]),
				choice("style", "BedStyle", "standard-bed", [
					{
						value: "standard-bed",
						parameters: {bedHeight: 0.5, mattressThickness: 0.2},
					},
					{
						value: "platform-bed",
						parameters: {bedHeight: 0.4, mattressThickness: 0.18},
					},
					{
						value: "storage-bed",
						parameters: {bedHeight: 0.55, mattressThickness: 0.2},
					},
					{
						value: "adjustable-bed",
						parameters: {
							bedHeight: 0.5,
							mattressThickness: 0.2,
							headAngle: 30,
							footAngle: 12,
						},
					},
				]),
				...BED_PARAMETER_DEFINITIONS,
				integer("drawersPerSide", "DrawersPerSide", 2, 1, 3),
				boolean("storageOpen", "StorageOpen", false),
				number("headAngle", "HeadAngle", 0, 0, 65, 1),
				number("footAngle", "FootAngle", 0, 0, 35, 1),
				boolean("beddingEnabled", "BeddingEnabled", true),
				boolean("paddedHeadboard", "PaddedHeadboard", false),
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
			thickness = Math.min(Number(p.thickness), w * 0.14, d * 0.1);
		const bedHeight = Math.min(Number(p.bedHeight), h - 0.08),
			mattress = Math.min(Number(p.mattressThickness), bedHeight * 0.6),
			baseH = bedHeight - mattress,
			solid = p.style === "platform-bed" || p.style === "storage-bed";
		const legHeight = solid ? Math.min(0.04, baseH * 0.2) : baseH * 0.4,
			frameHeight = baseH - legHeight,
			mw = w - thickness * 2,
			md = d - thickness * 2;
		this.rounded(
			"Bed Frame",
			[w, frameHeight, d],
			[0, legHeight + frameHeight / 2, 0],
			material,
			0.012,
		);
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.rounded(
					"Bed Leg",
					[thickness, legHeight, thickness],
					[x * (w / 2 - thickness), legHeight / 2, z * (d / 2 - thickness)],
					this.accent(0x4d4842),
					0.003,
				);
		if (p.headboardEnabled) {
			this.rounded(
				"Bed Headboard",
				[w, h - legHeight, thickness],
				[0, (h + legHeight) / 2, -d / 2 + thickness / 2],
				material,
				0.015,
			);
			if (p.paddedHeadboard)
				this.rounded(
					"Headboard Upholstery",
					[w * 0.91, (h - bedHeight) * 0.85, thickness * 0.65],
					[0, bedHeight + (h - bedHeight) / 2, -d / 2 + thickness * 1.1],
					this.accent(0xc2b3a0, 0.95),
					0.025,
				);
		}
		if (p.style === "storage-bed") {
			const count = Number(p.drawersPerSide),
				dw = md / count;
			for (const side of [-1, 1])
				for (let i = 0; i < count; i++) {
					const x = side * (w / 2 + (p.storageOpen ? w * 0.23 : 0)),
						z = -md / 2 + dw * (i + 0.5),
						y = legHeight + frameHeight / 2;
					this.rounded(
						"Bed Storage Drawer",
						[thickness, frameHeight * 0.85, dw * 0.95],
						[x, y, z],
						material,
						0.004,
					);
					this.rounded(
						"Bed Drawer Handle",
						[thickness * 0.5, frameHeight * 0.12, dw * 0.35],
						[x + side * thickness * 0.7, y, z],
						this.accent(0x6b655e, 0.3, 0.6),
						0.003,
					);
					if (p.storageOpen) {
						this.addBox(
							"Bed Drawer Bottom",
							[w * 0.24, thickness * 0.3, dw * 0.9],
							[x - side * w * 0.12, legHeight + frameHeight * 0.16, z],
							material,
						);
						for (const edge of [-1, 1])
							this.addBox(
								"Bed Drawer Side",
								[w * 0.24, frameHeight * 0.6, thickness * 0.4],
								[x - side * w * 0.12, y, z + edge * dw * 0.44],
								material,
							);
					}
				}
		}
		const fabric = this.accent(0xe7dfd2, 0.95),
			cover = this.accent(0x9eaea5, 0.98),
			pillowH = Math.min(0.08, mattress * 0.4),
			pillows = w >= 1.2 ? 2 : 1;
		const pillowParts = () => {
			for (let i = 0; i < pillows; i++)
				this.rounded(
					"Bed Pillow",
					[(mw / pillows) * 0.8, pillowH, Math.min(0.35, md * 0.2)],
					[
						((i - (pillows - 1) / 2) * mw) / pillows,
						bedHeight + pillowH / 2,
						-md / 2 + md * 0.12,
					],
					fabric,
					0.035,
				);
		};
		if (p.style === "adjustable-bed") {
			const sections = [
				{
					name: "Head",
					length: md * 0.4,
					z: -md * 0.3,
					pivot: -md * 0.1,
					angle: (Number(p.headAngle) * Math.PI) / 180,
				},
				{
					name: "Center",
					length: md * 0.28,
					z: md * 0.04,
					pivot: md * 0.04,
					angle: 0,
				},
				{
					name: "Foot",
					length: md * 0.32,
					z: md * 0.34,
					pivot: md * 0.18,
					angle: (-Number(p.footAngle) * Math.PI) / 180,
				},
			];
			for (const section of sections) {
				const before = this.partsGroup.children.length;
				this.rounded(
					"Bed Mattress",
					[mw, mattress, section.length * 0.99],
					[0, bedHeight - mattress / 2, section.z],
					fabric,
					0.025,
				);
				this.rounded(
					"Adjustable Bed Deck",
					[mw, thickness * 0.4, section.length * 0.98],
					[0, baseH - thickness * 0.2, section.z],
					this.accent(0x4b5359, 0.4, 0.5),
					0.004,
				);
				if (section.name === "Head") pillowParts();
				if (p.beddingEnabled && section.name !== "Head")
					this.rounded(
						"Bed Cover",
						[mw * 0.99, mattress * 0.12, section.length * 0.96],
						[0, bedHeight + mattress * 0.06, section.z],
						cover,
						0.015,
					);
				this.hingeParts(
					`Adjustable ${section.name} Section`,
					this.partsGroup.children.slice(before),
					[0, baseH, section.pivot],
					section.angle,
					"x",
				);
			}
		} else {
			this.rounded(
				"Bed Mattress",
				[mw, mattress, md],
				[0, bedHeight - mattress / 2, 0],
				fabric,
				0.035,
			);
			pillowParts();
			if (p.beddingEnabled)
				this.rounded(
					"Bed Cover",
					[mw * 0.99, mattress * 0.15, md * 0.67],
					[0, bedHeight + mattress * 0.075, md * 0.155],
					cover,
					0.025,
				);
		}
	}
}
