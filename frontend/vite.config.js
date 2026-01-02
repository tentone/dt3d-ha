import { defineConfig } from "vite";

export default defineConfig({
	build: {
		lib: {
			entry: "src/main.ts",
			name: "DT3DCard",
			fileName: "dt3d-card",
			formats: ["es"],
		},
		rollupOptions: {
			treeshake: "recommended",
		},
	},
	define: {
		BUILD_TIMESTAMP: JSON.stringify(new Date().toISOString()),
		"process.env.NODE_ENV": JSON.stringify("production")
	}
});
