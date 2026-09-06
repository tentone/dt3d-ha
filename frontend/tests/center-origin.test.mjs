import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { BoxGeometry, Group, Mesh, Object3D, Vector3 } from "three";

const bundled = await build({
	entryPoints: [
		fileURLToPath(new URL("../src/editor/center-origin.ts", import.meta.url)),
	],
	bundle: true,
	write: false,
	format: "esm",
	external: ["three"],
});
const code = bundled.outputFiles[0].text.replaceAll(
	'from "three"',
	`from ${JSON.stringify(import.meta.resolve("three"))}`,
);
const { centerOrigins } = await import(
	`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`
);

function vertices(mesh) {
	mesh.updateWorldMatrix(true, false);
	return Array.from(
		{ length: mesh.geometry.attributes.position.count },
		(_, i) =>
			new Vector3()
				.fromBufferAttribute(mesh.geometry.attributes.position, i)
				.applyMatrix4(mesh.matrixWorld),
	);
}
function same(actual, expected) {
	actual.forEach((point, i) => assert.ok(point.distanceTo(expected[i]) < 1e-5));
}

test("nested rotated/scaled meshes stay in place, isolate shared geometry, and undo/redo", () => {
	const root = new Group();
	root.rotation.set(0.4, -0.6, 0.2);
	root.scale.set(2, 0.7, -1);
	const geometry = new BoxGeometry().translate(4, 2, -3);
	const parent = new Mesh(geometry);
	parent.userData.meshType = "cube";
	parent.rotation.set(0.2, 0.8, -0.3);
	parent.scale.set(3, 2, 0.5);
	const child = new Mesh(geometry);
	child.position.set(1, 5, 2);
	child.rotation.set(0.5, 0.2, 0.3);
	child.matrixAutoUpdate = false;
	child.updateMatrix();
	const marker = new Object3D();
	child.add(marker);
	parent.add(child);
	root.add(parent);
	const outside = new Mesh(geometry);
	root.add(outside);
	const before = [parent, child, outside].map(vertices);
	const markerBefore = marker.getWorldPosition(new Vector3());
	const edit = centerOrigins(parent);
	[parent, child, outside].forEach((mesh, i) =>
		same(vertices(mesh), before[i]),
	);
	assert.ok(
		marker.getWorldPosition(new Vector3()).distanceTo(markerBefore) < 1e-8,
	);
	for (const mesh of [parent, child]) {
		assert.ok(
			mesh.geometry.boundingBox.getCenter(new Vector3()).length() < 1e-8,
		);
		assert.equal(mesh.geometry.type, "BufferGeometry");
	}
	assert.equal(outside.geometry, geometry);
	assert.equal(parent.userData.meshType, undefined);
	edit.undo();
	assert.equal(parent.geometry, geometry);
	assert.equal(parent.userData.meshType, "cube");
	[parent, child, outside].forEach((mesh, i) =>
		same(vertices(mesh), before[i]),
	);
	edit.redo();
	[parent, child, outside].forEach((mesh, i) =>
		same(vertices(mesh), before[i]),
	);
	assert.equal(centerOrigins(parent).objects.length, 0);
});

test("empty, locked, internal, and loading meshes are left alone", () => {
	const root = new Group();
	for (const kind of ["locked", "internal", "resourcePlaceholder"]) {
		const mesh = new Mesh(new BoxGeometry().translate(1, 2, 3));
		if (kind === "resourcePlaceholder") mesh.userData[kind] = true;
		else mesh[kind] = true;
		root.add(mesh);
	}
	root.add(new Mesh());
	assert.equal(centerOrigins(root).objects.length, 0);
});
