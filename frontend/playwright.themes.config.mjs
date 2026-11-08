import {defineConfig} from "@playwright/test";

import editorConfig from "./playwright.model-library.config.mjs";

export default defineConfig({
	...editorConfig,
	testMatch: "editor-themes.spec.mjs",
});
