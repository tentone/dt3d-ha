import type {FurnitureParameters} from "../furniture.js";
import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	furnitureSelect,
} from "../furniture.js";

export {BedroomObject as NurseryObject} from "../bedroom/primitives.js";
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
		`nursery${label}`,
		`nursery${label}Hint`,
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
	furnitureInteger(
		name,
		`nursery${label}`,
		`nursery${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `nursery${label}`, `nursery${label}Hint`, value);
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
		`nursery${label}`,
		`nursery${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `nurseryOption_${typeof option === "string" ? option : option.value}`,
		})),
	);

export const PLAY_COLORS = [
	0x93b8b0, 0xdcc08f, 0xd8a396, 0x9dacc7, 0xb3bd8e, 0xc3aed0,
];
