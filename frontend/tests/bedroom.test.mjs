import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".bedroom-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "bedroom.mjs");
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
	item.rooms?.includes("master-bedroom"),
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
test("all 29 requested bedroom objects are searchable in six categories and shared models stay unique", () => {
	assert.equal(options.length, 14);
	assert.equal(filterModels("", "all", "master-bedroom").length, 14);
	assert.deepEqual(
		MODEL_ROOMS.find((item) => item.id === "master-bedroom").categories,
		[
			"beds",
			"bedside",
			"storage",
			"seating",
			"bedroom-furniture",
			"decoration",
		],
	);
	for (const [queries, type] of [
		[
			[
				"single bed",
				"double bed",
				"queen bed",
				"king bed",
				"super king bed",
				"platform bed",
				"storage bed",
				"adjustable bed",
			],
			"bed",
		],
		[["bedside table", "bedside shelf"], "bedside"],
		[["bedside lamp"], "bedside-lamp"],
		[["2-door wardrobe", "3-door wardrobe", "sliding doors"], "wardrobe"],
		[
			["chest of drawers", "dresser", "tallboy", "clothes rack"],
			"bedroom-storage",
		],
		[["bedroom bench"], "bedroom-bench"],
		[["accent chair"], "accent-chair"],
		[["ottoman"], "ottoman"],
		[["dressing table", "vanity", "desk"], "bedroom-vanity"],
		[["full-length mirror"], "mirror"],
		[["rug"], "rug"],
		[["curtains"], "curtains"],
		[["wall art"], "artwork"],
		[["floor lamp"], "lamp"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, "all", "master-bedroom").some(
					(item) => item.type === `furniture-${type}`,
				),
				query,
			);
	assert.equal(
		filterModels("floor lamp", "decoration", "master-bedroom")[0].type,
		"furniture-lamp",
	);
	assert.equal(
		filterModels("full-length mirror", "bedroom-furniture", "master-bedroom")[0]
			.type,
		"furniture-mirror",
	);
	assert.equal(
		MODEL_LIBRARY.filter((item) => item.type === "furniture-mirror").length,
		1,
	);
	for (const [room, count] of [
		["living-room", 18],
		["dining-room", 8],
		["bathroom", 11],
		["kitchen", 17],
	])
		assert.equal(filterModels("", "all", room).length, count);
});

test("existing bed and wardrobe settings retain their values and creation identifiers", () => {
	for (const [type, parameters] of [
		[
			"bed",
			{
				width: 1.4,
				depth: 2,
				height: 0.95,
				bedHeight: 0.48,
				mattressThickness: 0.18,
				thickness: 0.05,
				headboardEnabled: false,
			},
		],
		[
			"wardrobe",
			{
				width: 1.4,
				depth: 0.55,
				height: 2,
				thickness: 0.025,
				doorCount: 4,
				shelfCount: 2,
				handleSize: 0.1,
			},
		],
	]) {
		const object = createFurnitureObject(type, parameters);
		for (const [key, value] of Object.entries(parameters))
			assert.equal(object.parameters[key], value, key);
		assert.equal(object.userData.meshType, `furniture-${type}`);
		object.dispose();
	}
});

test("bed size and frame controls remain independent, storage drawers extend and adjustable sections lift", () => {
	const bed = createFurnitureObject("bed", { sizePreset: "king-bed" });
	assert.equal(bed.parameters.width, 1.9);
	bed.setConfiguration("style", "storage-bed");
	assert.equal(bed.parameters.width, 1.9);
	assert.equal(parts(bed, "Bed Storage Drawer").length, 4);
	const closed = new Box3().setFromObject(bed).getSize(new Vector3()).x;
	bed.setConfiguration("storageOpen", true);
	assert.ok(
		new Box3().setFromObject(bed).getSize(new Vector3()).x > closed + 0.5,
	);
	bed.setConfiguration("style", "adjustable-bed");
	assert.equal(parts(bed, "Bed Mattress").length, 3);
	const head = bed.getObjectByName("Adjustable Head Section");
	assert.ok(head.rotation.x > 0);
	bed.setConfiguration("headAngle", 55);
	assert.ok(
		Math.abs(
			bed.getObjectByName("Adjustable Head Section").rotation.x -
				(55 * Math.PI) / 180,
		) < 1e-9,
	);
	assert.ok(bed.getObjectByName("Adjustable Foot Section").rotation.x < 0);
	assert.equal(parts(bed, "Bed Pillow").length, 2);
	bed.setConfiguration("sizePreset", "single-bed");
	assert.equal(parts(bed, "Bed Pillow").length, 1);
	bed.dispose();
});

test("hinged wardrobe doors swing forward and sliding doors stay within their tracks", () => {
	const wardrobe = createFurnitureObject("wardrobe", {
		style: "three-door-wardrobe",
	});
	assert.equal(parts(wardrobe, "Storage Door").length, 3);
	const z = new Box3().setFromObject(wardrobe).max.z;
	wardrobe.setConfiguration("doorsOpen", true);
	assert.ok(new Box3().setFromObject(wardrobe).max.z > z + 0.3);
	wardrobe.setConfiguration("style", "sliding-door-wardrobe");
	const initial = parts(wardrobe, "Storage Door")[0].position.x;
	wardrobe.setConfiguration("slidingOpen", 1);
	assert.ok(parts(wardrobe, "Storage Door")[0].position.x > initial + 0.5);
	assert.equal(parts(wardrobe, "Wardrobe Door Track").length, 2);
	const bounds = new Box3().setFromObject(wardrobe);
	assert.ok(bounds.min.x >= -Number(wardrobe.parameters.width) / 2 - 0.001);
	assert.ok(bounds.max.x <= Number(wardrobe.parameters.width) / 2 + 0.001);
	wardrobe.setConfiguration("mirrorDoors", true);
	assert.equal(parts(wardrobe, "Wardrobe Mirror Panel").length, 2);
	wardrobe.dispose();
});

test("bedside drawers and bedroom drawer chests expose working open compartments", () => {
	const bedside = createFurnitureObject("bedside");
	const z = new Box3().setFromObject(bedside).max.z;
	bedside.setConfiguration("drawerOpen", 1);
	assert.ok(new Box3().setFromObject(bedside).max.z > z + 0.2);
	bedside.setConfiguration("style", "bedside-shelf");
	assert.equal(parts(bedside, "Bedside Drawer").length, 0);
	assert.equal(parts(bedside, "Furniture Leg").length, 0);
	const storage = createFurnitureObject("bedroom-storage", {
		style: "tallboy",
	});
	assert.equal(parts(storage, "Bedroom Drawer Front").length, 5);
	storage.setConfiguration("style", "clothes-rack");
	assert.equal(parts(storage, "Bedroom Drawer Front").length, 0);
	assert.equal(parts(storage, "Hanger Hook").length, 5);
	storage.setConfiguration("hangerCount", 9);
	assert.equal(parts(storage, "Hanger Hook").length, 9);
	storage.setConfiguration("shoeShelfEnabled", false);
	assert.equal(parts(storage, "Clothes Rack Shoe Shelf").length, 0);
	bedside.dispose();
	storage.dispose();
});

test("storage bench opens its lid and dressing furniture changes mirrors, drawers and lights", () => {
	const bench = createFurnitureObject("bedroom-bench", {
		storageEnabled: true,
	});
	const h = new Box3().setFromObject(bench).max.y;
	bench.setConfiguration("storageOpen", true);
	assert.ok(new Box3().setFromObject(bench).max.y > h + 0.2);
	assert.ok(bench.getObjectByName("Bench Storage Floor"));
	const vanity = createFurnitureObject("bedroom-vanity", { style: "vanity" });
	assert.equal(parts(vanity, "Vanity Bulb").length, 8);
	assert.ok(vanity.getObjectByName("Vanity Light").intensity > 0);
	vanity.setConfiguration("bulbsEnabled", false);
	assert.equal(parts(vanity, "Vanity Bulb").length, 0);
	assert.equal(vanity.getObjectByName("Vanity Light"), undefined);
	vanity.setConfiguration("style", "bedroom-desk");
	assert.equal(parts(vanity, "Vanity Mirror Glass").length, 0);
	assert.equal(parts(vanity, "Vanity Drawer").length, 2);
	bench.dispose();
	vanity.dispose();
});

test("bedside lamp starts as a table lamp and the shared mirror has a full-length preset", () => {
	const lamp = createFurnitureObject("bedside-lamp");
	assert.equal(lamp.parameters.style, "table-lamp");
	assert.equal(lamp.parameters.height, 0.55);
	const mirror = createFurnitureObject("mirror");
	mirror.setConfiguration("sizePreset", "full-length-mirror");
	assert.equal(mirror.parameters.height, 1.8);
	assert.ok(new Box3().setFromObject(mirror).getSize(new Vector3()).y > 1.79);
	lamp.dispose();
	mirror.dispose();
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
