import type {Mesh} from "three";

import type {FurnitureParameters} from "../furniture.js";
import {boolean, dimensions, GymObject, integer} from "./primitives.js";

type RackType = "dumbbell-rack" | "kettlebell-rack" | "exercise-equipment-rack";

abstract class GymRackObject extends GymObject {
	protected constructor(
		type: RackType,
		name: string,
		parameters: Partial<FurnitureParameters>,
		color: number,
	) {
		const equipment = type === "exercise-equipment-rack";
		super(
			type,
			name,
			"gymRackControls",
			[
				...dimensions(
					1.2,
					equipment ? 0.5 : 0.45,
					equipment ? 1.5 : 0.85,
					[0.4, 0.25, 0.4],
				),
				integer("levels", "RackLevels", equipment ? 3 : 2, 1, 4),
				integer("itemsPerLevel", "RackItems", 4, 1, 8),
				boolean("contentsEnabled", "RackContents", true),
				...(equipment
					? [
						integer("storedMats", "StoredMats", 2, 0, 4),
						boolean("bandsEnabled", "StoredBands", true),
					]
					: []),
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
			n = Number(p.levels),
			count = Number(p.itemsPerLevel),
			equipment = this.furnitureType === "exercise-equipment-rack",
			steel = this.steel(),
			usableW = equipment ? w * 0.7 : w * 0.92,
			slot = usableW / count,
			gap = (h * 0.7) / n;
		for (const side of [-1, 1]) {
			this.foot(side * w * 0.44, 0, t * 2, d, t);
			for (const z of [-d * 0.36, d * 0.36])
				this.rail(
					"Gym Rack Upright",
					[side * w * 0.44, t, z],
					[side * w * 0.44, h - t, z],
					t * 0.55,
					material,
				);
		}
		for (let level = 0; level < n; level++) {
			const y = h * 0.12 + level * gap,
				bay = equipment && level > 0,
				left = -w * 0.46,
				right = w * (bay ? 0.24 : 0.46);
			this.rounded(
				"Gym Rack Tray",
				[right - left, t, d * 0.84],
				[(left + right) / 2, y, 0],
				material,
				0.005,
			);
			for (const side of [-1, 1])
				this.rail(
					"Gym Rack Tray Lip",
					[left, y + t, side * d * 0.4],
					[right, y + t, side * d * 0.4],
					t * 0.3,
					steel,
				);
			if (!p.contentsEnabled) continue;
			for (let i = 0; i < count; i++) {
				const x = (i + 0.5) * slot - usableW / 2 - (equipment ? w * 0.1 : 0),
					r =
						Math.min(slot * 0.32, gap * (equipment ? 0.38 : 0.26), d * 0.3) *
						(0.8 + (i / Math.max(1, count - 1)) * 0.2),
					bottom = y + t * 0.55;
				if (this.furnitureType === "dumbbell-rack")
					this.dumbbell(x, bottom, 0, slot * 0.88, r);
				else if (this.furnitureType === "kettlebell-rack")
					this.kettlebell(x, bottom, 0, r);
				else
					this.ellipsoid(
						"Stored Exercise Ball",
						[r, r, r],
						[x, bottom + r, 0],
						i % 2 ? this.trim() : this.rubber(),
					);
			}
		}
		if (equipment) {
			this.rail(
				"Gym Rack Hook Bar",
				[-w * 0.44, h - t, -d * 0.32],
				[w * 0.44, h - t, -d * 0.32],
				t * 0.4,
				steel,
			);
			if (p.contentsEnabled) {
				for (let i = 0; i < Number(p.storedMats); i++) {
					const r = Math.min(w * 0.035, d * 0.12),
						x = w * 0.29 + (i % 2) * r * 2.2,
						z = -d * 0.18 + Math.floor(i / 2) * r * 2.2;
					this.cylinder(
						"Stored Rolled Mat",
						r,
						r,
						h * 0.5,
						[x, h * 0.12 + t + h * 0.25, z],
						this.trim(),
					);
					this.cylinder(
						"Stored Mat Core",
						r * 0.4,
						r * 0.4,
						t * 0.1,
						[x, h * 0.62 + t * 1.1, z],
						this.rubber(),
					);
				}
				if (p.bandsEnabled)
					for (let i = 0; i < 3; i++) {
						const x = (i - 1) * w * 0.21,
							r = Math.min(w * 0.06, h * 0.09),
							top = h - t * 2;
						this.rail(
							"Gym Rack Band Hook",
							[x, top, -d * 0.32],
							[x, top, -d * 0.2],
							t * 0.17,
							steel,
						);
						const band = this.ring(
							"Stored Resistance Band",
							r,
							t * 0.13,
							[x, top - r * 1.8, -d * 0.2],
							this.accent([0x91aeb4, 0xc3ac83, 0xb493a8][i], 0.92),
						);
						band.scale.y = 1.8;
					}
			}
		}
	}
}

export class DumbbellRackObject extends GymRackObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x5f6e78) {
		super("dumbbell-rack", "Dumbbell rack", parameters, color);
	}
}
export class KettlebellRackObject extends GymRackObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x5f6e78) {
		super("kettlebell-rack", "Kettlebell rack", parameters, color);
	}
}
export class ExerciseEquipmentRackObject extends GymRackObject {
	constructor(parameters: Partial<FurnitureParameters> = {}, color = 0x5f6e78) {
		super(
			"exercise-equipment-rack",
			"Exercise equipment rack",
			parameters,
			color,
		);
	}
}
