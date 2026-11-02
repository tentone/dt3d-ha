import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".garage-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "garage.mjs");
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
	item.rooms?.includes("garage"),
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
test("all 18 garage objects are searchable in five categories and existing rooms retain their collections", () => {
	assert.equal(options.length, 9);
	assert.equal(filterModels("", "all", "garage").length, 9);
	assert.deepEqual(
		MODEL_ROOMS.find((room) => room.id === "garage").categories,
		["vehicles", "storage", "work-area", "equipment", "other"],
	);
	for (const [queries, type, category] of [
		[["car"], "garage-car", "vehicles"],
		[["motorcycle", "bicycle", "scooter"], "garage-cycle", "vehicles"],
		[
			[
				"garage shelving",
				"tool cabinet",
				"wall storage rack",
				"bike rack",
				"tire rack",
			],
			"garage-storage",
			"storage",
		],
		[["workbench", "workshop table"], "garage-workbench", "work-area"],
		[["tool pegboard"], "tool-pegboard", "work-area"],
		[["EV charger"], "ev-charger", "equipment"],
		[["air compressor", "pressure washer"], "garage-equipment", "equipment"],
		[["recycling bins", "waste bins"], "garage-bins", "other"],
		[["storage boxes"], "garage-boxes", "other"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, category, "garage").some(
					(item) => item.type === `furniture-${type}`,
				),
				query,
			);
	assert.equal(
		new Set(MODEL_LIBRARY.map((item) => item.type)).size,
		MODEL_LIBRARY.length,
	);
	for (const [room, count] of [
		["living-room", 18],
		["dining-room", 8],
		["bathroom", 11],
		["kitchen", 17],
		["master-bedroom", 14],
		["childrens-bedroom", 14],
		["home-office", 14],
		["laundry-room", 8],
		["walk-in-closet", 8],
	])
		assert.equal(filterModels("", "all", room).length, count, room);
});

test("car presets resize the vehicle while steering, wheelbase, lights and roof racks affect its parts", () => {
	const car = createFurnitureObject("garage-car");
	assert.equal(car.parameters.depth, 4.4);
	assert.equal(parts(car, "Car Wheel").length, 4);
	car.setConfiguration("wheelbase", 0.72);
	car.setConfiguration("steering", 30);
	car.updateMatrixWorld(true);
	const steering = [];
	car.traverse((item) => {
		if (item.name === "Car Steering") steering.push(item);
	});
	assert.equal(steering.length, 2);
	assert.ok(
		steering.every((item) => Math.abs(item.rotation.y - Math.PI / 6) < 1e-8),
	);
	assert.ok(
		steering.every((item) => Math.abs(item.position.z - 4.4 * 0.36) < 1e-8),
	);
	car.setConfiguration("roofRack", true);
	assert.equal(parts(car, "Car Roof Rack").length, 2);
	car.setConfiguration("lightsEnabled", true);
	assert.ok(parts(car, "Car Headlight")[0].material.emissiveIntensity > 0);
	car.setConfiguration("style", "suv");
	assert.equal(car.parameters.height, 1.8);
	car.dispose();
});

test("two-wheelers rebuild recognizably different frames and configurable wheels and accessories", () => {
	const cycle = createFurnitureObject("garage-cycle");
	assert.equal(parts(cycle, "Bicycle Frame").length, 6);
	cycle.setConfiguration("spokes", 16);
	assert.equal(parts(cycle, "Cycle Wheel Spoke").length, 32);
	cycle.setConfiguration("style", "motorcycle");
	assert.equal(parts(cycle, "Bicycle Frame").length, 0);
	assert.equal(parts(cycle, "Motorcycle Fuel Tank").length, 1);
	cycle.setConfiguration("style", "scooter");
	assert.equal(parts(cycle, "Scooter Leg Shield").length, 1);
	cycle.setConfiguration("seatEnabled", false);
	cycle.setConfiguration("kickstand", false);
	assert.equal(parts(cycle, "Cycle Saddle").length, 0);
	assert.equal(parts(cycle, "Cycle Kickstand").length, 0);
	cycle.dispose();
});

test("garage storage switches between loaded shelves, extending drawers and parking or tire racks", () => {
	const rack = createFurnitureObject("garage-storage");
	assert.equal(parts(rack, "Garage Storage Shelf").length, 4);
	rack.setConfiguration("contentsEnabled", false);
	assert.equal(parts(rack, "Garage Stored Box").length, 0);
	rack.setConfiguration("style", "tool-cabinet");
	const closed = new Box3().setFromObject(rack).max.z;
	rack.setConfiguration("drawerOpen", 1);
	assert.ok(new Box3().setFromObject(rack).max.z > closed + 0.25);
	assert.equal(parts(rack, "Tool Cabinet Drawer Bottom").length, 5);
	assert.equal(parts(rack, "Tool Cabinet Caster").length, 4);
	rack.setConfiguration("casters", false);
	assert.equal(parts(rack, "Tool Cabinet Caster").length, 0);
	rack.setConfiguration("style", "wall-storage-rack");
	assert.equal(parts(rack, "Wall Rack Shelf").length, 2);
	rack.setConfiguration("style", "bike-rack");
	rack.setConfiguration("slotCount", 4);
	assert.equal(parts(rack, "Bike Rack Cradle").length, 24);
	rack.setConfiguration("style", "tire-rack");
	rack.setConfiguration("contentsEnabled", true);
	assert.equal(parts(rack, "Stored Tire").length, 6);
	rack.dispose();
});

test("workbenches expose drawers, a supported tool board and vice while workshop tables clear their top", () => {
	const bench = createFurnitureObject("garage-workbench");
	assert.equal(parts(bench, "Workbench Drawer Front").length, 3);
	assert.equal(parts(bench, "Tool Pegboard").length, 1);
	assert.equal(parts(bench, "Bench Vice Jaw").length, 2);
	bench.setConfiguration("drawerOpen", 1);
	assert.equal(parts(bench, "Workbench Drawer Bottom").length, 3);
	bench.setConfiguration("style", "workshop-table");
	assert.equal(parts(bench, "Tool Pegboard").length, 0);
	assert.equal(parts(bench, "Bench Vice Jaw").length, 0);
	assert.equal(parts(bench, "Workbench Drawer Front").length, 0);
	assert.equal(parts(bench, "Workbench Leg").length, 4);
	bench.dispose();
});

test("pegboard holes are open through the board and tool controls remove hanging equipment", () => {
	const board = createFurnitureObject("tool-pegboard", { toolCount: 0 }),
		p = board.parameters;
	board.updateMatrixWorld(true);
	const hit = (x, y) =>
		new Raycaster(new Vector3(x, y, 2), new Vector3(0, 0, -1)).intersectObjects(
			parts(board),
			false,
		);
	assert.equal(
		hit(
			-Number(p.width) / 2 + Number(p.width) / (Number(p.columns) + 1),
			Number(p.height) / (Number(p.rows) + 1),
		).length,
		0,
	);
	assert.ok(hit(0, Number(p.height) * 0.5).length);
	board.setConfiguration("toolCount", 9);
	assert.equal(parts(board, "Pegboard Hook").length, 9);
	board.dispose();
});

test("EV chargers switch mounting, docking and visual power states", () => {
	const charger = createFurnitureObject("ev-charger"),
		closed = new Box3().setFromObject(charger).max.x;
	assert.equal(parts(charger, "EV Charger Post").length, 0);
	charger.setConfiguration("mount", "pedestal");
	assert.equal(parts(charger, "EV Charger Post").length, 1);
	charger.setConfiguration("plugDocked", false);
	assert.ok(new Box3().setFromObject(charger).max.x > closed + 0.2);
	charger.setConfiguration("powered", false);
	assert.equal(
		parts(charger, "EV Charger Status")[0].material.emissive.getHex(),
		0,
	);
	charger.dispose();
});

test("compressors and washers retain wheels while hose and accessory controls remove equipment", () => {
	const equipment = createFurnitureObject("garage-equipment");
	assert.equal(parts(equipment, "Compressor Tank").length, 1);
	assert.equal(parts(equipment, "Equipment Wheel").length, 2);
	equipment.setConfiguration("style", "pressure-washer");
	assert.equal(parts(equipment, "Compressor Tank").length, 0);
	assert.equal(parts(equipment, "Pressure Washer Body").length, 1);
	equipment.setConfiguration("hoseEnabled", false);
	equipment.setConfiguration("accessoryEnabled", false);
	assert.equal(parts(equipment, "Equipment Hose").length, 0);
	assert.equal(parts(equipment, "Pressure Washer Lance").length, 0);
	equipment.dispose();
});

test("bin lids reveal hollow bodies and storage boxes stack with only the uppermost lid opening", () => {
	const bins = createFurnitureObject("garage-bins");
	assert.equal(parts(bins, "Garage Bin Floor").length, 3);
	bins.setConfiguration("lidsOpen", true);
	bins.updateMatrixWorld(true);
	const hit = new Raycaster(
		new Vector3(0, 2, 0),
		new Vector3(0, -1, 0),
	).intersectObjects(parts(bins), false)[0];
	assert.equal(hit.object.name, "Garage Bin Floor");
	assert.ok(hit.point.y < 0.2);
	bins.setConfiguration("style", "waste-bins");
	assert.equal(parts(bins, "Garage Bin Floor").length, 1);
	bins.dispose();
	const boxes = createFurnitureObject("garage-boxes", {
		stackCount: 3,
		lidOpen: true,
	});
	assert.equal(parts(boxes, "Storage Box Floor").length, 3);
	const hinges = [];
	boxes.traverse((item) => {
		if (item.name === "Storage Box Lid Hinge") hinges.push(item);
	});
	assert.equal(hinges.filter((item) => item.rotation.x !== 0).length, 1);
	assert.ok(
		new Box3().setFromObject(boxes).getSize(new Vector3()).y >
			Number(boxes.parameters.height) * 3,
	);
	boxes.setConfiguration("style", "wood-crate");
	assert.equal(parts(boxes, "Storage Crate Slat").length, 48);
	boxes.setConfiguration("lidEnabled", false);
	assert.equal(parts(boxes, "Storage Box Lid").length, 0);
	boxes.dispose();
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
