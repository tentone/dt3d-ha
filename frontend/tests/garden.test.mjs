import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".garden-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "garden.mjs");
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
	item.rooms?.includes("garden"),
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
test("all 24 garden objects are searchable in five categories and shared models remain unique", () => {
	assert.equal(options.length, 15);
	assert.equal(filterModels("", "all", "garden").length, 15);
	assert.deepEqual(
		MODEL_ROOMS.find((room) => room.id === "garden").categories,
		[
			"garden-furniture",
			"recreation",
			"landscaping",
			"structures",
			"equipment",
		],
	);
	for (const [queries, type, category] of [
		[
			["picnic table", "garden bench", "outdoor dining set"],
			"garden-furniture",
			"garden-furniture",
		],
		[["swing chair"], "suspended-seat", "garden-furniture"],
		[["swimming pool"], "garden-pool", "recreation"],
		[["trampoline"], "garden-trampoline", "recreation"],
		[["swing set"], "garden-swing-set", "recreation"],
		[["slide"], "garden-slide", "recreation"],
		[["sandbox"], "garden-sandbox", "recreation"],
		[["playhouse"], "garden-playhouse", "recreation"],
		[["tree", "shrub"], "garden-vegetation", "landscaping"],
		[["flower bed", "planter"], "outdoor-planter", "landscaping"],
		[["garden path"], "garden-path", "landscaping"],
		[["fountain", "pond"], "garden-water-feature", "landscaping"],
		[["garden shed", "greenhouse", "gazebo"], "garden-building", "structures"],
		[["pergola"], "pergola", "structures"],
		[
			["compost bin", "rainwater tank", "lawn mower storage"],
			"garden-equipment",
			"equipment",
		],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, category, "garden").some(
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
		["patio", 15],
	])
		assert.equal(filterModels("", "all", room).length, count, room);
});

test("garden furniture changes between integrated picnic seating, a bench and a dining set", () => {
	const item = createFurnitureObject("garden-furniture");
	assert.equal(parts(item, "Picnic A-frame Leg").length, 4);
	assert.equal(parts(item, "Picnic Bench Slat").length, 6);
	item.setConfiguration("style", "garden-bench");
	assert.equal(parts(item, "Garden Table Slat").length, 0);
	assert.equal(parts(item, "Garden Seat Back Slat").length, 3);
	item.setConfiguration("backrest", false);
	assert.equal(parts(item, "Garden Seat Back Slat").length, 0);
	item.setConfiguration("style", "outdoor-dining-set");
	item.setConfiguration("chairCount", 4);
	item.setConfiguration("endChairs", false);
	assert.equal(parts(item, "Garden Seat Leg").length, 16);
	item.setConfiguration("endChairs", true);
	assert.equal(parts(item, "Garden Seat Leg").length, 24);
	item.dispose();
});

test("swimming pools have transparent water and open basins for both shapes", () => {
	for (const shape of ["rectangle", "round"]) {
		const pool = createFurnitureObject("garden-pool", {
			shape,
			stepsEnabled: false,
			ladderEnabled: false,
		});
		assert.equal(parts(pool, "Pool Water")[0].material.transparent, true);
		pool.setConfiguration("waterEnabled", false);
		pool.updateMatrixWorld(true);
		const hit = new Raycaster(
			new Vector3(0, 3, 0),
			new Vector3(0, -1, 0),
		).intersectObjects(parts(pool), false)[0];
		assert.ok(hit.point.y < Number(pool.parameters.height) * 0.2);
		pool.setConfiguration("ladderEnabled", true);
		assert.equal(parts(pool, "Pool Ladder Rung").length, 5);
		pool.dispose();
	}
});

test("trampoline enclosure and supports follow the pole and net controls", () => {
	const item = createFurnitureObject("garden-trampoline");
	item.setConfiguration("poleCount", 10);
	assert.equal(parts(item, "Trampoline Net Pole").length, 10);
	assert.equal(parts(item, "Trampoline Leg").length, 10);
	assert.equal(
		parts(item, "Trampoline Safety Net")[0].material.transparent,
		true,
	);
	const tall = new Box3().setFromObject(item).getSize(new Vector3()).y;
	item.setConfiguration("netEnabled", false);
	assert.equal(parts(item, "Trampoline Safety Net").length, 0);
	assert.ok(
		new Box3().setFromObject(item).getSize(new Vector3()).y < tall * 0.5,
	);
	item.setConfiguration("ladderEnabled", false);
	assert.equal(parts(item, "Trampoline Ladder Rung").length, 0);
	item.dispose();
});

test("swing seats and suspension rotate together while the frame stays fixed", () => {
	const item = createFurnitureObject("garden-swing-set", { seatCount: 3 }),
		frame = parts(item, "Swing A-frame")[0].position.toArray();
	item.setConfiguration("swingAngle", 25);
	assert.equal(parts(item, "Swing Seat").length, 3);
	assert.equal(parts(item, "Swing Suspension").length, 6);
	assert.ok(item.getObjectByName("Garden Swing Pivot").rotation.x > 0.4);
	assert.deepEqual(parts(item, "Swing A-frame")[0].position.toArray(), frame);
	item.dispose();
});

test("slides rebuild wavy chutes and ladder rungs, and sandbox covers hide toys and benches", () => {
	const slide = createFurnitureObject("garden-slide");
	slide.setConfiguration("style", "wavy-slide");
	slide.setConfiguration("rungCount", 8);
	assert.equal(parts(slide, "Slide Ladder Rung").length, 8);
	slide.setConfiguration("handrails", false);
	assert.equal(parts(slide, "Slide Handrail").length, 0);
	slide.dispose();
	const sandbox = createFurnitureObject("garden-sandbox");
	assert.equal(parts(sandbox, "Sandbox Bucket").length, 2);
	sandbox.setConfiguration("coverClosed", true);
	assert.equal(parts(sandbox, "Sandbox Bucket").length, 0);
	assert.equal(parts(sandbox, "Sandbox Bench").length, 0);
	assert.equal(parts(sandbox, "Sandbox Cover").length, 1);
	sandbox.dispose();
});

test("tree and shrub presets resize vegetation, recolor foliage and expose bare branches", () => {
	const item = createFurnitureObject("garden-vegetation");
	item.setConfiguration("clumpCount", 12);
	assert.equal(parts(item, "Garden Foliage").length, 12);
	item.setConfiguration("foliage", "autumn");
	assert.equal(
		parts(item, "Garden Foliage")[0].material.color.getHex(),
		0xb29a58,
	);
	item.setConfiguration("style", "shrub");
	assert.equal(item.parameters.height, 0.7);
	item.setConfiguration("leavesEnabled", false);
	assert.equal(parts(item, "Garden Foliage").length, 0);
	item.setConfiguration("style", "conifer");
	item.setConfiguration("leavesEnabled", true);
	assert.equal(parts(item, "Conifer Crown").length, 4);
	item.dispose();
});

test("garden paths provide separated stones, curved edging and gravel variants", () => {
	const item = createFurnitureObject("garden-path", {
		stepCount: 4,
		columns: 2,
	});
	assert.equal(parts(item, "Garden Paving Slab").length, 8);
	item.setConfiguration("style", "stepping-stones");
	assert.equal(parts(item, "Garden Stepping Stone").length, 8);
	item.setConfiguration("curve", 1);
	item.setConfiguration("edging", true);
	assert.equal(parts(item, "Garden Path Edge").length, 2);
	item.setConfiguration("style", "gravel");
	assert.equal(parts(item, "Garden Gravel Bed").length, 4);
	assert.equal(parts(item, "Garden Stepping Stone").length, 0);
	item.dispose();
});

test("fountain streams stop with the pump and ponds expose configurable border stones and lilies", () => {
	const item = createFurnitureObject("garden-water-feature");
	assert.equal(parts(item, "Fountain Water Stream").length, 6);
	item.setConfiguration("pumpOn", false);
	assert.equal(parts(item, "Fountain Water Stream").length, 0);
	item.setConfiguration("style", "pond");
	item.setConfiguration("stoneCount", 20);
	item.setConfiguration("plantCount", 4);
	assert.equal(parts(item, "Pond Border Stone").length, 20);
	assert.equal(parts(item, "Pond Lily Pad").length, 4);
	item.setConfiguration("waterEnabled", false);
	assert.equal(parts(item, "Pond Lily Pad").length, 0);
	assert.equal(parts(item, "Garden Feature Water").length, 0);
	item.dispose();
});

test("sheds have opening doors and glazed side openings, greenhouses stay transparent and gazebos stay open", () => {
	const item = createFurnitureObject("garden-building");
	item.setConfiguration("doorsOpen", true);
	assert.ok(item.getObjectByName("Garden Building Door Hinge").rotation.y < -1);
	item.updateMatrixWorld(true);
	assert.equal(
		new Raycaster(
			new Vector3(0, 0.6, 3),
			new Vector3(0, 0, -1),
		).intersectObjects(parts(item, "Garden Building Front"), false).length,
		0,
	);
	item.setConfiguration("windowsEnabled", false);
	assert.equal(parts(item, "Building Window Glass").length, 0);
	item.setConfiguration("style", "greenhouse");
	assert.ok(
		parts(item, "Greenhouse Side Glass").every(
			(mesh) => mesh.material.transparent && mesh.castShadow === false,
		),
	);
	item.setConfiguration("style", "gazebo");
	item.setConfiguration("gazeboSides", 8);
	assert.equal(parts(item, "Gazebo Post").length, 8);
	assert.equal(parts(item, "Garden Building Door").length, 0);
	assert.equal(parts(item, "Gazebo Roof Panel").length, 8);
	item.dispose();
});

test("garden playhouses remain a distinct recreation model and support porch and door controls", () => {
	const item = createFurnitureObject("garden-playhouse");
	assert.equal(item.furnitureType, "garden-playhouse");
	assert.equal(parts(item, "Playhouse Porch").length, 1);
	item.setConfiguration("porchEnabled", false);
	assert.equal(parts(item, "Playhouse Porch").length, 0);
	item.setConfiguration("doorsOpen", true);
	assert.ok(item.getObjectByName("Garden Building Door Hinge").rotation.y < -1);
	item.dispose();
});

test("compost hatches, tank lids and mower storage doors expose their stored contents", () => {
	const item = createFurnitureObject("garden-equipment");
	item.setConfiguration("hatchOpen", true);
	assert.ok(item.getObjectByName("Compost Hatch Hinge").rotation.x > 1);
	item.setConfiguration("style", "rainwater-tank");
	item.setConfiguration("lidOpen", true);
	assert.equal(parts(item, "Tank Stored Water").length, 1);
	assert.ok(item.getObjectByName("Rainwater Lid Hinge").rotation.x < -1);
	item.setConfiguration("tapEnabled", false);
	assert.equal(parts(item, "Rainwater Tap").length, 0);
	item.setConfiguration("style", "lawn-mower-storage");
	assert.equal(parts(item, "Stored Mower Wheel").length, 4);
	item.setConfiguration("doorsOpen", true);
	const hinges = [];
	item.traverse((part) => {
		if (part.name === "Mower Storage Door Hinge") hinges.push(part.rotation.y);
	});
	assert.ok(hinges.includes(Math.PI * 0.6) && hinges.includes(-Math.PI * 0.6));
	item.setConfiguration("contentsEnabled", false);
	assert.equal(parts(item, "Stored Mower Body").length, 0);
	item.dispose();
});

test("shared planters include a low flower-bed preset and maintain the existing patio defaults", () => {
	const item = createFurnitureObject("outdoor-planter");
	assert.equal(item.parameters.style, "planter");
	item.setConfiguration("style", "flower-bed");
	assert.equal(item.parameters.height, 0.15);
	assert.equal(item.parameters.legsEnabled, false);
	assert.equal(parts(item, "Planter Flower Center").length, 6);
	item.dispose();
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
