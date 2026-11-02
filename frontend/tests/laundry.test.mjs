import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".laundry-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "laundry.mjs");
await build({
	stdin: {
		contents: `export * from "./src/objects/furniture/furniture-registry.ts";
export {filterModels, MODEL_LIBRARY, MODEL_ROOMS} from "./src/editor/model-library.ts";`,
		resolveDir: frontend,
	},
	outfile: output,
	bundle: true,
	platform: "node",
	format: "esm",
	packages: "external",
});
const {
	createFurnitureObject,
	FURNITURE_OPTIONS,
	filterModels,
	MODEL_LIBRARY,
	MODEL_ROOMS,
} = await import(pathToFileURL(output).href);
const locale = JSON.parse(
	await readFile(join(frontend, "src/locale/en.json"), "utf8"),
);
const options = FURNITURE_OPTIONS.filter((item) =>
	item.rooms?.includes("laundry-room"),
);
function parts(object, name) {
	const result = [];
	object.traverse((child) => {
		if (child.isMesh && (!name || child.name === name)) result.push(child);
	});
	return result;
}
function valid(object) {
	assert.ok(object.furnitureMesh?.userData.ownerMaterialTarget);
	assert.ok(parts(object).length);
	for (const mesh of parts(object)) {
		assert.ok(mesh.internal && mesh.material);
		for (const name of ["position", "normal"]) {
			const attribute = mesh.geometry.getAttribute(name);
			assert.ok(
				attribute?.count && attribute.array.every(Number.isFinite),
				`${mesh.name}: ${name}`,
			);
		}
		assert.ok(
			mesh.scale
				.toArray()
				.every((value) => Number.isFinite(value) && value > 0),
		);
	}
	const bounds = new Box3().setFromObject(object);
	assert.ok(
		!bounds.isEmpty() &&
			[...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite),
	);
}
test("all 16 requested laundry objects are searchable in five categories and the shared basket remains unique", () => {
	assert.equal(options.length, 8);
	assert.equal(filterModels("", "all", "laundry-room").length, 8);
	assert.deepEqual(
		MODEL_ROOMS.find((item) => item.id === "laundry-room").categories,
		["appliances", "fixtures", "storage", "laundry-furniture", "accessories"],
	);
	for (const [queries, type] of [
		[
			[
				"washing machine",
				"tumble dryer",
				"washer-dryer",
				"stacked laundry unit",
			],
			"laundry-appliance",
		],
		[["utility sink", "laundry basin"], "utility-sink"],
		[
			["laundry cabinet", "broom cupboard", "wall shelves", "storage rack"],
			"laundry-storage",
		],
		[["folding table", "ironing board"], "laundry-worktable"],
		[["laundry sorting station"], "laundry-sorting-station"],
		[["clothes drying rack"], "clothes-drying-rack"],
		[["laundry basket"], "laundry-basket"],
		[["cleaning trolley"], "cleaning-trolley"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, "all", "laundry-room").some(
					(item) => item.type === `furniture-${type}`,
				),
				query,
			);
	assert.equal(
		filterModels("laundry basket", "accessories", "laundry-room")[0].type,
		"furniture-laundry-basket",
	);
	assert.equal(
		filterModels("laundry basket", "other", "bathroom")[0].type,
		"furniture-laundry-basket",
	);
	assert.equal(
		MODEL_LIBRARY.filter((item) => item.type === "furniture-laundry-basket")
			.length,
		1,
	);
	for (const [room, count] of [
		["living-room", 18],
		["dining-room", 8],
		["bathroom", 11],
		["kitchen", 17],
		["master-bedroom", 14],
		["childrens-bedroom", 14],
		["home-office", 14],
	])
		assert.equal(filterModels("", "all", room).length, count);
});

test("appliance presets build stacked units, dryer details, independent door hinges and translucent glass", () => {
	const appliance = createFurnitureObject("laundry-appliance", {
		style: "stacked-laundry-unit",
	});
	assert.equal(parts(appliance, "Laundry Appliance Body").length, 2);
	assert.equal(parts(appliance, "Laundry Door Rim").length, 2);
	assert.equal(parts(appliance, "Drum Laundry").length, 6);
	assert.equal(parts(appliance, "Dryer Vent Slot").length, 8);
	for (const glass of parts(appliance, "Laundry Door Glass")) {
		assert.ok(glass.material.transparent && !glass.material.depthWrite);
		assert.equal(glass.castShadow, false);
	}
	const closed = new Box3().setFromObject(appliance).max.z;
	appliance.setConfiguration("doorOpen", true);
	assert.ok(new Box3().setFromObject(appliance).max.z > closed + 0.15);
	appliance.setConfiguration("doorSide", "right-hinge");
	assert.ok(appliance.getObjectByName("Laundry Door Hinge").rotation.y > 0);
	appliance.setConfiguration("style", "washer-dryer");
	assert.equal(parts(appliance, "Laundry Appliance Body").length, 1);
	assert.equal(parts(appliance, "Washer Dryer Indicator").length, 2);
	appliance.setConfiguration("contentsEnabled", false);
	assert.equal(parts(appliance, "Drum Laundry").length, 0);
	appliance.dispose();
});

test("utility sinks and laundry basins remain hollow and can include a stand, plumbing and faucet", () => {
	const sink = createFurnitureObject("utility-sink", { faucetEnabled: false });
	assert.equal(parts(sink, "Utility Sink Leg").length, 4);
	for (const leg of parts(sink, "Utility Sink Leg"))
		assert.ok(
			Math.abs(
				new Box3().setFromObject(leg).max.y -
					sink.getObjectByName("Utility Sink Rim").position.y,
			) < 1e-6,
			"stand reaches the underside of the rim",
		);
	assert.ok(sink.getObjectByName("Utility Sink Trap"));
	sink.setConfiguration("style", "laundry-basin");
	assert.equal(parts(sink, "Utility Sink Leg").length, 0);
	sink.updateMatrixWorld(true);
	const bowl = sink.getObjectByName("Utility Sink Bowl"),
		hits = new Raycaster(
			new Vector3(0, 2, bowl.position.z),
			new Vector3(0, -1, 0),
		).intersectObject(sink, true);
	assert.ok(
		hits.length && hits[0].point.y < Number(sink.parameters.height) * 0.5,
	);
	sink.setConfiguration("faucetEnabled", true);
	assert.ok(sink.getObjectByName("Kitchen Faucet Spout"));
	sink.dispose();
});

test("laundry cabinets open, broom cupboards include a broom and racks and wall shelves rebuild their tiers", () => {
	const storage = createFurnitureObject("laundry-storage"),
		closed = new Box3().setFromObject(storage).max.z;
	storage.setConfiguration("doorsOpen", true);
	assert.ok(new Box3().setFromObject(storage).max.z > closed + 0.3);
	storage.setConfiguration("style", "broom-cupboard");
	assert.ok(storage.getObjectByName("Laundry Broom Head"));
	storage.setConfiguration("contentsEnabled", false);
	assert.equal(parts(storage, "Laundry Broom Head").length, 0);
	storage.setConfiguration("style", "storage-rack");
	assert.equal(parts(storage, "Laundry Rack Post").length, 4);
	assert.equal(parts(storage, "Laundry Storage Shelf").length, 5);
	storage.setConfiguration("style", "wall-shelves");
	assert.equal(parts(storage, "Laundry Storage Shelf").length, 3);
	assert.equal(parts(storage, "Laundry Shelf Bracket").length, 6);
	storage.dispose();
});

test("folding and ironing surfaces collapse to a lower profile and preserve their unfolded height setting", () => {
	const table = createFurnitureObject("laundry-worktable"),
		height = table.parameters.height,
		open = new Box3().setFromObject(table).getSize(new Vector3()).y;
	table.setConfiguration("folded", true);
	assert.ok(
		new Box3().setFromObject(table).getSize(new Vector3()).y < open * 0.3,
	);
	assert.equal(table.parameters.height, height);
	table.setConfiguration("style", "ironing-board");
	assert.ok(table.getObjectByName("Ironing Board Top"));
	assert.equal(parts(table, "Iron Rest Bar").length, 4);
	table.setConfiguration("ironRest", false);
	assert.equal(parts(table, "Iron Rest Bar").length, 0);
	table.dispose();
});

test("sorting stations rebuild separate hollow bags and move them beyond the frame", () => {
	const station = createFurnitureObject("laundry-sorting-station", {
		bagCount: 4,
	});
	assert.equal(parts(station, "Sorting Bag Floor").length, 4);
	assert.equal(parts(station, "Sorting Bag Wall").length, 16);
	assert.equal(parts(station, "Sorting Bag Laundry").length, 8);
	const closed = new Box3().setFromObject(station).max.z;
	station.setConfiguration("bagsOut", 1);
	assert.ok(new Box3().setFromObject(station).max.z > closed + 0.2);
	station.setConfiguration("topEnabled", false);
	assert.equal(parts(station, "Sorting Worktop").length, 0);
	station.setConfiguration("contentsEnabled", false);
	assert.equal(parts(station, "Sorting Bag Laundry").length, 0);
	station.dispose();
});

test("drying racks fold to a narrow profile and tower tiers and towels follow their controls", () => {
	const rack = createFurnitureObject("clothes-drying-rack"),
		depth = new Box3().setFromObject(rack).getSize(new Vector3()).z;
	assert.equal(parts(rack, "Drying Wing Rod").length, 16);
	rack.setConfiguration("folded", true);
	assert.ok(
		new Box3().setFromObject(rack).getSize(new Vector3()).z < depth * 0.3,
	);
	assert.equal(parts(rack, "Drying Wing Rod").length, 0);
	rack.setConfiguration("style", "tower-airer");
	assert.equal(parts(rack, "Drying Tower Post").length, 4);
	assert.equal(parts(rack, "Clothes Drying Rod").length, 24);
	rack.setConfiguration("towelsEnabled", true);
	assert.equal(parts(rack, "Drying Towel").length, 2);
	rack.dispose();
});

test("cleaning trolleys provide casters, a hollow bucket, bottles and optional mop", () => {
	const trolley = createFurnitureObject("cleaning-trolley");
	assert.equal(parts(trolley, "Cleaning Trolley Caster").length, 4);
	assert.equal(parts(trolley, "Cleaning Bottle").length, 3);
	assert.ok(trolley.getObjectByName("Cleaning Bucket"));
	assert.ok(trolley.getObjectByName("Cleaning Mop Handle"));
	trolley.setConfiguration("suppliesEnabled", false);
	assert.equal(parts(trolley, "Cleaning Bucket").length, 0);
	trolley.setConfiguration("mopEnabled", false);
	assert.equal(parts(trolley, "Cleaning Mop Handle").length, 0);
	trolley.setConfiguration("wheelsEnabled", false);
	assert.equal(parts(trolley, "Cleaning Trolley Caster").length, 0);
	trolley.dispose();
});

for (const option of options) {
	test(`${option.type}: variants, dimension limits, labels, cloning and saved configuration`, () => {
		const object = createFurnitureObject(option.type);
		valid(object);
		assert.ok(locale[option.labelKey]);
		assert.ok(locale[object.editorLabelKey]);
		const limits = ["min", "max"].map((limit) =>
			Object.fromEntries(
				object.parameterDefinitions
					.filter((item) => item.type === "number" || item.type === "integer")
					.map((item) => [item.name, item[limit]]),
			),
		);
		for (const definition of object.parameterDefinitions) {
			assert.ok(locale[definition.labelKey], definition.labelKey);
			assert.ok(locale[definition.tooltipKey], definition.tooltipKey);
			for (const choice of definition.options ?? []) {
				assert.ok(locale[choice.labelKey], choice.labelKey);
				for (const range of [{}, ...limits]) {
					const variant = createFurnitureObject(option.type, {
						[definition.name]: choice.value,
						...range,
					});
					valid(variant);
					assert.equal(variant.parameters[definition.name], choice.value);
					variant.dispose();
				}
			}
		}
		object.position.set(2, 3, 4);
		object.rotation.y = 0.6;
		object.setConfiguration("width", 1.4);
		const clone = object.clone(),
			restored = createFurnitureObject(
				option.type,
				JSON.parse(JSON.stringify(object.getParameters())),
			);
		assert.deepEqual(clone.getParameters(), object.getParameters());
		assert.deepEqual(restored.getParameters(), object.getParameters());
		assert.deepEqual(clone.position.toArray(), [2, 3, 4]);
		assert.ok(Math.abs(clone.rotation.y - 0.6) < 1e-10);
		assert.notEqual(
			clone.furnitureMesh.geometry,
			object.furnitureMesh.geometry,
		);
		assert.notEqual(
			clone.furnitureMesh.material,
			object.furnitureMesh.material,
		);
		valid(clone);
		valid(restored);
		object.dispose();
		clone.dispose();
		restored.dispose();
	});
}
