import {localManager} from "../locale/locale.js";
import type {FurnitureCategory} from "../objects/furniture/furniture-registry.js";
import {FURNITURE_OPTIONS} from "../objects/furniture/furniture-registry.js";
import {MESH_OPTIONS} from "./mesh-handler.js";

export type ModelCategoryId =
	| FurnitureCategory
	| "geometric-shapes"
	| "lighting"
	| "openings";

export type ModelCategory = {
	id: ModelCategoryId;
	labelKey: string;
	icon: string;
};

export type ModelLibraryEntry = {
	/** Existing creation identifier; changing categories must never change saved model types. */
	type: string;
	kind: "furniture" | "mesh" | "light" | "opening";
	category: ModelCategoryId;
	labelKey?: string;
	label?: string;
	icon: string;
	keywords?: string[];
	rooms?: string[];
	roomCategories?: Partial<Record<string, ModelCategoryId>>;
};

/** Add categories here and assign furniture in furniture-registry.ts as the library grows. */
export type ModelRoom = {
	id: string;
	labelKey: string;
	categories: ModelCategoryId[];
};
export const MODEL_ROOMS: ModelRoom[] = [
	{
		id: "living-room",
		labelKey: "livingRoom",
		categories: [
			"seating",
			"tables-desks",
			"storage",
			"entertainment",
			"lighting",
			"decoration",
		],
	},
	{
		id: "bathroom",
		labelKey: "bathroomRoom",
		categories: [
			"sanitary-fixtures",
			"washbasins",
			"bathing",
			"storage",
			"accessories",
			"other",
		],
	},
];

export const MODEL_CATEGORIES: ModelCategory[] = [
	{id: "seating", labelKey: "modelCategorySeating", icon: "mdi:sofa-outline"},
	{
		id: "tables-desks",
		labelKey: "modelCategoryTablesDesks",
		icon: "mdi:desk",
	},
	{
		id: "storage",
		labelKey: "modelCategoryStorage",
		icon: "mdi:wardrobe-outline",
	},
	{id: "bedroom", labelKey: "modelCategoryBedroom", icon: "mdi:bed-outline"},
	{
		id: "kitchen",
		labelKey: "modelCategoryKitchen",
		icon: "mdi:countertop-outline",
	},
	{
		id: "bathroom",
		labelKey: "modelCategoryBathroom",
		icon: "mdi:bathtub-outline",
	},
	{
		id: "sanitary-fixtures",
		labelKey: "bathCategorySanitary",
		icon: "mdi:toilet",
	},
	{
		id: "washbasins",
		labelKey: "bathCategoryWashbasins",
		icon: "mdi:hand-wash-outline",
	},
	{id: "bathing", labelKey: "bathCategoryBathing", icon: "mdi:shower"},
	{
		id: "accessories",
		labelKey: "bathCategoryAccessories",
		icon: "mdi:paper-roll-outline",
	},
	{id: "other", labelKey: "bathCategoryOther", icon: "mdi:dots-horizontal"},
	{
		id: "entertainment",
		labelKey: "modelCategoryEntertainment",
		icon: "mdi:television",
	},
	{
		id: "decoration",
		labelKey: "modelCategoryDecoration",
		icon: "mdi:vase-outline",
	},
	{id: "openings", labelKey: "floorplanOpenings", icon: "mdi:door-open"},
	{
		id: "lighting",
		labelKey: "modelCategoryLighting",
		icon: "mdi:lightbulb-on-outline",
	},
	{
		id: "geometric-shapes",
		labelKey: "geometricShapes",
		icon: "mdi:shape-outline",
	},
];

export const MODEL_LIBRARY: ModelLibraryEntry[] = [
	...FURNITURE_OPTIONS.map(
		(option): ModelLibraryEntry => ({
			...option,
			kind: "furniture",
			keywords: option.keywords ?? [],
		}),
	),
	...MESH_OPTIONS.map(
		(option): ModelLibraryEntry => ({
			...option,
			kind: "mesh",
			category: "geometric-shapes",
			keywords: ["geometry", "primitive", "shape"],
		}),
	),
	{
		type: "light-ambient",
		kind: "light",
		category: "lighting",
		labelKey: "ambientLight",
		icon: "mdi:brightness-6",
	},
	{
		type: "light-directional",
		kind: "light",
		category: "lighting",
		labelKey: "directionalLight",
		icon: "mdi:weather-sunny",
	},
	{
		type: "light-point",
		kind: "light",
		category: "lighting",
		labelKey: "pointLight",
		icon: "mdi:lightbulb-on-outline",
	},
	{
		type: "light-spot",
		kind: "light",
		category: "lighting",
		labelKey: "spotLight",
		icon: "mdi:spotlight-beam",
	},
	{
		type: "light-rect-area",
		kind: "light",
		category: "lighting",
		labelKey: "rectAreaLight",
		icon: "mdi:rectangle-outline",
	},
	{
		type: "door",
		kind: "opening",
		category: "openings",
		labelKey: "door",
		icon: "mdi:door",
	},
	{
		type: "window",
		kind: "opening",
		category: "openings",
		labelKey: "window",
		icon: "mdi:window-closed-variant",
	},
	{
		type: "gate",
		kind: "opening",
		category: "openings",
		labelKey: "gate",
		icon: "mdi:gate",
	},
];

export function modelLabel(entry: ModelLibraryEntry): string {
	return entry.labelKey
		? localManager.get(entry.labelKey)
		: (entry.label ?? entry.type);
}

function normalizeSearch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase();
}

/** Search labels, category names, stable identifiers, and aliases using all query words. */
export function filterModels(
	query: string,
	category: ModelCategoryId | "all" = "all",
	room = "all",
): ModelLibraryEntry[] {
	const words = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
	return MODEL_LIBRARY.map((entry) =>
		room !== "all" && entry.roomCategories?.[room]
			? {...entry, category: entry.roomCategories[room]!}
			: entry,
	).filter((entry) => {
		if (category !== "all" && entry.category !== category) return false;
		if (room !== "all" && !entry.rooms?.includes(room)) return false;
		const categoryLabel = localManager.get(
			MODEL_CATEGORIES.find((item) => item.id === entry.category)!.labelKey,
		);
		const searchable = normalizeSearch(
			[
				modelLabel(entry),
				categoryLabel,
				entry.type.replace(/-/g, " "),
				...(entry.keywords ?? []),
				...Object.values(entry.roomCategories ?? {}).map((category) =>
					localManager.get(
						MODEL_CATEGORIES.find((item) => item.id === category)!.labelKey,
					),
				),
				...(entry.rooms ?? []).map((id) =>
					localManager.get(
						MODEL_ROOMS.find((item) => item.id === id)?.labelKey ?? id,
					),
				),
			].join(" "),
		);
		return words.every((word) => searchable.includes(word));
	});
}
