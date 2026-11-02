import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".closet-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "closet.mjs");
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
	item.rooms?.includes("walk-in-closet"),
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
test("all 16 closet objects are searchable in four categories without duplicating shared furniture", () => {
	assert.equal(options.length, 8);
	assert.equal(filterModels("", "all", "walk-in-closet").length, 8);
	assert.deepEqual(
		MODEL_ROOMS.find((room) => room.id === "walk-in-closet").categories,
		["closet-wardrobes", "storage", "closet-furniture", "accessories"],
	);
	for (const [queries, type, category] of [
		[
			[
				"open wardrobe",
				"closed wardrobe",
				"modular wardrobe",
				"corner wardrobe",
			],
			"closet-wardrobe",
			"closet-wardrobes",
		],
		[
			[
				"shoe rack",
				"drawer unit",
				"hanging rail",
				"shelving unit",
				"accessories organizer",
			],
			"closet-storage",
			"storage",
		],
		[["dressing island"], "dressing-island", "closet-furniture"],
		[["vanity table"], "bedroom-vanity", "closet-furniture"],
		[["ottoman"], "ottoman", "closet-furniture"],
		[["bench"], "bedroom-bench", "closet-furniture"],
		[
			["full-length mirror", "illuminated mirror"],
			"dressing-mirror",
			"accessories",
		],
		[["clothes stand"], "clothes-stand", "accessories"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, category, "walk-in-closet").some(
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
	])
		assert.equal(filterModels("", "all", room).length, count, room);
});

test("wardrobe presets rebuild bays, rails, doors and extendable drawers", () => {
	const wardrobe = createFurnitureObject("closet-wardrobe");
	assert.equal(parts(wardrobe, "Closet Wardrobe Door").length, 0);
	assert.equal(parts(wardrobe, "Closet Garment").length, 3);
	wardrobe.setConfiguration("style", "closed-wardrobe");
	assert.equal(parts(wardrobe, "Closet Wardrobe Door").length, 3);
	const closed = new Box3().setFromObject(wardrobe).max.z;
	wardrobe.setConfiguration("doorsOpen", true);
	assert.ok(new Box3().setFromObject(wardrobe).max.z > closed + 0.3);
	wardrobe.setConfiguration("style", "modular-wardrobe");
	assert.equal(wardrobe.parameters.width, 2.4);
	assert.equal(parts(wardrobe, "Closet Drawer Front").length, 6);
	wardrobe.setConfiguration("drawerOpen", 1);
	assert.equal(parts(wardrobe, "Closet Drawer Bottom").length, 6);
	assert.ok(new Box3().setFromObject(wardrobe).max.z > 0.65);
	wardrobe.setConfiguration("hangingEnabled", false);
	assert.equal(parts(wardrobe, "Closet Garment").length, 0);
	assert.equal(parts(wardrobe, "Closet Wardrobe Shelf").length, 9);
	wardrobe.dispose();
});

test("corner wardrobes have two perpendicular runs and an open interior on either return side", () => {
	for (const side of ["left-return", "right-return"]) {
		const wardrobe = createFurnitureObject("closet-wardrobe", {
			style: "corner-wardrobe",
			returnSide: side,
			width: 2,
			depth: 1.8,
			runDepth: 0.5,
		});
		valid(wardrobe);
		assert.equal(
			wardrobe.children[0].children.filter(
				(item) => item.name === "Closet Wardrobe Run",
			).length,
			2,
		);
		wardrobe.updateMatrixWorld(true);
		const ray = (x, z) =>
			new Raycaster(
				new Vector3(x, 3, z),
				new Vector3(0, -1, 0),
			).intersectObjects(parts(wardrobe), false);
		assert.ok(ray(0, -0.7).length, "back run has a top");
		assert.ok(
			ray(side === "left-return" ? -0.8 : 0.8, 0.4).length,
			"return run has a top",
		);
		assert.equal(
			ray(side === "left-return" ? 0.5 : -0.5, 0.4).length,
			0,
			"L interior remains empty",
		);
		const size = new Box3().setFromObject(wardrobe).getSize(new Vector3());
		assert.ok(Math.abs(size.x - 2) < 0.01 && Math.abs(size.z - 1.8) < 0.01);
		wardrobe.dispose();
	}
});

test("closet storage tilts shoes with shelves and changes into drawers, rails and shelves", () => {
	const storage = createFurnitureObject("closet-storage");
	assert.equal(parts(storage, "Closet Shoe").length, 24);
	const shoe = parts(storage, "Closet Shoe")[0];
	assert.ok(shoe.parent.rotation.x > 0);
	storage.setConfiguration("shelfTilt", 0);
	assert.equal(parts(storage, "Closet Shoe")[0].parent.rotation.x, 0);
	storage.setConfiguration("style", "drawer-unit");
	const closed = new Box3().setFromObject(storage).max.z;
	storage.setConfiguration("drawerOpen", 1);
	assert.equal(parts(storage, "Closet Storage Drawer Front").length, 4);
	assert.ok(new Box3().setFromObject(storage).max.z > closed + 0.2);
	storage.setConfiguration("style", "hanging-rail");
	assert.equal(parts(storage, "Closet Garment").length, 3);
	storage.setConfiguration("contentsEnabled", false);
	assert.equal(parts(storage, "Closet Garment").length, 0);
	storage.setConfiguration("style", "shelving-unit");
	assert.equal(parts(storage, "Closet Storage Shelf").length, 5);
	storage.dispose();
});

test("accessory organizers have independent compartments, optional contents and a transparent cover", () => {
	const tray = createFurnitureObject("closet-storage", {
		style: "accessories-organizer",
		columns: 4,
		trayRows: 2,
		coverEnabled: true,
	});
	assert.equal(parts(tray, "Organizer Lining").length, 8);
	assert.equal(parts(tray, "Organizer Ring").length, 8);
	assert.equal(parts(tray, "Organizer Divider").length, 4);
	assert.equal(
		parts(tray, "Organizer Glass Cover")[0].material.transparent,
		true,
	);
	tray.updateMatrixWorld(true);
	const ray = new Raycaster(new Vector3(0.1, 1, 0.06), new Vector3(0, -1, 0));
	const first = ray.intersectObjects(
		parts(tray).filter(
			(item) =>
				!["Organizer Glass Cover", "Organizer Ring"].includes(item.name),
		),
		false,
	)[0];
	assert.equal(first.object.name, "Organizer Lining");
	assert.ok(first.point.y < Number(tray.parameters.height) * 0.3);
	tray.setConfiguration("contentsEnabled", false);
	assert.equal(parts(tray, "Organizer Ring").length, 0);
	tray.dispose();
});

test("dressing islands open drawers on both faces and offer a recessed tray beneath glass", () => {
	const island = createFurnitureObject("dressing-island");
	assert.equal(parts(island, "Island Drawer Front").length, 12);
	assert.equal(parts(island, "Island Glass Top")[0].material.transparent, true);
	const closed = new Box3().setFromObject(island);
	island.setConfiguration("drawerOpen", 1);
	const open = new Box3().setFromObject(island);
	assert.ok(open.min.z < closed.min.z - 0.2 && open.max.z > closed.max.z + 0.2);
	island.setConfiguration("bothSides", false);
	assert.equal(parts(island, "Island Drawer Front").length, 6);
	assert.equal(parts(island, "Island Back").length, 1);
	island.setConfiguration("organizerEnabled", false);
	assert.equal(parts(island, "Island Tray Divider").length, 0);
	island.setConfiguration("topStyle", "solid-top");
	assert.equal(parts(island, "Island Glass Top").length, 0);
	assert.equal(parts(island, "Island Solid Top").length, 1);
	island.dispose();
});

test("dressing mirror presets preserve full height and support switchable lighting for every shape", () => {
	const mirror = createFurnitureObject("dressing-mirror");
	assert.equal(mirror.parameters.height, 1.8);
	assert.equal(parts(mirror, "Mirror Stand").length, 2);
	assert.equal(parts(mirror, "Dressing Mirror LED").length, 0);
	mirror.setConfiguration("style", "illuminated-mirror");
	assert.equal(parts(mirror, "Mirror Stand").length, 0);
	assert.equal(parts(mirror, "Dressing Mirror LED").length, 1);
	assert.equal(mirror.getObjectByName("Dressing Mirror Light").intensity, 0.35);
	mirror.setConfiguration("enabled", false);
	assert.equal(mirror.getObjectByName("Dressing Mirror Light").intensity, 0);
	assert.equal(
		parts(mirror, "Dressing Mirror LED")[0].material.emissiveIntensity,
		0,
	);
	mirror.setConfiguration("enabled", true);
	mirror.setConfiguration("intensity", 1.5);
	assert.equal(mirror.getObjectByName("Dressing Mirror Light").intensity, 1.5);
	for (const shape of ["rectangle", "round", "oval", "arched"]) {
		mirror.setConfiguration("shape", shape);
		valid(mirror);
	}
	mirror.dispose();
	const original = createFurnitureObject("mirror");
	assert.equal(original.parameters.height, 1.1);
	assert.equal(original.parameters.standEnabled, false);
	original.dispose();
});

test("clothes stands switch between a valet and a configurable coat tree", () => {
	const stand = createFurnitureObject("clothes-stand");
	assert.equal(parts(stand, "Valet Shoe Shelf").length, 1);
	assert.equal(parts(stand, "Valet Jacket").length, 1);
	stand.setConfiguration("shoeShelf", false);
	assert.equal(parts(stand, "Valet Shoe Shelf").length, 0);
	stand.setConfiguration("style", "coat-tree");
	stand.setConfiguration("hookCount", 8);
	assert.equal(parts(stand, "Clothes Stand Hook").length, 8);
	assert.equal(parts(stand, "Clothes Stand Hat Crown").length, 1);
	stand.setConfiguration("clothesEnabled", false);
	assert.equal(parts(stand, "Clothes Stand Hat Crown").length, 0);
	stand.dispose();
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
