/* global window, document, URL, crypto, Buffer, HTMLCanvasElement */
import { expect, test } from "@playwright/test";

const space = {
	id: "test-space",
	name: "Preview tests",
	description: "",
	is_default: true,
	cache_version: 1,
	config: {},
	object_instances: [],
	created_at: 1,
	updated_at: 1,
};

test.beforeEach(async ({ page }) => {
	await page.route("**/api/**", async (route) => {
		const request = route.request();
		const path = new URL(request.url()).pathname;
		let data =
			path === "/api/spaces" && request.method() === "GET"
				? [space]
				: path.endsWith("/version")
					? { cache_version: 1 }
					: space;
		if (request.method() === "POST" && path.endsWith("/objects"))
			data = {
				...request.postDataJSON(),
				id: crypto.randomUUID(),
				space_id: space.id,
			};
		await route.fulfill({ json: data });
	});
	await page.goto("/tests/model-library.html");
	await expect(
		page.getByRole("button", { name: "Model Library", exact: true }),
	).toBeVisible();
	await expect
		.poll(() => page.evaluate(() => window.testCard.spaceSync?.editingBlocked))
		.toBe(false);
});

async function openLibrary(page) {
	await page
		.getByRole("button", { name: "Model Library", exact: true })
		.click();
	await expect(
		page.getByRole("dialog", { name: "Model Library" }),
	).toBeVisible();
}

async function preparePlacementView(page) {
	await page.evaluate(() => {
		const card = window.testCard;
		card.camera.position.set(5, 5, 7);
		card.controls.target?.set(0, 0, 0);
		card.controls.update(0);
		card.camera.updateMatrixWorld(true);
	});
}

async function placeSelectedModel(page) {
	await expect(page.locator("dt3d-hint-box")).toContainText(
		"Double click on the space to place the object",
	);
	await preparePlacementView(page);
	await page
		.locator("dt3d-card > div > div > canvas")
		.dblclick({ position: { x: 590, y: 430 } });
	await expect(page.locator("dt3d-hint-box")).not.toContainText(
		"Double click on the space to place the object",
	);
}

test("home gym shows all four categories and treadmill controls save and undo after placement", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-gym");
	await expect(library.locator(".model")).toHaveCount(14);
	await expect(library.locator(".preview img")).toHaveCount(14);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Cardio",
		"Strength",
		"Accessories",
		"Other",
	]);
	await library.getByRole("searchbox").fill("treadmill");
	await library
		.getByRole("button", { name: "Add Treadmill", exact: true })
		.click();
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children.some(
					(item) => item.userData.meshType === "furniture-treadmill",
				),
			),
		)
		.toBe(false);
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Treadmill configuration" })
		.click();
	const incline = inspector.getByRole("spinbutton", {
		name: "Treadmill incline (°)",
		exact: true,
	});
	await incline.fill("12");
	await incline.blur();
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-treadmill")
			.getParameters(),
	);
	const folded = inspector.getByRole("checkbox", {
		name: "Fold treadmill deck",
		exact: true,
	});
	await folded.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-treadmill" &&
					item.data.furniture.incline === 12 &&
					item.data.furniture.folded === true,
			),
		)
		.toBe(true);
	await folded.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-treadmill")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("gym cable and mat presets rebuild their variants and persist their configurations", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-gym");
	await library.getByRole("searchbox").fill("multi-gym");
	await library
		.getByRole("button", { name: "Add Cable machine / multi-gym", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Cable machine configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Cable machine preset", exact: true })
		.selectOption("multi-gym");
	const angle = inspector.getByRole("spinbutton", {
		name: "Multi-gym press angle (°)",
		exact: true,
	});
	await angle.fill("40");
	await angle.blur();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "multi-gym" &&
					item.data.furniture.seatEnabled === true &&
					item.data.furniture.pressAngle === 40,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-cable-machine",
						)
						.getObjectByName("Gym Seat Pad"),
				),
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-gym");
	await library.getByRole("searchbox").fill("yoga mat");
	await library
		.getByRole("button", { name: "Add Yoga / exercise mat", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Exercise mat configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Exercise mat preset", exact: true })
		.selectOption("exercise-mat");
	await inspector
		.getByRole("checkbox", { name: "Roll up mat", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-exercise-mat" &&
					item.data.furniture.style === "exercise-mat" &&
					item.data.furniture.height === 0.03 &&
					item.data.furniture.rolled === true,
			),
		)
		.toBe(true);
});

test("gym rack searches stay in their categories and stored contents can be edited", async ({
	page,
}) => {
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-gym");
	await library
		.locator("nav")
		.getByRole("button", { name: /^Strength\b/ })
		.click();
	await expect(library.locator(".model")).toHaveCount(4);
	await library.getByRole("searchbox").fill("dumbbell rack");
	await library
		.getByRole("button", { name: "Add Dumbbell rack", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Gym rack configuration" })
		.click();
	const levels = inspector.getByRole("spinbutton", {
		name: "Equipment rack levels",
		exact: true,
	});
	await levels.fill("3");
	await levels.blur();
	await inspector
		.getByRole("checkbox", { name: "Stored gym equipment", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const rack = window.testCard.space.children.find(
					(item) => item.userData.meshType === "furniture-dumbbell-rack",
				);
				let trays = 0,
					weights = 0;
				rack.traverse((part) => {
					if (part.name === "Gym Rack Tray") trays++;
					if (part.name === "Dumbbell Weight") weights++;
				});
				return { trays, weights };
			}),
		)
		.toEqual({ trays: 3, weights: 0 });
	await openLibrary(page);
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-gym");
	await library
		.locator("nav")
		.getByRole("button", { name: /^Accessories\b/ })
		.click();
	await library.getByRole("searchbox").fill("kettlebell rack");
	await expect(
		library.getByRole("button", { name: "Add Kettlebell rack", exact: true }),
	).toBeVisible();
});

test("gym bike presets update dimensions and retain level opposed pedals", async ({
	page,
}) => {
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-gym");
	await library.getByRole("searchbox").fill("exercise bike");
	await library
		.getByRole("button", { name: "Add Exercise bike", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Exercise bike configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Exercise bike preset", exact: true })
		.selectOption("recumbent-bike");
	const angle = inspector.getByRole("spinbutton", {
		name: "Bike pedal position (°)",
		exact: true,
	});
	await angle.fill("90");
	await angle.blur();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const bike = window.testCard.space.children.find(
					(item) => item.userData.meshType === "furniture-exercise-bike",
				);
				return {
					depth: bike.parameters.depth,
					angle: bike.parameters.pedalAngle,
					back: Boolean(bike.getObjectByName("Bike Seat Back")),
				};
			}),
		)
		.toEqual({ depth: 1.65, angle: 90, back: true });
});

test("game room library shows five categories and gaming chair configurations save and undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("game-room");
	await expect(library.locator(".model")).toHaveCount(14);
	await expect(library.locator(".preview img")).toHaveCount(14);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Seating",
		"Gaming",
		"Tables",
		"Entertainment",
		"Storage",
	]);
	await library.getByRole("searchbox").fill("gaming chair");
	await library
		.getByRole("button", { name: "Add Gaming chair", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Gaming chair configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Gaming accent color", exact: true })
		.selectOption("purple");
	const recline = inspector.getByRole("spinbutton", {
		name: "Gaming chair recline (°)",
		exact: true,
	});
	await recline.fill("30");
	await recline.blur();
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-gaming-chair")
			.getParameters(),
	);
	const footrest = inspector.getByRole("checkbox", {
		name: "Gaming chair footrest",
		exact: true,
	});
	await footrest.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-gaming-chair" &&
					item.data.furniture.recline === 30 &&
					item.data.furniture.accent === "purple" &&
					item.data.furniture.footrest === true,
			),
		)
		.toBe(true);
	await footrest.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-gaming-chair")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("arcade and console presets save their controls and handheld configuration", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("game-room");
	await library.getByRole("searchbox").fill("arcade machine");
	await library
		.getByRole("button", { name: "Add Arcade machine", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Arcade machine configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Arcade preset", exact: true })
		.selectOption("bartop");
	const buttons = inspector.getByRole("spinbutton", {
		name: "Buttons per arcade player",
		exact: true,
	});
	await buttons.fill("8");
	await buttons.blur();
	await inspector
		.getByRole("checkbox", { name: "Screen / power indicator on", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "bartop" &&
					item.data.furniture.buttons === 8 &&
					item.data.furniture.powered === false,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("game-room");
	await library.getByRole("searchbox").fill("gaming console");
	await library
		.getByRole("button", { name: "Add Gaming console", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Gaming console configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Gaming console preset", exact: true })
		.selectOption("handheld");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-gaming-console" &&
					item.data.furniture.style === "handheld" &&
					item.data.furniture.controllers === 0,
			),
		)
		.toBe(true);
});

test("game table presets save folding and poker settings and update their geometry", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("game-room");
	await library.getByRole("searchbox").fill("ping-pong table");
	await library
		.getByRole("button", { name: "Add Game tables", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Game table configuration" })
		.click();
	const preset = inspector.getByRole("combobox", {
		name: "Game table preset",
		exact: true,
	});
	await preset.selectOption("ping-pong-table");
	await inspector
		.getByRole("checkbox", { name: "Fold ping-pong table", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "ping-pong-table" &&
					item.data.furniture.folded === true,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find((item) => item.userData.meshType === "furniture-game-table")
						.getObjectByName("Ping Pong Net"),
				),
			),
		)
		.toBe(false);
	await preset.selectOption("poker-table");
	const places = inspector.getByRole("spinbutton", {
		name: "Poker places",
		exact: true,
	});
	await places.fill("8");
	await places.blur();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "poker-table" &&
					item.data.furniture.playerCount === 8 &&
					item.data.furniture.folded === false,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() => {
				let n = 0;
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-game-table")
					.traverse((item) => {
						if (item.name === "Poker Card") n++;
					});
				return n;
			}),
		)
		.toBe(16);
});

test("gaming desks, racing rigs and game cabinets expose functioning setup controls", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("game-room");
	await library.getByRole("searchbox").fill("gaming desk");
	await library
		.getByRole("button", { name: "Add Gaming desk", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Gaming desk configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Gaming desk layout", exact: true })
		.selectOption("l-shaped");
	await inspector
		.getByRole("combobox", { name: "Gaming desk return side", exact: true })
		.selectOption("right-return");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-gaming-desk" &&
					item.data.furniture.layout === "l-shaped" &&
					item.data.furniture.returnSide === "right-return",
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("game-room");
	await library.getByRole("searchbox").fill("racing simulator");
	await library
		.getByRole("button", { name: "Add Racing simulator", exact: true })
		.click();
	await placeSelectedModel(page);
	let summary = inspector
		.locator("summary")
		.filter({ hasText: "Racing simulator configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	const wheel = inspector.getByRole("spinbutton", {
		name: "Steering wheel angle (°)",
		exact: true,
	});
	await wheel.fill("35");
	await wheel.blur();
	await inspector
		.getByRole("checkbox", { name: "Racing gear shifter", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-racing-simulator" &&
					item.data.furniture.wheelAngle === 35 &&
					item.data.furniture.shifter === false,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("game-room");
	await library.getByRole("searchbox").fill("game storage cabinet");
	await library
		.getByRole("button", {
			name: "Add Media shelving / game cabinets",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	summary = inspector
		.locator("summary")
		.filter({ hasText: "Game storage configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Game storage preset", exact: true })
		.selectOption("game-storage-cabinet");
	await inspector
		.getByRole("checkbox", { name: "Glass game cabinet doors", exact: true })
		.check();
	await inspector
		.getByRole("checkbox", { name: "Open game cabinet doors", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "game-storage-cabinet" &&
					item.data.furniture.glassDoors === true &&
					item.data.furniture.doorsOpen === true,
			),
		)
		.toBe(true);
});

test("garden library shows five categories and dining configurations save and undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garden");
	await expect(library.locator(".model")).toHaveCount(15);
	await expect(library.locator(".preview img")).toHaveCount(15);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Furniture",
		"Recreation",
		"Landscaping",
		"Structures",
		"Equipment",
	]);
	await library.getByRole("searchbox").fill("picnic table");
	await library
		.getByRole("button", {
			name: "Add Picnic tables / benches / dining sets",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Garden furniture configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Garden furniture preset", exact: true })
		.selectOption("outdoor-dining-set");
	const chairs = inspector.getByRole("spinbutton", {
		name: "Chairs along table sides",
		exact: true,
	});
	await chairs.fill("4");
	await chairs.blur();
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-garden-furniture")
			.getParameters(),
	);
	const ends = inspector.getByRole("checkbox", {
		name: "Dining set end chairs",
		exact: true,
	});
	await ends.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "outdoor-dining-set" &&
					item.data.furniture.chairCount === 4 &&
					item.data.furniture.endChairs === false,
			),
		)
		.toBe(true);
	await ends.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find(
						(item) => item.userData.meshType === "furniture-garden-furniture",
					)
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("garden pools and trampolines expose water and safety enclosure controls", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garden");
	await library.getByRole("searchbox").fill("swimming pool");
	await library
		.getByRole("button", { name: "Add Swimming pool", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Swimming pool configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Swimming pool shape", exact: true })
		.selectOption("round");
	await inspector
		.getByRole("checkbox", { name: "Include water", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-garden-pool" &&
					item.data.furniture.shape === "round" &&
					item.data.furniture.waterEnabled === false,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garden");
	await library.getByRole("searchbox").fill("trampoline");
	await library
		.getByRole("button", { name: "Add Trampoline", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Trampoline configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("checkbox", { name: "Trampoline safety net", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-garden-trampoline" &&
					item.data.furniture.netEnabled === false,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find(
							(item) =>
								item.userData.meshType === "furniture-garden-trampoline",
						)
						.getObjectByName("Trampoline Safety Net"),
				),
			),
		)
		.toBe(false);
});

test("garden buildings switch between glazed greenhouses and open gazebos and playhouses keep their own controls", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garden");
	await library.getByRole("searchbox").fill("greenhouse");
	await library
		.getByRole("button", {
			name: "Add Sheds / greenhouses / gazebos",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Garden building configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Garden building preset", exact: true })
		.selectOption("greenhouse");
	await inspector
		.getByRole("checkbox", { name: "Open building door", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "greenhouse" &&
					item.data.furniture.doorsOpen === true,
			),
		)
		.toBe(true);
	await inspector
		.getByRole("combobox", { name: "Garden building preset", exact: true })
		.selectOption("gazebo");
	const sides = inspector.getByRole("spinbutton", {
		name: "Gazebo sides",
		exact: true,
	});
	await sides.fill("8");
	await sides.blur();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "gazebo" &&
					item.data.furniture.gazeboSides === 8,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garden");
	await library.getByRole("searchbox").fill("playhouse");
	await library
		.getByRole("button", { name: "Add Garden playhouse", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Garden building configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("checkbox", { name: "Playhouse porch", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-garden-playhouse" &&
					item.data.furniture.porchEnabled === false,
			),
		)
		.toBe(true);
});

test("garden rainwater tanks and shared flower beds save lids, taps and low planting presets", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garden");
	await library.getByRole("searchbox").fill("rainwater tank");
	await library
		.getByRole("button", {
			name: "Add Compost / rainwater / mower storage",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Garden equipment configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Garden equipment preset", exact: true })
		.selectOption("rainwater-tank");
	await inspector
		.getByRole("checkbox", { name: "Open equipment lid", exact: true })
		.check();
	await inspector
		.getByRole("checkbox", { name: "Rainwater tank tap", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "rainwater-tank" &&
					item.data.furniture.lidOpen === true &&
					item.data.furniture.tapEnabled === false,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garden");
	await library.getByRole("searchbox").fill("flower bed");
	await library
		.getByRole("button", { name: "Add Planters / garden beds", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Planter configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Planter preset", exact: true })
		.selectOption("flower-bed");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-outdoor-planter" &&
					item.data.furniture.style === "flower-bed" &&
					item.data.furniture.height === 0.15,
			),
		)
		.toBe(true);
});

test("patio library shows six categories and sectional settings save and undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("patio");
	await expect(library.locator(".model")).toHaveCount(15);
	await expect(library.locator(".preview img")).toHaveCount(15);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Seating",
		"Tables",
		"Cooking",
		"Shade",
		"Decoration",
		"Other",
	]);
	await library.getByRole("searchbox").fill("outdoor sectional sofa");
	await library
		.getByRole("button", {
			name: "Add Outdoor sofas / sectionals",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Outdoor sofa configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Outdoor sofa layout", exact: true })
		.selectOption("u-shaped");
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-outdoor-sofa")
			.getParameters(),
	);
	const cushions = inspector.getByRole("checkbox", {
		name: "Include cushions",
		exact: true,
	});
	await cushions.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.layout === "u-shaped" &&
					item.data.furniture.cushions === false,
			),
		)
		.toBe(true);
	await cushions.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-outdoor-sofa")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("patio awnings retract and pergola roof and curtain settings save", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("patio");
	await library.getByRole("searchbox").fill("retractable awning");
	await library
		.getByRole("button", { name: "Add Retractable awning", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Awning configuration" })
		.click();
	const extension = inspector.getByRole("spinbutton", {
		name: "Awning extension",
		exact: true,
	});
	await extension.fill("0");
	await extension.blur();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-retractable-awning" &&
					item.data.furniture.extension === 0,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find(
							(item) =>
								item.userData.meshType === "furniture-retractable-awning",
						)
						.getObjectByName("Awning Fabric"),
				),
			),
		)
		.toBe(false);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("patio");
	await library.getByRole("searchbox").fill("pergola");
	await library
		.getByRole("button", { name: "Add Pergola", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Pergola configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Pergola roof", exact: true })
		.selectOption("fabric");
	await inspector
		.getByRole("checkbox", { name: "Pergola curtains", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-pergola" &&
					item.data.furniture.roofStyle === "fabric" &&
					item.data.furniture.curtains === true,
			),
		)
		.toBe(true);
});

test("patio barbecues and pizza ovens expose functioning lid and door controls", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("patio");
	await library.getByRole("searchbox").fill("barbecue grill");
	await library
		.getByRole("button", { name: "Add Barbecue grill", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Barbecue configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Barbecue preset", exact: true })
		.selectOption("kettle-grill");
	await inspector
		.getByRole("checkbox", { name: "Open barbecue lid", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "kettle-grill" &&
					item.data.furniture.lidOpen === true,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("patio");
	await library.getByRole("searchbox").fill("pizza oven");
	await library
		.getByRole("button", { name: "Add Pizza oven", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Pizza oven configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("checkbox", { name: "Close pizza oven door", exact: true })
		.check();
	await inspector
		.getByRole("checkbox", { name: "Pizza oven stand", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-pizza-oven" &&
					item.data.furniture.doorClosed === true &&
					item.data.furniture.standEnabled === false,
			),
		)
		.toBe(true);
});

test("patio hot tub and outdoor heater settings save water, cover and lighting states", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("patio");
	await library.getByRole("searchbox").fill("hot tub");
	await library
		.getByRole("button", { name: "Add Hot tub", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Hot tub configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Hot tub shape", exact: true })
		.selectOption("round");
	await inspector
		.getByRole("checkbox", { name: "Hot tub water", exact: true })
		.uncheck();
	await inspector
		.getByRole("checkbox", { name: "Close hot tub cover", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-hot-tub" &&
					item.data.furniture.shape === "round" &&
					item.data.furniture.waterEnabled === false &&
					item.data.furniture.coverClosed === true,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("patio");
	await library.getByRole("searchbox").fill("outdoor heater");
	await library
		.getByRole("button", { name: "Add Outdoor heater", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Outdoor heater configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Outdoor heater preset", exact: true })
		.selectOption("pyramid");
	await inspector
		.getByRole("checkbox", { name: "Heater on", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-outdoor-heater" &&
					item.data.furniture.style === "pyramid" &&
					item.data.furniture.lit === true,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-outdoor-heater",
						)
						.getObjectByName("Patio Heater Light"),
				),
			),
		)
		.toBe(true);
});

test("garage library shows five categories and car customization saves and undoes", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garage");
	await expect(library.locator(".model")).toHaveCount(9);
	await expect(library.locator(".preview img")).toHaveCount(9);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Vehicles",
		"Storage",
		"Work area",
		"Equipment",
		"Other",
	]);
	await library.getByRole("searchbox").fill("sedan");
	await library.getByRole("button", { name: "Add Cars", exact: true }).click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Car configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Car preset", exact: true })
		.selectOption("suv");
	const steering = inspector.getByRole("spinbutton", {
		name: "Front wheel angle (°)",
		exact: true,
	});
	await steering.fill("25");
	await steering.blur();
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-garage-car")
			.getParameters(),
	);
	const rack = inspector.getByRole("checkbox", {
		name: "Roof rack",
		exact: true,
	});
	await rack.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "suv" &&
					item.data.furniture.steering === 25 &&
					item.data.furniture.roofRack === true,
			),
		)
		.toBe(true);
	await rack.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-garage-car")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("garage racks and workshop tables expose functioning preset and drawer controls", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garage");
	await library.getByRole("searchbox").fill("tool cabinet");
	await library
		.getByRole("button", { name: "Add Garage storage / racks", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Garage storage configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Garage storage preset", exact: true })
		.selectOption("tool-cabinet");
	const extension = inspector.getByRole("spinbutton", {
		name: "Drawer extension",
		exact: true,
	});
	await extension.fill("1");
	await extension.blur();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "tool-cabinet" &&
					item.data.furniture.drawerOpen === 1,
			),
		)
		.toBe(true);
	await inspector
		.getByRole("combobox", { name: "Garage storage preset", exact: true })
		.selectOption("tire-rack");
	await expect
		.poll(() =>
			page.evaluate(() => {
				let n = 0;
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-garage-storage")
					.traverse((item) => {
						if (item.name === "Stored Tire") n++;
					});
				return n;
			}),
		)
		.toBe(6);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garage");
	await library.getByRole("searchbox").fill("workshop table");
	await library
		.getByRole("button", {
			name: "Add Workbenches / workshop tables",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Workbench configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Workbench preset", exact: true })
		.selectOption("workshop-table");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "workshop-table" &&
					item.data.furniture.pegboardEnabled === false &&
					item.data.furniture.drawerRows === 0,
			),
		)
		.toBe(true);
});

test("garage charger and bin configurations save mounting, cable, count and opening states", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garage");
	await library.getByRole("searchbox").fill("EV charger");
	await library
		.getByRole("button", { name: "Add EV charger", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "EV charger configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Charger mounting", exact: true })
		.selectOption("pedestal");
	await inspector
		.getByRole("checkbox", { name: "Plug docked", exact: true })
		.uncheck();
	await inspector
		.getByRole("checkbox", { name: "Power indicator on", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-ev-charger" &&
					item.data.furniture.mount === "pedestal" &&
					item.data.furniture.plugDocked === false &&
					item.data.furniture.powered === false,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("garage");
	await library.getByRole("searchbox").fill("waste bins");
	await library
		.getByRole("button", { name: "Add Recycling / waste bins", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Garage bin configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Bin preset", exact: true })
		.selectOption("waste-bins");
	const count = inspector.getByRole("spinbutton", {
		name: "Number of bins",
		exact: true,
	});
	await count.fill("2");
	await count.blur();
	await inspector
		.getByRole("checkbox", { name: "Open bin lids", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "waste-bins" &&
					item.data.furniture.binCount === 2 &&
					item.data.furniture.lidsOpen === true,
			),
		)
		.toBe(true);
});

test("closet library shows four categories and wardrobe changes save and undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("walk-in-closet");
	await expect(library.locator(".model")).toHaveCount(8);
	await expect(library.locator(".preview img")).toHaveCount(8);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Wardrobes",
		"Storage",
		"Furniture",
		"Accessories",
	]);
	await library.getByRole("searchbox").fill("corner wardrobe");
	await library
		.getByRole("button", { name: "Add Dressing room wardrobes", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Dressing room wardrobe configuration" })
		.click();
	const preset = inspector.getByRole("combobox", {
		name: "Wardrobe preset",
		exact: true,
	});
	await preset.selectOption("corner-wardrobe");
	await inspector
		.getByRole("combobox", { name: "Corner return side", exact: true })
		.selectOption("right-return");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "corner-wardrobe" &&
					item.data.furniture.returnSide === "right-return",
			),
		)
		.toBe(true);
	await preset.selectOption("closed-wardrobe");
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-closet-wardrobe")
			.getParameters(),
	);
	const doors = inspector.getByRole("checkbox", {
		name: "Open wardrobe doors",
		exact: true,
	});
	await doors.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "closed-wardrobe" &&
					item.data.furniture.doorsOpen === true,
			),
		)
		.toBe(true);
	await doors.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find(
						(item) => item.userData.meshType === "furniture-closet-wardrobe",
					)
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("closet organizers and dressing islands expose their configurable compartments and drawers", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("walk-in-closet");
	await library.getByRole("searchbox").fill("accessories organizer");
	await library
		.getByRole("button", {
			name: "Add Closet storage / organizers",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Closet storage configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Storage preset", exact: true })
		.selectOption("accessories-organizer");
	const columns = inspector.getByRole("spinbutton", {
		name: "Organizer columns",
		exact: true,
	});
	await columns.fill("4");
	await columns.blur();
	await inspector
		.getByRole("checkbox", { name: "Glass organizer cover", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "accessories-organizer" &&
					item.data.furniture.columns === 4 &&
					item.data.furniture.coverEnabled === true,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("walk-in-closet");
	await library.getByRole("searchbox").fill("dressing island");
	await library
		.getByRole("button", { name: "Add Dressing island", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Dressing island configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("checkbox", { name: "Drawers on both sides", exact: true })
		.uncheck();
	await inspector
		.getByRole("combobox", { name: "Island top", exact: true })
		.selectOption("solid-top");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-dressing-island" &&
					item.data.furniture.bothSides === false &&
					item.data.furniture.topStyle === "solid-top",
			),
		)
		.toBe(true);
});

test("dressing mirrors save illumination settings and shared vanities remain available", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("walk-in-closet");
	await library.getByRole("searchbox").fill("illuminated mirror");
	await library
		.getByRole("button", { name: "Add Dressing mirrors", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Dressing mirror configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Dressing mirror preset", exact: true })
		.selectOption("illuminated-mirror");
	await inspector
		.getByRole("combobox", { name: "Mirror light color", exact: true })
		.selectOption("cool");
	await inspector
		.getByRole("checkbox", { name: "Mirror light on", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "illuminated-mirror" &&
					item.data.furniture.temperature === "cool" &&
					item.data.furniture.enabled === false,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-dressing-mirror",
						)
						.getObjectByName("Dressing Mirror Light").intensity,
			),
		)
		.toBe(0);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("walk-in-closet");
	await library.getByRole("searchbox").fill("vanity table");
	await expect(library.locator(".model")).toHaveCount(1);
	await library.locator(".model").click();
	await placeSelectedModel(page);
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children.some(
					(item) => item.userData.meshType === "furniture-bedroom-vanity",
				),
			),
		)
		.toBe(true);
});

test("laundry library shows five categories and saves stacked appliances with undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("laundry-room");
	await expect(library.locator(".model")).toHaveCount(8);
	await expect(library.locator(".preview img")).toHaveCount(8);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Appliances",
		"Fixtures",
		"Storage",
		"Furniture",
		"Accessories",
	]);
	await library.getByRole("searchbox").fill("stacked laundry unit");
	await library
		.getByRole("button", { name: "Add Laundry appliances", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Laundry appliance configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Laundry appliance preset", exact: true })
		.selectOption("stacked-laundry-unit");
	await expect
		.poll(() =>
			page.evaluate(() => {
				let count = 0;
				window.testCard.space.children
					.find(
						(item) => item.userData.meshType === "furniture-laundry-appliance",
					)
					.traverse((item) => {
						if (item.name === "Laundry Appliance Body") count++;
					});
				return count;
			}),
		)
		.toBe(2);
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-laundry-appliance")
			.getParameters(),
	);
	await inspector
		.getByRole("checkbox", { name: "Open appliance doors", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "stacked-laundry-unit" &&
					item.data.furniture.doorOpen === true,
			),
		)
		.toBe(true);
	await inspector
		.getByRole("checkbox", { name: "Open appliance doors", exact: true })
		.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find(
						(item) => item.userData.meshType === "furniture-laundry-appliance",
					)
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("laundry basins and broom cupboards expose functioning inspector controls", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("laundry-room");
	await library.getByRole("searchbox").fill("laundry basin");
	await library
		.getByRole("button", {
			name: "Add Utility sinks / laundry basins",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Utility sink configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Utility sink preset", exact: true })
		.selectOption("laundry-basin");
	await inspector
		.getByRole("checkbox", { name: "Include faucet", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const object = window.testCard.space.children.find(
					(item) => item.userData.meshType === "furniture-utility-sink",
				);
				return {
					stand: object.parameters.standEnabled,
					faucet: Boolean(object.getObjectByName("Kitchen Faucet Spout")),
				};
			}),
		)
		.toEqual({ stand: false, faucet: false });
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("laundry-room");
	await library.getByRole("searchbox").fill("broom cupboard");
	await library
		.getByRole("button", { name: "Add Laundry storage", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Laundry storage configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Laundry storage preset", exact: true })
		.selectOption("broom-cupboard");
	await inspector
		.getByRole("checkbox", { name: "Open cabinet doors", exact: true })
		.check();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-laundry-storage",
						)
						.getObjectByName("Laundry Cabinet Hinge").rotation.y,
			),
		)
		.toBeLessThan(-1);
});

test("ironing boards and drying racks fold and save their configuration", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("laundry-room");
	await library.getByRole("searchbox").fill("ironing board");
	await library
		.getByRole("button", {
			name: "Add Folding tables / ironing boards",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Folding / ironing table configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Folding / ironing preset", exact: true })
		.selectOption("ironing-board");
	await inspector
		.getByRole("checkbox", { name: "Fold legs", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "ironing-board" &&
					item.data.furniture.folded === true,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("laundry-room");
	await library.getByRole("searchbox").fill("clothes drying rack");
	await library
		.getByRole("button", { name: "Add Clothes drying racks", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Drying rack configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Drying rack preset", exact: true })
		.selectOption("tower-airer");
	await inspector
		.getByRole("spinbutton", { name: "Tower tiers", exact: true })
		.fill("4");
	await inspector
		.getByRole("spinbutton", { name: "Tower tiers", exact: true })
		.blur();
	await inspector
		.getByRole("checkbox", { name: "Fold drying rack", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "tower-airer" &&
					item.data.furniture.tiers === 4 &&
					item.data.furniture.folded === true,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() => {
				let count = 0;
				window.testCard.space.children
					.find(
						(item) =>
							item.userData.meshType === "furniture-clothes-drying-rack",
					)
					.traverse((item) => {
						if (item.name === "Clothes Drying Rod") count++;
					});
				return count;
			}),
		)
		.toBe(32);
});

test("office library shows six categories and saves mirrored L desks with undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-office");
	await expect(library.locator(".model")).toHaveCount(14);
	await expect(library.locator(".preview img")).toHaveCount(14);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Desks",
		"Seating",
		"Storage",
		"Equipment",
		"Accessories",
		"Other",
	]);
	await library.getByRole("searchbox").fill("L-shaped desk");
	await library
		.getByRole("button", { name: "Add Office desks", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Office desk configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Office desk preset", exact: true })
		.selectOption("l-shaped-desk");
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-office-desk")
			.getParameters(),
	);
	await inspector
		.getByRole("combobox", { name: "L desk return side", exact: true })
		.selectOption("right-return");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "l-shaped-desk" &&
					item.data.furniture.returnSide === "right-return",
			),
		)
		.toBe(true);
	await inspector
		.getByRole("combobox", { name: "L desk return side", exact: true })
		.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-office-desk")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("office seating and storage presets expose functioning inspector controls", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-office");
	await library.getByRole("searchbox").fill("ergonomic chair");
	await library
		.getByRole("button", { name: "Add Office seating", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Office seating configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Office seating preset", exact: true })
		.selectOption("ergonomic-chair");
	await inspector
		.getByRole("checkbox", { name: "Chair casters", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			page.evaluate(() => {
				let count = 0;
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-office-chair")
					.traverse((item) => {
						if (item.name === "Office Caster") count++;
					});
				return count;
			}),
		)
		.toBe(0);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-office");
	await library.getByRole("searchbox").fill("storage cabinet");
	await library
		.getByRole("button", { name: "Add Office storage", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Office storage configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Office storage preset", exact: true })
		.selectOption("storage-cabinet");
	await inspector
		.getByRole("checkbox", { name: "Open cabinet doors", exact: true })
		.check();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-office-storage",
						)
						.getObjectByName("Office Cabinet Hinge").rotation.y,
			),
		)
		.toBeLessThan(-1);
});

test("office laptop and desk lamp controls save their open and power states", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-office");
	await library.getByRole("searchbox").fill("laptop");
	await library
		.getByRole("button", { name: "Add Laptops", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Laptop configuration" })
		.click();
	await inspector
		.getByRole("checkbox", { name: "Open laptop", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-office-laptop" &&
					item.data.furniture.lidOpen === false,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("home-office");
	await library.getByRole("searchbox").fill("desk lamp");
	await library
		.getByRole("button", { name: "Add Desk lamps", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Desk lamp configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("checkbox", { name: "Desk lamp on", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.meshType === "furniture-office-desk-lamp" &&
					item.data.furniture.enabled === false,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-office-desk-lamp",
						)
						.getObjectByName("Desk Lamp Light").intensity,
			),
		)
		.toBe(0);
});

test("nursery collection shows five categories and saves bunk and trundle beds with undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("childrens-bedroom");
	await expect(library.locator(".model")).toHaveCount(14);
	await expect(library.locator(".preview img")).toHaveCount(14);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Beds",
		"Storage",
		"Furniture",
		"Play",
		"Decoration",
	]);
	await library.getByRole("searchbox").fill("bunk bed");
	await library
		.getByRole("button", { name: "Add Children's beds / cribs", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Children's bed configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Children's bed preset", exact: true })
		.selectOption("bunk-bed");
	await expect
		.poll(() =>
			page.evaluate(() => {
				let count = 0;
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-nursery-bed")
					.traverse((item) => {
						if (item.name === "Child Mattress") count++;
					});
				return count;
			}),
		)
		.toBe(2);
	await inspector
		.getByRole("combobox", { name: "Children's bed preset", exact: true })
		.selectOption("trundle-bed");
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-nursery-bed")
			.getParameters(),
	);
	await inspector
		.getByRole("spinbutton", { name: "Trundle extension", exact: true })
		.fill("1");
	await inspector
		.getByRole("spinbutton", { name: "Trundle extension", exact: true })
		.blur();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "trundle-bed" &&
					item.data.furniture.trundleOpen === 1,
			),
		)
		.toBe(true);
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-nursery-bed")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("nursery storage lids and playpen gates expose working controls after placement", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("childrens-bedroom");
	await library.getByRole("searchbox").fill("toy chest");
	await library
		.getByRole("button", { name: "Add Children's storage", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Children's storage configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Children's storage preset", exact: true })
		.selectOption("toy-chest");
	await inspector
		.getByRole("checkbox", { name: "Open toy chest", exact: true })
		.check();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-nursery-storage",
						)
						.getObjectByName("Toy Chest Lid Hinge").rotation.x,
			),
		)
		.toBeLessThan(-1);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("childrens-bedroom");
	await library.getByRole("searchbox").fill("playpen");
	await library
		.getByRole("button", { name: "Add Playpen", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Playpen configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("checkbox", { name: "Open playpen gate", exact: true })
		.check();
	await inspector
		.getByRole("checkbox", { name: "Padded floor", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const object = window.testCard.space.children.find(
					(item) => item.userData.meshType === "furniture-playpen",
				);
				return {
					open: object.getObjectByName("Playpen Gate Hinge").rotation.y < 0,
					pad: Boolean(object.getObjectByName("Playpen Pad")),
				};
			}),
		)
		.toEqual({ open: true, pad: false });
});

test("night lights save shape, color and power state and kids' play tables load their size", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("childrens-bedroom");
	await library.getByRole("searchbox").fill("night light");
	await library
		.getByRole("button", { name: "Add Night lights", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Night light configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Night light shape", exact: true })
		.selectOption("cloud-light");
	await inspector
		.getByRole("combobox", { name: "Night light color", exact: true })
		.selectOption("soft-blue");
	await inspector
		.getByRole("checkbox", { name: "Night light on", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "cloud-light" &&
					item.data.furniture.lightColor === "soft-blue" &&
					item.data.furniture.enabled === false,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find((item) => item.userData.meshType === "furniture-night-light")
						.getObjectByName("Night Light Source").intensity,
			),
		)
		.toBe(0);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("childrens-bedroom");
	await library.getByRole("searchbox").fill("play table");
	await library
		.getByRole("button", { name: "Add Kids' desks / play tables", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Kids' table configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Kids' table preset", exact: true })
		.selectOption("play-table");
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children.find(
						(item) => item.userData.meshType === "furniture-kids-table",
					).parameters.height,
			),
		)
		.toBe(0.48);
});

test("master bedroom shows six categories and saves independent bed size and articulation with undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("master-bedroom");
	await expect(library.locator(".model")).toHaveCount(14);
	await expect(library.locator(".preview img")).toHaveCount(14);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Beds",
		"Bedside",
		"Storage",
		"Seating",
		"Other furniture",
		"Decoration",
	]);
	await library.getByRole("searchbox").fill("adjustable bed");
	await library.getByRole("button", { name: "Add Bed", exact: true }).click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Bed dimensions" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Bed size preset", exact: true })
		.selectOption("king-bed");
	await inspector
		.getByRole("combobox", { name: "Bed frame style", exact: true })
		.selectOption("adjustable-bed");
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-bed")
			.getParameters(),
	);
	expect(original.width).toBe(1.9);
	await inspector
		.getByRole("spinbutton", { name: "Head section angle", exact: true })
		.fill("45");
	await inspector
		.getByRole("spinbutton", { name: "Head section angle", exact: true })
		.blur();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.sizePreset === "king-bed" &&
					item.data.furniture.headAngle === 45,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find((item) => item.userData.meshType === "furniture-bed")
						.getObjectByName("Adjustable Head Section").rotation.x,
			),
		)
		.toBeCloseTo(Math.PI / 4);
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-bed")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("master bedroom wardrobe panels slide and bedside shelves omit drawers", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("master-bedroom");
	await library.getByRole("searchbox").fill("sliding doors");
	await library
		.getByRole("button", { name: "Add Wardrobe (with doors)", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Wardrobe dimensions" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Wardrobe preset", exact: true })
		.selectOption("sliding-door-wardrobe");
	const initial = await page.evaluate(
		() =>
			window.testCard.space.children
				.find((item) => item.userData.meshType === "furniture-wardrobe")
				.getObjectByName("Storage Door").position.x,
	);
	await inspector
		.getByRole("spinbutton", { name: "Sliding opening", exact: true })
		.fill("1");
	await inspector
		.getByRole("spinbutton", { name: "Sliding opening", exact: true })
		.blur();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find((item) => item.userData.meshType === "furniture-wardrobe")
						.getObjectByName("Storage Door").position.x,
			),
		)
		.toBeGreaterThan(initial + 0.5);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("master-bedroom");
	await library.getByRole("searchbox").fill("bedside shelf");
	await library
		.getByRole("button", { name: "Add Bedside tables / shelves", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Bedside furniture configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Bedside preset", exact: true })
		.selectOption("bedside-shelf");
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children.find(
						(item) => item.userData.meshType === "furniture-bedside",
					).parameters.drawerCount,
			),
		)
		.toBe(0);
});

test("bedroom vanity and full-length mirror presets expose their controls and save", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("master-bedroom");
	await library.getByRole("searchbox").fill("dressing table");
	await library
		.getByRole("button", {
			name: "Add Dressing tables / vanities / desks",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Dressing furniture configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Dressing furniture preset", exact: true })
		.selectOption("vanity");
	await inspector
		.getByRole("checkbox", { name: "Vanity lights on", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "vanity" &&
					item.data.furniture.bulbsEnabled === false,
			),
		)
		.toBe(true);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("master-bedroom");
	await library.getByRole("searchbox").fill("full-length mirror");
	await library
		.getByRole("button", { name: "Add Mirror", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Mirror configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Mirror size preset", exact: true })
		.selectOption("full-length-mirror");
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.sizePreset === "full-length-mirror" &&
					item.data.furniture.height === 1.8,
			),
		)
		.toBe(true);
});

test("kitchen shows eight categories and saves cabinet presets with undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("kitchen");
	await expect(library.locator(".model")).toHaveCount(17);
	await expect(library.locator(".preview img")).toHaveCount(17);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Base cabinets",
		"Wall cabinets",
		"Tall cabinets",
		"Countertops",
		"Appliances",
		"Fixtures",
		"Furniture",
		"Accessories",
	]);
	await library.getByRole("searchbox").fill("drawer cabinet");
	await expect(library.locator(".model")).toHaveCount(1);
	await library
		.getByRole("button", { name: "Add Base cabinets", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Lower kitchen cabinet dimensions" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Base cabinet preset", exact: true })
		.selectOption("drawer-cabinet");
	await inspector
		.getByRole("spinbutton", { name: "Drawer rows", exact: true })
		.fill("4");
	await inspector
		.getByRole("spinbutton", { name: "Drawer rows", exact: true })
		.blur();
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find(
				(item) => item.userData.meshType === "furniture-kitchen-cabinet-bottom",
			)
			.getParameters(),
	);
	await inspector
		.getByRole("checkbox", { name: "Open doors / drawers", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "drawer-cabinet" &&
					item.data.furniture.drawerCount === 4 &&
					item.data.furniture.doorsOpen === true,
			),
		)
		.toBe(true);
	await inspector
		.getByRole("checkbox", { name: "Open doors / drawers", exact: true })
		.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find(
						(item) =>
							item.userData.meshType === "furniture-kitchen-cabinet-bottom",
					)
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("kitchen worktop and sink presets expose functioning inspector controls", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("kitchen");
	await library.getByRole("searchbox").fill("U-shaped countertop");
	await library
		.getByRole("button", {
			name: "Add Countertops / islands / bars",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Countertop configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Countertop preset", exact: true })
		.selectOption("u-shaped-countertop");
	await inspector
		.getByRole("combobox", { name: "Worktop cutout", exact: true })
		.selectOption("hob-cutout");
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children.find(
						(item) => item.userData.meshType === "furniture-kitchen-countertop",
					).parameters.cutout,
			),
		)
		.toBe("hob-cutout");
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("kitchen");
	await library.getByRole("searchbox").fill("double sink");
	await library
		.getByRole("button", { name: "Add Kitchen sinks", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Kitchen sink configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Sink preset", exact: true })
		.selectOption("double-sink");
	await inspector
		.getByRole("checkbox", { name: "Include faucet", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const object = window.testCard.space.children.find(
					(item) => item.userData.meshType === "furniture-kitchen-sink",
				);
				let bowls = 0;
				object.traverse((item) => {
					if (item.name === "Kitchen Sink Bowl") bowls++;
				});
				return {
					bowls,
					faucet: Boolean(object.getObjectByName("Kitchen Faucet Spout")),
				};
			}),
		)
		.toEqual({ bowls: 2, faucet: false });
});

test("kitchen appliance doors and refrigerator presets save after placement", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("kitchen");
	await library.getByRole("searchbox").fill("American-style refrigerator");
	await library
		.getByRole("button", { name: "Add Refrigerators / freezers", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Refrigerator configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Refrigeration preset", exact: true })
		.selectOption("american-style-refrigerator");
	await inspector
		.getByRole("checkbox", { name: "Open doors / drawers", exact: true })
		.check();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "american-style-refrigerator" &&
					item.data.furniture.doorsOpen === true,
			),
		)
		.toBe(true);
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find(
							(item) =>
								item.userData.meshType === "furniture-kitchen-refrigerator",
						)
						.getObjectByName("Ice Dispenser"),
				),
			),
		)
		.toBe(true);
});

test("dining room shows five ordered categories, renders previews and saves extendable tables with undo", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("dining-room");
	await expect(library.locator(".model")).toHaveCount(8);
	await expect(library.locator(".preview img")).toHaveCount(8);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Tables",
		"Seating",
		"Storage",
		"Lighting",
		"Decoration",
	]);
	await expect(library.locator("nav button span:first-of-type")).toHaveText([
		"All models",
		"Tables",
		"Seating",
		"Storage",
		"Lighting",
		"Decoration",
	]);
	await library.getByRole("searchbox").fill("extendable dining table");
	await expect(library.locator(".model")).toHaveCount(1);
	await library
		.getByRole("button", { name: "Add Dining tables", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Dining table configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Dining table preset", exact: true })
		.selectOption("extendable-dining-table");
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-dining-table")
			.getParameters(),
	);
	expect(original.width).toBe(1.6);
	expect(original.extensionEnabled).toBe(true);
	await inspector
		.getByRole("checkbox", { name: "Extend table", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "extendable-dining-table" &&
					item.data.furniture.extensionEnabled === false,
			),
		)
		.toBe(true);
	await inspector
		.getByRole("checkbox", { name: "Extend table", exact: true })
		.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-dining-table")
					.getParameters(),
			),
		)
		.toEqual(original);
});

test("dining seating and wine storage presets expose working controls after placement", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("dining-room");
	await library.getByRole("searchbox").fill("bar stool");
	await library
		.getByRole("button", {
			name: "Add Dining chairs / benches / stools",
			exact: true,
		})
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Dining seating configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Dining seating preset", exact: true })
		.selectOption("bar-stool");
	await expect(
		inspector.getByRole("spinbutton", { name: "Seat height", exact: true }),
	).toHaveValue("0.75");
	await inspector
		.getByRole("checkbox", { name: "Stool footrest", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-dining-seating",
						)
						.getObjectByName("Stool Footrest"),
				),
			),
		)
		.toBe(false);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("dining-room");
	await library.getByRole("searchbox").fill("wine rack");
	await library
		.getByRole("button", { name: "Add Dining room storage", exact: true })
		.click();
	await placeSelectedModel(page);
	const summary = inspector
		.locator("summary")
		.filter({ hasText: "Dining storage configuration" });
	if (!(await summary.evaluate((element) => element.parentElement.open)))
		await summary.click();
	await inspector
		.getByRole("combobox", { name: "Dining storage preset", exact: true })
		.selectOption("wine-rack");
	await inspector
		.getByRole("spinbutton", { name: "Columns", exact: true })
		.fill("3");
	await inspector
		.getByRole("spinbutton", { name: "Columns", exact: true })
		.blur();
	await expect
		.poll(() =>
			page.evaluate(() => {
				let count = 0;
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-dining-storage")
					.traverse((item) => {
						if (item.name === "Wine Bottle") count++;
					});
				return count;
			}),
		)
		.toBe(15);
});

test("dining lights save their light count and on/off state", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("dining-room");
	await library.getByRole("searchbox").fill("chandelier");
	await library
		.getByRole("button", { name: "Add Dining room lighting", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Dining lighting configuration" })
		.click();
	await inspector
		.getByRole("spinbutton", { name: "Light count", exact: true })
		.fill("8");
	await inspector
		.getByRole("spinbutton", { name: "Light count", exact: true })
		.blur();
	await inspector
		.getByRole("checkbox", { name: "Light on", exact: true })
		.uncheck();
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.lightCount === 8 &&
					item.data.furniture.enabled === false,
			),
		)
		.toBe(true);
	const lights = await page.evaluate(() => {
		const result = [];
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-dining-light")
			.traverse((item) => {
				if (item.isPointLight) result.push(item.intensity);
			});
		return result;
	});
	expect(lights).toEqual(Array(8).fill(0));
});

test("bathroom collection shows six categories, renders previews and saves fixture variants", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("bathroom");
	await expect(library.locator(".model")).toHaveCount(11);
	await expect(library.locator(".preview img")).toHaveCount(11);
	await expect(library.locator("nav button span:first-of-type")).toHaveText([
		"All models",
		"Sanitary fixtures",
		"Washbasins",
		"Bathing",
		"Storage",
		"Accessories",
		"Other",
	]);
	await expect(library.locator(".model-section h3")).toHaveText([
		"Sanitary fixtures",
		"Washbasins",
		"Bathing",
		"Storage",
		"Accessories",
		"Other",
	]);
	await library.getByRole("searchbox").fill("wall-hung toilet");
	await library
		.getByRole("button", { name: "Add Sanitary fixtures", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Sanitary fixture configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Fixture preset", exact: true })
		.selectOption("wall-hung-toilet");
	await inspector
		.getByRole("checkbox", { name: "Open lid", exact: true })
		.check();
	await expect
		.poll(() =>
			page.evaluate(() => {
				const object = window.testCard.space.children.find(
					(item) => item.userData.meshType === "furniture-sanitary-fixture",
				);
				return {
					style: object.parameters.style,
					width: object.parameters.width,
					lidOpen: object.parameters.lidOpen,
				};
			}),
		)
		.toEqual({ style: "wall-hung-toilet", width: 0.38, lidOpen: true });
	await expect
		.poll(() =>
			saved.some(
				(item) =>
					item.data?.furniture?.style === "wall-hung-toilet" &&
					item.data.furniture.lidOpen,
			),
		)
		.toBe(true);
});

test("bathroom shower and storage presets expose working inspector controls after placement", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("bathroom");
	await library.getByRole("searchbox").fill("walk-in shower");
	await library
		.getByRole("button", { name: "Add Showers", exact: true })
		.click();
	await placeSelectedModel(page);
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Shower configuration" })
		.click();
	await inspector
		.getByRole("combobox", { name: "Shower preset", exact: true })
		.selectOption("shower-enclosure");
	const initialX = await page.evaluate(
		() =>
			window.testCard.space.children
				.find((item) => item.userData.meshType === "furniture-shower")
				.getObjectByName("Shower Sliding Door").position.x,
	);
	await inspector
		.getByRole("spinbutton", { name: "Door opening", exact: true })
		.fill("1");
	await inspector
		.getByRole("spinbutton", { name: "Door opening", exact: true })
		.blur();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children
						.find((item) => item.userData.meshType === "furniture-shower")
						.getObjectByName("Shower Sliding Door").position.x,
			),
		)
		.toBeLessThan(initialX);
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("bathroom");
	await library.getByRole("searchbox").fill("under-sink cabinet");
	await library
		.getByRole("button", { name: "Add Bathroom storage", exact: true })
		.click();
	await placeSelectedModel(page);
	const storageSummary = inspector
		.locator("summary")
		.filter({ hasText: "Bathroom storage configuration" });
	if (!(await storageSummary.evaluate((element) => element.parentElement.open)))
		await storageSummary.click();
	await inspector
		.getByRole("combobox", { name: "Cabinet preset", exact: true })
		.selectOption("under-sink-cabinet");
	await expect
		.poll(() =>
			page.evaluate(() =>
				Boolean(
					window.testCard.space.children
						.find(
							(item) => item.userData.meshType === "furniture-bathroom-storage",
						)
						.getObjectByName("Sink Cutout Side"),
				),
			),
		)
		.toBe(true);
});

test("model placement previews follow the pointer and save only once after a double-click", async ({
	page,
}) => {
	const creates = [];
	page.on("request", (request) => {
		if (
			request.method() === "POST" &&
			new URL(request.url()).pathname.endsWith("/objects")
		)
			creates.push(request.postDataJSON());
	});
	await openLibrary(page);
	await page.locator("dt3d-model-library").getByRole("searchbox").fill("sofa");
	await page.getByRole("button", { name: "Add Couch", exact: true }).click();
	await expect(page.locator("dt3d-hint-box")).toContainText(
		"Double click on the space to place the object",
	);
	const id = await page.evaluate(
		() => window.testCard.objectPlacement.object.uuid,
	);
	await expect(
		page.locator("dt3d-tree").getByText("Couch", { exact: true }),
	).toHaveCount(0);
	await preparePlacementView(page);
	// Placement outlines also render when the post-processing pipeline is disabled.
	await page.evaluate(() => {
		window.testCard.rendererManager.renderingConfig.postProcessingEnabled = false;
	});
	await page.mouse.move(350, 440);
	await expect
		.poll(() =>
			page.evaluate(() => window.testCard.objectPlacement.root.visible),
		)
		.toBe(true);
	const first = await page.evaluate(() =>
		window.testCard.objectPlacement.object.position.toArray(),
	);
	await page.mouse.move(740, 470);
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.objectPlacement.object.position.toArray(),
			),
		)
		.not.toEqual(first);
	const preview = await page.evaluate(() => {
		const card = window.testCard;
		let outlines = 0;
		card.objectPlacement.object.traverse((child) => {
			if (child.isLineSegments && child.material.color.getHex() === 0x63d8ff)
				outlines++;
		});
		return {
			outsideSpace: !card.space.getObjectByProperty(
				"uuid",
				card.objectPlacement.object.uuid,
			),
			outlines,
		};
	});
	expect(preview.outsideSpace).toBe(true);
	expect(preview.outlines).toBeGreaterThan(0);
	await page.mouse.click(740, 470);
	expect(
		creates.filter((item) => item.data?.meshType === "furniture-couch"),
	).toHaveLength(0);
	await page.mouse.dblclick(740, 470);
	await expect
		.poll(
			() =>
				creates.filter((item) => item.data?.meshType === "furniture-couch")
					.length,
		)
		.toBe(1);
	await expect
		.poll(() =>
			page.evaluate(
				(uuid) => window.testCard.space.getObjectByProperty("uuid", uuid)?.uuid,
				id,
			),
		)
		.toBe(id);
	await expect
		.poll(() => page.evaluate(() => window.testCard.objectPlacement))
		.toBe(null);
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(
				(uuid) =>
					Boolean(window.testCard.space.getObjectByProperty("uuid", uuid)),
				id,
			),
		)
		.toBe(false);
	await page.keyboard.press("Control+Shift+z");
	await expect
		.poll(() =>
			page.evaluate(
				(uuid) =>
					Boolean(window.testCard.space.getObjectByProperty("uuid", uuid)),
				id,
			),
		)
		.toBe(true);
});

test("escape, tool changes and read-only mode cancel unsaved placement", async ({
	page,
}) => {
	const creates = [];
	page.on("request", (request) => {
		if (request.method() === "POST" && request.url().endsWith("/objects"))
			creates.push(request.postDataJSON());
	});
	for (const cancel of ["escape", "tool", "read-only"]) {
		await openLibrary(page);
		await page
			.locator("dt3d-model-library")
			.getByRole("searchbox")
			.fill("sofa");
		await page.getByRole("button", { name: "Add Couch", exact: true }).click();
		await preparePlacementView(page);
		await page.mouse.move(500, 460);
		if (cancel === "escape") await page.keyboard.press("Escape");
		else if (cancel === "tool")
			await page
				.getByRole("button", { name: "Draw wall", exact: true })
				.click();
		else
			await page.evaluate(() =>
				window.testCard.setConfig({
					...window.testCard.config,
					visualization_only: true,
				}),
			);
		await expect
			.poll(() => page.evaluate(() => window.testCard.objectPlacement))
			.toBe(null);
		await expect
			.poll(() =>
				page.evaluate(
					() =>
						window.testCard.scene.getObjectByProperty(
							"name",
							"Object placement preview",
						) === undefined,
				),
			)
			.toBe(true);
	}
	expect(
		creates.filter((item) => item.data?.meshType === "furniture-couch"),
	).toHaveLength(0);
});

test("multiple imported files wait for placement one at a time", async ({
	page,
}) => {
	const creates = [];
	page.on("request", (request) => {
		if (request.method() === "POST" && request.url().endsWith("/objects"))
			creates.push(request.postDataJSON());
	});
	await openLibrary(page);
	const chooser = page.waitForEvent("filechooser");
	await page.getByRole("button", { name: "Select model files" }).click();
	const buffer = Buffer.from(
		"o Test\nv -0.5 0 0\nv 0.5 0 0\nv 0 1 0\nf 1 2 3\n",
	);
	await (
		await chooser
	).setFiles([
		{ name: "one.obj", mimeType: "text/plain", buffer },
		{ name: "two.obj", mimeType: "text/plain", buffer },
	]);
	await expect
		.poll(() =>
			page.evaluate(() => window.testCard.objectPlacementQueue.length),
		)
		.toBe(1);
	expect(creates.filter((item) => item.name?.endsWith(".obj"))).toHaveLength(0);
	await preparePlacementView(page);
	await page
		.locator("dt3d-card > div > div > canvas")
		.dblclick({ position: { x: 590, y: 430 } });
	await expect
		.poll(() => creates.filter((item) => item.name?.endsWith(".obj")).length)
		.toBe(1);
	await expect(page.locator("dt3d-hint-box")).toContainText(
		"Double click on the space to place the object",
	);
	await page
		.locator("dt3d-card > div > div > canvas")
		.dblclick({ position: { x: 700, y: 450 } });
	await expect
		.poll(() => creates.filter((item) => item.name?.endsWith(".obj")).length)
		.toBe(2);
	await expect
		.poll(() => page.evaluate(() => window.testCard.objectPlacement))
		.toBe(null);
});

test("renders library thumbnails offscreen, filters categories, searches, and creates models", async ({
	page,
}) => {
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	const total = await page.evaluate(
		async () =>
			(await import("/src/editor/model-library.ts")).MODEL_LIBRARY.length,
	);
	await expect(library.locator(".model")).toHaveCount(total);
	await expect(library.locator(".preview img")).toHaveCount(total);
	// Thumbnails contain visible pixels and no preview canvas is attached to the page.
	const imageChecks = await library
		.locator(".preview img")
		.evaluateAll(async (images) => {
			return Promise.all(
				images.map(async (image) => {
					await image.decode();
					const canvas = document.createElement("canvas");
					canvas.width = image.naturalWidth;
					canvas.height = image.naturalHeight;
					const context = canvas.getContext("2d");
					context.drawImage(image, 0, 0);
					return context
						.getImageData(0, 0, canvas.width, canvas.height)
						.data.some((value, index) => index % 4 === 3 && value > 0);
				}),
			);
		});
	expect(imageChecks.every(Boolean)).toBe(true);
	await expect(library.locator("canvas")).toHaveCount(0);
	await library.getByRole("button", { name: "Geometric Shapes" }).click();
	await expect(library.locator(".model")).toHaveCount(14);
	await library.getByRole("searchbox").fill("sphere");
	await expect(library.locator(".model")).toHaveCount(1);
	await library
		.getByRole("button", { name: "Add Sphere", exact: true })
		.click();
	await placeSelectedModel(page);
	await expect(library).toHaveCount(0);
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children.some(
					(object) => object.userData.meshType === "sphere",
				),
			),
		)
		.toBe(true);
	await openLibrary(page);
	await library.getByRole("searchbox").fill("sofa");
	await expect(library.locator(".model")).toHaveCount(2);
	await expect(
		library.getByRole("button", {
			name: "Add Outdoor sofas / sectionals",
			exact: true,
		}),
	).toBeVisible();
	await library.getByRole("button", { name: "Add Couch", exact: true }).click();
	await placeSelectedModel(page);
	await page.locator("dt3d-tree").getByText("Couch", { exact: true }).click();
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children.some(
					(object) => object.userData.meshType === "furniture-couch",
				),
			),
		)
		.toBe(true);
	expect(errors).toEqual([]);
});

test("living room filtering exposes every family and sofa controls change the scene", async ({
	page,
}) => {
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library
		.getByRole("combobox", { name: "Filter by room" })
		.selectOption("living-room");
	await expect(library.locator(".model")).toHaveCount(18);
	await library.getByRole("searchbox").fill("U-shaped sofa");
	await expect(library.locator(".model")).toHaveCount(1);
	await library.getByRole("button", { name: "Add Couch", exact: true }).click();
	await placeSelectedModel(page);
	await page.locator("dt3d-tree").getByText("Couch", { exact: true }).click();
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Couch dimensions" })
		.click();
	await expect(
		inspector.getByRole("combobox", { name: "Layout", exact: true }),
	).toBeVisible();
	await inspector
		.getByRole("combobox", { name: "Layout", exact: true })
		.selectOption("u-shaped");
	await expect
		.poll(() =>
			page.evaluate(() => {
				const sofa = window.testCard.space.children.find(
					(item) => item.userData.meshType === "furniture-couch",
				);
				let returns = 0;
				sofa?.traverse((part) => {
					if (part.name === "Sofa Return Base") returns++;
				});
				return returns;
			}),
		)
		.toBe(2);
	await inspector
		.getByRole("spinbutton", { name: "Main seats", exact: true })
		.fill("4");
	await inspector
		.getByRole("spinbutton", { name: "Main seats", exact: true })
		.blur();
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children.find(
						(item) => item.userData.meshType === "furniture-couch",
					)?.parameters.seatCount,
			),
		)
		.toBe(4);
});

test("table preset edits save string parameters and undo restores the complete configuration", async ({
	page,
}) => {
	const saved = [];
	page.on("request", (request) => {
		if (request.method() === "PUT" && request.url().includes("/objects/"))
			saved.push(request.postDataJSON());
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library.getByRole("searchbox").fill("nesting tables");
	await library
		.getByRole("button", { name: "Add Living room tables", exact: true })
		.click();
	await placeSelectedModel(page);
	await page
		.locator("dt3d-tree")
		.getByText("Living room table", { exact: true })
		.click();
	const inspector = page.locator("dt3d-object-inspector");
	await inspector
		.locator("summary")
		.filter({ hasText: "Table dimensions" })
		.click();
	const original = await page.evaluate(() =>
		window.testCard.space.children
			.find((item) => item.userData.meshType === "furniture-living-table")
			.getParameters(),
	);
	await inspector
		.getByRole("combobox", { name: "Table preset", exact: true })
		.selectOption("nesting-tables");
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					window.testCard.space.children.find(
						(item) => item.userData.meshType === "furniture-living-table",
					)?.parameters.tableCount,
			),
		)
		.toBe(3);
	await expect
		.poll(() =>
			saved.some((item) => item.data?.furniture?.style === "nesting-tables"),
		)
		.toBe(true);
	await inspector
		.getByRole("combobox", { name: "Table preset", exact: true })
		.blur();
	await page.keyboard.press("Control+z");
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children
					.find((item) => item.userData.meshType === "furniture-living-table")
					?.getParameters(),
			),
		)
		.toEqual(original);
});

test("supports empty searches, opening placement, lighting, closing, and keyboard focus", async ({
	page,
}) => {
	await openLibrary(page);
	let library = page.locator("dt3d-model-library");
	await expect(library.getByRole("searchbox")).toBeFocused();
	await library.getByRole("searchbox").fill("missing item");
	await expect(library.locator(".model")).toHaveCount(0);
	await library.getByRole("button", { name: "Clear filters" }).click();
	await library
		.getByRole("button", { name: "Doors, windows and gates" })
		.click();
	await library.getByRole("button", { name: "Add Door", exact: true }).click();
	await expect
		.poll(() => page.evaluate(() => window.testCard.objectSidebar.wallTool))
		.toBe("door");
	await openLibrary(page);
	library = page.locator("dt3d-model-library");
	await library
		.locator("nav")
		.getByRole("button", { name: "Lighting" })
		.click();
	await library
		.getByRole("button", { name: "Add Point Light", exact: true })
		.click();
	await placeSelectedModel(page);
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children.some(
					(object) => object.sourceType === "point",
				),
			),
		)
		.toBe(true);
	await openLibrary(page);
	await page.keyboard.press("Escape");
	await expect(library).toHaveCount(0);
	await expect(
		page.getByRole("button", { name: "Model Library", exact: true }),
	).toBeFocused();
	await openLibrary(page);
	await library.getByRole("button", { name: "Close model library" }).focus();
	await page.keyboard.press("Shift+Tab");
	await expect(
		library.getByRole("button", { name: "Select model folder" }),
	).toBeFocused();
});

test("fits a small card and keeps imports reachable", async ({ page }) => {
	await openLibrary(page);
	await page.setViewportSize({ width: 390, height: 740 });
	await page.evaluate(() => {
		document.querySelector("#editor").style.height = "620px";
	});
	const library = page.locator("dt3d-model-library");
	const bounds = await library.getByRole("dialog").boundingBox();
	expect(bounds.x).toBeGreaterThanOrEqual(0);
	expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
	await expect(
		library.getByRole("button", { name: "Select model files" }),
	).toBeVisible();
	await expect(
		library.getByRole("button", { name: "Select model folder" }),
	).toBeVisible();
	await library.getByRole("button", { name: "Geometric Shapes" }).click();
	await expect(library.locator(".model")).toHaveCount(14);
	const chooserPromise = page.waitForEvent("filechooser");
	await library.getByRole("button", { name: "Select model files" }).click();
	const chooser = await chooserPromise;
	expect(chooser.isMultiple()).toBe(true);
	await expect(library).toHaveCount(0);
});

test("keeps model selection usable when thumbnail WebGL is unavailable", async ({
	page,
}) => {
	await page.evaluate(() => {
		const original = HTMLCanvasElement.prototype.getContext;
		HTMLCanvasElement.prototype.getContext = function (type, ...args) {
			if (!this.isConnected && type.startsWith("webgl")) return null;
			return original.call(this, type, ...args);
		};
	});
	await openLibrary(page);
	const library = page.locator("dt3d-model-library");
	await library.getByRole("searchbox").fill("cube");
	await expect(library.locator(".model")).toHaveCount(1);
	await expect(library.locator(".preview > ha-icon")).toHaveCount(1);
	await library.getByRole("button", { name: "Add Cube", exact: true }).click();
	await placeSelectedModel(page);
	await expect(library).toHaveCount(0);
	await expect
		.poll(() =>
			page.evaluate(() =>
				window.testCard.space.children.some(
					(object) => object.userData.meshType === "cube",
				),
			),
		)
		.toBe(true);
});
