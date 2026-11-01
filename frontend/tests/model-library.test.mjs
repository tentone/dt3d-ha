import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectory = await mkdtemp(
	join(frontend, "tests", ".model-library-"),
);
after(() => rm(temporaryDirectory, { recursive: true, force: true }));
const bundlePath = join(temporaryDirectory, "library.mjs");
await build({
	stdin: {
		contents: `export * from "./src/editor/model-library.ts";
export * from "./src/editor/model-preview.ts";
export {MESH_OPTIONS} from "./src/editor/mesh-handler.ts";
export {FURNITURE_OPTIONS} from "./src/objects/furniture/furniture-registry.ts";`,
		resolveDir: frontend,
	},
	outfile: bundlePath,
	bundle: true,
	platform: "node",
	format: "esm",
	packages: "external",
});
const {
	MODEL_LIBRARY,
	MODEL_CATEGORIES,
	filterModels,
	modelLabel,
	createModelPreviewObject,
	disposeModelPreview,
	FURNITURE_OPTIONS,
	MESH_OPTIONS,
} = await import(pathToFileURL(bundlePath).href);
const locale = JSON.parse(
	await readFile(join(frontend, "src/locale/en.json"), "utf8"),
);

test("every existing creation option appears once in a named category", () => {
	const expected = [...FURNITURE_OPTIONS, ...MESH_OPTIONS]
		.map((item) => item.type)
		.concat([
			"light-ambient",
			"light-directional",
			"light-point",
			"light-spot",
			"light-rect-area",
			"door",
			"window",
			"gate",
		]);
	assert.deepEqual(
		MODEL_LIBRARY.map((entry) => entry.type).sort(),
		expected.sort(),
	);
	assert.equal(
		new Set(MODEL_LIBRARY.map((entry) => entry.type)).size,
		MODEL_LIBRARY.length,
	);
	for (const category of MODEL_CATEGORIES) {
		assert.ok(locale[category.labelKey], category.labelKey);
		assert.ok(
			filterModels("", category.id).length,
			`${category.id} is populated`,
		);
	}
	for (const entry of MODEL_LIBRARY) {
		assert.ok(
			MODEL_CATEGORIES.some((category) => category.id === entry.category),
		);
		assert.ok(modelLabel(entry));
		if (entry.labelKey) assert.ok(locale[entry.labelKey], entry.labelKey);
	}
	assert.deepEqual(
		filterModels("", "geometric-shapes").map((entry) => entry.type),
		MESH_OPTIONS.map((entry) => entry.type),
	);
});

test("search combines category filters, labels, identifiers, aliases, and query words", () => {
	assert.equal(filterModels("  SOFA  ")[0].type, "furniture-couch");
	assert.equal(filterModels("sofa", "kitchen").length, 0);
	assert.equal(
		filterModels("kitchen top")[0].type,
		"furniture-kitchen-cabinet-top",
	);
	assert.equal(
		filterModels("standing desk")[0].type,
		"furniture-standing-desk",
	);
	assert.equal(filterModels("géometric sphere")[0].type, "sphere");
	assert.equal(filterModels("lighting").length, 7);
	assert.equal(filterModels("living room", "all", "living-room").length, 18);
	assert.equal(filterModels("bean bag", "seating", "living-room")[0].type, "furniture-ottoman");
	assert.equal(filterModels("this model does not exist").length, 0);
	assert.equal(filterModels(" \t ").length, MODEL_LIBRARY.length);
});

for (const entry of MODEL_LIBRARY) {
	test(`${entry.type}: default preview has finite visible geometry and releases its resources`, () => {
		const object = createModelPreviewObject(entry);
		assert.ok(object);
		assert.equal(object.parent, null);
		const bounds = new Box3().setFromObject(object);
		assert.equal(bounds.isEmpty(), false);
		assert.ok(
			[...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite),
		);
		const geometries = new Set();
		const materials = new Set();
		object.traverse((child) => {
			if (child.geometry) geometries.add(child.geometry);
			for (const material of Array.isArray(child.material)
				? child.material
				: child.material
					? [child.material]
					: [])
				materials.add(material);
		});
		let disposedGeometries = 0;
		let disposedMaterials = 0;
		geometries.forEach((geometry) =>
			geometry.addEventListener("dispose", () => disposedGeometries++),
		);
		materials.forEach((material) =>
			material.addEventListener("dispose", () => disposedMaterials++),
		);
		disposeModelPreview(object);
		assert.equal(disposedGeometries, geometries.size);
		assert.equal(disposedMaterials, materials.size);
	});
}
