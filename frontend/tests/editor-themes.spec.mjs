/* global window, document, URL, getComputedStyle */
import {expect, test} from "@playwright/test";

// Home Assistant's theme variables are supplied by the dashboard, including scoped themes.
const themes = {
	light: {
		mode: "light", surface: "#ffffff", background: "#fafafa", secondary: "#e5e5e5",
		text: "#212121", muted: "#727272", accent: "#009ac7", onAccent: "#ffffff",
		input: "#f5f5f5", ink: "rgba(0, 0, 0, 0.87)", divider: "rgba(0, 0, 0, 0.12)",
	},
	dark: {
		mode: "dark", surface: "#1c1c1c", background: "#111111", secondary: "#282828",
		text: "#e1e1e1", muted: "#9b9b9b", accent: "#009ac7", onAccent: "#ffffff",
		input: "rgba(255, 255, 255, 0.05)", ink: "rgba(255, 255, 255, 0.87)", divider: "rgba(225, 225, 225, 0.12)",
	},
};

const rgb = (hex) => `rgb(${hex.match(/[a-f0-9]{2}/gi).map((part) => parseInt(part, 16)).join(", ")})`;

async function applyTheme(page, theme, omitInputColors = false) {
	await page.evaluate(({theme, omitInputColors}) => {
		const editor = document.querySelector("#editor");
		const variables = {
			"card-background-color": theme.surface, "primary-background-color": theme.background,
			"secondary-background-color": theme.secondary, "primary-text-color": theme.text,
			"secondary-text-color": theme.muted, "primary-color": theme.accent,
			"text-primary-color": theme.onAccent, "divider-color": theme.divider,
			"shadow-color": "rgba(0, 0, 0, 0.24)", "error-color": "#db4437",
			"ha-color-on-danger-loud": "#ffffff",
		};
		for (const [name, value] of Object.entries(variables)) editor.style.setProperty(`--${name}`, value);
		for (const [name, value] of [["input-fill-color", theme.input], ["input-ink-color", theme.ink]]) {
			if (omitInputColors) editor.style.removeProperty(`--${name}`);
			else editor.style.setProperty(`--${name}`, value);
		}
		editor.style.colorScheme = theme.mode;
	}, {theme, omitInputColors});
}

async function expectReadable(locator, surface, minimum = 4.5) {
	const ratio = await locator.evaluate((element, surface) => {
		const style = getComputedStyle(element);
		const context = document.createElement("canvas").getContext("2d");
		const sample = (colors) => {
			context.clearRect(0, 0, 1, 1);
			for (const color of colors) { context.fillStyle = color; context.fillRect(0, 0, 1, 1); }
			return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
		};
		const luminance = (channels) => channels.map((value) => {
			const channel = value / 255;
			return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
		}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
		const background = luminance(sample([surface, style.backgroundColor]));
		const foreground = luminance(sample([surface, style.backgroundColor, style.color]));
		return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
	}, surface);
	expect(ratio).toBeGreaterThanOrEqual(minimum);
}

test.beforeEach(async ({page}) => {
	const space = {id: "theme-space", name: "Theme preview", is_default: true, cache_version: 1,
		config: {}, object_instances: [], created_at: 1, updated_at: 1};
	await page.route("**/api/**", (route) => {
		const path = new URL(route.request().url()).pathname;
		return route.fulfill({json: path === "/api/spaces" ? [space] : path.endsWith("/version") ? {cache_version: 1} : space});
	});
	await page.goto("/tests/model-library.html");
	await expect.poll(() => page.evaluate(() => window.testCard?.spaceSync?.editingBlocked)).toBe(false);
	await page.evaluate(() => {
		const card = window.testCard;
		card.setConfig({...card.config, general: {developmentMode: {enabled: false}}});
		card.tree.selectObject(card.space.uuid, true);
	});
});

for (const [name, theme] of Object.entries({
	...themes,
	"custom light": {...themes.light, accent: "#a51660"},
	"custom dark": {...themes.dark, accent: "#90caf9", onAccent: "#121212"},
})) {
	test(`${name}: editor, tooltips, inputs and loading states inherit the dashboard palette`, async ({page}) => {
		await page.emulateMedia({colorScheme: theme.mode === "dark" ? "light" : "dark"});
		await applyTheme(page, theme);
		await expect(page.locator("dt3d-tree")).toHaveCSS("background-color", rgb(theme.surface));
		await expect(page.locator("dt3d-space-selector .selector")).toHaveCSS("background-color", rgb(theme.surface));
		await expect(page.locator("dt3d-bottom-bar .tool-group").first()).toHaveCSS("background-color", rgb(theme.surface));
		await expect(page.locator("dt3d-tree .section-heading").first()).toHaveCSS("color", rgb(theme.text));
		const selected = page.locator("dt3d-bottom-bar button.selected").first();
		await expect(selected).toHaveCSS("background-color", rgb(theme.accent));
		await expect(selected).toHaveCSS("color", rgb(theme.onAccent));
		await expectReadable(selected, theme.surface, 3);
		const search = page.locator("dt3d-tree input[type=search]");
		await expect(search).toHaveCSS("color", theme.ink.startsWith("#") ? rgb(theme.ink) : theme.ink);
		await expect(search).toHaveCSS("color-scheme", theme.mode);
		await expect.poll(() => search.evaluate((element) => getComputedStyle(element, "::placeholder").color)).toBe(rgb(theme.muted));
		await expectReadable(search, theme.surface);
		await expect(page.locator("dt3d-object-inspector input[type=checkbox]").first()).toHaveCSS("accent-color", rgb(theme.accent));
		const library = page.getByRole("button", {name: "Model Library", exact: true});
		await library.hover();
		const tooltip = page.getByRole("tooltip", {name: "Model Library", exact: true});
		await expect(tooltip).toBeVisible();
		await expect(tooltip).toHaveCSS("background-color", rgb(theme.surface));
		await expectReadable(tooltip, theme.surface);
		await library.click();
		await expect(page.locator("dt3d-model-library .library")).toHaveCSS("background-color", rgb(theme.surface));
		await expect(page.locator("dt3d-model-library .room-filter option").first()).toHaveCSS("color", rgb(theme.text));
		if (name === "light" || name === "dark") {
			await page.screenshot({path: `test-results/theme-previews/editor-${name}.png`});
		}
		await page.keyboard.press("Escape");
		await page.evaluate(() => window.testCard.updateSpaceLoadState({blocked: true, refreshing: true, error: null}));
		await expect(library).toBeDisabled();
		await expectReadable(page.locator("dt3d-tree .blocked-state p"), theme.surface);
		await expect(page.locator("dt3d-tree .blocked-state strong")).toHaveCSS("color", rgb(theme.text));
	});
}

test("open materials and inspector follow live theme changes without rebuilding the scene", async ({page}) => {
	await applyTheme(page, themes.light);
	await page.getByRole("button", {name: "Open material manager", exact: true}).click();
	await page.evaluate(async () => {
		const {MeshStandardMaterial} = await import("/node_modules/.vite/deps/three.js");
		const material = new MeshStandardMaterial({color: 0x669999});
		material.name = "Theme test material";
		window.testCard.materialManager.materials = [material];
	});
	const manager = page.locator("dt3d-material-manager");
	const preview = manager.locator(".preview img");
	await expect(preview).toBeVisible();
	await expect.poll(() => preview.evaluate((img) => {
		const context = document.createElement("canvas").getContext("2d");
		context.drawImage(img, 0, 0);
		return context.getImageData(0, 0, 1, 1).data[3];
	})).toBe(0);
	const source = await preview.getAttribute("src");
	for (const theme of [themes.dark, {...themes.light, accent: "#a51660"}, themes.dark]) {
		await applyTheme(page, theme, true);
		await expect(manager.locator(".manager")).toHaveCSS("background-color", rgb(theme.surface));
		await expect(manager.locator(".preview")).toHaveCSS("background-color", rgb(theme.secondary));
		await expect(manager.locator(".delete-button")).toHaveCSS("background-color", rgb(theme.surface));
		await expect(manager.locator(".delete-button")).toHaveCSS("color", rgb(theme.text));
		await expect(manager.locator(".create-button")).toHaveCSS("background-color", rgb(theme.accent));
		await manager.locator(".create-button").hover();
		await expect(manager.locator(".create-button")).toHaveCSS("background-color", rgb(theme.accent));
		await expect(page.locator("dt3d-tree input[type=search]")).toHaveCSS("color", rgb(theme.text));
		await expectReadable(manager.getByRole("searchbox"), theme.surface);
		await expect(preview).toHaveAttribute("src", source);
	}
});
