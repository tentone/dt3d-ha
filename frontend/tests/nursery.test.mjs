import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".nursery-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "nursery.mjs");
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
	item.rooms?.includes("childrens-bedroom"),
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
test("all 27 requested children's room objects are searchable across five categories", () => {
	assert.equal(options.length, 14);
	assert.equal(filterModels("", "all", "childrens-bedroom").length, 14);
	assert.deepEqual(
		MODEL_ROOMS.find((item) => item.id === "childrens-bedroom").categories,
		["beds", "storage", "nursery-furniture", "play", "decoration"],
	);
	for (const [queries, type] of [
		[
			[
				"crib",
				"cot",
				"toddler bed",
				"single bed",
				"bunk bed",
				"loft bed",
				"trundle bed",
				"cabin bed",
			],
			"nursery-bed",
		],
		[
			[
				"children's wardrobe",
				"toy chest",
				"toy storage unit",
				"bookshelf",
				"chest of drawers",
			],
			"nursery-storage",
		],
		[["changing table"], "changing-table"],
		[["nursing chair", "rocking chair"], "nursery-chair"],
		[["kids' desk", "play table"], "kids-table"],
		[["kids' chair"], "kids-chair"],
		[["play mat"], "play-mat"],
		[["playpen"], "playpen"],
		[["indoor tent"], "indoor-tent"],
		[["toy kitchen"], "toy-kitchen"],
		[["climbing structure"], "climbing-frame"],
		[["rug"], "rug"],
		[["night light"], "night-light"],
		[["wall shelves"], "nursery-wall-shelves"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, "all", "childrens-bedroom").some(
					(item) => item.type === `furniture-${type}`,
				),
				query,
			);
	assert.equal(
		MODEL_LIBRARY.filter((item) => item.type === "furniture-rug").length,
		1,
	);
	for (const [room, count] of [
		["living-room", 18],
		["dining-room", 8],
		["bathroom", 11],
		["kitchen", 17],
		["master-bedroom", 14],
	])
		assert.equal(filterModels("", "all", room).length, count);
});

test("crib and cot geometry uses open slats and omits pillows and bed covers", () => {
	const crib = createFurnitureObject("nursery-bed", { slatCount: 14 });
	assert.equal(parts(crib, "Crib Slat").length, 28);
	assert.equal(parts(crib, "Child Bed Pillow").length, 0);
	assert.equal(parts(crib, "Child Bed Cover").length, 0);
	crib.setConfiguration("guardRails", false);
	assert.equal(parts(crib, "Crib Slat").length, 0);
	crib.setConfiguration("style", "cot");
	assert.equal(crib.parameters.depth, 1.4);
	crib.setConfiguration("style", "single-bed");
	assert.equal(parts(crib, "Child Bed Pillow").length, 1);
	crib.dispose();
});

test("bunk, loft, trundle and cabin variants change their occupied space and under-bed construction", () => {
	const bed = createFurnitureObject("nursery-bed", { style: "bunk-bed" });
	assert.equal(parts(bed, "Child Mattress").length, 2);
	const upper = Math.max(
		...parts(bed, "Child Mattress").map((mesh) => mesh.position.y),
	);
	assert.ok(
		parts(bed, "Child Guard Top Rail").every((mesh) => mesh.position.y > upper),
	);
	const right = parts(bed, "Bed Ladder Upright")[0].position.x;
	bed.setConfiguration("ladderSide", "left-side");
	assert.ok(parts(bed, "Bed Ladder Upright")[0].position.x < 0 && right > 0);
	bed.setConfiguration("style", "loft-bed");
	assert.equal(parts(bed, "Child Mattress").length, 1);
	assert.ok(bed.getObjectByName("Loft Desk Top"));
	bed.setConfiguration("underbedDesk", false);
	assert.equal(parts(bed, "Loft Desk Top").length, 0);
	bed.setConfiguration("style", "trundle-bed");
	const width = new Box3().setFromObject(bed).getSize(new Vector3()).x;
	bed.setConfiguration("trundleOpen", 1);
	assert.ok(
		new Box3().setFromObject(bed).getSize(new Vector3()).x > width + 0.5,
	);
	assert.ok(bed.getObjectByName("Trundle Mattress"));
	bed.setConfiguration("style", "cabin-bed");
	assert.equal(parts(bed, "Cabin Storage Front").length, 3);
	bed.dispose();
});

test("toy chests have a hollow opening and storage contents follow the selected layout", () => {
	const storage = createFurnitureObject("nursery-storage", {
		style: "toy-chest",
		contentsEnabled: false,
		lidOpen: true,
	});
	storage.updateMatrixWorld(true);
	const ray = new Raycaster(new Vector3(0, 2, 0), new Vector3(0, -1, 0)),
		hits = ray.intersectObject(storage, true);
	assert.ok(
		hits.length && hits[0].point.y < Number(storage.parameters.height) * 0.15,
	);
	storage.setConfiguration("style", "toy-storage-unit");
	assert.equal(parts(storage, "Toy Storage Bin").length, 0);
	storage.setConfiguration("contentsEnabled", true);
	assert.equal(parts(storage, "Toy Storage Bin").length, 6);
	storage.setConfiguration("style", "chest-of-drawers");
	assert.equal(parts(storage, "Child Drawer Front").length, 6);
	storage.setConfiguration("drawerOpen", 1);
	assert.equal(parts(storage, "Child Drawer Bottom").length, 6);
	storage.setConfiguration("style", "childrens-wardrobe");
	const closed = new Box3().setFromObject(storage).max.z;
	storage.setConfiguration("doorsOpen", true);
	assert.ok(new Box3().setFromObject(storage).max.z > closed + 0.2);
	storage.dispose();
});

test("changing tables, nursing chairs and kids' furniture rebuild their optional details", () => {
	const table = createFurnitureObject("changing-table");
	assert.ok(table.getObjectByName("Changing Pad"));
	table.setConfiguration("padEnabled", false);
	assert.equal(parts(table, "Changing Pad").length, 0);
	table.setConfiguration("drawerRows", 0);
	assert.equal(parts(table, "Changing Drawer Front").length, 0);
	const chair = createFurnitureObject("nursery-chair");
	assert.equal(chair.parameters.style, "nursing-chair");
	chair.setConfiguration("style", "rocking-chair");
	assert.equal(parts(chair, "Chair Rocker").length, 2);
	const desk = createFurnitureObject("kids-table");
	assert.ok(desk.getObjectByName("Kids Desk Drawer"));
	desk.setConfiguration("style", "play-table");
	assert.equal(desk.parameters.height, 0.48);
	assert.equal(parts(desk, "Kids Desk Drawer").length, 0);
	const seat = createFurnitureObject("kids-chair", {
		backSlats: 5,
		armsEnabled: true,
	});
	assert.equal(parts(seat, "Kids Chair Back Slat").length, 5);
	assert.equal(parts(seat, "Kids Chair Arm").length, 2);
	for (const object of [table, chair, desk, seat]) object.dispose();
});

test("playpen gate swings into the room and tent entrance is a real opening", () => {
	const pen = createFurnitureObject("playpen");
	const z = new Box3().setFromObject(pen).max.z;
	pen.setConfiguration("gateOpen", true);
	assert.ok(new Box3().setFromObject(pen).max.z > z + 0.5);
	pen.setConfiguration("matEnabled", false);
	assert.equal(parts(pen, "Playpen Pad").length, 0);
	const tent = createFurnitureObject("indoor-tent");
	const hit = () => {
		tent.updateMatrixWorld(true);
		return new Raycaster(
			new Vector3(0, Number(tent.parameters.height) * 0.3, 3),
			new Vector3(0, 0, -1),
		).intersectObject(tent, true)[0];
	};
	assert.ok(hit().point.z < 0);
	tent.setConfiguration("entranceOpen", false);
	assert.ok(hit().point.z > 0);
	pen.dispose();
	tent.dispose();
});

test("puzzle tiles and climbing rungs respond to counts, shape and ramp controls", () => {
	const mat = createFurnitureObject("play-mat", { columns: 4, rows: 3 });
	assert.equal(parts(mat, "Play Mat Tile").length, 12);
	assert.ok(parts(mat, "Play Mat Puzzle Tab").length > 0);
	mat.setConfiguration("tabsEnabled", false);
	assert.equal(parts(mat, "Play Mat Puzzle Tab").length, 0);
	const frame = createFurnitureObject("climbing-frame", { rungCount: 5 });
	assert.equal(parts(frame, "Climbing Rung").length, 10);
	frame.setConfiguration("style", "climbing-arch");
	assert.equal(parts(frame, "Climbing Rung").length, 5);
	assert.equal(parts(frame, "Climbing Arch Rail").length, 2);
	frame.setConfiguration("rampEnabled", true);
	assert.ok(frame.getObjectByName("Climbing Ramp"));
	mat.dispose();
	frame.dispose();
});

test("toy kitchen sink is hollow and its oven and faucet controls change the scene", () => {
	const kitchen = createFurnitureObject("toy-kitchen", {
		faucetEnabled: false,
	});
	kitchen.updateMatrixWorld(true);
	const bowl = kitchen.getObjectByName("Toy Kitchen Sink");
	const hits = new Raycaster(
		new Vector3(bowl.position.x, 2, 0),
		new Vector3(0, -1, 0),
	).intersectObject(kitchen, true);
	assert.ok(
		hits.length && hits[0].point.y < Number(kitchen.parameters.height) * 0.55,
	);
	const z = new Box3().setFromObject(kitchen).max.z;
	kitchen.setConfiguration("ovenOpen", true);
	assert.ok(new Box3().setFromObject(kitchen).max.z > z + 0.15);
	kitchen.setConfiguration("faucetEnabled", true);
	assert.ok(kitchen.getObjectByName("Kitchen Faucet Spout"));
	kitchen.dispose();
});

test("night lights retain their light settings and wall shelves rebuild all tiers", () => {
	const night = createFurnitureObject("night-light", { intensity: 0.6 });
	assert.equal(night.getObjectByName("Night Light Source").intensity, 0.6);
	night.setConfiguration("enabled", false);
	assert.equal(night.getObjectByName("Night Light Source").intensity, 0);
	night.setConfiguration("style", "cloud-light");
	assert.ok(night.getObjectByName("Night Light Cloud"));
	night.setConfiguration("lightColor", "soft-blue");
	assert.equal(
		night.getObjectByName("Night Light Source").color.getHex(),
		0xb1d6ff,
	);
	const shelves = createFurnitureObject("nursery-wall-shelves", {
		shelfCount: 4,
	});
	assert.equal(parts(shelves, "Nursery Wall Shelf").length, 4);
	night.dispose();
	shelves.dispose();
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
