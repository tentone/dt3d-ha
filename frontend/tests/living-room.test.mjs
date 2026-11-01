import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, MeshStandardMaterial, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".living-room-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "registry.mjs");
await build({
	entryPoints: [join(frontend, "src/objects/furniture/furniture-registry.ts")],
	outfile: output,
	bundle: true,
	platform: "node",
	format: "esm",
	packages: "external",
});
const { createFurnitureObject, FURNITURE_OPTIONS } = await import(
	pathToFileURL(output).href
);
const locale = JSON.parse(
	await readFile(join(frontend, "src/locale/en.json"), "utf8"),
);
const options = FURNITURE_OPTIONS.filter((item) =>
	item.rooms?.includes("living-room"),
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
		assert.ok(mesh.internal);
		assert.ok(mesh.material);
		for (const name of ["position", "normal"]) {
			const attribute = mesh.geometry.getAttribute(name);
			assert.ok(attribute?.count > 0, `${mesh.name} ${name}`);
			assert.ok(
				attribute.array.every(Number.isFinite),
				`${mesh.name}: finite ${name}`,
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
	test(`${option.type}: controls, variants, numeric limits, cloning and restoration`, () => {
		const object = createFurnitureObject(option.type);
		valid(object);
		assert.ok(locale[option.labelKey]);
		assert.ok(locale[object.editorLabelKey]);
		for (const definition of object.parameterDefinitions) {
			assert.ok(locale[definition.labelKey], definition.labelKey);
			assert.ok(locale[definition.tooltipKey], definition.tooltipKey);
			for (const choice of definition.options ?? []) {
				assert.ok(locale[choice.labelKey], choice.labelKey);
				const variant = createFurnitureObject(option.type, {
					[definition.name]: choice.value,
				});
				valid(variant);
				assert.equal(variant.parameters[definition.name], choice.value);
				variant.dispose();
			}
		}
		for (const limit of ["min", "max"]) {
			const parameters = Object.fromEntries(
				object.parameterDefinitions
					.filter((item) => item.type === "number" || item.type === "integer")
					.map((item) => [item.name, item[limit]]),
			);
			const extreme = createFurnitureObject(option.type, parameters);
			valid(extreme);
			extreme.dispose();
		}
		object.position.set(2, 3, 4);
		object.rotation.y = 0.6;
		object.setConfiguration("width", 1.4);
		const clone = object.clone();
		assert.deepEqual(clone.getParameters(), object.getParameters());
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
		const restored = createFurnitureObject(
			option.type,
			JSON.parse(JSON.stringify(object.getParameters())),
		);
		assert.deepEqual(restored.getParameters(), object.getParameters());
		valid(restored);
		object.dispose();
		clone.dispose();
		restored.dispose();
	});
}

test("sofa seats, left and right returns, U layout and bed deployment affect geometry", () => {
	const sofa = createFurnitureObject("couch", { seatCount: 4 });
	assert.equal(parts(sofa, "Sofa Seat Cushion").length, 4);
	sofa.setConfiguration("layout", "l-left");
	assert.equal(parts(sofa, "Sofa Return Base").length, 1);
	assert.ok(parts(sofa, "Sofa Return Base")[0].position.x < 0);
	sofa.setConfiguration("layout", "l-right");
	assert.ok(parts(sofa, "Sofa Return Base")[0].position.x > 0);
	sofa.setConfiguration("layout", "u-shaped");
	assert.equal(parts(sofa, "Sofa Return Base").length, 2);
	sofa.setConfiguration("layout", "sofa-bed");
	assert.equal(parts(sofa, "Sofa Bed Mattress").length, 0);
	sofa.setConfiguration("bedExtended", true);
	assert.equal(parts(sofa, "Sofa Bed Mattress").length, 1);
	sofa.dispose();
});

test("table presets change dimensions and geometry, while full configuration restoration reverses all changes", () => {
	const table = createFurnitureObject("living-table");
	table.setConfiguration("width", 1.37);
	const saved = table.getParameters();
	table.setConfiguration("style", "nesting-tables");
	assert.equal(parts(table, "Table Top").length, 3);
	assert.equal(table.parameters.height, 0.5);
	table.setParameters(saved);
	assert.deepEqual(table.getParameters(), saved);
	assert.equal(parts(table, "Table Top").length, 1);
	table.setConfiguration("legStyle", "pedestal");
	assert.equal(parts(table, "Table Pedestal").length, 1);
	table.setConfiguration("topShape", "corner");
	assert.equal(parts(table, "Table Top")[0].geometry.type, "ExtrudeGeometry");
	table.dispose();
});

test("accents stay independent of body material, rebuilds release owned materials, and lamps retain a single light", () => {
	const lamp = createFurnitureObject("lamp");
	const bulb = parts(lamp, "Lamp Bulb")[0];
	const oldAccent = bulb.material;
	let disposed = false;
	oldAccent.addEventListener("dispose", () => {
		disposed = true;
	});
	const body = new MeshStandardMaterial({ color: 0xff0000 });
	lamp.furnitureMesh.material = body;
	lamp.update(0);
	assert.equal(bulb.material, oldAccent);
	lamp.setConfiguration("enabled", false);
	assert.equal(disposed, true);
	assert.equal(lamp.furnitureMesh.material, body);
	const lights = [];
	lamp.traverse((child) => {
		if (child.isPointLight) lights.push(child);
	});
	assert.equal(lights.length, 1);
	assert.equal(lights[0].intensity, 0);
	lamp.dispose();
	body.dispose();
});

test("storage variants, curtains and cinema settings respond to their controls", () => {
	const storage = createFurnitureObject("living-storage", {
		style: "display-cabinet",
	});
	assert.ok(parts(storage, "Display Glass").length);
	storage.setConfiguration("style", "wall-shelves");
	assert.equal(parts(storage, "Wall Shelf Board").length, 3);
	assert.equal(parts(storage, "Storage Door").length, 0);
	const cinema = createFurnitureObject("speaker-system", {
		style: "home-cinema",
	});
	assert.equal(parts(cinema, "Cinema Front Speaker").length, 2);
	assert.equal(parts(cinema, "Cinema Rear Speaker").length, 2);
	assert.equal(parts(cinema, "Cinema Center Speaker").length, 1);
	assert.equal(parts(cinema, "Cinema Subwoofer").length, 1);
	const curtains = createFurnitureObject("curtains", { openAmount: 0 });
	const closed = new Box3()
		.setFromObject(parts(curtains, "Curtain Fabric")[0])
		.getSize(new Vector3()).x;
	curtains.setConfiguration("openAmount", 0.8);
	const fabric = parts(curtains, "Curtain Fabric")[0];
	fabric.geometry.computeBoundingBox();
	assert.ok(
		fabric.geometry.boundingBox.max.x - fabric.geometry.boundingBox.min.x <
			closed,
	);
	storage.dispose();
	cinema.dispose();
	curtains.dispose();
});
