import type {Mesh} from "three";
import {TorusGeometry} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {boolean, choice, dimensions, LaundryObject} from "./primitives.js";

export class LaundryApplianceObject extends LaundryObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xd7dedf) {
		super(
			"laundry-appliance",
			"Laundry appliance",
			"laundryApplianceControls",
			[
				choice("style", "ApplianceStyle", "washing-machine", [
					{
						value: "washing-machine",
						parameters: {width: 0.6, depth: 0.6, height: 0.85},
					},
					{
						value: "tumble-dryer",
						parameters: {width: 0.6, depth: 0.65, height: 0.85},
					},
					{
						value: "washer-dryer",
						parameters: {width: 0.6, depth: 0.64, height: 0.85},
					},
					{
						value: "stacked-laundry-unit",
						parameters: {width: 0.65, depth: 0.68, height: 1.75},
					},
				]),
				...dimensions(0.6, 0.6, 0.85),
				boolean("doorOpen", "ApplianceDoor", false),
				choice("doorSide", "DoorSide", "left-hinge", [
					"left-hinge",
					"right-hinge",
				]),
				boolean("enabled", "ApplianceOn", false),
				boolean("contentsEnabled", "DrumContents", true),
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
			stacked = p.style === "stacked-laundry-unit",
			gap = stacked ? h * 0.012 : 0,
			count = stacked ? 2 : 1,
			uh = (h - gap) / count;
		for (let index = 0; index < count; index++) {
			const offset = index * (uh + gap),
				dryer = p.style === "tumble-dryer" || (stacked && index === 1),
				combined = p.style === "washer-dryer",
				t = Math.min(w, d, uh) * 0.035,
				r = Math.min(w * 0.31, uh * 0.29),
				y = offset + uh * 0.47,
				dark = this.accent(0x35454f, 0.45),
				metal = this.accent(0x8a9ca6, 0.2, 0.8);
			this.rounded(
				"Laundry Appliance Body",
				[w, uh, d],
				[0, offset + uh / 2, 0],
				material,
				0.012,
			);
			this.rounded(
				"Laundry Control Panel",
				[w * 0.96, uh * 0.13, t],
				[0, offset + uh * 0.915, d / 2],
				material,
				0.004,
			);
			this.cylinder(
				"Laundry Selector Dial",
				uh * 0.032,
				uh * 0.032,
				t,
				[-w * 0.28, offset + uh * 0.915, d / 2 + t * 0.6],
				metal,
				24,
			).rotation.x = Math.PI / 2;
			this.rounded(
				"Laundry Display",
				[w * 0.26, uh * 0.05, t * 0.4],
				[w * 0.16, offset + uh * 0.915, d / 2 + t * 0.6],
				this.accent(
					p.enabled ? (dryer ? 0xb79a69 : 0x638c92) : 0x2e424a,
					0.4,
					0,
					1,
					Boolean(p.enabled),
				),
				0.003,
			);
			if (combined)
				for (const side of [-1, 1])
					this.cylinder(
						"Washer Dryer Indicator",
						uh * 0.012,
						uh * 0.012,
						t * 0.3,
						[w * (0.12 + side * 0.06), offset + uh * 0.84, d / 2 + t * 0.6],
						this.accent(side < 0 ? 0x7fabb7 : 0xc6a270),
						16,
					).rotation.x = Math.PI / 2;
			this.cylinder(
				"Laundry Drum Interior",
				r * 0.9,
				r * 0.9,
				t,
				[0, y, d / 2 + t * 0.3],
				dark,
				48,
			).rotation.x = Math.PI / 2;
			if (p.contentsEnabled)
				for (let i = 0; i < 3; i++)
					this.ellipsoid(
						"Drum Laundry",
						[r * 0.26, r * 0.22, t * 0.6],
						[
							(i - 1) * r * 0.36,
							y - r * 0.28 + (i % 2) * r * 0.18,
							d / 2 + t * 0.75,
						],
						this.accent([0xb6c5c3, 0xe2d8c5, 0x9bafc1][i], 0.98),
					);
			const before = this.partsGroup.children.length;
			this.addGeometry(
				"Laundry Door Rim",
				new TorusGeometry(r, r * 0.12, 12, 56),
				[0, y, d / 2 + t * 1.3],
				metal,
			);
			const glass = this.cylinder(
				"Laundry Door Glass",
				r * 0.88,
				r * 0.88,
				t * 0.65,
				[0, y, d / 2 + t * 1.3],
				this.accent(
					dryer ? 0xb9c3c6 : 0x8baebc,
					0.2,
					0.12,
					dryer ? 0.65 : 0.38,
				),
				48,
			);
			glass.rotation.x = Math.PI / 2;
			initializeMeshShadowSettings(glass, {
				castShadow: false,
				receiveShadow: false,
			});
			const side = p.doorSide === "right-hinge" ? 1 : -1;
			this.rounded(
				"Laundry Door Handle",
				[t * 0.5, r * 0.45, t],
				[-side * r * 0.8, y, d / 2 + t * 2.2],
				dark,
				0.005,
			);
			this.hingeParts(
				"Laundry Door Hinge",
				this.partsGroup.children.slice(before),
				[side * r, 0, d / 2 + t * 1.3],
				p.doorOpen ? side * Math.PI * 0.48 : 0,
			);
			if (dryer)
				for (let i = 0; i < 8; i++)
					this.rounded(
						"Dryer Vent Slot",
						[w * 0.045, uh * 0.014, t * 0.2],
						[(i - 3.5) * w * 0.075, offset + uh * 0.12, d / 2 + t * 0.4],
						dark,
						0.001,
					);
			else
				this.rounded(
					"Washer Detergent Drawer",
					[w * 0.28, uh * 0.07, t * 0.3],
					[-w * 0.29, offset + uh * 0.81, d / 2 + t * 0.4],
					material,
					0.003,
				);
		}
		if (stacked)
			for (const side of [-1, 1])
				this.rounded(
					"Laundry Stacking Bracket",
					[w * 0.08, gap * 2, d * 0.45],
					[side * w * 0.44, uh + gap / 2, 0],
					this.accent(0x76868d, 0.4, 0.6),
					0.002,
				);
	}
}
