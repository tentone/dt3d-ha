import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import {
	Box3,
	BoxGeometry,
	Group,
	Mesh,
	MeshStandardMaterial,
	PointLight,
	Raycaster,
	Scene,
	Texture,
	Vector3,
} from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".object-placement-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "placement.mjs");
await build({
	stdin: {
		contents: `export * from "./src/editor/object-placement.ts";
export {createFurnitureObject} from "./src/objects/furniture/furniture-registry.ts";
export {markObjectInternal} from "./src/utils/internal-object.ts";`,
		resolveDir: frontend,
	},
	outfile: output,
	bundle: true,
	platform: "node",
	format: "esm",
	packages: "external",
});
const {
	ObjectPlacementPreview,
	pickObjectPlacementPoint,
	createFurnitureObject,
	markObjectInternal,
} = await import(pathToFileURL(output).href);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-5, `${a} != ${b}`);

test("preview stays outside the saved space and releases a floor-aligned object without helpers", () => {
	const scene = new Scene(),
		space = new Group();
	scene.add(space);
	const object = new Mesh(new BoxGeometry(2, 1, 3), new MeshStandardMaterial());
	object.position.set(2, -3, 1);
	object.castShadow = true;
	const originalMaterial = object.material,
		originalGeometry = object.geometry;
	let geometryDisposed = false;
	originalGeometry.addEventListener("dispose", () => {
		geometryDisposed = true;
	});
	const preview = new ObjectPlacementPreview(object);
	scene.add(preview.root);
	assert.equal(preview.root.visible, false);
	assert.equal(space.getObjectByProperty("uuid", object.uuid), undefined);
	assert.ok(object.children.some((child) => child.isLineSegments));
	assert.equal(object.castShadow, false);
	preview.move(new Vector3(4, 2, -3));
	assert.equal(preview.root.visible, true);
	const placed = preview.release();
	space.add(placed);
	const bounds = new Box3().setFromObject(placed),
		center = bounds.getCenter(new Vector3());
	close(bounds.min.y, 2);
	close(center.x, 4);
	close(center.z, -3);
	assert.equal(placed.children.length, 0);
	assert.equal(placed.material, originalMaterial);
	assert.equal(placed.geometry, originalGeometry);
	assert.equal(placed.castShadow, true);
	assert.equal(preview.root.parent, null);
	assert.equal(geometryDisposed, false);
});

test("offset furniture uses its bottom center and respects grid snap without changing surface height", () => {
	const object = createFurnitureObject("couch", { layout: "l-right" });
	const preview = new ObjectPlacementPreview(object);
	preview.move(new Vector3(1.17, 0.82, -2.36), 0.5);
	const placed = preview.release(),
		bounds = new Box3().setFromObject(placed),
		center = bounds.getCenter(new Vector3());
	close(bounds.min.y, 0.82);
	close(center.x, 1);
	close(center.z, -2.5);
	assert.equal(placed.parameters.layout, "l-right");
});

test("invalid positions hide the preview and temporary lights remain off until release", () => {
	const object = new Group(),
		light = new PointLight();
	object.add(light);
	const preview = new ObjectPlacementPreview(object);
	assert.equal(light.visible, false);
	preview.move(new Vector3(1, 2, 3));
	assert.deepEqual(object.position.toArray(), [1, 2, 3]);
	preview.move(null);
	assert.equal(preview.root.visible, false);
	preview.move(new Vector3(2, 3, 4));
	assert.equal(preview.root.visible, true);
	preview.release();
	assert.equal(light.visible, true);
});

test("surface picking sees furniture parts, ignores hidden objects and helpers, and falls back to ground", () => {
	const space = new Group(),
		table = createFurnitureObject("table");
	space.add(table);
	const helper = markObjectInternal(
		new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial()),
	);
	helper.position.y = 3;
	space.add(helper);
	const hidden = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
	hidden.position.y = 2;
	hidden.visible = false;
	space.add(hidden);
	const ray = new Raycaster(new Vector3(0, 5, 0), new Vector3(0, -1, 0));
	close(pickObjectPlacementPoint(ray, space).y, table.parameters.height);
	ray.set(new Vector3(5, 5, 0), new Vector3(0, -1, 0));
	assert.deepEqual(pickObjectPlacementPoint(ray, space).toArray(), [5, 0, 0]);
	ray.set(new Vector3(5, 1, 0), new Vector3(0, 1, 0));
	assert.equal(pickObjectPlacementPoint(ray, space), null);
	ray.set(new Vector3(5, 0, 0), new Vector3(0, -1, 0));
	assert.equal(pickObjectPlacementPoint(ray, space), null);
});

test("a preview cannot intersect itself while the pointer moves", () => {
	const scene = new Scene(),
		space = new Group();
	scene.add(space);
	const preview = new ObjectPlacementPreview(
		new Mesh(new BoxGeometry(2, 4, 2), new MeshStandardMaterial()),
	);
	scene.add(preview.root);
	const ray = new Raycaster(new Vector3(0, 10, 0), new Vector3(0, -1, 0));
	for (let i = 0; i < 5; i++)
		preview.move(pickObjectPlacementPoint(ray, space));
	close(preview.release().position.y, 2);
});

test("cancelling frees unique model resources once and leaves no preview in the scene", () => {
	const scene = new Scene(),
		geometry = new BoxGeometry(),
		texture = new Texture(),
		material = new MeshStandardMaterial({ map: texture });
	const object = new Group();
	object.add(new Mesh(geometry, material), new Mesh(geometry, material));
	const disposed = { geometry: 0, material: 0, texture: 0 };
	geometry.addEventListener("dispose", () => disposed.geometry++);
	material.addEventListener("dispose", () => disposed.material++);
	texture.addEventListener("dispose", () => disposed.texture++);
	const preview = new ObjectPlacementPreview(object);
	scene.add(preview.root);
	preview.cancel();
	preview.cancel();
	assert.deepEqual(disposed, { geometry: 1, material: 1, texture: 1 });
	assert.equal(scene.children.length, 0);
	assert.equal(object.parent, null);
});
