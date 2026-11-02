import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".game-room-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "game-room.mjs");
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
	item.rooms?.includes("game-room"),
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
test("all 18 game room objects are searchable in five categories and shared models remain unique", () => {
	assert.equal(options.length, 14);
	assert.equal(filterModels("", "all", "game-room").length, 14);
	assert.deepEqual(
		MODEL_ROOMS.find((room) => room.id === "game-room").categories,
		["seating", "gaming", "tables-desks", "entertainment", "storage"],
	);
	for (const [queries, type, category] of [
		[["gaming chair"], "gaming-chair", "seating"],
		[["sofa"], "couch", "seating"],
		[["recliner"], "accent-chair", "seating"],
		[["bean bag"], "ottoman", "seating"],
		[["gaming desk"], "gaming-desk", "gaming"],
		[["arcade machine"], "arcade-machine", "gaming"],
		[["gaming console"], "gaming-console", "gaming"],
		[["racing simulator"], "racing-simulator", "gaming"],
		[
			["pool table", "foosball table", "ping-pong table", "poker table"],
			"game-table",
			"tables-desks",
		],
		[["TV"], "television", "entertainment"],
		[["projector"], "projector", "entertainment"],
		[["projection screen"], "projection-screen", "entertainment"],
		[["speaker system"], "speaker-system", "entertainment"],
		[["media shelving", "game storage cabinet"], "game-storage", "storage"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, category, "game-room").some(
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
	])
		assert.equal(filterModels("", "all", room).length, count, room);
});

test("gaming chair backs recline together and footrests, arms and trim follow their controls", () => {
	const chair = createFurnitureObject("gaming-chair"),
		height = new Box3().setFromObject(chair).max.y;
	assert.equal(parts(chair, "Gaming Chair Caster").length, 5);
	chair.setConfiguration("recline", 45);
	assert.ok(new Box3().setFromObject(chair).max.y < height);
	chair.setConfiguration("footrest", true);
	assert.equal(parts(chair, "Gaming Chair Footrest").length, 1);
	assert.ok(
		new Box3().setFromObject(chair).max.z >
			Number(chair.parameters.depth) * 0.6,
	);
	chair.setConfiguration("armsEnabled", false);
	assert.equal(parts(chair, "Gaming Chair Armrest").length, 0);
	chair.setConfiguration("accent", "red");
	assert.equal(
		parts(chair, "Gaming Seat Bolster")[0].material.color.getHex(),
		0xb97871,
	);
	chair.dispose();
});

test("gaming desks retain open mirrored L footprints, a through cable hole and optional setup equipment", () => {
	for (const side of ["left-return", "right-return"]) {
		const desk = createFurnitureObject("gaming-desk", {
				layout: "l-shaped",
				returnSide: side,
				monitorCount: 0,
				peripherals: false,
				towerEnabled: false,
			}),
			p = desk.parameters,
			top = parts(desk, "Gaming Desktop"),
			r = Math.min(
				Number(p.returnDepth),
				Number(p.width) * 0.42,
				Number(p.depth) * 0.42,
			);
		desk.updateMatrixWorld(true);
		const ray = (x, z) =>
			new Raycaster(
				new Vector3(x, 2, z),
				new Vector3(0, -1, 0),
			).intersectObjects(top, false);
		assert.equal(ray(side === "left-return" ? 0.4 : -0.4, 0.4).length, 0);
		assert.ok(ray(side === "left-return" ? -0.8 : 0.8, 0.4).length);
		const cx = Number(p.width) * 0.28 * (side === "right-return" ? -1 : 1),
			cz = -Number(p.depth) / 2 + r * 0.25;
		assert.equal(ray(cx, cz).length, 0);
		desk.setConfiguration("cablePort", false);
		desk.updateMatrixWorld(true);
		assert.ok(
			new Raycaster(
				new Vector3(cx, 2, cz),
				new Vector3(0, -1, 0),
			).intersectObjects(parts(desk, "Gaming Desktop"), false).length,
		);
		desk.setConfiguration("monitorCount", 3);
		assert.equal(parts(desk, "Gaming Monitor Frame").length, 3);
		assert.equal(parts(desk, "Gaming Keyboard Key").length, 0);
		desk.dispose();
	}
});

test("arcade presets rebuild control stations, screen power and compact cabinet dimensions", () => {
	const item = createFurnitureObject("arcade-machine");
	item.setConfiguration("players", 2);
	item.setConfiguration("buttons", 8);
	assert.equal(parts(item, "Arcade Button").length, 16);
	assert.equal(parts(item, "Arcade Joystick Ball").length, 2);
	item.setConfiguration("powered", false);
	assert.equal(
		parts(item, "Arcade Display Screen")[0].material.emissive.getHex(),
		0,
	);
	item.setConfiguration("marquee", false);
	assert.equal(parts(item, "Arcade Marquee Mark").length, 0);
	item.setConfiguration("style", "bartop");
	assert.equal(item.parameters.height, 0.75);
	assert.ok(new Box3().setFromObject(item).getSize(new Vector3()).y < 0.8);
	item.dispose();
});

test("console presets include standalone handheld controls and configurable separate gamepads", () => {
	const item = createFurnitureObject("gaming-console");
	assert.equal(parts(item, "Gamepad Body").length, 2);
	item.setConfiguration("controllers", 4);
	assert.equal(parts(item, "Gamepad Body").length, 4);
	item.setConfiguration("style", "tower-console");
	assert.equal(item.parameters.height, 0.32);
	item.setConfiguration("style", "handheld");
	assert.equal(parts(item, "Gamepad Body").length, 0);
	assert.equal(parts(item, "Handheld Button").length, 8);
	item.setConfiguration("powered", false);
	assert.equal(parts(item, "Handheld Screen")[0].material.emissive.getHex(), 0);
	item.dispose();
});

test("racing rigs slide seats, turn wheel assemblies and keep tilted pedals above the floor", () => {
	const item = createFurnitureObject("racing-simulator"),
		rear = item.getObjectByName("Racing Seat Slider").position.z;
	item.setConfiguration("seatSlide", 1);
	assert.ok(item.getObjectByName("Racing Seat Slider").position.z > rear + 0.1);
	item.setConfiguration("wheelAngle", 35);
	assert.ok(item.getObjectByName("Racing Wheel Turn").rotation.z > 0.6);
	item.setConfiguration("pedalAngle", 45);
	item.updateMatrixWorld(true);
	assert.ok(
		new Box3().setFromObject(parts(item, "Racing Pedal Board")[0]).min.y >= 0,
	);
	item.setConfiguration("monitorCount", 3);
	assert.equal(parts(item, "Racing Monitor Frame").length, 3);
	item.setConfiguration("shifter", false);
	assert.equal(parts(item, "Racing Shifter Knob").length, 0);
	item.dispose();
});

test("pool pockets pass through the felt into open cups and accessories can be removed", () => {
	const table = createFurnitureObject("game-table"),
		p = table.parameters,
		iw = Number(p.width) * 0.88,
		id = Number(p.depth) * 0.82,
		pr = Math.min(Number(p.pocketSize), iw * 0.08, id * 0.12),
		x = iw / 2 - pr * 1.1,
		z = id / 2 - pr * 1.1;
	table.updateMatrixWorld(true);
	const ray = new Raycaster(new Vector3(x, 2, z), new Vector3(0, -1, 0));
	assert.equal(
		ray.intersectObjects(parts(table, "Pool Table Felt"), false).length,
		0,
	);
	const cup = ray.intersectObjects(parts(table, "Pool Pocket"), false)[0];
	assert.ok(cup && cup.point.y < Number(p.height) * 0.9);
	assert.equal(parts(table, "Pool Pocket").length, 6);
	assert.equal(parts(table, "Pool Cue").length, 2);
	table.setConfiguration("accessories", false);
	assert.equal(parts(table, "Pool Ball").length, 0);
	assert.equal(parts(table, "Pool Cue").length, 0);
	table.dispose();
});

test("foosball rods carry all figures and handles through their pose changes", () => {
	const table = createFurnitureObject("game-table", {
		style: "foosball-table",
	});
	assert.equal(parts(table, "Foosball Rod").length, 8);
	assert.equal(parts(table, "Foosball Player Head").length, 22);
	table.setConfiguration("rodAngle", 50);
	const pivots = [];
	table.traverse((item) => {
		if (item.name === "Foosball Rod Pivot") pivots.push(item.rotation.z);
	});
	assert.ok(pivots.every((angle) => angle > 0.8));
	assert.equal(
		parts(table, "Foosball Player Head")[0].parent.name,
		"Foosball Rod Pivot",
	);
	table.setConfiguration("accessories", false);
	assert.equal(parts(table, "Foosball Player Head").length, 0);
	assert.equal(parts(table, "Foosball Rod").length, 8);
	table.dispose();
});

test("ping-pong tables fold both halves upright into a narrower supported footprint", () => {
	const table = createFurnitureObject("game-table", {
			style: "ping-pong-table",
		}),
		open = new Box3().setFromObject(table).getSize(new Vector3());
	assert.equal(parts(table, "Ping Pong Net").length, 1);
	table.setConfiguration("folded", true);
	const folded = new Box3().setFromObject(table).getSize(new Vector3());
	assert.ok(folded.x < open.x * 0.5);
	assert.ok(folded.y > open.y + 0.7);
	assert.equal(parts(table, "Ping Pong Net").length, 0);
	assert.equal(parts(table, "Ping Pong Paddle").length, 0);
	table.setConfiguration("folded", false);
	assert.equal(parts(table, "Ping Pong Paddle").length, 2);
	table.dispose();
});

test("poker tables arrange cards and chip stacks by place count and update surface colors", () => {
	const table = createFurnitureObject("game-table", {
		style: "poker-table",
		playerCount: 8,
	});
	assert.equal(parts(table, "Poker Card").length, 16);
	assert.equal(parts(table, "Poker Chip").length, 72);
	table.setConfiguration("surfaceColor", "blue");
	assert.equal(parts(table, "Poker Felt")[0].material.color.getHex(), 0x597d9c);
	table.setConfiguration("accessories", false);
	assert.equal(parts(table, "Poker Chip").length, 0);
	table.dispose();
});

test("game cabinets open their doors, switch to glass and expose optional stored games", () => {
	const storage = createFurnitureObject("game-storage");
	assert.equal(parts(storage, "Stored Game Box").length, 24);
	storage.setConfiguration("style", "game-storage-cabinet");
	assert.equal(parts(storage, "Game Cabinet Door").length, 2);
	storage.setConfiguration("doorsOpen", true);
	assert.ok(storage.getObjectByName("Game Cabinet Hinge").rotation.y < -1);
	storage.setConfiguration("glassDoors", true);
	assert.equal(parts(storage, "Game Cabinet Door").length, 0);
	assert.ok(
		parts(storage, "Game Cabinet Glass").every(
			(mesh) => mesh.material.transparent && mesh.castShadow === false,
		),
	);
	storage.setConfiguration("contentsEnabled", false);
	assert.equal(parts(storage, "Stored Game Box").length, 0);
	storage.dispose();
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
