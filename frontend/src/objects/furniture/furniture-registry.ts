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
import {
	BedroomBenchObject,
	BedroomVanityObject,
	BedsideLampObject,
	BedsideObject,
} from "./bedroom/furniture.js";
import {BedroomStorageObject} from "./bedroom/storage.js";
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
	KitchenAccessoriesObject,
	KitchenTrolleyObject,
} from "./kitchen/accessories.js";
import {
	KitchenCleaningApplianceObject,
	KitchenCoffeeMachineObject,
	KitchenHobObject,
	KitchenHoodObject,
	KitchenOvenObject,
} from "./kitchen/appliances.js";
import {KitchenTallCabinetObject} from "./kitchen/cabinets.js";
import {KitchenCountertopObject} from "./kitchen/countertops.js";
import {
	KitchenBinObject,
	KitchenFaucetObject,
	KitchenSinkObject,
} from "./kitchen/fixtures.js";
import {KitchenRefrigeratorObject} from "./kitchen/refrigeration.js";
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
import {NurseryBedObject} from "./nursery/beds.js";
import {
	ChangingTableObject,
	KidsChairObject,
	KidsTableObject,
	NurseryChairObject,
	NurseryWallShelvesObject,
} from "./nursery/furniture.js";
import {NightLightObject} from "./nursery/lighting.js";
import {
	ClimbingFrameObject,
	IndoorTentObject,
	PlayMatObject,
	PlaypenObject,
} from "./nursery/play.js";
import {NurseryStorageObject} from "./nursery/storage.js";
import {ToyKitchenObject} from "./nursery/toy-kitchen.js";
import {
	MonitorStandObject,
	OfficeBoardObject,
	OfficeDeskLampObject,
} from "./office/accessories.js";
import {MeetingTableObject, OfficeDeskObject} from "./office/desks.js";
import {
	DesktopComputerObject,
	OfficeLaptopObject,
	OfficeMonitorObject,
	OfficePrinterObject,
} from "./office/equipment.js";
import {OfficeChairObject} from "./office/seating.js";
import {OfficeStorageObject} from "./office/storage.js";
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
	| "other"
	| "base-cabinets"
	| "wall-cabinets"
	| "tall-cabinets"
	| "countertops"
	| "appliances"
	| "fixtures"
	| "kitchen-furniture"
	| "beds"
	| "bedside"
	| "bedroom-furniture"
	| "nursery-furniture"
	| "play"
	| "equipment";

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
		rooms: ["home-office"],
		keywords: ["standing desk", "height adjustable desk"],
	},
	{
		type: "furniture-wardrobe",
		furnitureType: "wardrobe",
		category: "storage",
		labelKey: "furnitureWardrobe",
		icon: "mdi:wardrobe-outline",
		rooms: ["master-bedroom"],
		keywords: [
			"wardrobe",
			"2-door wardrobe",
			"2 door wardrobe",
			"two door wardrobe",
			"3-door wardrobe",
			"3 door wardrobe",
			"three door wardrobe",
			"sliding doors",
			"sliding wardrobe",
		],
	},
	{
		type: "furniture-bed",
		furnitureType: "bed",
		category: "beds",
		labelKey: "furnitureBed",
		icon: "mdi:bed-outline",
		rooms: ["master-bedroom"],
		keywords: [
			"single bed",
			"double bed",
			"queen bed",
			"king bed",
			"super king bed",
			"platform bed",
			"storage bed",
			"adjustable bed",
		],
	},
	{
		type: "furniture-kitchen-cabinet-top",
		furnitureType: "kitchen-cabinet-top",
		category: "wall-cabinets",
		labelKey: "kitchenModelWall",
		icon: "mdi:cupboard-outline",
		rooms: ["kitchen"],
		keywords: [
			"single wall cabinet",
			"double wall cabinet",
			"corner wall cabinet",
			"open shelving",
		],
	},
	{
		type: "furniture-kitchen-cabinet-bottom",
		furnitureType: "kitchen-cabinet-bottom",
		category: "base-cabinets",
		labelKey: "kitchenModelBase",
		icon: "mdi:countertop-outline",
		rooms: ["kitchen"],
		keywords: [
			"single base cabinet",
			"double base cabinet",
			"drawer cabinet",
			"corner cabinet",
			"sink cabinet",
		],
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
		rooms: ["living-room", "home-office"],
		roomCategories: {"home-office": "other"},
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
		rooms: ["living-room", "master-bedroom", "home-office"],
		roomCategories: {"home-office": "other"},
		keywords: [
			"accent chair",
			"armchair",
			"recliner",
			"lounge chair",
			"rocking chair",
		],
	},
	{
		type: "furniture-ottoman",
		furnitureType: "ottoman",
		category: "seating",
		labelKey: "livingModelOttoman",
		icon: "mdi:stool-outline",
		rooms: ["living-room", "master-bedroom"],
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
		rooms: ["living-room", "master-bedroom"],
		roomCategories: {"master-bedroom": "decoration"},
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
		rooms: [
			"living-room",
			"dining-room",
			"master-bedroom",
			"childrens-bedroom",
		],
		keywords: ["rug", "carpet"],
	},
	{
		type: "furniture-mirror",
		furnitureType: "mirror",
		roomCategories: {
			bathroom: "accessories",
			"master-bedroom": "bedroom-furniture",
		},
		category: "decoration",
		labelKey: "livingModelMirror",
		icon: "mdi:mirror",
		rooms: ["living-room", "bathroom", "dining-room", "master-bedroom"],
		keywords: ["mirror", "full-length mirror", "full length mirror"],
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
		rooms: ["living-room", "master-bedroom"],
		keywords: ["artwork", "wall art", "art", "painting", "triptych"],
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
		rooms: ["living-room", "master-bedroom"],
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
		rooms: ["dining-room", "kitchen"],
		roomCategories: {kitchen: "kitchen-furniture"},
		keywords: [
			"kitchen table",
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
		rooms: ["dining-room", "kitchen"],
		roomCategories: {kitchen: "kitchen-furniture"},
		keywords: [
			"kitchen chair",
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
	{
		type: "furniture-kitchen-tall-cabinet",
		furnitureType: "kitchen-tall-cabinet",
		category: "tall-cabinets",
		labelKey: "kitchenModelTall",
		icon: "mdi:cupboard-outline",
		rooms: ["kitchen"],
		keywords: [
			"pantry cabinet",
			"oven tower",
			"fridge housing",
			"broom cabinet",
		],
	},
	{
		type: "furniture-kitchen-countertop",
		furnitureType: "kitchen-countertop",
		category: "countertops",
		labelKey: "kitchenModelCountertop",
		icon: "mdi:countertop-outline",
		rooms: ["kitchen"],
		keywords: [
			"straight countertop",
			"L-shaped countertop",
			"L shaped countertop",
			"U-shaped countertop",
			"U shaped countertop",
			"kitchen island",
			"peninsula",
			"breakfast bar",
			"worktop",
		],
	},
	{
		type: "furniture-kitchen-refrigerator",
		furnitureType: "kitchen-refrigerator",
		category: "appliances",
		labelKey: "kitchenModelRefrigerator",
		icon: "mdi:fridge-outline",
		rooms: ["kitchen"],
		keywords: [
			"refrigerator",
			"American-style refrigerator",
			"American style refrigerator",
			"freezer",
			"fridge",
		],
	},
	{
		type: "furniture-kitchen-oven",
		furnitureType: "kitchen-oven",
		category: "appliances",
		labelKey: "kitchenModelOven",
		icon: "mdi:stove",
		rooms: ["kitchen"],
		keywords: ["oven", "microwave"],
	},
	{
		type: "furniture-kitchen-hob",
		furnitureType: "kitchen-hob",
		category: "appliances",
		labelKey: "kitchenModelHob",
		icon: "mdi:stove",
		rooms: ["kitchen"],
		keywords: ["induction hob", "gas hob", "cooktop"],
	},
	{
		type: "furniture-kitchen-hood",
		furnitureType: "kitchen-hood",
		category: "appliances",
		labelKey: "kitchenModelHood",
		icon: "mdi:hvac",
		rooms: ["kitchen"],
		keywords: ["extractor hood", "range hood", "cooker hood"],
	},
	{
		type: "furniture-kitchen-cleaning-appliance",
		furnitureType: "kitchen-cleaning-appliance",
		category: "appliances",
		labelKey: "kitchenModelCleaning",
		icon: "mdi:dishwasher",
		rooms: ["kitchen"],
		keywords: ["dishwasher", "washing machine"],
	},
	{
		type: "furniture-kitchen-coffee-machine",
		furnitureType: "kitchen-coffee-machine",
		category: "appliances",
		labelKey: "kitchenModelCoffee",
		icon: "mdi:coffee-maker-outline",
		rooms: ["kitchen"],
		keywords: ["coffee machine", "espresso machine", "pod machine"],
	},
	{
		type: "furniture-kitchen-sink",
		furnitureType: "kitchen-sink",
		category: "fixtures",
		labelKey: "kitchenModelSink",
		icon: "mdi:water-pump",
		rooms: ["kitchen"],
		keywords: ["single sink", "double sink", "kitchen sink"],
	},
	{
		type: "furniture-kitchen-faucet",
		furnitureType: "kitchen-faucet",
		category: "fixtures",
		labelKey: "kitchenModelFaucet",
		icon: "mdi:faucet",
		rooms: ["kitchen"],
		keywords: ["kitchen faucet", "tap", "gooseneck"],
	},
	{
		type: "furniture-kitchen-bin",
		furnitureType: "kitchen-bin",
		category: "fixtures",
		labelKey: "kitchenModelBin",
		icon: "mdi:trash-can-outline",
		rooms: ["kitchen"],
		keywords: ["waste bin", "rubbish bin", "trash can"],
	},
	{
		type: "furniture-kitchen-trolley",
		furnitureType: "kitchen-trolley",
		category: "kitchen-furniture",
		labelKey: "kitchenModelTrolley",
		icon: "mdi:cart-outline",
		rooms: ["kitchen"],
		keywords: ["kitchen trolley", "kitchen cart", "utility cart"],
	},
	{
		type: "furniture-kitchen-accessories",
		furnitureType: "kitchen-accessories",
		category: "accessories",
		labelKey: "kitchenModelAccessories",
		icon: "mdi:shaker-outline",
		rooms: ["kitchen"],
		keywords: ["dish rack", "spice rack", "kitchen shelves"],
	},
	{
		type: "furniture-bedside",
		furnitureType: "bedside",
		category: "bedside",
		labelKey: "bedroomModelBedside",
		icon: "mdi:table-furniture",
		rooms: ["master-bedroom"],
		keywords: ["bedside table", "bedside shelf", "nightstand"],
	},
	{
		type: "furniture-bedside-lamp",
		furnitureType: "bedside-lamp",
		category: "bedside",
		labelKey: "bedroomModelBedsideLamp",
		icon: "mdi:lamp",
		rooms: ["master-bedroom"],
		keywords: ["bedside lamp", "night light"],
	},
	{
		type: "furniture-bedroom-storage",
		furnitureType: "bedroom-storage",
		category: "storage",
		labelKey: "bedroomModelStorage",
		icon: "mdi:dresser-outline",
		rooms: ["master-bedroom"],
		keywords: ["chest of drawers", "dresser", "tallboy", "clothes rack"],
	},
	{
		type: "furniture-bedroom-bench",
		furnitureType: "bedroom-bench",
		category: "seating",
		labelKey: "bedroomModelBench",
		icon: "mdi:bench",
		rooms: ["master-bedroom"],
		keywords: ["bedroom bench", "bed end bench", "storage bench"],
	},
	{
		type: "furniture-bedroom-vanity",
		furnitureType: "bedroom-vanity",
		category: "bedroom-furniture",
		labelKey: "bedroomModelVanity",
		icon: "mdi:vanity-light",
		rooms: ["master-bedroom"],
		keywords: ["dressing table", "vanity", "desk", "bedroom desk"],
	},
	{
		type: "furniture-nursery-bed",
		furnitureType: "nursery-bed",
		category: "beds",
		labelKey: "nurseryModelBed",
		icon: "mdi:bed-outline",
		rooms: ["childrens-bedroom"],
		keywords: [
			"crib",
			"cot",
			"toddler bed",
			"single bed",
			"bunk bed",
			"loft bed",
			"trundle bed",
			"cabin bed",
		],
	},
	{
		type: "furniture-nursery-storage",
		furnitureType: "nursery-storage",
		category: "storage",
		labelKey: "nurseryModelStorage",
		icon: "mdi:toy-brick-outline",
		rooms: ["childrens-bedroom"],
		keywords: [
			"children's wardrobe",
			"childrens wardrobe",
			"children wardrobe",
			"toy chest",
			"toy storage unit",
			"bookshelf",
			"chest of drawers",
		],
	},
	{
		type: "furniture-changing-table",
		furnitureType: "changing-table",
		category: "nursery-furniture",
		labelKey: "nurseryModelChanging",
		icon: "mdi:baby-carriage",
		rooms: ["childrens-bedroom"],
		keywords: ["changing table", "baby changing"],
	},
	{
		type: "furniture-nursery-chair",
		furnitureType: "nursery-chair",
		category: "nursery-furniture",
		labelKey: "nurseryModelChair",
		icon: "mdi:seat-outline",
		rooms: ["childrens-bedroom"],
		keywords: ["nursing chair", "rocking chair"],
	},
	{
		type: "furniture-kids-table",
		furnitureType: "kids-table",
		category: "nursery-furniture",
		labelKey: "nurseryModelTable",
		icon: "mdi:table-furniture",
		rooms: ["childrens-bedroom"],
		keywords: ["kids' desk", "kids desk", "children's desk", "play table"],
	},
	{
		type: "furniture-kids-chair",
		furnitureType: "kids-chair",
		category: "nursery-furniture",
		labelKey: "nurseryModelKidsChair",
		icon: "mdi:chair-school",
		rooms: ["childrens-bedroom"],
		keywords: ["kids' chair", "kids chair", "children's chair"],
	},
	{
		type: "furniture-play-mat",
		furnitureType: "play-mat",
		category: "play",
		labelKey: "nurseryModelMat",
		icon: "mdi:puzzle-outline",
		rooms: ["childrens-bedroom"],
		keywords: ["play mat", "puzzle mat", "foam mat"],
	},
	{
		type: "furniture-playpen",
		furnitureType: "playpen",
		category: "play",
		labelKey: "nurseryModelPlaypen",
		icon: "mdi:fence",
		rooms: ["childrens-bedroom"],
		keywords: ["playpen", "play pen"],
	},
	{
		type: "furniture-indoor-tent",
		furnitureType: "indoor-tent",
		category: "play",
		labelKey: "nurseryModelTent",
		icon: "mdi:tent",
		rooms: ["childrens-bedroom"],
		keywords: ["indoor tent", "teepee", "tipi"],
	},
	{
		type: "furniture-toy-kitchen",
		furnitureType: "toy-kitchen",
		category: "play",
		labelKey: "nurseryModelToyKitchen",
		icon: "mdi:stove",
		rooms: ["childrens-bedroom"],
		keywords: ["toy kitchen", "play kitchen"],
	},
	{
		type: "furniture-climbing-frame",
		furnitureType: "climbing-frame",
		category: "play",
		labelKey: "nurseryModelClimbing",
		icon: "mdi:ladder",
		rooms: ["childrens-bedroom"],
		keywords: [
			"climbing structure",
			"climbing frame",
			"triangle ladder",
			"climbing arch",
		],
	},
	{
		type: "furniture-night-light",
		furnitureType: "night-light",
		category: "decoration",
		labelKey: "nurseryModelNightLight",
		icon: "mdi:weather-night",
		rooms: ["childrens-bedroom"],
		keywords: ["night light", "nightlight", "star light", "cloud light"],
	},
	{
		type: "furniture-nursery-wall-shelves",
		furnitureType: "nursery-wall-shelves",
		category: "decoration",
		labelKey: "nurseryModelShelves",
		icon: "mdi:bookshelf",
		rooms: ["childrens-bedroom"],
		keywords: ["wall shelves", "children's shelves", "nursery shelves"],
	},
	{
		type: "furniture-office-desk",
		furnitureType: "office-desk",
		category: "tables-desks",
		labelKey: "officeModelDesk",
		icon: "mdi:desk",
		rooms: ["home-office"],
		keywords: [
			"writing desk",
			"computer desk",
			"L-shaped desk",
			"L shaped desk",
			"corner desk",
			"executive desk",
		],
	},
	{
		type: "furniture-office-chair",
		furnitureType: "office-chair",
		category: "seating",
		labelKey: "officeModelChair",
		icon: "mdi:chair-rolling",
		rooms: ["home-office"],
		keywords: ["office chair", "ergonomic chair", "visitor chair", "stool"],
	},
	{
		type: "furniture-office-storage",
		furnitureType: "office-storage",
		category: "storage",
		labelKey: "officeModelStorage",
		icon: "mdi:file-cabinet",
		rooms: ["home-office"],
		keywords: [
			"filing cabinet",
			"bookshelf",
			"drawer unit",
			"storage cabinet",
			"wall shelving",
		],
	},
	{
		type: "furniture-desktop-computer",
		furnitureType: "desktop-computer",
		category: "equipment",
		labelKey: "officeModelComputer",
		icon: "mdi:desktop-tower-monitor",
		rooms: ["home-office"],
		keywords: ["desktop computer", "PC", "tower", "all in one"],
	},
	{
		type: "furniture-office-monitor",
		furnitureType: "office-monitor",
		category: "equipment",
		labelKey: "officeModelMonitor",
		icon: "mdi:monitor",
		rooms: ["home-office"],
		keywords: ["monitor", "screen", "dual monitors"],
	},
	{
		type: "furniture-office-laptop",
		furnitureType: "office-laptop",
		category: "equipment",
		labelKey: "officeModelLaptop",
		icon: "mdi:laptop",
		rooms: ["home-office"],
		keywords: ["laptop", "notebook computer"],
	},
	{
		type: "furniture-office-printer",
		furnitureType: "office-printer",
		category: "equipment",
		labelKey: "officeModelPrinter",
		icon: "mdi:printer-outline",
		rooms: ["home-office"],
		keywords: ["printer", "scanner", "flatbed"],
	},
	{
		type: "furniture-office-desk-lamp",
		furnitureType: "office-desk-lamp",
		category: "accessories",
		labelKey: "officeModelLamp",
		icon: "mdi:desk-lamp",
		rooms: ["home-office"],
		keywords: ["desk lamp", "task lamp"],
	},
	{
		type: "furniture-monitor-stand",
		furnitureType: "monitor-stand",
		category: "accessories",
		labelKey: "officeModelStand",
		icon: "mdi:monitor-screenshot",
		rooms: ["home-office"],
		keywords: ["monitor stand", "monitor riser"],
	},
	{
		type: "furniture-office-board",
		furnitureType: "office-board",
		category: "accessories",
		labelKey: "officeModelBoard",
		icon: "mdi:clipboard-outline",
		rooms: ["home-office"],
		keywords: ["whiteboard", "noticeboard", "notice board", "bulletin board"],
	},
	{
		type: "furniture-meeting-table",
		furnitureType: "meeting-table",
		category: "other",
		labelKey: "officeModelMeeting",
		icon: "mdi:table-furniture",
		rooms: ["home-office"],
		keywords: ["meeting table", "conference table"],
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
	"kitchen-tall-cabinet": KitchenTallCabinetObject,
	"kitchen-countertop": KitchenCountertopObject,
	"kitchen-refrigerator": KitchenRefrigeratorObject,
	"kitchen-oven": KitchenOvenObject,
	"kitchen-hob": KitchenHobObject,
	"kitchen-hood": KitchenHoodObject,
	"kitchen-cleaning-appliance": KitchenCleaningApplianceObject,
	"kitchen-coffee-machine": KitchenCoffeeMachineObject,
	"kitchen-sink": KitchenSinkObject,
	"kitchen-faucet": KitchenFaucetObject,
	"kitchen-bin": KitchenBinObject,
	"kitchen-trolley": KitchenTrolleyObject,
	"kitchen-accessories": KitchenAccessoriesObject,
	bedside: BedsideObject,
	"bedside-lamp": BedsideLampObject,
	"bedroom-storage": BedroomStorageObject,
	"bedroom-bench": BedroomBenchObject,
	"bedroom-vanity": BedroomVanityObject,
	"nursery-bed": NurseryBedObject,
	"nursery-storage": NurseryStorageObject,
	"changing-table": ChangingTableObject,
	"nursery-chair": NurseryChairObject,
	"kids-table": KidsTableObject,
	"kids-chair": KidsChairObject,
	"play-mat": PlayMatObject,
	playpen: PlaypenObject,
	"indoor-tent": IndoorTentObject,
	"toy-kitchen": ToyKitchenObject,
	"climbing-frame": ClimbingFrameObject,
	"night-light": NightLightObject,
	"nursery-wall-shelves": NurseryWallShelvesObject,
	"office-desk": OfficeDeskObject,
	"office-chair": OfficeChairObject,
	"office-storage": OfficeStorageObject,
	"desktop-computer": DesktopComputerObject,
	"office-monitor": OfficeMonitorObject,
	"office-laptop": OfficeLaptopObject,
	"office-printer": OfficePrinterObject,
	"office-desk-lamp": OfficeDeskLampObject,
	"monitor-stand": MonitorStandObject,
	"office-board": OfficeBoardObject,
	"meeting-table": MeetingTableObject,
};
