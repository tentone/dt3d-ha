import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { Box3, Raycaster, Vector3 } from "three";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(frontend, "tests", ".office-"));
after(() => rm(temporary, { recursive: true, force: true }));
const output = join(temporary, "office.mjs");
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
	item.rooms?.includes("home-office"),
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
test("all 27 office objects are searchable in six categories without duplicating shared models", () => {
	assert.equal(options.length, 14);
	assert.equal(filterModels("", "all", "home-office").length, 14);
	const room = MODEL_ROOMS.find((item) => item.id === "home-office");
	assert.deepEqual(room.categories, [
		"tables-desks",
		"seating",
		"storage",
		"equipment",
		"accessories",
		"other",
	]);
	assert.equal(locale[room.categoryLabels["tables-desks"]], "Desks");
	for (const [queries, type] of [
		[
			[
				"writing desk",
				"computer desk",
				"L-shaped desk",
				"corner desk",
				"executive desk",
			],
			"office-desk",
		],
		[["standing desk"], "standing-desk"],
		[
			["office chair", "ergonomic chair", "visitor chair", "stool"],
			"office-chair",
		],
		[
			[
				"filing cabinet",
				"bookshelf",
				"drawer unit",
				"storage cabinet",
				"wall shelving",
			],
			"office-storage",
		],
		[["desktop computer"], "desktop-computer"],
		[["monitor"], "office-monitor"],
		[["laptop"], "office-laptop"],
		[["printer", "scanner"], "office-printer"],
		[["desk lamp"], "office-desk-lamp"],
		[["monitor stand"], "monitor-stand"],
		[["whiteboard", "noticeboard"], "office-board"],
		[["meeting table"], "meeting-table"],
		[["sofa"], "couch"],
		[["lounge chair"], "accent-chair"],
	])
		for (const query of queries)
			assert.ok(
				filterModels(query, "all", "home-office").some(
					(item) => item.type === `furniture-${type}`,
				),
				query,
			);
	for (const type of ["couch", "accent-chair"]) {
		assert.equal(
			MODEL_LIBRARY.filter((item) => item.type === `furniture-${type}`).length,
			1,
		);
		assert.ok(
			filterModels("", "other", "home-office").some(
				(item) => item.type === `furniture-${type}`,
			),
		);
	}
	for (const [room, count] of [
		["living-room", 18],
		["dining-room", 8],
		["bathroom", 11],
		["kitchen", 17],
		["master-bedroom", 14],
		["childrens-bedroom", 14],
	])
		assert.equal(filterModels("", "all", room).length, count);
});

test("L and corner desks keep a true open footprint, mirrored returns and an optional cable hole", () => {
	const desk = createFurnitureObject("office-desk", { style: "l-shaped-desk" });
	const hit = (x, z) => {
		desk.updateMatrixWorld(true);
		return new Raycaster(
			new Vector3(x, 3, z),
			new Vector3(0, -1, 0),
		).intersectObject(desk.getObjectByName("Office Desk Top")).length;
	};
	assert.equal(hit(0.5, 0.5), 0);
	assert.ok(hit(-0.7, 0.5));
	assert.ok(hit(0.5, -0.6));
	desk.setConfiguration("returnSide", "right-return");
	assert.equal(hit(-0.7, 0.5), 0);
	assert.ok(hit(0.7, 0.5));
	desk.setConfiguration("style", "corner-desk");
	assert.equal(hit(0.5, 0.5), 0);
	desk.setConfiguration("style", "writing-desk");
	const z =
		-Number(desk.parameters.depth) / 2 + Number(desk.parameters.depth) * 0.23;
	assert.equal(hit(0, z), 0);
	desk.setConfiguration("cablePort", false);
	assert.ok(hit(0, z));
	desk.dispose();
});

test("computer keyboard trays and executive desk drawers extend while standing desk settings remain compatible", () => {
	const desk = createFurnitureObject("office-desk", { style: "computer-desk" }),
		z = desk.getObjectByName("Keyboard Tray").position.z;
	desk.setConfiguration("trayOpen", 1);
	assert.ok(desk.getObjectByName("Keyboard Tray").position.z > z + 0.2);
	desk.setConfiguration("style", "executive-desk");
	assert.equal(parts(desk, "Desk Pedestal Body").length, 2);
	assert.equal(parts(desk, "Desk Drawer Front").length, 6);
	desk.setConfiguration("drawerOpen", 1);
	assert.equal(parts(desk, "Desk Drawer Bottom").length, 6);
	const parameters = {
			width: 1.6,
			depth: 0.75,
			height: 1.15,
			topThickness: 0.04,
			legThickness: 0.08,
			legInset: 0.15,
		},
		standing = createFurnitureObject("standing-desk", parameters);
	assert.deepEqual(standing.getParameters(), parameters);
	desk.dispose();
	standing.dispose();
});

test("office seating presets rebuild caster bases, mesh backs, headrests and stool footrests", () => {
	const chair = createFurnitureObject("office-chair", {
		style: "ergonomic-chair",
	});
	assert.equal(parts(chair, "Office Caster").length, 5);
	assert.equal(parts(chair, "Ergonomic Mesh Band").length, 9);
	assert.ok(chair.getObjectByName("Office Headrest"));
	chair.setConfiguration("headrest", false);
	assert.equal(parts(chair, "Office Headrest").length, 0);
	chair.setConfiguration("backTilt", 25);
	assert.ok(
		Math.abs(
			chair.getObjectByName("Office Back Hinge").rotation.x +
				(25 * Math.PI) / 180,
		) < 1e-9,
	);
	chair.setConfiguration("meshBack", false);
	assert.equal(parts(chair, "Office Chair Back").length, 1);
	chair.setConfiguration("style", "visitor-chair");
	assert.equal(parts(chair, "Office Caster").length, 0);
	assert.equal(parts(chair, "Furniture Leg").length, 4);
	chair.setConfiguration("style", "office-stool");
	assert.ok(chair.getObjectByName("Office Stool Footrest"));
	assert.equal(parts(chair, "Office Chair Back").length, 0);
	chair.dispose();
});

test("filing drawers, cabinet doors, binder contents and wall shelving respond to controls", () => {
	const storage = createFurnitureObject("office-storage");
	assert.equal(parts(storage, "Filing Label").length, 3);
	storage.setConfiguration("drawerOpen", 1);
	assert.equal(parts(storage, "Office Drawer Bottom").length, 3);
	storage.setConfiguration("style", "bookshelf");
	assert.ok(parts(storage, "Office Binder").length > 0);
	storage.setConfiguration("contentsEnabled", false);
	assert.equal(parts(storage, "Office Binder").length, 0);
	storage.setConfiguration("style", "storage-cabinet");
	const z = new Box3().setFromObject(storage).max.z;
	storage.setConfiguration("doorsOpen", true);
	assert.ok(new Box3().setFromObject(storage).max.z > z + 0.3);
	storage.setConfiguration("style", "wall-shelving");
	assert.equal(parts(storage, "Office Wall Shelf").length, 3);
	assert.equal(parts(storage, "Office Storage Side").length, 0);
	storage.dispose();
});

test("monitor arrangements grow by screen count and laptop lids change occupied height without changing saved size", () => {
	const monitor = createFurnitureObject("office-monitor", { screenCount: 3 });
	assert.equal(parts(monitor, "Monitor Screen").length, 3);
	assert.ok(new Box3().setFromObject(monitor).getSize(new Vector3()).x > 1.8);
	monitor.setConfiguration("screenTilt", 15);
	assert.ok(
		Math.abs(
			monitor.getObjectByName("Monitor Tilt Hinge").rotation.x - Math.PI / 12,
		) < 1e-9,
	);
	const laptop = createFurnitureObject("office-laptop"),
		height = laptop.parameters.height,
		open = new Box3().setFromObject(laptop).max.y;
	laptop.setConfiguration("lidOpen", false);
	assert.ok(new Box3().setFromObject(laptop).max.y < open * 0.3);
	assert.equal(laptop.parameters.height, height);
	monitor.dispose();
	laptop.dispose();
});

test("computer and printer presets switch their construction and scanner lids reveal a flatbed", () => {
	const computer = createFurnitureObject("desktop-computer");
	assert.ok(computer.getObjectByName("Computer Tower"));
	computer.setConfiguration("style", "all-in-one-computer");
	assert.equal(parts(computer, "Computer Tower").length, 0);
	assert.ok(computer.getObjectByName("Computer Screen"));
	computer.setConfiguration("keyboardEnabled", true);
	assert.ok(computer.getObjectByName("Computer Keyboard"));
	const printer = createFurnitureObject("office-printer");
	assert.ok(printer.getObjectByName("Printer Output Tray"));
	printer.setConfiguration("style", "scanner");
	assert.equal(parts(printer, "Printer Output Tray").length, 0);
	const h = new Box3().setFromObject(printer).max.y;
	printer.setConfiguration("lidOpen", true);
	assert.ok(new Box3().setFromObject(printer).max.y > h + 0.1);
	assert.ok(printer.getObjectByName("Scanner Glass"));
	computer.dispose();
	printer.dispose();
});

test("desk lamp head carries its source and turns off all illumination", () => {
	const lamp = createFurnitureObject("office-desk-lamp", { intensity: 2 });
	assert.equal(lamp.getObjectByName("Desk Lamp Light").intensity, 2);
	assert.equal(
		lamp.getObjectByName("Desk Lamp Light").parent.name,
		"Desk Lamp Head Hinge",
	);
	lamp.setConfiguration("headTilt", 30);
	assert.ok(
		Math.abs(
			lamp.getObjectByName("Desk Lamp Head Hinge").rotation.x - Math.PI / 6,
		) < 1e-9,
	);
	lamp.setConfiguration("enabled", false);
	assert.equal(lamp.getObjectByName("Desk Lamp Light").intensity, 0);
	lamp.dispose();
});

test("monitor stand drawers, noticeboard pins, floor stands and meeting tables remain configurable", () => {
	const stand = createFurnitureObject("monitor-stand", { drawerEnabled: true });
	const z = new Box3().setFromObject(stand).max.z;
	stand.setConfiguration("drawerOpen", 1);
	assert.ok(new Box3().setFromObject(stand).max.z > z + 0.1);
	const board = createFurnitureObject("office-board", { style: "noticeboard" });
	assert.equal(parts(board, "Noticeboard Pin").length, 4);
	board.setConfiguration("standEnabled", true);
	assert.equal(parts(board, "Board Stand Foot").length, 2);
	board.setConfiguration("contentsEnabled", false);
	assert.equal(parts(board, "Board Note").length, 0);
	const meeting = createFurnitureObject("meeting-table");
	assert.equal(meeting.parameters.topShape, "oval");
	assert.ok(new Box3().setFromObject(meeting).getSize(new Vector3()).x > 2.1);
	for (const object of [stand, board, meeting]) object.dispose();
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
