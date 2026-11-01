import {
	BathroomAccessoryObject,
	TowelRailObject,
} from "./bathroom/accessories.js";
import {ShowerObject} from "./bathroom/bathing.js";
import {SanitaryFixtureObject, WashbasinObject} from "./bathroom/fixtures.js";
import {
	BathMatObject,
	BathroomStoolObject,
	LaundryBasketObject,
} from "./bathroom/other.js";
import {BathroomStorageObject} from "./bathroom/storage.js";
import {BathtubObject} from "./bathtub.js";
import {BedObject} from "./bed.js";
import {CabinetObject} from "./cabinet.js";
import {ChairObject} from "./chair.js";
import {CouchObject} from "./couch.js";
import {CenterpieceObject} from "./dining-room/decoration.js";
import {DiningLightObject} from "./dining-room/lighting.js";
import {DiningSeatingObject} from "./dining-room/seating.js";
import {DiningStorageObject} from "./dining-room/storage.js";
import {DiningTableObject} from "./dining-room/tables.js";
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
	| "lighting"
	| "sanitary-fixtures"
	| "washbasins"
	| "bathing"
	| "accessories"
	| "other";

export type FurnitureOption = {
	type: `furniture-${FurnitureType}`;
	furnitureType: FurnitureType;
	labelKey: string;
	icon: string;
	category: FurnitureCategory;
	rooms?: string[];
	roomCategories?: Partial<Record<string, FurnitureCategory>>;
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
		rooms: ["bathroom"],
		roomCategories: {bathroom: "bathing"},
		keywords: ["bathtub", "freestanding bathtub", "corner bathtub", "bath"],
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
		rooms: ["living-room", "dining-room"],
		keywords: ["rug", "carpet"],
	},
	{
		type: "furniture-mirror",
		furnitureType: "mirror",
		roomCategories: {bathroom: "accessories"},
		category: "decoration",
		labelKey: "livingModelMirror",
		icon: "mdi:mirror",
		rooms: ["living-room", "bathroom", "dining-room"],
		keywords: ["mirror"],
	},
	{
		type: "furniture-indoor-plant",
		furnitureType: "indoor-plant",
		category: "decoration",
		labelKey: "livingModelPlant",
		icon: "mdi:flower-outline",
		rooms: ["living-room", "dining-room"],
		keywords: [
			"indoor plant",
			"decorative plant",
			"palm",
			"succulent",
			"houseplant",
		],
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
	{
		type: "furniture-sanitary-fixture",
		furnitureType: "sanitary-fixture",
		category: "sanitary-fixtures",
		labelKey: "bathModelSanitaryFixture",
		icon: "mdi:toilet",
		rooms: ["bathroom"],
		keywords: [
			"toilet",
			"wall-hung toilet",
			"wall hung toilet",
			"bidet",
			"urinal",
		],
	},
	{
		type: "furniture-washbasin",
		furnitureType: "washbasin",
		category: "washbasins",
		labelKey: "bathModelWashbasin",
		icon: "mdi:hand-wash-outline",
		rooms: ["bathroom"],
		keywords: [
			"pedestal basin",
			"wall-mounted basin",
			"wall mounted basin",
			"countertop basin",
			"double basin",
			"vanity unit",
			"washbasin",
			"sink",
		],
	},
	{
		type: "furniture-shower",
		furnitureType: "shower",
		category: "bathing",
		labelKey: "bathModelShower",
		icon: "mdi:shower",
		rooms: ["bathroom"],
		keywords: [
			"shower tray",
			"walk-in shower",
			"walk in shower",
			"shower enclosure",
		],
	},
	{
		type: "furniture-bathroom-storage",
		furnitureType: "bathroom-storage",
		category: "storage",
		labelKey: "bathModelBathroomStorage",
		icon: "mdi:cupboard-outline",
		rooms: ["bathroom"],
		keywords: [
			"medicine cabinet",
			"bathroom cabinet",
			"tall cabinet",
			"wall shelf",
			"under-sink cabinet",
			"under sink cabinet",
		],
	},
	{
		type: "furniture-towel-rail",
		furnitureType: "towel-rail",
		category: "accessories",
		labelKey: "bathModelTowelRail",
		icon: "mdi:radiator",
		rooms: ["bathroom"],
		keywords: ["towel rail", "heated towel rail", "towel warmer"],
	},
	{
		type: "furniture-bathroom-accessory",
		furnitureType: "bathroom-accessory",
		category: "accessories",
		labelKey: "bathModelBathroomAccessory",
		icon: "mdi:paper-roll-outline",
		rooms: ["bathroom"],
		keywords: [
			"toilet paper holder",
			"soap holder",
			"soap dish",
			"towel hooks",
		],
	},
	{
		type: "furniture-laundry-basket",
		furnitureType: "laundry-basket",
		category: "other",
		labelKey: "bathModelLaundryBasket",
		icon: "mdi:basket-outline",
		rooms: ["bathroom"],
		keywords: ["laundry basket", "hamper"],
	},
	{
		type: "furniture-bathroom-stool",
		furnitureType: "bathroom-stool",
		category: "other",
		labelKey: "bathModelBathroomStool",
		icon: "mdi:stool-outline",
		rooms: ["bathroom"],
		keywords: ["bathroom stool", "stool"],
	},
	{
		type: "furniture-bath-mat",
		furnitureType: "bath-mat",
		category: "other",
		labelKey: "bathModelBathMat",
		icon: "mdi:rug",
		rooms: ["bathroom"],
		keywords: ["bath mat", "bathmat", "bathroom rug"],
	},
	{
		type: "furniture-dining-table",
		furnitureType: "dining-table",
		category: "tables-desks",
		labelKey: "diningModelTable",
		icon: "mdi:table-furniture",
		rooms: ["dining-room"],
		keywords: [
			"rectangular dining table",
			"round dining table",
			"oval dining table",
			"square dining table",
			"extendable dining table",
			"extension leaf",
		],
	},
	{
		type: "furniture-dining-seating",
		furnitureType: "dining-seating",
		category: "seating",
		labelKey: "diningModelSeating",
		icon: "mdi:chair-rolling",
		rooms: ["dining-room"],
		keywords: [
			"dining chair",
			"upholstered dining chair",
			"dining bench",
			"bar stool",
		],
	},
	{
		type: "furniture-dining-storage",
		furnitureType: "dining-storage",
		category: "storage",
		labelKey: "diningModelStorage",
		icon: "mdi:buffet",
		rooms: ["dining-room"],
		keywords: [
			"sideboard",
			"buffet cabinet",
			"china cabinet",
			"display cabinet",
			"drinks cabinet",
			"wine rack",
		],
	},
	{
		type: "furniture-dining-light",
		furnitureType: "dining-light",
		category: "lighting",
		labelKey: "diningModelLight",
		icon: "mdi:chandelier",
		rooms: ["dining-room"],
		keywords: ["chandelier", "pendant light", "wall light", "sconce"],
	},
	{
		type: "furniture-centerpiece",
		furnitureType: "centerpiece",
		category: "decoration",
		labelKey: "diningModelCenterpiece",
		icon: "mdi:flower-vase-outline",
		rooms: ["dining-room"],
		keywords: [
			"centerpiece",
			"centrepiece",
			"fruit bowl",
			"floral arrangement",
			"candle arrangement",
			"table decoration",
		],
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
	const factory = type ? CUSTOM_FURNITURE_FACTORIES[type] : undefined;
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

const CUSTOM_FURNITURE_FACTORIES: Partial<
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
	"sanitary-fixture": SanitaryFixtureObject,
	washbasin: WashbasinObject,
	shower: ShowerObject,
	"bathroom-storage": BathroomStorageObject,
	"towel-rail": TowelRailObject,
	"bathroom-accessory": BathroomAccessoryObject,
	"laundry-basket": LaundryBasketObject,
	"bathroom-stool": BathroomStoolObject,
	"bath-mat": BathMatObject,
	"dining-table": DiningTableObject,
	"dining-seating": DiningSeatingObject,
	"dining-storage": DiningStorageObject,
	"dining-light": DiningLightObject,
	centerpiece: CenterpieceObject,
};
