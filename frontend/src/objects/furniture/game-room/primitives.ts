import type {Mesh, MeshStandardMaterial} from "three";

import {ClosetObject} from "../closet/primitives.js";
import type {FurnitureParameters} from "../furniture.js";
import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	furnitureSelect,
} from "../furniture.js";

export {furnitureDimensions as dimensions} from "../procedural-furniture.js";
export const number = (
	name: string,
	label: string,
	value: number,
	min: number,
	max: number,
	step = 0.01,
) =>
	furnitureNumber(
		name,
		`game${label}`,
		`game${label}Hint`,
		value,
		min,
		max,
		step,
	);
export const integer = (
	name: string,
	label: string,
	value: number,
	min: number,
	max: number,
) =>
	furnitureInteger(name, `game${label}`, `game${label}Hint`, value, min, max);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `game${label}`, `game${label}Hint`, value);
export const choice = (
	name: string,
	label: string,
	value: string,
	options: (
		| string
		| { value: string; parameters: Partial<FurnitureParameters> }
	)[],
) =>
	furnitureSelect(
		name,
		`game${label}`,
		`game${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `gameOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export abstract class GameRoomObject extends ClosetObject {
	protected trim(): MeshStandardMaterial {
		return this.accent(
			this.parameters.accent === "red"
				? 0xb97871
				: this.parameters.accent === "purple"
					? 0x9b83bc
					: this.parameters.accent === "green"
						? 0x85aa88
						: 0x76a7c3,
			0.75,
		);
	}
	protected display(
		name: string,
		w: number,
		h: number,
		d: number,
		x: number,
		y: number,
		z: number,
		powered: boolean,
	): void {
		const dark = this.accent(0x273139, 0.55),
			screen = this.accent(powered ? 0x557c9b : 0x344047, 0.35, 0, 1, powered);
		this.rounded(`${name} Frame`, [w, h, d], [x, y, z], dark, 0.006);
		this.rounded(
			`${name} Screen`,
			[w * 0.91, h * 0.84, d * 0.1],
			[x, y, z + d * 0.55],
			screen,
			0.002,
		);
		if (powered)
			for (let i = 0; i < 3; i++)
				this.rounded(
					`${name} Graphic`,
					[w * (0.25 + i * 0.15), h * 0.025, d * 0.04],
					[x - w * 0.12, y + h * (0.2 - i * 0.18), z + d * 0.62],
					this.accent(0x92b6b4, 0.6, 0, 1, true),
					0.001,
				);
	}
	protected bucketSeat(
		w: number,
		d: number,
		bh: number,
		y: number,
		material: Mesh["material"],
		tilt: number,
	): void {
		const trim = this.trim(),
			t = Math.min(w, d, bh) * 0.12;
		this.rounded(
			"Gaming Seat Cushion",
			[w * 0.82, t, d * 0.87],
			[0, y - t / 2, d * 0.05],
			material,
			0.035,
		);
		for (const side of [-1, 1])
			this.rounded(
				"Gaming Seat Bolster",
				[w * 0.12, t * 1.3, d * 0.8],
				[side * w * 0.43, y, d * 0.04],
				trim,
				0.025,
			);
		const before = this.partsGroup.children.length;
		this.rounded(
			"Gaming Seat Back",
			[w * 0.8, bh, t],
			[0, y + bh / 2, -d * 0.33],
			material,
			0.04,
		);
		for (const side of [-1, 1]) {
			this.rounded(
				"Gaming Back Bolster",
				[w * 0.13, bh * 0.83, t * 1.5],
				[side * w * 0.39, y + bh * 0.48, -d * 0.28],
				trim,
				0.025,
			).rotation.z = -side * 0.1;
			this.rounded(
				"Gaming Shoulder Slot",
				[w * 0.19, bh * 0.055, t * 0.15],
				[side * w * 0.19, y + bh * 0.78, -d * 0.33 + t * 0.56],
				this.accent(0x293239, 0.9),
				0.005,
			);
		}
		this.rounded(
			"Gaming Head Pillow",
			[w * 0.47, bh * 0.13, t * 0.65],
			[0, y + bh * 0.88, -d * 0.33 + t * 0.65],
			trim,
			0.018,
		);
		this.rounded(
			"Gaming Lumbar Pillow",
			[w * 0.55, bh * 0.16, t * 0.7],
			[0, y + bh * 0.2, -d * 0.33 + t * 0.67],
			trim,
			0.02,
		);
		this.hingeParts(
			"Gaming Seat Recline",
			this.partsGroup.children.slice(before),
			[0, y, -d * 0.33],
			(-tilt * Math.PI) / 180,
			"x",
		);
	}
	protected gamepad(
		x: number,
		y: number,
		z: number,
		w: number,
		d: number,
	): void {
		const dark = this.accent(0x4e5a62, 0.7),
			button = this.accent(0xa8b3b6, 0.5),
			h = Math.min(w, d) * 0.18;
		this.rounded(
			"Gamepad Body",
			[w * 0.8, h, d * 0.65],
			[x, y + h / 2, z],
			dark,
			0.018,
		);
		for (const side of [-1, 1])
			this.ellipsoid(
				"Gamepad Grip",
				[w * 0.2, h * 0.7, d * 0.34],
				[x + side * w * 0.34, y + h * 0.5, z + d * 0.15],
				dark,
			).rotation.y = side * 0.3;
		this.rounded(
			"Gamepad D-pad",
			[w * 0.19, h * 0.3, d * 0.05],
			[x - w * 0.22, y + h * 1.07, z - d * 0.12],
			button,
			0.001,
		);
		this.rounded(
			"Gamepad D-pad",
			[w * 0.06, h * 0.3, d * 0.19],
			[x - w * 0.22, y + h * 1.07, z - d * 0.12],
			button,
			0.001,
		);
		for (let i = 0; i < 4; i++) {
			const a = (i / 4) * Math.PI * 2;
			this.cylinder(
				"Gamepad Button",
				w * 0.025,
				w * 0.025,
				h * 0.2,
				[
					x + w * 0.24 + Math.cos(a) * w * 0.07,
					y + h * 1.12,
					z - d * 0.12 + Math.sin(a) * d * 0.09,
				],
				this.accent([0xb88678, 0x829fbf, 0x88ab8a, 0xc3ae74][i], 0.5),
				12,
			);
		}
		for (const side of [-1, 1])
			this.cylinder(
				"Gamepad Stick",
				w * 0.045,
				w * 0.045,
				h * 0.25,
				[x + side * w * 0.12, y + h * 1.13, z + d * 0.08],
				button,
				16,
			);
	}
}
