import type {FurnitureParameters} from "../furniture.js";
import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	furnitureSelect,
} from "../furniture.js";

export {BedroomObject as LaundryObject} from "../bedroom/primitives.js";
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
		`laundry${label}`,
		`laundry${label}Hint`,
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
		`laundry${label}`,
		`laundry${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `laundry${label}`, `laundry${label}Hint`, value);
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
		`laundry${label}`,
		`laundry${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `laundryOption_${typeof option === "string" ? option : option.value}`,
		})),
	);
