import {defineConfig} from "@playwright/test";

import modelLibraryConfig from "./playwright.model-library.config.mjs";

export default defineConfig({
	...modelLibraryConfig,
	testMatch: "spaces.spec.mjs",
});
