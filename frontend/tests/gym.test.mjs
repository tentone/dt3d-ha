import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".gym-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "gym.mjs");
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
	item.rooms?.includes("home-gym"),
);
function parts(object, name) {
	const result = [];
	object.traverse((child) => {
		if (child.isMesh && (!name || child.name === name)) result.push(child);
	});
	return result;
}
function bounds(object) {
	object.updateWorldMatrix(true, true);
	return new Box3().setFromObject(object);
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
	const box = bounds(object);
	assert.ok(
		!box.isEmpty() &&
			[...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite),
	);
}

test("all 16 gym objects are searchable in their four categories without duplicating shared models", () => {
	assert.equal(options.length, 14);
	assert.deepEqual(
		MODEL_ROOMS.find((room) => room.id === "home-gym").categories,
		["cardio", "strength", "accessories", "other"],
	);
	assert.equal(filterModels("", "all", "home-gym").length, 14);
	for (const [queries, type, category] of [
		[["treadmill"], "treadmill", "cardio"],
		[["exercise bike"], "exercise-bike", "cardio"],
		[["rowing machine"], "rowing-machine", "cardio"],
		[["elliptical trainer"], "elliptical-trainer", "cardio"],
		[["weight bench"], "weight-bench", "strength"],
		[["dumbbell rack"], "dumbbell-rack", "strength"],
		[["squat rack"], "squat-rack", "strength"],
		[["cable machine", "multi-gym"], "cable-machine", "strength"],
		[["yoga mat", "exercise mat"], "exercise-mat", "accessories"],
		[["medicine ball"], "medicine-ball", "accessories"],
		[["kettlebell rack"], "kettlebell-rack", "accessories"],
		[["wall mirror"], "mirror", "other"],
		[["storage shelving"], "shelf", "other"],
		[["exercise equipment rack"], "exercise-equipment-rack", "other"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, category, "home-gym").some(
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
		["garage", 9],
		["patio", 15],
		["garden", 15],
		["game-room", 14],
	])
		assert.equal(filterModels("", "all", room).length, count, room);
});

test("treadmill incline raises its belt, folding narrows its footprint, and the console and rails switch independently", () => {
	const item = createFurnitureObject("treadmill"),
		original = bounds(item),
		belt = parts(item, "Treadmill Belt")[0];
	const flatY = bounds(belt).max.y;
	item.setConfiguration("incline", 15);
	assert.ok(bounds(parts(item, "Treadmill Belt")[0]).max.y > flatY + 0.2);
	item.setConfiguration("folded", true);
	const folded = bounds(item);
	assert.ok(
		folded.max.z - folded.min.z < (original.max.z - original.min.z) * 0.8,
	);
	assert.ok(folded.min.y >= -0.001);
	item.setConfiguration("handrails", false);
	assert.equal(parts(item, "Treadmill Handrail").length, 0);
	item.setConfiguration("screenOn", false);
	assert.equal(parts(item, "Fitness Display")[0].material.emissive.getHex(), 0);
	item.dispose();
});

test("bike presets resize and add recumbent seating while cranks oppose and pedals stay level", () => {
	const item = createFurnitureObject("exercise-bike");
	item.setConfiguration("pedalAngle", 90);
	const pedals = parts(item, "Bike Pedal");
	assert.ok(pedals[0].position.z > pedals[1].position.z);
	assert.ok(
		pedals.every((pedal) => pedal.rotation.x === 0 && bounds(pedal).min.y > 0),
	);
	item.setConfiguration("style", "recumbent-bike");
	assert.equal(item.parameters.depth, 1.65);
	assert.equal(item.parameters.seatHeight, 0.48);
	assert.equal(parts(item, "Bike Seat Back").length, 1);
	item.setConfiguration("seatHeight", 0.6);
	assert.ok(parts(item, "Bike Saddle")[0].position.y > 0.5);
	item.setConfiguration("displayEnabled", false);
	assert.equal(parts(item, "Fitness Display").length, 0);
	item.dispose();
});

test("rowing seats slide along their rail and handles extend with a continuous cable", () => {
	const item = createFurnitureObject("rowing-machine"),
		rear = parts(item, "Rower Seat")[0].position.z;
	item.setConfiguration("seatPosition", 0);
	assert.ok(parts(item, "Rower Seat")[0].position.z < rear - 0.3);
	const start = parts(item, "Rower Handle")[0].position.z;
	item.setConfiguration("handlePull", 1);
	assert.ok(parts(item, "Rower Handle")[0].position.z > start + 0.3);
	assert.equal(parts(item, "Rower Pull Cable").length, 1);
	item.dispose();
});

test("elliptical stride poses opposed level pedals and the moving handles together", () => {
	const item = createFurnitureObject("elliptical-trainer"),
		start = parts(item, "Elliptical Pedal")[0].position.z;
	item.setConfiguration("stridePosition", 270);
	assert.notEqual(parts(item, "Elliptical Pedal")[0].position.z, start);
	const handles = [];
	item.traverse((part) => {
		if (part.name === "Elliptical Handle Pivot") handles.push(part.rotation.x);
	});
	assert.ok(handles[0] * handles[1] < 0);
	assert.ok(
		parts(item, "Elliptical Pedal").every(
			(pedal) => pedal.rotation.x === 0 && bounds(pedal).min.y > 0,
		),
	);
	item.setConfiguration("movingHandles", false);
	assert.equal(item.getObjectByName("Elliptical Handle Pivot").rotation.x, 0);
	item.dispose();
});

test("bench pads hinge at their bases with optional front leg rollers", () => {
	const item = createFurnitureObject("weight-bench"),
		flat = bounds(item).max.y;
	item.setConfiguration("backAngle", 75);
	assert.ok(bounds(item).max.y > flat + 0.6);
	assert.ok(item.getObjectByName("Bench Back Pivot").rotation.x > 1);
	item.setConfiguration("seatAngle", 20);
	assert.ok(item.getObjectByName("Bench Seat Pivot").rotation.x < 0);
	item.setConfiguration("legRollers", true);
	assert.equal(parts(item, "Bench Leg Roller").length, 2);
	item.dispose();
});

test("squat rack presets retain paired supports, loaded bar height and safety rails below the bar", () => {
	const item = createFurnitureObject("squat-rack");
	assert.equal(parts(item, "Squat Rack Upright").length, 4);
	item.setConfiguration("style", "half-rack");
	assert.equal(parts(item, "Squat Rack Upright").length, 2);
	assert.equal(parts(item, "Half Rack Pullup Support").length, 2);
	const pullup = bounds(parts(item, "Squat Rack Pullup Bar")[0]);
	assert.ok(
		parts(item, "Half Rack Pullup Support").every((support) =>
			bounds(support).intersectsBox(pullup),
		),
	);
	item.setConfiguration("barHeight", 1.1);
	item.setConfiguration("safetyHeight", 1.8);
	assert.equal(parts(item, "Rack Barbell")[0].position.y, 1.1);
	assert.ok(
		parts(item, "Squat Rack Safety").every((rail) => bounds(rail).max.y < 1.1),
	);
	item.setConfiguration("platePairs", 4);
	assert.equal(parts(item, "Rack Weight Plate").length, 8);
	item.setConfiguration("barbellEnabled", false);
	assert.equal(parts(item, "Rack Barbell").length, 0);
	assert.equal(parts(item, "Rack Weight Plate").length, 0);
	item.dispose();
});

test("cable trainer stacks and pulleys adjust, and multi-gym presets add posed press arms and a seat", () => {
	const item = createFurnitureObject("cable-machine");
	item.setConfiguration("stackPlates", 16);
	assert.equal(parts(item, "Cable Stack Plate").length, 32);
	const start = parts(item, "Cable Handle Grip")[0].position.y;
	item.setConfiguration("pulleyHeight", 0.6);
	assert.ok(parts(item, "Cable Handle Grip")[0].position.y < start);
	item.setConfiguration("style", "multi-gym");
	assert.equal(item.parameters.depth, 1.5);
	assert.equal(item.parameters.seatEnabled, true);
	assert.equal(parts(item, "Gym Seat Pad").length, 1);
	assert.equal(parts(item, "Multi Gym Leg Roller").length, 2);
	item.setConfiguration("pressAngle", 40);
	assert.ok(item.getObjectByName("Multi Gym Press Pivot").rotation.x < -0.6);
	assert.equal(
		parts(item, "Multi Gym Press Grip")[0].parent.name,
		"Multi Gym Press Pivot",
	);
	item.setConfiguration("guardsEnabled", false);
	assert.equal(parts(item, "Cable Stack Guard").length, 0);
	item.dispose();
});

test("racks fill each tray with their own equipment and clear every accessory when contents are hidden", () => {
	for (const [type, name, multiplier] of [
		["dumbbell-rack", "Dumbbell Weight", 2],
		["kettlebell-rack", "Kettlebell Body", 1],
		["exercise-equipment-rack", "Stored Exercise Ball", 1],
	]) {
		const item = createFurnitureObject(type, { levels: 3, itemsPerLevel: 5 });
		assert.equal(parts(item, "Gym Rack Tray").length, 3);
		assert.equal(parts(item, name).length, 15 * multiplier);
		if (type === "exercise-equipment-rack") {
			assert.equal(parts(item, "Stored Rolled Mat").length, 2);
			assert.equal(parts(item, "Stored Resistance Band").length, 3);
			const matBounds = bounds(parts(item, "Stored Rolled Mat")[0]);
			for (const tray of parts(item, "Gym Rack Tray").slice(1))
				assert.equal(bounds(tray).intersectsBox(matBounds), false);
		}
		item.setConfiguration("contentsEnabled", false);
		assert.equal(parts(item, name).length, 0);
		assert.equal(parts(item, "Stored Rolled Mat").length, 0);
		assert.equal(parts(item, "Stored Resistance Band").length, 0);
		item.dispose();
	}
});

test("yoga and exercise mat presets roll into a hollow cylinder and restore their original flat surface", () => {
	const item = createFurnitureObject("exercise-mat");
	item.setConfiguration("style", "exercise-mat");
	assert.equal(item.parameters.height, 0.03);
	const flat = bounds(item).getSize(new Vector3());
	item.setConfiguration("rolled", true);
	const rolled = bounds(item).getSize(new Vector3()),
		mesh = parts(item, "Rolled Exercise Mat")[0];
	assert.ok(rolled.z < flat.z / 3);
	item.updateMatrixWorld(true);
	const radius = mesh.position.y;
	assert.equal(
		new Raycaster(
			new Vector3(-2, radius, 0),
			new Vector3(1, 0, 0),
		).intersectObject(mesh, false).length,
		0,
	);
	assert.ok(
		new Raycaster(
			new Vector3(-2, radius * 1.8, 0),
			new Vector3(1, 0, 0),
		).intersectObject(mesh, false).length,
	);
	item.setConfiguration("rolled", false);
	assert.equal(parts(item, "Exercise Mat").length, 1);
	assert.equal(parts(item, "Rolled Exercise Mat").length, 0);
	item.setConfiguration("alignmentLines", false);
	assert.equal(parts(item, "Mat Alignment Line").length, 0);
	item.dispose();
});

test("medicine balls resize on the floor and can omit panel seams", () => {
	const item = createFurnitureObject("medicine-ball", { diameter: 0.5 });
	assert.equal(parts(item, "Medicine Ball Seam").length, 3);
	assert.ok(Math.abs(bounds(parts(item, "Medicine Ball")[0]).min.y) < 1e-6);
	assert.ok(
		Math.abs(bounds(parts(item, "Medicine Ball")[0]).max.y - 0.5) < 1e-6,
	);
	item.setConfiguration("panelLines", false);
	assert.equal(parts(item, "Medicine Ball Seam").length, 0);
	item.dispose();
});

for (const option of options) {
	test(`${option.type}: geometry, labels, variant limits, independent clones and saved configurations`, () => {
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
		for (const range of limits) {
			const extreme = createFurnitureObject(option.type, range);
			valid(extreme);
			extreme.dispose();
		}
		object.position.set(2, 3, 4);
		object.rotation.y = 0.6;
		const previous = parts(object).map((mesh) => mesh.geometry);
		let disposed = 0;
		previous.forEach((geometry) =>
			geometry.addEventListener("dispose", () => disposed++),
		);
		object.setParameters(object.getParameters());
		assert.equal(disposed, previous.length);
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
