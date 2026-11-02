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
	await expect(library.locator(".model")).toHaveCount(1);
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
