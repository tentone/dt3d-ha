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
import {
	ArtworkObject,
	CurtainsObject,
	FireplaceObject,
	MirrorObject,
	PlantObject,
	RugObject,
	VaseObject,
	WallClockObject,
} from "./living-room/decoration.js";
import {
	ProjectionScreenObject,
	ProjectorObject,
	SpeakerSystemObject,
	TelevisionObject,
} from "./living-room/entertainment.js";
import {LampObject} from "./living-room/lighting.js";
import {AccentChairObject, OttomanObject} from "./living-room/seating.js";
import {LivingStorageObject} from "./living-room/storage.js";
import {ShelfObject} from "./shelf.js";
import {StandingDeskObject} from "./standing-desk.js";
import {
	KitchenCabinetBottomObject,
	KitchenCabinetTopObject,
	WardrobeObject,
} from "./storage.js";
import {LivingTableObject, TableObject} from "./table.js";

export type FurnitureCategory =
	| "seating"
	| "tables-desks"
	| "storage"
	| "bedroom"
	| "kitchen"
	| "bathroom"
	| "entertainment"
	| "decoration"
	| "lighting";

export type FurnitureOption = {
	type: `furniture-${FurnitureType}`;
	furnitureType: FurnitureType;
	labelKey: string;
	icon: string;
	category: FurnitureCategory;
	rooms?: string[];
	keywords?: string[];
};

export const FURNITURE_OPTIONS: FurnitureOption[] = [
	{
		type: "furniture-standing-desk",
		furnitureType: "standing-desk",
		category: "tables-desks",
		labelKey: "furnitureStandingDesk",
		icon: "mdi:desk",
	},
	{
		type: "furniture-wardrobe",
		furnitureType: "wardrobe",
		category: "storage",
		labelKey: "furnitureWardrobe",
		icon: "mdi:wardrobe-outline",
	},
	{
		type: "furniture-bed",
		furnitureType: "bed",
		category: "bedroom",
		labelKey: "furnitureBed",
		icon: "mdi:bed-outline",
	},
	{
		type: "furniture-kitchen-cabinet-top",
		furnitureType: "kitchen-cabinet-top",
		category: "kitchen",
		labelKey: "furnitureKitchenCabinetTop",
		icon: "mdi:cupboard-outline",
	},
	{
		type: "furniture-kitchen-cabinet-bottom",
		furnitureType: "kitchen-cabinet-bottom",
		category: "kitchen",
		labelKey: "furnitureKitchenCabinetBottom",
		icon: "mdi:countertop-outline",
	},
	{
		type: "furniture-table",
		furnitureType: "table",
		category: "tables-desks",
		labelKey: "furnitureTable",
		icon: "mdi:table-furniture",
	},
	{
		type: "furniture-chair",
		furnitureType: "chair",
		category: "seating",
		labelKey: "furnitureChair",
		icon: "mdi:chair-rolling",
	},
	{
		type: "furniture-couch",
		furnitureType: "couch",
		rooms: ["living-room"],
		keywords: [
			"sofa",
			"sectional sofa",
			"L-shaped sofa",
			"U-shaped sofa",
			"sofa bed",
			"2-seater",
			"3-seater",
			"4-seater",
			"2 seater",
			"3 seater",
			"4 seater",
			"lounge",
		],
		category: "seating",
		labelKey: "furnitureCouch",
		icon: "mdi:sofa-outline",
	},
	{
		type: "furniture-bathtub",
		furnitureType: "bathtub",
		category: "bathroom",
		labelKey: "furnitureBathtub",
		icon: "mdi:bathtub-outline",
	},
	{
		type: "furniture-shelf",
		furnitureType: "shelf",
		category: "storage",
		labelKey: "furnitureShelf",
		icon: "mdi:bookshelf",
	},
	{
		type: "furniture-cabinet",
		furnitureType: "cabinet",
		category: "storage",
		labelKey: "furnitureCabinet",
		icon: "mdi:cupboard-outline",
	},
	{
		type: "furniture-living-table",
		furnitureType: "living-table",
		category: "tables-desks",
		labelKey: "livingModelLivingTable",
		icon: "mdi:coffee-table",
		rooms: ["living-room"],
		keywords: [
			"coffee table",
			"side table",
			"nesting tables",
			"console table",
			"corner table",
		],
	},
	{
		type: "furniture-accent-chair",
		furnitureType: "accent-chair",
		category: "seating",
		labelKey: "livingModelAccentChair",
		icon: "mdi:seat-outline",
		rooms: ["living-room"],
		keywords: ["armchair", "recliner", "lounge chair", "rocking chair"],
	},
	{
		type: "furniture-ottoman",
		furnitureType: "ottoman",
		category: "seating",
		labelKey: "livingModelOttoman",
		icon: "mdi:stool-outline",
		rooms: ["living-room"],
		keywords: ["ottoman", "pouf", "bean bag", "beanbag", "footstool"],
	},
	{
		type: "furniture-living-storage",
		furnitureType: "living-storage",
		category: "storage",
		labelKey: "livingModelLivingStorage",
		icon: "mdi:bookshelf",
		rooms: ["living-room"],
		keywords: [
			"TV cabinet",
			"media console",
			"bookshelf",
			"display cabinet",
			"sideboard",
			"shelving unit",
			"wall shelves",
		],
	},
	{
		type: "furniture-television",
		furnitureType: "television",
		category: "entertainment",
		labelKey: "livingModelTelevision",
		icon: "mdi:television",
		rooms: ["living-room"],
		keywords: ["TV", "television", "flat screen"],
	},
	{
		type: "furniture-projector",
		furnitureType: "projector",
		category: "entertainment",
		labelKey: "livingModelProjector",
		icon: "mdi:projector",
		rooms: ["living-room"],
		keywords: ["projector", "cinema"],
	},
	{
		type: "furniture-projection-screen",
		furnitureType: "projection-screen",
		category: "entertainment",
		labelKey: "livingModelProjectionScreen",
		icon: "mdi:projector-screen-outline",
		rooms: ["living-room"],
		keywords: ["projection screen", "cinema screen"],
	},
	{
		type: "furniture-speaker-system",
		furnitureType: "speaker-system",
		category: "entertainment",
		labelKey: "livingModelSpeakerSystem",
		icon: "mdi:speaker",
		rooms: ["living-room"],
		keywords: ["speaker", "soundbar", "home cinema system", "surround sound"],
	},
	{
		type: "furniture-lamp",
		furnitureType: "lamp",
		category: "lighting",
		labelKey: "livingModelLamp",
		icon: "mdi:floor-lamp",
		rooms: ["living-room"],
		keywords: [
			"floor lamp",
			"table lamp",
			"pendant light",
			"wall light",
			"sconce",
		],
	},
	{
		type: "furniture-rug",
		furnitureType: "rug",
		category: "decoration",
		labelKey: "livingModelRug",
		icon: "mdi:rug",
		rooms: ["living-room"],
		keywords: ["rug", "carpet"],
	},
	{
		type: "furniture-mirror",
		furnitureType: "mirror",
		category: "decoration",
		labelKey: "livingModelMirror",
		icon: "mdi:mirror",
		rooms: ["living-room"],
		keywords: ["mirror"],
	},
	{
		type: "furniture-indoor-plant",
		furnitureType: "indoor-plant",
		category: "decoration",
		labelKey: "livingModelPlant",
		icon: "mdi:flower-outline",
		rooms: ["living-room"],
		keywords: ["indoor plant", "palm", "succulent", "houseplant"],
	},
	{
		type: "furniture-vase",
		furnitureType: "vase",
		category: "decoration",
		labelKey: "livingModelVase",
		icon: "mdi:vase-outline",
		rooms: ["living-room"],
		keywords: ["vase", "bowl"],
	},
	{
		type: "furniture-artwork",
		furnitureType: "artwork",
		category: "decoration",
		labelKey: "livingModelArtwork",
		icon: "mdi:image-frame",
		rooms: ["living-room"],
		keywords: ["artwork", "art", "painting", "triptych"],
	},
	{
		type: "furniture-wall-clock",
		furnitureType: "wall-clock",
		category: "decoration",
		labelKey: "livingModelWallClock",
		icon: "mdi:clock-outline",
		rooms: ["living-room"],
		keywords: ["wall clock"],
	},
	{
		type: "furniture-fireplace",
		furnitureType: "fireplace",
		category: "decoration",
		labelKey: "livingModelFireplace",
		icon: "mdi:fireplace",
		rooms: ["living-room"],
		keywords: ["fireplace", "mantel", "electric fire"],
	},
	{
		type: "furniture-curtains",
		furnitureType: "curtains",
		category: "decoration",
		labelKey: "livingModelCurtains",
		icon: "mdi:curtains",
		rooms: ["living-room"],
		keywords: ["curtains", "drapes", "drapery"],
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
	const type = furnitureTypeFromMeshType(meshType);
	const factory = type ? LIVING_FURNITURE_FACTORIES[type] : undefined;
	if (factory) return new factory(parameters, color);
	switch (type) {
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

const LIVING_FURNITURE_FACTORIES: Partial<
	Record<
		FurnitureType,
		new (
			parameters?: Partial<FurnitureParameters>,
			color?: number,
		) => FurnitureObject
	>
> = {
	"living-table": LivingTableObject,
	"accent-chair": AccentChairObject,
	ottoman: OttomanObject,
	"living-storage": LivingStorageObject,
	television: TelevisionObject,
	projector: ProjectorObject,
	"projection-screen": ProjectionScreenObject,
	"speaker-system": SpeakerSystemObject,
	lamp: LampObject,
	rug: RugObject,
	mirror: MirrorObject,
	"indoor-plant": PlantObject,
	vase: VaseObject,
	artwork: ArtworkObject,
	"wall-clock": WallClockObject,
	fireplace: FireplaceObject,
	curtains: CurtainsObject,
};
