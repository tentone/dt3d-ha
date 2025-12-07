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
});
