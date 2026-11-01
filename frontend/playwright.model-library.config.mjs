import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "tests",
	testMatch: "model-library.spec.mjs",
	fullyParallel: false,
	workers: 1,
	use: {
		baseURL: "http://127.0.0.1:4173",
		channel: process.env.PLAYWRIGHT_CHANNEL,
		viewport: { width: 1180, height: 820 },
	},
	webServer: {
		command: "npm run dev -- --host 127.0.0.1 --port 4173 --strictPort",
		url: "http://127.0.0.1:4173/tests/model-library.html",
		reuseExistingServer: !process.env.CI,
	},
});
