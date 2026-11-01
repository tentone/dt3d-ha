import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".dining-room-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "dining.mjs");
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
	item.rooms?.includes("dining-room"),
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

test("all 22 dining objects are searchable in five categories without duplicate shared models", () => {
	assert.equal(options.length, 8);
	assert.equal(filterModels("", "all", "dining-room").length, 8);
	const categories = new Set(
		filterModels("", "all", "dining-room").map((item) => item.category),
	);
	assert.deepEqual(
		[...categories].sort(),
		["tables-desks", "seating", "storage", "lighting", "decoration"].sort(),
	);
	const room = MODEL_ROOMS.find((item) => item.id === "dining-room");
	assert.equal(locale[room.categoryLabels["tables-desks"]], "Tables");
	for (const [queries, type] of [
		[
			[
				"rectangular dining table",
				"round dining table",
				"oval dining table",
				"square dining table",
				"extendable dining table",
			],
			"dining-table",
		],
		[
			["dining chair", "upholstered dining chair", "dining bench", "bar stool"],
			"dining-seating",
		],
		[
			[
				"sideboard",
				"buffet cabinet",
				"china cabinet",
				"display cabinet",
				"drinks cabinet",
				"wine rack",
			],
			"dining-storage",
		],
		[["chandelier", "pendant light", "wall light"], "dining-light"],
		[["rug"], "rug"],
		[["mirror"], "mirror"],
		[["decorative plant"], "indoor-plant"],
		[["centerpiece"], "centerpiece"],
	])
		for (const query of queries)
			assert.equal(
				filterModels(query, "all", "dining-room")[0]?.type,
				`furniture-${type}`,
				query,
			);
	for (const type of ["rug", "mirror", "indoor-plant"]) {
		assert.equal(
			MODEL_LIBRARY.filter((item) => item.type === `furniture-${type}`).length,
			1,
		);
		assert.ok(
			filterModels("", "decoration", "living-room").some(
				(item) => item.type === `furniture-${type}`,
			),
		);
	}
	assert.equal(filterModels("", "all", "living-room").length, 18);
	assert.equal(filterModels("", "all", "bathroom").length, 11);
});

test("extension adds its leaf length, retracts cleanly, and retains closed dimensions for saving", () => {
	const table = createFurnitureObject("dining-table", {
		style: "extendable-dining-table",
	});
	const parameters = table.getParameters();
	const extended = new Box3().setFromObject(table).getSize(new Vector3()).x;
	assert.equal(parts(table, "Extension Leaf Seam").length, 2);
	table.setConfiguration("extensionEnabled", false);
	const closed = new Box3().setFromObject(table).getSize(new Vector3()).x;
	assert.ok(
		Math.abs(extended - closed - Number(parameters.extensionLength)) < 1e-6,
	);
	assert.equal(parts(table, "Extension Leaf Seam").length, 0);
	assert.equal(table.parameters.width, parameters.width);
	table.setConfiguration("style", "round-dining-table");
	const round = new Box3().setFromObject(table).getSize(new Vector3());
	assert.ok(Math.abs(round.x - round.z) < 1e-6);
	assert.ok(table.getObjectByName("Table Pedestal"));
	table.setConfiguration("style", "square-dining-table");
	assert.equal(table.parameters.width, table.parameters.depth);
	assert.equal(parts(table, "Table Leg").length, 4);
	table.dispose();
});

test("chair upholstery, bench back and stool footrest follow the selected configuration", () => {
	const seat = createFurnitureObject("dining-seating", {
		style: "upholstered-dining-chair",
	});
	assert.equal(parts(seat, "Seat Upholstery").length, 1);
	assert.equal(parts(seat, "Back Upholstery").length, 1);
	seat.setConfiguration("style", "dining-bench");
	assert.equal(parts(seat, "Seat Upholstery").length, 0);
	assert.equal(parts(seat, "Back Post").length, 0);
	assert.ok(seat.getObjectByName("Bench Stretcher"));
	seat.setConfiguration("style", "bar-stool");
	assert.equal(seat.parameters.seatHeight, 0.75);
	assert.ok(seat.getObjectByName("Seat Pedestal"));
	assert.ok(seat.getObjectByName("Stool Footrest"));
	seat.setConfiguration("footrestEnabled", false);
	assert.equal(parts(seat, "Stool Footrest").length, 0);
	seat.dispose();
});

test("glass cabinets keep transparent doors, reveal dishes and swing doors on their hinges", () => {
	const cabinet = createFurnitureObject("dining-storage", {
		style: "china-cabinet",
	});
	assert.equal(parts(cabinet, "China Cabinet Lower Door").length, 2);
	assert.ok(parts(cabinet, "Display Plate").length > 0);
	const glass = cabinet.getObjectByName("Dining Cabinet Glass");
	assert.ok(glass.material.transparent && !glass.material.depthWrite);
	assert.equal(glass.castShadow, false);
	assert.equal(glass.receiveShadow, false);
	const closed = new Box3().setFromObject(cabinet);
	cabinet.setConfiguration("doorsOpen", true);
	const open = new Box3().setFromObject(cabinet);
	assert.ok(open.max.z > closed.max.z + 0.3);
	cabinet.setConfiguration("contentsEnabled", false);
	assert.equal(parts(cabinet, "Display Plate").length, 0);
	cabinet.setConfiguration("style", "buffet-cabinet");
	assert.equal(parts(cabinet, "Buffet Drawer").length, 6);
	cabinet.dispose();
});

test("wine rack rows and columns rebuild the bottle slots and contents can be hidden", () => {
	const rack = createFurnitureObject("dining-storage", {
		style: "wine-rack",
		columns: 3,
		shelfCount: 2,
	});
	assert.equal(parts(rack, "Wine Bottle").length, 9);
	assert.equal(parts(rack, "Dining Cabinet Door").length, 0);
	assert.equal(parts(rack, "Cabinet Divider").length, 2);
	rack.setConfiguration("shelfCount", 4);
	assert.equal(parts(rack, "Wine Bottle").length, 15);
	rack.setConfiguration("contentsEnabled", false);
	assert.equal(parts(rack, "Wine Bottle").length, 0);
	rack.dispose();
});

test("lighting shares total brightness across bulbs and on/off disables every source", () => {
	const fixture = createFurnitureObject("dining-light", {
		lightCount: 8,
		intensity: 12,
	});
	const lights = () => {
		const result = [];
		fixture.traverse((child) => {
			if (child.isPointLight) result.push(child);
		});
		return result;
	};
	assert.equal(lights().length, 8);
	assert.equal(
		lights().reduce((sum, light) => sum + light.intensity, 0),
		12,
	);
	fixture.setConfiguration("lightCount", 3);
	assert.equal(lights().length, 3);
	assert.equal(
		lights().reduce((sum, light) => sum + light.intensity, 0),
		12,
	);
	fixture.setConfiguration("enabled", false);
	assert.ok(lights().every((light) => light.intensity === 0));
	fixture.setConfiguration("temperature", "cool");
	assert.equal(lights()[0].color.getHex(), 0xc5e3ff);
	fixture.dispose();
});

test("centerpieces have a hollow bowl, optional contents and controllable candle flames", () => {
	const centerpiece = createFurnitureObject("centerpiece", {
		contentsEnabled: false,
	});
	centerpiece.updateMatrixWorld(true);
	const bowl = centerpiece.getObjectByName("Centerpiece Bowl");
	const ray = new Raycaster(new Vector3(0, 1, 0), new Vector3(0, -1, 0));
	const hits = ray.intersectObject(bowl);
	assert.ok(
		hits.length &&
			hits[0].point.y < Number(centerpiece.parameters.height) * 0.2,
	);
	centerpiece.setConfiguration("style", "candle-arrangement");
	centerpiece.setConfiguration("contentsEnabled", true);
	assert.equal(parts(centerpiece, "Centerpiece Candle").length, 3);
	assert.equal(parts(centerpiece, "Candle Flame").length, 0);
	centerpiece.setConfiguration("candlesLit", true);
	assert.equal(parts(centerpiece, "Candle Flame").length, 3);
	centerpiece.setConfiguration("style", "floral-arrangement");
	assert.equal(parts(centerpiece, "Flower Stem").length, 5);
	centerpiece.dispose();
});
