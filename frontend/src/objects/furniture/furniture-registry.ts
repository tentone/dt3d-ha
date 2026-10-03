import {BathtubObject} from "./bathtub.js";
import {BedObject} from "./bed.js";
import {CabinetObject} from "./cabinet.js";
import {ChairObject} from "./chair.js";
import {CouchObject} from "./couch.js";
import type {
	FurnitureObject,
	FurnitureParameters,
	FurnitureType,
} from "./furniture.js";
import {ShelfObject} from "./shelf.js";
import {StandingDeskObject} from "./standing-desk.js";
import {
	KitchenCabinetBottomObject,
	KitchenCabinetTopObject,
	WardrobeObject,
} from "./storage.js";
import {TableObject} from "./table.js";

export type FurnitureOption = {
	type: `furniture-${FurnitureType}`;
	furnitureType: FurnitureType;
	labelKey: string;
	icon: string;
};

export const FURNITURE_OPTIONS: FurnitureOption[] = [
	{
		type: "furniture-standing-desk",
		furnitureType: "standing-desk",
		labelKey: "furnitureStandingDesk",
		icon: "mdi:desk",
	},
	{
		type: "furniture-wardrobe",
		furnitureType: "wardrobe",
		labelKey: "furnitureWardrobe",
		icon: "mdi:wardrobe-outline",
	},
	{
		type: "furniture-bed",
		furnitureType: "bed",
		labelKey: "furnitureBed",
		icon: "mdi:bed-outline",
	},
	{
		type: "furniture-kitchen-cabinet-top",
		furnitureType: "kitchen-cabinet-top",
		labelKey: "furnitureKitchenCabinetTop",
		icon: "mdi:cupboard-outline",
	},
	{
		type: "furniture-kitchen-cabinet-bottom",
		furnitureType: "kitchen-cabinet-bottom",
		labelKey: "furnitureKitchenCabinetBottom",
		icon: "mdi:countertop-outline",
	},
	{
		type: "furniture-table",
		furnitureType: "table",
		labelKey: "furnitureTable",
		icon: "mdi:table-furniture",
	},
	{
		type: "furniture-chair",
		furnitureType: "chair",
		labelKey: "furnitureChair",
		icon: "mdi:chair-rolling",
	},
	{
		type: "furniture-couch",
		furnitureType: "couch",
		labelKey: "furnitureCouch",
		icon: "mdi:sofa-outline",
	},
	{
		type: "furniture-bathtub",
		furnitureType: "bathtub",
		labelKey: "furnitureBathtub",
		icon: "mdi:bathtub-outline",
	},
	{
		type: "furniture-shelf",
		furnitureType: "shelf",
		labelKey: "furnitureShelf",
		icon: "mdi:bookshelf",
	},
	{
		type: "furniture-cabinet",
		furnitureType: "cabinet",
		labelKey: "furnitureCabinet",
		icon: "mdi:cupboard-outline",
	},
];

export function furnitureTypeFromMeshType(type: string): FurnitureType | null {
	const option = FURNITURE_OPTIONS.find(
		(item) => item.type === type || item.furnitureType === type,
	);
	return option?.furnitureType ?? null;
}

export function isFurnitureMeshType(type: string): boolean {
	return (
		type.startsWith("furniture-") && furnitureTypeFromMeshType(type) !== null
	);
}

export function createFurnitureObject(
	meshType: string,
	parameters: Partial<FurnitureParameters> = {},
	color?: number,
): FurnitureObject | null {
	switch (furnitureTypeFromMeshType(meshType)) {
		case "standing-desk":
			return new StandingDeskObject(parameters, color);
		case "wardrobe":
			return new WardrobeObject(parameters, color);
		case "bed":
			return new BedObject(parameters, color);
		case "kitchen-cabinet-top":
			return new KitchenCabinetTopObject(parameters, color);
		case "kitchen-cabinet-bottom":
			return new KitchenCabinetBottomObject(parameters, color);
		case "table":
			return new TableObject(parameters, color);
		case "chair":
			return new ChairObject(parameters, color);
		case "couch":
			return new CouchObject(parameters, color);
		case "bathtub":
			return new BathtubObject(parameters, color);
		case "shelf":
			return new ShelfObject(parameters, color);
		case "cabinet":
			return new CabinetObject(parameters, color);
		default:
			return null;
	}
}
