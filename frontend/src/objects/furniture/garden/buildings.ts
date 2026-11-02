import type {Mesh} from "three";
import {ExtrudeGeometry, Shape} from "three";

import {initializeMeshShadowSettings} from "../../../editor/mesh-shadows.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	boolean,
	choice,
	dimensions,
	GardenObject,
	integer,
	number,
} from "./primitives.js";

export class GardenBuildingObject extends GardenObject {
	constructor(
		parameters: Partial<FurnitureParameters> = {},
		color = 0xa39577,
		type: "garden-building" | "garden-playhouse" = "garden-building",
	) {
		const play = type === "garden-playhouse";
		super(
			type,
			play ? "Garden playhouse" : "Garden buildings",
			"gardenBuildingControls",
			[
				choice(
					"style",
					"BuildingStyle",
					play ? "playhouse" : "garden-shed",
					play
						? ["playhouse"]
						: [
							{
								value: "garden-shed",
								parameters: {width: 2.4, depth: 1.8, height: 2.3},
							},
							{
								value: "greenhouse",
								parameters: {width: 2.4, depth: 1.8, height: 2.4},
							},
							{
								value: "gazebo",
								parameters: {width: 3, depth: 3, height: 2.5},
							},
						],
				),
				...dimensions(play ? 1.5 : 2.4, play ? 1.3 : 1.8, play ? 1.7 : 2.3).map(
					(def) => (def.name === "depth" ? {...def, max: 8} : def),
				),
				number("roofRise", "RoofRise", 0.25, 0.15, 0.4),
				boolean("doorsOpen", "BuildingDoors", false),
				boolean("windowsEnabled", "BuildingWindows", true),
				boolean("baseEnabled", "BuildingFloor", true),
				integer("gazeboSides", "GazeboSides", 6, 4, 8),
				boolean("porchEnabled", "PlayhousePorch", true),
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
			rise = h * Number(p.roofRise),
			eave = h - rise,
			gazebo = p.style === "gazebo",
			glass = p.style === "greenhouse",
			play = p.style === "playhouse",
			roof = glass
				? this.accent(0xc0d4cf, 0.18, 0.05, 0.32)
				: this.accent(play ? 0x9d826b : 0x65776c, 0.8),
			pane = this.accent(0xb2cece, 0.18, 0.05, 0.35);
		if (p.baseEnabled)
			this.addBox("Garden Building Floor", [w, t, d], [0, t / 2, 0], material);
		if (gazebo) {
			const n = Number(p.gazeboSides);
			for (let i = 0; i < n; i++) {
				const a = (i / n) * Math.PI * 2,
					x = Math.cos(a) * w * 0.46,
					z = Math.sin(a) * d * 0.46;
				this.rounded(
					"Gazebo Post",
					[t * 1.5, eave, t * 1.5],
					[x, eave / 2, z],
					material,
					0.004,
				);
				const next = ((i + 1) / n) * Math.PI * 2;
				this.rail(
					"Gazebo Eave",
					[x, eave, z],
					[Math.cos(next) * w * 0.46, eave, Math.sin(next) * d * 0.46],
					t,
					material,
				);
				this.fabric(
					"Gazebo Roof Panel",
					1,
					1,
					(u, v) => {
						const xx =
								(1 - u) * Math.cos(a) * w * 0.53 +
								u * Math.cos(next) * w * 0.53,
							zz =
								(1 - u) * Math.sin(a) * d * 0.53 +
								u * Math.sin(next) * d * 0.53;
						return [xx * v, eave + rise * (1 - v), zz * v];
					},
					roof,
				);
			}
			return;
		}
		for (const x of [-1, 1])
			for (const z of [-1, 1])
				this.addBox(
					"Garden Building Post",
					[t * 1.5, eave, t * 1.5],
					[(x * (w - t)) / 2, eave / 2, (z * (d - t)) / 2],
					material,
				);
		this.addBox(
			"Garden Building Back",
			[w, eave, t],
			[0, eave / 2, -d / 2],
			glass ? pane : material,
		);
		for (const side of [-1, 1]) {
			const x = (side * w) / 2;
			if (glass)
				this.addBox(
					"Greenhouse Side Glass",
					[t * 0.25, eave, d],
					[x, eave / 2, 0],
					pane,
				);
			else if (p.windowsEnabled) {
				this.addBox(
					"Building Window Sill Wall",
					[t, eave * 0.4, d],
					[x, eave * 0.2, 0],
					material,
				);
				this.addBox(
					"Building Window Header Wall",
					[t, eave * 0.2, d],
					[x, eave * 0.9, 0],
					material,
				);
				for (const z of [-1, 1])
					this.addBox(
						"Building Window Side Wall",
						[t, eave * 0.4, d * 0.25],
						[x, eave * 0.6, z * d * 0.375],
						material,
					);
				this.addBox(
					"Building Window Glass",
					[t * 0.25, eave * 0.4, d * 0.5],
					[x, eave * 0.6, 0],
					pane,
				);
			} else
				this.addBox(
					"Garden Building Side",
					[t, eave, d],
					[x, eave / 2, 0],
					material,
				);
			if (p.windowsEnabled || glass) {
				this.addBox(
					"Building Window Bar",
					[t * 1.7, t, d * 0.55],
					[x, eave * 0.6, 0],
					material,
				);
				this.addBox(
					"Building Window Bar",
					[t * 1.7, eave * 0.45, t],
					[x, eave * 0.6, 0],
					material,
				);
			}
		}
		const dw = w * 0.42,
			dh = eave * 0.82;
		for (const side of [-1, 1])
			this.addBox(
				"Garden Building Front",
				[(w - dw) / 2, eave, t],
				[(side * (w + dw)) / 4, eave / 2, d / 2],
				glass ? pane : material,
			);
		this.addBox(
			"Garden Building Door Header",
			[dw, eave - dh, t],
			[0, (eave + dh) / 2, d / 2],
			glass ? pane : material,
		);
		const before = this.partsGroup.children.length;
		this.addBox(
			"Garden Building Door",
			[dw * 0.96, dh, t],
			[0, dh / 2, d / 2 + t],
			glass ? pane : material,
		);
		this.rail(
			"Garden Building Door Handle",
			[dw * 0.3, dh * 0.45, d / 2 + t * 2],
			[dw * 0.3, dh * 0.58, d / 2 + t * 2],
			t * 0.3,
			this.accent(0x657473, 0.4, 0.7),
		);
		this.hingeParts(
			"Garden Building Door Hinge",
			this.partsGroup.children.slice(before),
			[-dw / 2, 0, d / 2],
			p.doorsOpen ? -Math.PI * 0.55 : 0,
		);
		const gable = new Shape();
		gable.moveTo(-w / 2, 0);
		gable.lineTo(w / 2, 0);
		gable.lineTo(0, rise);
		gable.closePath();
		for (const side of [-1, 1])
			this.addGeometry(
				"Garden Building Gable",
				new ExtrudeGeometry(gable, {depth: t, bevelEnabled: false}),
				[0, eave, (side * d) / 2],
				glass ? pane : material,
			);
		this.roof(w, d, eave, rise, t, roof);
		for (const side of [-1, 1])
			this.rail(
				"Garden Roof Eave",
				[(side * w) / 2, eave, -d * 0.53],
				[(side * w) / 2, eave, d * 0.53],
				t,
				material,
			);
		this.rail(
			"Garden Roof Ridge",
			[0, h, -d * 0.53],
			[0, h, d * 0.53],
			t,
			material,
		);
		if (play && p.porchEnabled) {
			this.addBox(
				"Playhouse Porch",
				[w * 0.7, t, d * 0.28],
				[0, t / 2, d * 0.62],
				material,
			);
			for (const side of [-1, 1])
				this.rail(
					"Playhouse Porch Rail",
					[side * w * 0.32, t, d * 0.52],
					[side * w * 0.32, h * 0.25, d * 0.72],
					t,
					material,
				);
		}
		if (glass)
			this.partsGroup.traverse((child) => {
				const mesh = child as Mesh;
				if (mesh.isMesh && [pane, roof].includes(mesh.material as typeof pane))
					initializeMeshShadowSettings(mesh, {
						castShadow: false,
						receiveShadow: false,
					});
			});
	}
}

export class GardenPlayhouseObject extends GardenBuildingObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0xb5a580) {
		super(parameters, color, "garden-playhouse");
	}
}
