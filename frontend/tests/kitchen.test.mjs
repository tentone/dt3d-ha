import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".kitchen-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "kitchen.mjs");
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
	item.rooms?.includes("kitchen"),
);
function parts(object, name) {
	const result = [];
	object.traverse((child) => {
		if (child.isMesh && (!name || child.name === name)) result.push(child);
	});
	return result;
}

test("all 41 requested kitchen objects are searchable across the eight categories", () => {
	assert.equal(options.length, 17);
	assert.equal(filterModels("", "all", "kitchen").length, 17);
	const room = MODEL_ROOMS.find((item) => item.id === "kitchen");
	assert.deepEqual(room.categories, [
		"base-cabinets",
		"wall-cabinets",
		"tall-cabinets",
		"countertops",
		"appliances",
		"fixtures",
		"kitchen-furniture",
		"accessories",
	]);
	for (const [queries, type] of [
		[
			[
				"single base cabinet",
				"double base cabinet",
				"drawer cabinet",
				"corner cabinet",
				"sink cabinet",
			],
			"kitchen-cabinet-bottom",
		],
		[
			[
				"single wall cabinet",
				"double wall cabinet",
				"corner wall cabinet",
				"open shelving",
			],
			"kitchen-cabinet-top",
		],
		[
			["pantry cabinet", "oven tower", "fridge housing", "broom cabinet"],
			"kitchen-tall-cabinet",
		],
		[
			[
				"straight countertop",
				"L-shaped countertop",
				"U-shaped countertop",
				"kitchen island",
				"peninsula",
				"breakfast bar",
			],
			"kitchen-countertop",
		],
		[
			["refrigerator", "American-style refrigerator", "freezer"],
			"kitchen-refrigerator",
		],
		[["oven", "microwave"], "kitchen-oven"],
		[["induction hob", "gas hob"], "kitchen-hob"],
		[["extractor hood"], "kitchen-hood"],
		[["dishwasher", "washing machine"], "kitchen-cleaning-appliance"],
		[["coffee machine"], "kitchen-coffee-machine"],
		[["single sink", "double sink"], "kitchen-sink"],
		[["kitchen faucet"], "kitchen-faucet"],
		[["waste bin"], "kitchen-bin"],
		[["bar stool", "kitchen chair"], "dining-seating"],
		[["kitchen table"], "dining-table"],
		[["kitchen trolley"], "kitchen-trolley"],
		[["dish rack", "spice rack", "kitchen shelves"], "kitchen-accessories"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, "all", "kitchen").some(
					(item) => item.type === `furniture-${type}`,
				),
				query,
			);
	assert.equal(
		filterModels("kitchen table", "kitchen-furniture", "kitchen")[0].type,
		"furniture-dining-table",
	);
	assert.equal(
		MODEL_LIBRARY.filter((item) => item.type === "furniture-dining-table")
			.length,
		1,
	);
	assert.equal(filterModels("", "all", "living-room").length, 18);
	assert.equal(filterModels("", "all", "bathroom").length, 11);
	assert.equal(filterModels("", "all", "dining-room").length, 8);
});

test("original cabinet identifiers and every saved numeric setting are preserved", () => {
	for (const type of ["kitchen-cabinet-top", "kitchen-cabinet-bottom"]) {
		const saved = {
			width: 0.8,
			depth: 0.45,
			height: 0.8,
			thickness: 0.025,
			doorCount: 3,
			shelfCount: 2,
			handleSize: 0.1,
			...(type.endsWith("bottom")
				? { plinthHeight: 0.12, countertopThickness: 0.05 }
				: {}),
		};
		const cabinet = createFurnitureObject(type, saved);
		for (const [key, value] of Object.entries(saved))
			assert.equal(cabinet.parameters[key], value, key);
		assert.equal(cabinet.userData.meshType, `furniture-${type}`);
		assert.equal(parts(cabinet, "Storage Door").length, 3);
		assert.equal(parts(cabinet, "Storage Shelf").length, 2);
		cabinet.dispose();
	}
});

test("cabinet drawer fronts extend, open wall shelving omits doors, and corners have a clipped footprint", () => {
	const cabinet = createFurnitureObject("kitchen-cabinet-bottom", {
		style: "drawer-cabinet",
	});
	assert.equal(parts(cabinet, "Kitchen Drawer Front").length, 3);
	const initial = new Box3().setFromObject(cabinet).max.z;
	cabinet.setConfiguration("doorsOpen", true);
	assert.ok(new Box3().setFromObject(cabinet).max.z > initial + 0.3);
	assert.equal(parts(cabinet, "Drawer Bottom").length, 3);
	cabinet.setConfiguration("style", "corner-cabinet");
	const top = cabinet.getObjectByName("Kitchen Countertop");
	cabinet.updateMatrixWorld(true);
	const ray = new Raycaster(
		new Vector3(
			Number(cabinet.parameters.width) * 0.45,
			2,
			Number(cabinet.parameters.depth) * 0.45,
		),
		new Vector3(0, -1, 0),
	);
	assert.equal(ray.intersectObject(top).length, 0);
	cabinet.setConfiguration("style", "sink-cabinet");
	assert.equal(parts(cabinet, "Storage Back").length, 0);
	const wall = createFurnitureObject("kitchen-cabinet-top", {
		style: "open-shelving",
		shelfCount: 3,
	});
	assert.equal(parts(wall, "Storage Door").length, 0);
	assert.equal(parts(wall, "Storage Shelf").length, 3);
	cabinet.dispose();
	wall.dispose();
});

test("L and U worktops keep a clear center and sink/hob cutouts are true openings", () => {
	const countertop = createFurnitureObject("kitchen-countertop", {
		style: "l-shaped-countertop",
	});
	const hit = (x, z) => {
		countertop.updateMatrixWorld(true);
		return new Raycaster(
			new Vector3(x, 3, z),
			new Vector3(0, -1, 0),
		).intersectObject(countertop.getObjectByName("Kitchen Worktop")).length;
	};
	assert.equal(hit(0.2, 0.2), 0);
	assert.ok(hit(0, -0.8));
	countertop.setConfiguration("style", "u-shaped-countertop");
	assert.equal(hit(0, 0.3), 0);
	assert.ok(hit(-1.2, 0.3));
	assert.ok(hit(1.2, 0.3));
	countertop.setConfiguration("style", "straight-countertop");
	assert.ok(hit(0, 0));
	for (const cutout of ["single-sink-cutout", "hob-cutout"]) {
		countertop.setConfiguration("cutout", cutout);
		assert.equal(hit(0, 0), 0);
		assert.ok(hit(0.8, 0));
	}
	countertop.setConfiguration("style", "kitchen-island");
	assert.equal(parts(countertop, "Island Cabinet Body").length, 1);
	countertop.setConfiguration("supportsEnabled", false);
	assert.equal(parts(countertop, "Island Cabinet Body").length, 0);
	countertop.dispose();
});

test("single and double kitchen sink bowls are hollow beneath a matching rim cutout", () => {
	const sink = createFurnitureObject("kitchen-sink", {
		style: "double-sink",
		faucetEnabled: false,
	});
	sink.updateMatrixWorld(true);
	const bowls = parts(sink, "Kitchen Sink Bowl");
	assert.equal(bowls.length, 2);
	for (const bowl of bowls) {
		const ray = new Raycaster(
			new Vector3(bowl.position.x, 2, bowl.position.z),
			new Vector3(0, -1, 0),
		);
		const hits = ray.intersectObject(sink, true);
		assert.ok(
			hits.length && hits[0].point.y < Number(sink.parameters.height) * 0.2,
		);
	}
	sink.setConfiguration("bowlCount", 1);
	assert.equal(parts(sink, "Kitchen Sink Bowl").length, 1);
	sink.setConfiguration("faucetEnabled", true);
	assert.ok(sink.getObjectByName("Kitchen Faucet Spout"));
	sink.dispose();
});

test("refrigerator, oven, microwave and dishwasher doors open forwards into the room", () => {
	for (const [type, parameters, key] of [
		["kitchen-refrigerator", {}, "doorsOpen"],
		["kitchen-oven", {}, "doorOpen"],
		["kitchen-oven", { style: "microwave" }, "doorOpen"],
		["kitchen-cleaning-appliance", {}, "doorOpen"],
	]) {
		const object = createFurnitureObject(type, parameters),
			closed = new Box3().setFromObject(object).max.z;
		object.setConfiguration(key, true);
		assert.ok(new Box3().setFromObject(object).max.z > closed + 0.1, type);
		object.dispose();
	}
	const fridge = createFurnitureObject("kitchen-refrigerator", {
		style: "american-style-refrigerator",
	});
	assert.equal(parts(fridge, "Refrigerator Door").length, 2);
	assert.ok(fridge.getObjectByName("Ice Dispenser"));
	fridge.setConfiguration("dispenserEnabled", false);
	assert.equal(parts(fridge, "Ice Dispenser").length, 0);
	fridge.dispose();
});

test("tall cabinet presets rebuild their ovens, refrigerator housing and broom compartment", () => {
	const tower = createFurnitureObject("kitchen-tall-cabinet", {
		style: "oven-tower",
	});
	assert.ok(tower.getObjectByName("Tower Oven Body"));
	tower.setConfiguration("style", "fridge-housing");
	assert.ok(tower.getObjectByName("Housed Refrigerator"));
	assert.equal(parts(tower, "Tower Oven Body").length, 0);
	tower.setConfiguration("style", "broom-cabinet");
	assert.ok(tower.getObjectByName("Broom Head"));
	tower.setConfiguration("contentsEnabled", false);
	assert.equal(parts(tower, "Broom Head").length, 0);
	tower.dispose();
});

test("hob zones, trolley wheels and rack contents rebuild from their controls", () => {
	const hob = createFurnitureObject("kitchen-hob", {
		style: "gas-hob",
		burnerCount: 5,
	});
	assert.equal(parts(hob, "Gas Burner").length, 5);
	hob.setConfiguration("style", "induction-hob");
	assert.equal(parts(hob, "Gas Burner").length, 0);
	assert.equal(parts(hob, "Induction Ring").length, 5);
	const trolley = createFurnitureObject("kitchen-trolley", { shelfCount: 3 });
	assert.equal(parts(trolley, "Trolley Wheel").length, 4);
	assert.equal(parts(trolley, "Trolley Shelf").length, 3);
	trolley.setConfiguration("wheelsEnabled", false);
	assert.equal(parts(trolley, "Trolley Wheel").length, 0);
	const rack = createFurnitureObject("kitchen-accessories", {
		style: "spice-rack",
		shelfCount: 3,
		itemCount: 5,
	});
	assert.equal(parts(rack, "Spice Jar").length, 15);
	rack.setConfiguration("contentsEnabled", false);
	assert.equal(parts(rack, "Spice Jar").length, 0);
	for (const object of [hob, trolley, rack]) object.dispose();
});

test("bin lids lift and separate faucets extend without altering saved body dimensions", () => {
	const bin = createFurnitureObject("kitchen-bin"),
		closed = new Box3().setFromObject(bin).max.y;
	bin.setConfiguration("lidOpen", true);
	assert.ok(new Box3().setFromObject(bin).max.y > closed + 0.1);
	const faucet = createFurnitureObject("kitchen-faucet"),
		original = faucet.parameters.depth,
		z = new Box3().setFromObject(faucet).max.z;
	faucet.setConfiguration("pullOut", 0.2);
	assert.ok(new Box3().setFromObject(faucet).max.z > z + 0.15);
	assert.equal(faucet.parameters.depth, original);
	bin.dispose();
	faucet.dispose();
});
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
