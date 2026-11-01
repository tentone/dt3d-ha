import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".bathroom-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "bathroom.mjs");
await build({
	stdin: {
		contents: `export * from "./src/objects/furniture/furniture-registry.ts";
export {filterModels, MODEL_LIBRARY} from "./src/editor/model-library.ts";`,
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
} = await import(pathToFileURL(output).href);
const locale = JSON.parse(
	await readFile(join(frontend, "src/locale/en.json"), "utf8"),
);
const options = FURNITURE_OPTIONS.filter((item) =>
	item.rooms?.includes("bathroom"),
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
for (const option of options) {
	test(`${option.type}: every variant, dimensions, labels, clone and saved settings`, () => {
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
		object.position.set(1, 2, 3);
		object.rotation.y = 0.4;
		object.setConfiguration("width", 0.9);
		const clone = object.clone(),
			restored = createFurnitureObject(
				option.type,
				JSON.parse(JSON.stringify(object.getParameters())),
			);
		assert.deepEqual(clone.getParameters(), object.getParameters());
		assert.deepEqual(restored.getParameters(), object.getParameters());
		assert.deepEqual(clone.position.toArray(), [1, 2, 3]);
		assert.ok(Math.abs(clone.rotation.y - 0.4) < 1e-10);
		assert.notEqual(
			clone.furnitureMesh.material,
			object.furnitureMesh.material,
		);
		assert.notEqual(
			clone.furnitureMesh.geometry,
			object.furnitureMesh.geometry,
		);
		valid(clone);
		valid(restored);
		object.dispose();
		clone.dispose();
		restored.dispose();
	});
}

test("bathroom filtering maps shared models to the requested categories without duplicating them", () => {
	assert.equal(filterModels("", "all", "bathroom").length, 11);
	assert.equal(
		filterModels("mirror", "accessories", "bathroom")[0].type,
		"furniture-mirror",
	);
	assert.equal(
		filterModels("mirror", "decoration", "living-room")[0].type,
		"furniture-mirror",
	);
	assert.equal(
		MODEL_LIBRARY.find((item) => item.type === "furniture-mirror").category,
		"decoration",
	);
	assert.equal(
		filterModels("corner bathtub", "bathing", "bathroom")[0].type,
		"furniture-bathtub",
	);
	assert.equal(
		filterModels("bath mat", "other", "bathroom")[0].type,
		"furniture-bath-mat",
	);
	for (const query of [
		"wall-hung toilet",
		"bidet",
		"urinal",
		"pedestal basin",
		"wall-mounted basin",
		"countertop basin",
		"double basin",
		"vanity unit",
		"freestanding bathtub",
		"shower tray",
		"walk-in shower",
		"shower enclosure",
		"medicine cabinet",
		"bathroom cabinet",
		"tall cabinet",
		"wall shelf",
		"under-sink cabinet",
		"heated towel rail",
		"toilet paper holder",
		"soap holder",
		"towel hooks",
		"laundry basket",
		"bathroom stool",
	]) {
		assert.ok(filterModels(query, "all", "bathroom").length, query);
	}
});

test("sanitary fixture presets change construction and toilet lids open", () => {
	const object = createFurnitureObject("sanitary-fixture");
	assert.equal(parts(object, "Toilet Cistern").length, 1);
	assert.equal(parts(object, "Toilet Cistern Support").length, 1);
	object.setConfiguration("lidOpen", true);
	assert.ok(Math.abs(parts(object, "Toilet Lid")[0].rotation.x) > 1);
	object.setConfiguration("style", "wall-hung-toilet");
	assert.equal(parts(object, "Fixture Pedestal").length, 0);
	assert.equal(parts(object, "Toilet Cistern").length, 0);
	assert.equal(parts(object, "Toilet Cistern Support").length, 0);
	object.setConfiguration("style", "bidet");
	assert.equal(parts(object, "Bidet Bowl").length, 1);
	assert.equal(parts(object, "Toilet Lid").length, 0);
	object.setConfiguration("style", "urinal");
	assert.equal(parts(object, "Urinal Shell").length, 1);
	object.dispose();
});

test("basin and bath bowls are hollow rather than covered by a solid top", () => {
	for (const [type, parameters, point, threshold] of [
		["washbasin", {}, [0, 2, 0.03], 0.8],
		[
			"bathtub",
			{ style: "freestanding-bathtub", tapEnabled: false },
			[0, 2, 0],
			0.4,
		],
		[
			"bathtub",
			{ style: "corner-bathtub", tapEnabled: false },
			[-0.25, 2, 0.25],
			0.4,
		],
	]) {
		const object = createFurnitureObject(type, parameters);
		object.updateMatrixWorld(true);
		const hits = new Raycaster(
			new Vector3(...point),
			new Vector3(0, -1, 0),
		).intersectObject(object, true);
		assert.ok(hits.length && hits[0].point.y < threshold, `${type}: open bowl`);
		object.dispose();
	}
	const basin = createFurnitureObject("washbasin", { style: "double-basin" });
	assert.equal(parts(basin, "Washbasin Bowl").length, 2);
	assert.equal(parts(basin, "Vanity Door").length, 4);
	basin.dispose();
});

test("shower doors slide, glass stays transparent, and tray presets omit the enclosure", () => {
	const shower = createFurnitureObject("shower", { style: "shower-enclosure" });
	const initial = parts(shower, "Shower Sliding Door")[0].position.x;
	shower.setConfiguration("doorOpen", 1);
	assert.ok(parts(shower, "Shower Sliding Door")[0].position.x < initial);
	assert.ok(parts(shower, "Shower Side Glass")[0].material.opacity < 1);
	assert.equal(parts(shower, "Shower Side Glass")[0].castShadow, false);
	shower.setConfiguration("style", "shower-tray");
	assert.equal(parts(shower, "Shower Side Glass").length, 0);
	shower.dispose();
});

test("storage opens its doors and provides a rear pipe cutout for under-sink units", () => {
	const cabinet = createFurnitureObject("bathroom-storage", {
		style: "under-sink-cabinet",
	});
	assert.equal(parts(cabinet, "Bathroom Cabinet Back").length, 0);
	assert.equal(parts(cabinet, "Sink Cutout Side").length, 2);
	cabinet.updateMatrixWorld(true);
	const hit = new Raycaster(
		new Vector3(0, 2, -0.12),
		new Vector3(0, -1, 0),
	).intersectObject(cabinet, true)[0];
	assert.ok(hit.point.y < cabinet.parameters.height - 0.05);
	const closed = parts(cabinet, "Bathroom Cabinet Door")[0].position.z;
	cabinet.setConfiguration("doorsOpen", true);
	assert.ok(parts(cabinet, "Bathroom Cabinet Door")[0].position.z > closed);
	cabinet.setConfiguration("style", "wall-shelf");
	assert.equal(parts(cabinet, "Bathroom Shelf Board").length, 2);
	cabinet.dispose();
});

test("rails, holders, baskets and stools expose functioning construction controls", () => {
	const rail = createFurnitureObject("towel-rail", {
		style: "heated-towel-rail",
		railCount: 10,
	});
	assert.equal(parts(rail, "Heated Towel Bar").length, 10);
	rail.setConfiguration("towelEnabled", false);
	assert.equal(parts(rail, "Hanging Towel").length, 0);
	const holder = createFurnitureObject("bathroom-accessory", {
		style: "towel-hooks",
		hookCount: 5,
	});
	assert.equal(parts(holder, "Towel Hook").length, 5);
	const basket = createFurnitureObject("laundry-basket");
	assert.equal(parts(basket, "Laundry").length, 3);
	basket.setConfiguration("lidEnabled", true);
	assert.equal(parts(basket, "Laundry").length, 0);
	assert.equal(parts(basket, "Laundry Basket Lid").length, 1);
	const stool = createFurnitureObject("bathroom-stool", { legCount: 3 });
	assert.equal(parts(stool, "Stool Leg").length, 3);
	for (const object of [rail, holder, basket, stool]) object.dispose();
});
