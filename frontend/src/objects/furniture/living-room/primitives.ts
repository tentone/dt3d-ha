import type {FurnitureParameters} from "../furniture.js";
import {
	furnitureBoolean,
	furnitureInteger,
	furnitureNumber,
	furnitureSelect,
} from "../furniture.js";

export {
	furnitureDimensions as dimensions,
	ProceduralFurnitureObject as LivingRoomObject,
} from "../procedural-furniture.js";

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
		`living${label}`,
		`living${label}Hint`,
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
		`living${label}`,
		`living${label}Hint`,
		value,
		min,
		max,
	);
export const boolean = (name: string, label: string, value: boolean) =>
	furnitureBoolean(name, `living${label}`, `living${label}Hint`, value);
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
		`living${label}`,
		`living${label}Hint`,
		value,
		options.map((option) => ({
			...(typeof option === "string" ? {value: option} : option),
			labelKey: `livingOption_${typeof option === "string" ? option : option.value}`,
		})),
	);
