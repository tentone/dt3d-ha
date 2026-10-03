import assert from "node:assert/strict";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {dirname, join, resolve} from "node:path";
import {after, test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";

import {build} from "esbuild";
import {Box3, Vector3} from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectory = await mkdtemp(join(frontend, "tests", ".furniture-"));
after(() => rm(temporaryDirectory, {recursive: true, force: true}));
const bundlePath = join(temporaryDirectory, "registry.mjs");
await build({
	entryPoints: [join(frontend, "src/objects/furniture/furniture-registry.ts")],
	outfile: bundlePath,
	bundle: true,
	platform: "node",
	format: "esm",
	packages: "external",
});
const {createFurnitureObject, FURNITURE_OPTIONS, isFurnitureMeshType} = await import(pathToFileURL(bundlePath).href);
const locale = JSON.parse(await readFile(join(frontend, "src/locale/en.json"), "utf8"));
const addedTypes = ["standing-desk", "wardrobe", "bed", "kitchen-cabinet-top", "kitchen-cabinet-bottom"];

function parts(object, name) {
	const result = [];
	object.traverse((child) => {
		if (child.isMesh && (!name || child.name === name)) result.push(child);
	});
	return result;
}

function assertValidGeometry(object) {
	assert.ok(parts(object).length > 0);
	for (const part of parts(object)) {
		for (const dimension of ["width", "height", "depth"]) {
			assert.ok(Number.isFinite(part.geometry.parameters[dimension]) && part.geometry.parameters[dimension] > 0, `${part.name}: ${dimension}`);
		}
		assert.ok(part.position.toArray().every(Number.isFinite));
		assert.equal(part.internal, true);
	}
	const bounds = new Box3().setFromObject(object);
	assert.ok(Math.abs(bounds.min.y) < 1e-6, "furniture sits on its local floor");
	assert.ok(bounds.max.y <= object.parameters.height + 1e-6, "geometry respects overall height");
	const size = bounds.getSize(new Vector3());
	assert.ok(size.x <= object.parameters.width + 1e-6, "geometry respects overall width");
}

for (const type of addedTypes) {
	test(`${type}: menu, geometry, edits, cloning, and parameter restoration`, () => {
		const meshType = `furniture-${type}`;
		assert.ok(isFurnitureMeshType(meshType));
		const option = FURNITURE_OPTIONS.find((item) => item.type === meshType);
		assert.ok(locale[option.labelKey]);
		const object = createFurnitureObject(meshType, {}, 0x123456);
		assert.ok(locale[object.editorLabelKey]);
		assertValidGeometry(object);
		for (const definition of object.parameterDefinitions) {
			assert.ok(locale[definition.labelKey]);
			assert.ok(locale[definition.tooltipKey]);
		}
		object.position.set(2, 3, 4);
		object.rotation.y = 0.5;
		const originalMaterial = object.furnitureMesh.material;
		let disposed = false;
		object.furnitureMesh.geometry.addEventListener("dispose", () => { disposed = true; });
		assert.equal(object.setConfiguration("width", 1.8), true);
		assert.equal(disposed, true);
		assert.equal(object.furnitureMesh.material, originalMaterial);
		assert.deepEqual(object.position.toArray(), [2, 3, 4]);
		assert.equal(object.setConfiguration("unknown", 7), false);
		const clone = object.clone();
		assert.deepEqual(clone.getParameters(), object.getParameters());
		assert.deepEqual(clone.position.toArray(), object.position.toArray());
		assert.equal(clone.rotation.y, object.rotation.y);
		assert.notEqual(clone.furnitureMesh.geometry, object.furnitureMesh.geometry);
		assert.notEqual(clone.furnitureMesh.material, originalMaterial);
		const restored = createFurnitureObject(object.userData.meshType, JSON.parse(JSON.stringify(object.getParameters())));
		assert.deepEqual(restored.getParameters(), object.getParameters());
		assertValidGeometry(restored);
		for (const mode of ["min", "max"]) {
			const parameters = Object.fromEntries(object.parameterDefinitions.filter((definition) => definition.type !== "boolean").map((definition) => [definition.name, definition[mode]]));
			const extreme = createFurnitureObject(meshType, parameters);
			assertValidGeometry(extreme);
			extreme.dispose();
		}
		// Short, narrow units with thick boards and many doors/shelves must remain valid.
		const mixed = createFurnitureObject(meshType, {width: 0.4, depth: 0.25, height: 0.4, thickness: 0.1, doorCount: 6, shelfCount: 12, bedHeight: 1, mattressThickness: 0.4, legThickness: 0.2, legInset: 0});
		assertValidGeometry(mixed);
		mixed.dispose();
		object.dispose();
		clone.dispose();
		restored.dispose();
	});
}

test("storage doors and lower kitchen construction respond to controls", () => {
	for (const type of ["wardrobe", "kitchen-cabinet-top", "kitchen-cabinet-bottom"]) {
		const object = createFurnitureObject(type, {doorCount: 4, shelfCount: 3});
		assert.equal(parts(object, "Storage Door").length, 4);
		assert.equal(parts(object, "Storage Handle").length, 4);
		assert.equal(parts(object, "Storage Shelf").length, 3);
		assert.equal(parts(object, "Kitchen Countertop").length, type === "kitchen-cabinet-bottom" ? 1 : 0);
		assert.equal(parts(object, "Kitchen Plinth").length, type === "kitchen-cabinet-bottom" ? 1 : 0);
		object.setConfiguration("doorCount", 1);
		object.setConfiguration("shelfCount", 0);
		assert.equal(parts(object, "Storage Door").length, 1);
		assert.equal(parts(object, "Storage Shelf").length, 0);
		object.dispose();
	}
});

test("bed headboard is optional and desk height changes its columns", () => {
	const bed = createFurnitureObject("bed");
	assert.equal(parts(bed, "Bed Headboard").length, 1);
	bed.setConfiguration("headboardEnabled", false);
	assert.equal(parts(bed, "Bed Headboard").length, 0);
	assert.equal(parts(bed, "Bed Pillow").length, 2);
	bed.setConfiguration("width", 0.9);
	assert.equal(parts(bed, "Bed Pillow").length, 1);
	const desk = createFurnitureObject("standing-desk");
	const originalHeight = parts(desk, "Desk Upper Column")[0].geometry.parameters.height;
	desk.setConfiguration("height", 0.75);
	assert.ok(parts(desk, "Desk Upper Column")[0].geometry.parameters.height < originalHeight);
	assertValidGeometry(desk);
	bed.dispose();
	desk.dispose();
});

test("all existing furniture types remain available", () => {
	for (const type of ["table", "chair", "couch", "bathtub", "shelf", "cabinet"]) {
		const object = createFurnitureObject(type);
		assert.equal(object.furnitureType, type);
		assert.ok(parts(object).length > 0);
		object.dispose();
	}
	assert.equal(createFurnitureObject("unknown"), null);
});
