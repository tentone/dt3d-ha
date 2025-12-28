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
		DT3D_BUILD_TIMESTAMP: new Date(),
	}
});
