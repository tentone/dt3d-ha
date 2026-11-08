/* global window, document, URL, structuredClone, getComputedStyle */
import {expect, test} from "@playwright/test";

function deferred() {
	let resolve;
	const promise = new Promise((done) => {
		resolve = done;
	});
	return {promise, resolve};
}

const spaces = ["alpha", "beta", "gamma"].map((id) => ({
	id,
	name: id,
	description: "",
	is_default: id === "alpha",
	cache_version: 1,
	config: {},
	object_instances: [{
		id: `${id}-root`,
		space_id: id,
		parent_id: null,
		name: `${id} objects`,
		type: "group",
		data: {},
	}],
	created_at: 1,
	updated_at: 1,
}));

async function mockSpaces(page) {
	const pending = new Map();
	await page.route("**/api/**", async (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path === "/api/spaces") {
			await route.fulfill({json: spaces.map((space) => ({
				...space,
				object_instances: [],
			}))});
			return;
		}
		const [, , , id, resource] = path.split("/");
		const gate = pending.get(resource ? `${id}/${resource}` : id);
		if (gate) {
			gate.started.resolve();
			await gate.finished.promise;
			if (gate.fail) {
				await route.fulfill({status: 500, body: "Scene unavailable"});
				return;
			}
		}
		const space = spaces.find((space) => space.id === id);
		await route.fulfill({json: resource === "version"
			? {id, cache_version: 1}
			: space});
	});
	return {
		hold(id, fail = false) {
			const gate = {started: deferred(), finished: deferred(), fail};
			pending.set(id, gate);
			return {started: gate.started.promise, release: gate.finished.resolve};
		},
	};
}

const selector = (page) => page.locator("dt3d-space-selector select");

test("loading visibly blocks editing while keeping panel navigation and space switching available", async ({page}) => {
	const api = await mockSpaces(page);
	const initial = api.hold("alpha");
	await page.goto("/tests/model-library.html");
	await initial.started;
	const tree = page.locator("dt3d-tree");
	await expect(tree.locator(".blocked-state")).toContainText("Loading space");
	await expect(tree.locator(".panel")).toHaveAttribute("inert", "");
	await expect(page.getByRole("button", {name: "Model Library", exact: true})).toBeDisabled();
	await expect(page.locator("dt3d-bottom-bar button:enabled")).toHaveCount(0);
	await page.getByRole("button", {name: "Model Library", exact: true}).hover();
	await expect(page.getByRole("tooltip", {name: "Loading space", exact: true})).toBeVisible();
	await expect(selector(page)).toBeEnabled();
	await tree.locator(".collapse-btn").click();
	await expect(tree).toHaveAttribute("collapsed", "");
	await tree.locator(".collapse-btn").click();
	initial.release();
	await expectActiveSpace(page, "alpha");
	await expect(tree.locator(".blocked-state")).toHaveCount(0);
	await expect(tree.locator(".panel")).not.toHaveAttribute("inert", "");
	await expect(page.getByRole("button", {name: "Model Library", exact: true})).toBeEnabled();
});

test("a failed load shows a blocked inspector with a working retry action", async ({page}) => {
	const api = await mockSpaces(page);
	const initial = api.hold("alpha", true);
	await page.goto("/tests/model-library.html");
	await initial.started;
	initial.release();
	await expect(page.locator("dt3d-tree .blocked-state")).toContainText("Editing unavailable");
	const retry = api.hold("alpha");
	await page.getByRole("button", {name: "Retry loading space"}).click();
	await retry.started;
	await expect(page.locator("dt3d-tree .blocked-state")).toContainText("Loading space");
	retry.release();
	await expectActiveSpace(page, "alpha");
});

test("icon controls explain their actions on hover and keyboard focus", async ({page}) => {
	await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	const library = page.getByRole("button", {name: "Model Library", exact: true});
	await library.hover();
	await expect(page.getByRole("tooltip", {name: "Model Library", exact: true})).toBeVisible();
	await page.mouse.move(600, 350);
	const configure = page.getByRole("button", {name: "Space configuration", exact: true});
	await configure.focus();
	await expect(page.getByRole("tooltip", {name: "Space configuration", exact: true})).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(page.getByRole("tooltip", {name: "Space configuration", exact: true})).not.toBeVisible();
});

test("docked controls stay separate in wide, narrow and embedded editors", async ({page}) => {
	await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	await page.evaluate(() => window.testCard.setConfig({...window.testCard.config, orientation_cube: true}));
	for (const width of [1180, 850, 600, 599, 390, 320]) {
		await page.locator("#editor").evaluate((element, width) => { element.style.width = `${width}px`; }, width);
		for (const collapsed of [true, false]) {
			const toggle = page.locator("dt3d-tree .collapse-btn");
			if (await toggle.getAttribute("aria-expanded") === String(collapsed)) await toggle.click();
			await expect.poll(() => page.evaluate(() => {
				const card = window.testCard;
				const visible = (element) => element && getComputedStyle(element).visibility !== "hidden" && element.getBoundingClientRect().width > 0;
				const controls = [card.spaceSelector, card.objectSidebar, card.tree,
					card.bottomBar, card.cameraToggle, card.orientationCube].filter(visible);
				const rects = controls.map((element) => ({name: element.tagName, rect: element.getBoundingClientRect()}));
				return rects.flatMap((a, index) => rects.slice(index + 1).filter((b) =>
					Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left) > 1 &&
					Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top) > 1,
				).map((b) => `${a.name} overlaps ${b.name}`));
			})).toEqual([]);
		}
	}
});

test("materials use the creation rail and the space dialog covers editor controls", async ({page}) => {
	await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	await page.getByRole("button", {name: "Open material manager", exact: true}).click();
	await expect(page.locator("dt3d-material-manager")).toHaveAttribute("open", "");
	await expect.poll(() => page.evaluate(() => {
		const card = window.testCard;
		return card.materialManager.getBoundingClientRect().top >= card.bottomBar.getBoundingClientRect().bottom;
	})).toBe(true);
	await page.getByRole("button", {name: "Close material manager", exact: true}).click();
	await expect(page.locator("dt3d-material-manager .manager")).toHaveAttribute("inert", "");
	await page.getByRole("button", {name: "Space configuration", exact: true}).click();
	await expect(page.locator("dt3d-space-config-menu .close-button")).toBeVisible();
	await page.locator("dt3d-space-config-menu .close-button").click();
	await expect(page.locator("dt3d-space-config-menu")).toHaveCount(0);
});

test("short cards keep progress in the header and materials clear of workspace tools", async ({page}) => {
	await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	await page.locator("#editor").evaluate((element) => { element.style.width = "390px"; element.style.height = "300px"; });
	await page.locator("dt3d-tree .collapse-btn").click();
	await page.evaluate(() => {
		window.testCard.syncProgressComponent.progress = {active: true, completed: 1, failed: 0, total: 2, items: [{id: "save", label: "Objects", operation: "Save"}]};
	});
	await expect(page.locator("sync-progress-component")).toHaveAttribute("compact", "");
	await expect.poll(() => page.evaluate(() => {
		const card = window.testCard;
		return card.syncProgressComponent.getBoundingClientRect().bottom <= card.spaceSelector.getBoundingClientRect().bottom;
	})).toBe(true);
	await page.getByRole("button", {name: "Open material manager", exact: true}).click();
	await expect(page.locator("dt3d-bottom-bar")).toBeHidden();
});

async function expectActiveSpace(page, id) {
	await expect.poll(() => page.evaluate(() => ({
		id: window.testCard.spaceSync?.activeSpaceId,
		blocked: window.testCard.spaceSync?.editingBlocked,
		children: window.testCard.space?.children.map((object) => object.name),
	}))).toEqual({id, blocked: false, children: [`${id} objects`]});
}

async function expectRequestFinished(page, id) {
	await expect.poll(() => page.evaluate((id) =>
		window.testCard.spaceSync.getProgressSnapshot().items
			.some((item) => item.label === id), id)).toBe(false);
}

test("switching during the initial load keeps the newly selected space", async ({page}) => {
	const api = await mockSpaces(page);
	const initial = api.hold("alpha");
	await page.goto("/tests/model-library.html");
	await initial.started;
	await expect(selector(page)).toBeEnabled();
	await expect(selector(page)).toHaveValue("alpha");
	await expect(page.locator("dt3d-space-selector button").first()).toBeDisabled();
	await selector(page).selectOption("beta");
	await expectActiveSpace(page, "beta");
	initial.release();
	await expectRequestFinished(page, "alpha");
	await expectActiveSpace(page, "beta");
	await expect(selector(page)).toHaveValue("beta");
	await expect(page.locator("dt3d-space-selector .loading-indicator")).toHaveCount(0);
});

for (const fail of [false, true]) {
	test(`a superseded ${fail ? "failed" : "successful"} switch cannot reset the latest selection`, async ({page}) => {
		const api = await mockSpaces(page);
		await page.goto("/tests/model-library.html");
		await expectActiveSpace(page, "alpha");
		const previous = api.hold("beta", fail);
		const latest = api.hold("gamma");
		await selector(page).selectOption("beta");
		await previous.started;
		await selector(page).selectOption("gamma");
		await latest.started;
		previous.release();
		await expectRequestFinished(page, "beta");
		await expect(selector(page)).toHaveValue("gamma");
		await expect(page.locator("dt3d-space-selector .loading-indicator")).toBeVisible();
		await expect.poll(() => page.evaluate(() => window.testCard.spaceSync.editingBlocked)).toBe(true);
		latest.release();
		await expectActiveSpace(page, "gamma");
		await expect(selector(page)).toHaveValue("gamma");
	});
}

test("a pending switch can return to the previously displayed space", async ({page}) => {
	const api = await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	const pending = api.hold("beta");
	await selector(page).selectOption("beta");
	await pending.started;
	await selector(page).selectOption("alpha");
	await expectActiveSpace(page, "alpha");
	pending.release();
	await expectRequestFinished(page, "beta");
	await expectActiveSpace(page, "alpha");
	await expect(selector(page)).toHaveValue("alpha");
});

test("the latest choice wins while previous edits are still being saved", async ({page}) => {
	await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	await page.evaluate(() => {
		const saved = new Promise((resolve) => { window.finishSaving = resolve; });
		window.testCard.actionStack.flush = () => saved;
	});
	await selector(page).selectOption("beta");
	await selector(page).selectOption("alpha");
	await page.evaluate(() => window.finishSaving());
	await expectActiveSpace(page, "alpha");
	await expect(selector(page)).toHaveValue("alpha");
});

for (const visualizationOnly of [false, true]) {
	test(`saving the card default opens the chosen space in ${visualizationOnly ? "view" : "editor"} mode`, async ({page}) => {
		await mockSpaces(page);
		await page.goto("/tests/model-library.html");
		await expectActiveSpace(page, "alpha");
		await page.evaluate(async (visualizationOnly) => {
			await import("/src/components/config-editor.ts");
			const card = window.testCard;
			card.setConfig({...card.config, visualization_only: visualizationOnly});
			const editor = document.createElement("dt3d-config-editor");
			editor.setConfig({...card.config, default_viewport: "old-viewport"});
			editor.addEventListener("config-changed", (event) => {
				window.savedConfig = structuredClone(event.detail.config);
				card.setConfig(event.detail.config);
			});
			document.body.appendChild(editor);
		}, visualizationOnly);
		const defaultSpace = page.locator("dt3d-config-editor select[data-key=default_space]");
		await defaultSpace.selectOption("beta");
		await expectActiveSpace(page, "beta");
		await expect(defaultSpace).toHaveValue("beta");
		await expect.poll(() => page.evaluate(() => ({
			space: window.savedConfig?.default_space,
			viewport: window.savedConfig?.default_viewport,
		}))).toEqual({space: "beta", viewport: ""});
		// Reopening the editor must show the saved choice after its options load.
		await page.evaluate(() => {
			const editor = document.querySelector("dt3d-config-editor");
			editor.remove();
			const reopened = document.createElement("dt3d-config-editor");
			reopened.setConfig(window.savedConfig);
			reopened.addEventListener("config-changed", (event) => window.testCard.setConfig(event.detail.config));
			document.body.appendChild(reopened);
		});
		await expect(defaultSpace).toHaveValue("beta");
		// Saving unrelated settings must preserve the current space.
		await page.evaluate(() => window.testCard.setConfig({...window.savedConfig, orientation_cube: true}));
		await expectActiveSpace(page, "beta");
		await defaultSpace.selectOption("");
		await expectActiveSpace(page, "alpha");
	});
}

test("a failed initial load still allows switching to another space", async ({page}) => {
	const api = await mockSpaces(page);
	const initial = api.hold("alpha", true);
	await page.goto("/tests/model-library.html");
	await initial.started;
	initial.release();
	await expect(page.locator("dt3d-space-selector .loading-indicator")).toHaveCount(0);
	await expect(selector(page)).toBeEnabled();
	await expect(page.locator("dt3d-space-selector button").first()).toBeDisabled();
	await selector(page).selectOption("beta");
	await expectActiveSpace(page, "beta");
	await expect(selector(page)).toHaveValue("beta");
});

test("a failed switch can be retried by selecting that space again", async ({page}) => {
	const api = await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	const failed = api.hold("beta", true);
	await selector(page).selectOption("beta");
	await failed.started;
	failed.release();
	await expect(selector(page)).toHaveValue("alpha");
	await expect(page.locator("dt3d-space-selector .loading-indicator")).toHaveCount(0);
	const retry = api.hold("beta");
	await selector(page).selectOption("beta");
	await retry.started;
	retry.release();
	await expectActiveSpace(page, "beta");
	await expect(selector(page)).toHaveValue("beta");
});

test("saving a new default during initial loading supersedes that load", async ({page}) => {
	const api = await mockSpaces(page);
	const initial = api.hold("alpha");
	await page.goto("/tests/model-library.html");
	await initial.started;
	await page.evaluate(() => window.testCard.setConfig({
		...window.testCard.config,
		default_space: "beta",
	}));
	await expectActiveSpace(page, "beta");
	initial.release();
	await expectRequestFinished(page, "alpha");
	await expectActiveSpace(page, "beta");
});

test("the configuration editor offers space choices before scene data finishes loading", async ({page}) => {
	const api = await mockSpaces(page);
	await page.goto("/tests/model-library.html");
	await expectActiveSpace(page, "alpha");
	const viewportData = api.hold("alpha/version", true);
	await page.evaluate(async () => {
		await import("/src/components/config-editor.ts");
		const editor = document.createElement("dt3d-config-editor");
		editor.setConfig(window.testCard.config);
		document.body.appendChild(editor);
	});
	await viewportData.started;
	const defaultSpace = page.locator("dt3d-config-editor select[data-key=default_space]");
	await expect(defaultSpace).toBeEnabled();
	await defaultSpace.selectOption("beta");
	await expect(defaultSpace).toHaveValue("beta");
	viewportData.release();
	await expect(defaultSpace).toHaveValue("beta");
});
