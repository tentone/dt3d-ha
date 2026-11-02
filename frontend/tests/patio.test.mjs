import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".patio-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "patio.mjs");
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
	item.rooms?.includes("patio"),
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
test("all 24 patio objects are searchable in six categories and existing rooms retain their collections", () => {
	assert.equal(options.length, 15);
	assert.equal(filterModels("", "all", "patio").length, 15);
	assert.deepEqual(MODEL_ROOMS.find((room) => room.id === "patio").categories, [
		"seating",
		"tables-desks",
		"cooking",
		"shade",
		"decoration",
		"other",
	]);
	for (const [queries, type, category] of [
		[
			["outdoor chair", "lounge chair", "sun lounger"],
			"outdoor-chair",
			"seating",
		],
		[["outdoor sofa", "outdoor sectional sofa"], "outdoor-sofa", "seating"],
		[["hammock", "hanging chair"], "suspended-seat", "seating"],
		[
			["outdoor dining table", "coffee table", "side table", "bistro table"],
			"outdoor-table",
			"tables-desks",
		],
		[["barbecue grill"], "outdoor-grill", "cooking"],
		[["outdoor kitchen"], "outdoor-kitchen", "cooking"],
		[["pizza oven"], "pizza-oven", "cooking"],
		[["parasol"], "parasol", "shade"],
		[["pergola"], "pergola", "shade"],
		[["retractable awning"], "retractable-awning", "shade"],
		[
			["planter", "flower pot", "raised garden bed"],
			"outdoor-planter",
			"decoration",
		],
		[["outdoor rug"], "rug", "decoration"],
		[["hot tub"], "hot-tub", "other"],
		[["fire pit"], "fire-pit", "other"],
		[["outdoor heater"], "outdoor-heater", "other"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, category, "patio").some(
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
	])
		assert.equal(filterModels("", "all", room).length, count, room);
});

test("outdoor chair presets recline the full back assembly and expose slats without cushions", () => {
	const chair = createFurnitureObject("outdoor-chair");
	chair.setConfiguration("style", "sun-lounger");
	assert.equal(chair.parameters.depth, 1.95);
	assert.equal(parts(chair, "Outdoor Chair Arm").length, 0);
	const original = new Box3().setFromObject(chair).getSize(new Vector3()).y;
	chair.setConfiguration("recline", 80);
	assert.ok(
		new Box3().setFromObject(chair).getSize(new Vector3()).y < original,
	);
	chair.setConfiguration("cushions", false);
	assert.equal(parts(chair, "Outdoor Chair Back Cushion").length, 0);
	chair.setConfiguration("slatCount", 12);
	assert.equal(parts(chair, "Outdoor Chair Back Slat").length, 12);
	chair.dispose();
});

test("outdoor sectionals produce mirrored returns and a true open U-shaped interior", () => {
	const sofa = createFurnitureObject("outdoor-sofa", {
		layout: "u-shaped",
		width: 3,
		returnLength: 2.2,
	});
	assert.equal(parts(sofa, "Outdoor Sectional Base").length, 2);
	assert.equal(parts(sofa, "Outdoor Sectional Cushion").length, 4);
	sofa.updateMatrixWorld(true);
	assert.equal(
		new Raycaster(new Vector3(0, 2, 1), new Vector3(0, -1, 0)).intersectObjects(
			parts(sofa),
			false,
		).length,
		0,
	);
	sofa.setConfiguration("layout", "l-left");
	assert.ok(parts(sofa, "Outdoor Sectional Base")[0].position.x < 0);
	sofa.setConfiguration("layout", "l-right");
	assert.ok(parts(sofa, "Outdoor Sectional Base")[0].position.x > 0);
	sofa.setConfiguration("cushions", false);
	assert.equal(parts(sofa, "Outdoor Sectional Cushion").length, 0);
	sofa.dispose();
});

test("hammock sag reshapes suspended fabric and hanging chairs rebuild their open ribbed shell", () => {
	const seat = createFurnitureObject("suspended-seat");
	const low = () => {
		const mesh = parts(seat, "Hammock Fabric")[0];
		mesh.geometry.computeBoundingBox();
		return mesh.geometry.boundingBox.min.y;
	};
	const before = low();
	seat.setConfiguration("sag", 0.7);
	assert.ok(low() < before - 0.1);
	seat.setConfiguration("standEnabled", false);
	assert.equal(parts(seat, "Hammock Stand").length, 0);
	seat.setConfiguration("style", "hanging-chair");
	seat.setConfiguration("standEnabled", true);
	seat.setConfiguration("ribCount", 14);
	assert.equal(parts(seat, "Hanging Chair Rib").length, 15);
	assert.equal(parts(seat, "Hanging Chair Stand").length, 1);
	seat.setConfiguration("cushions", false);
	assert.equal(parts(seat, "Hanging Chair Cushion").length, 0);
	seat.dispose();
});

test("outdoor tables switch sizes, top shapes, slatted construction and leg arrangements", () => {
	const table = createFurnitureObject("outdoor-table");
	assert.equal(parts(table, "Outdoor Table Slat").length, 7);
	table.setConfiguration("style", "bistro-table");
	assert.equal(table.parameters.width, 0.65);
	assert.equal(parts(table, "Outdoor Table Pedestal").length, 1);
	table.setConfiguration("topStyle", "solid");
	assert.equal(parts(table, "Outdoor Table Slat").length, 0);
	assert.equal(parts(table, "Outdoor Table Top").length, 1);
	table.setConfiguration("legs", "trestle");
	assert.equal(parts(table, "Outdoor Table Trestle").length, 2);
	table.dispose();
});

test("barbecue lids swing away from the grate and kettle presets replace the gas cabinet", () => {
	const grill = createFurnitureObject("outdoor-grill");
	grill.updateMatrixWorld(true);
	const closed = new Box3().setFromObject(parts(grill, "Barbecue Lid")[0]);
	grill.setConfiguration("lidOpen", true);
	grill.updateMatrixWorld(true);
	assert.ok(
		new Box3().setFromObject(parts(grill, "Barbecue Lid")[0]).max.y >
			closed.max.y + 0.1,
	);
	assert.equal(parts(grill, "Grill Grate").length, 12);
	grill.setConfiguration("burners", 5);
	assert.equal(parts(grill, "Grill Control Knob").length, 5);
	grill.setConfiguration("style", "kettle-grill");
	assert.equal(parts(grill, "Kettle Grill Bowl").length, 1);
	assert.equal(parts(grill, "Gas Grill Wall").length, 0);
	grill.dispose();
});

test("outdoor kitchens retain an open recessed sink even with one cabinet module", () => {
	for (const modules of [1, 3]) {
		const kitchen = createFurnitureObject("outdoor-kitchen", { modules }),
			p = kitchen.parameters,
			x = Number(p.width) / 2 - Number(p.width) / modules / 2;
		kitchen.updateMatrixWorld(true);
		const hit = new Raycaster(
			new Vector3(x, 3, Number(p.depth) * 0.1),
			new Vector3(0, -1, 0),
		).intersectObjects(parts(kitchen), false)[0];
		assert.equal(hit.object.name, "Outdoor Sink Floor");
		assert.ok(hit.point.y < Number(p.height) * 0.85);
		kitchen.setConfiguration("doorsOpen", true);
		assert.ok(kitchen.getObjectByName("Outdoor Kitchen Hinge").rotation.y < -1);
		kitchen.setConfiguration("sinkEnabled", false);
		assert.equal(parts(kitchen, "Outdoor Sink Wall").length, 0);
		kitchen.dispose();
	}
});

test("pizza oven arches have an open mouth and a removable fitted door", () => {
	const oven = createFurnitureObject("pizza-oven"),
		p = oven.parameters,
		y =
			Number(p.standHeight) +
			Math.min(Number(p.width), Number(p.depth), Number(p.height)) * 0.06 +
			Number(p.height) * 0.3;
	oven.updateMatrixWorld(true);
	const ray = new Raycaster(new Vector3(0, y, 2), new Vector3(0, 0, -1));
	assert.equal(
		ray.intersectObjects(parts(oven, "Pizza Oven Arch"), false).length,
		0,
	);
	assert.ok(ray.intersectObjects(parts(oven, "Pizza Oven Back"), false).length);
	oven.setConfiguration("doorClosed", true);
	oven.updateMatrixWorld(true);
	assert.ok(ray.intersectObjects(parts(oven, "Pizza Oven Door"), false).length);
	oven.setConfiguration("standEnabled", false);
	assert.equal(parts(oven, "Pizza Oven Stand").length, 0);
	oven.dispose();
});

test("parasols collapse their canopy, tilt at the crown and support a cantilever mast", () => {
	const parasol = createFurnitureObject("parasol"),
		open = new Box3()
			.setFromObject(parts(parasol, "Parasol Canopy")[0])
			.getSize(new Vector3()).x;
	parasol.setConfiguration("open", false);
	assert.ok(
		new Box3()
			.setFromObject(parts(parasol, "Parasol Canopy")[0])
			.getSize(new Vector3()).x <
			open * 0.2,
	);
	parasol.setConfiguration("tilt", 25);
	assert.ok(parasol.getObjectByName("Parasol Tilt").rotation.z > 0.4);
	parasol.setConfiguration("style", "cantilever");
	assert.equal(parts(parasol, "Parasol Cantilever Arm").length, 1);
	parasol.dispose();
});

test("pergola mounting, slat angles, roof fabric and gathered curtains change the structure", () => {
	const pergola = createFurnitureObject("pergola");
	assert.equal(parts(pergola, "Pergola Post").length, 4);
	pergola.setConfiguration("mount", "wall-mounted");
	assert.equal(parts(pergola, "Pergola Post").length, 2);
	pergola.setConfiguration("slatAngle", 60);
	assert.ok(parts(pergola, "Pergola Roof Slat")[0].rotation.x > 1);
	pergola.setConfiguration("roofStyle", "fabric");
	assert.equal(parts(pergola, "Pergola Roof Slat").length, 0);
	assert.equal(parts(pergola, "Pergola Fabric Roof").length, 1);
	pergola.setConfiguration("curtains", true);
	pergola.setConfiguration("curtainOpen", 0);
	const width = new Box3()
		.setFromObject(parts(pergola, "Pergola Curtain")[0])
		.getSize(new Vector3()).x;
	pergola.setConfiguration("curtainOpen", 1);
	assert.ok(
		new Box3()
			.setFromObject(parts(pergola, "Pergola Curtain")[0])
			.getSize(new Vector3()).x <
			width * 0.2,
	);
	pergola.dispose();
});

test("awning extension changes its projection and fully retracts the fabric and folding arms", () => {
	const awning = createFurnitureObject("retractable-awning"),
		full = new Box3().setFromObject(awning).getSize(new Vector3()).z;
	awning.setConfiguration("extension", 0.5);
	assert.ok(
		new Box3().setFromObject(awning).getSize(new Vector3()).z < full * 0.6,
	);
	awning.setConfiguration("armCount", 4);
	assert.equal(parts(awning, "Awning Folding Arm").length, 8);
	awning.setConfiguration("extension", 0);
	assert.equal(parts(awning, "Awning Fabric").length, 0);
	assert.equal(parts(awning, "Awning Folding Arm").length, 0);
	awning.dispose();
});

test("planter presets preserve hollow containers and soil and plants remain optional", () => {
	const planter = createFurnitureObject("outdoor-planter", { plants: "none" });
	planter.updateMatrixWorld(true);
	const hit = new Raycaster(
		new Vector3(0, 2, 0),
		new Vector3(0, -1, 0),
	).intersectObjects(parts(planter), false)[0];
	assert.equal(hit.object.name, "Planter Soil");
	assert.ok(hit.point.y < Number(planter.parameters.height) * 0.9);
	planter.setConfiguration("style", "raised-garden-bed");
	assert.equal(parts(planter, "Garden Bed Corner").length, 4);
	planter.setConfiguration("plants", "flowers");
	planter.setConfiguration("plantCount", 6);
	assert.equal(parts(planter, "Planter Flower Center").length, 6);
	planter.setConfiguration("soilEnabled", false);
	assert.equal(parts(planter, "Planter Soil").length, 0);
	assert.equal(parts(planter, "Planter Stem").length, 0);
	planter.setConfiguration("style", "flower-pot");
	assert.equal(parts(planter, "Flower Pot Body").length, 1);
	planter.dispose();
});

test("hot tubs provide transparent water, hollow basins, configurable jets and solid covers", () => {
	for (const shape of ["square", "round"]) {
		const tub = createFurnitureObject("hot-tub", {
			shape,
			stepsEnabled: false,
		});
		assert.equal(parts(tub, "Hot Tub Water")[0].material.transparent, true);
		tub.setConfiguration("waterEnabled", false);
		tub.updateMatrixWorld(true);
		const hit = new Raycaster(
			new Vector3(0, 2, 0),
			new Vector3(0, -1, 0),
		).intersectObjects(parts(tub), false)[0];
		assert.ok(hit.point.y < Number(tub.parameters.height) * 0.25);
		tub.setConfiguration("jetCount", 12);
		assert.equal(parts(tub, "Hot Tub Jet").length, 12);
		tub.setConfiguration("coverClosed", true);
		assert.equal(parts(tub, "Hot Tub Cover").length, 1);
		tub.dispose();
	}
});

test("fire pit covers extinguish the flames and release their local light", () => {
	const pit = createFurnitureObject("fire-pit", { lit: true });
	assert.equal(parts(pit, "Patio Flame").length, 5);
	assert.ok(pit.getObjectByName("Patio Fire Light"));
	pit.setConfiguration("coverClosed", true);
	assert.equal(parts(pit, "Patio Flame").length, 0);
	assert.equal(pit.getObjectByName("Patio Fire Light"), undefined);
	pit.setConfiguration("style", "fire-table");
	assert.equal(parts(pit, "Fire Table Wall").length, 4);
	pit.dispose();
});

test("outdoor heaters switch frames and turn off both the emitter and local light", () => {
	const heater = createFurnitureObject("outdoor-heater", { lit: true });
	assert.ok(heater.getObjectByName("Patio Heater Light"));
	heater.setConfiguration("style", "pyramid");
	assert.equal(parts(heater, "Pyramid Heater Frame").length, 4);
	heater.setConfiguration("guardRods", 16);
	assert.equal(parts(heater, "Heater Guard").length, 16);
	heater.setConfiguration("lit", false);
	assert.equal(heater.getObjectByName("Patio Heater Light"), undefined);
	assert.equal(
		parts(heater, "Pyramid Heater Emitter")[0].material.emissive.getHex(),
		0,
	);
	heater.dispose();
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
