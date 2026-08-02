import * as mdiIcons from "@mdi/js";
import {Buffer} from "node:buffer";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {deflateSync} from "node:zlib";
import { defineConfig } from "vite";

const MDI_CATALOG_ID = "virtual:mdi-icon-catalog";
const RESOLVED_MDI_CATALOG_ID = `\0${MDI_CATALOG_ID}`;
const DRACO_WASM_ID = "virtual:draco-wasm";
const RESOLVED_DRACO_WASM_ID = `\0${DRACO_WASM_ID}`;
const require = createRequire(import.meta.url);

function compressToBase64(value) {
	return Buffer.from(deflateSync(value, {level: 9})).toString("base64");
}

// Keep the complete runtime icon/codec support without storing large, gzip-friendly data verbatim in the single-file HACS artifact.
const mdiIconCatalog = compressToBase64(
	JSON.stringify(
		Object.fromEntries(
			Object.entries(mdiIcons).filter(
				([name, value]) =>
					name.startsWith("mdi") && typeof value === "string",
			),
		),
	),
);
const dracoDecoderWasm = compressToBase64(
	readFileSync(require.resolve("draco3d/draco_decoder.wasm")),
);
const dracoEncoderWasm = compressToBase64(
	readFileSync(require.resolve("draco3d/draco_encoder.wasm")),
);

function compressedAssets() {
	return {
		name: "compressed-assets",
		resolveId(id) {
			if (id === MDI_CATALOG_ID) return RESOLVED_MDI_CATALOG_ID;
			if (id === DRACO_WASM_ID) return RESOLVED_DRACO_WASM_ID;
			return null;
		},
		load(id) {
			if (id === RESOLVED_MDI_CATALOG_ID) {
				return `export default ${JSON.stringify(mdiIconCatalog)};`;
			}
			if (id === RESOLVED_DRACO_WASM_ID) {
				return [
					`export const decoderWasm = ${JSON.stringify(dracoDecoderWasm)};`,
					`export const encoderWasm = ${JSON.stringify(dracoEncoderWasm)};`,
				].join("\n");
			}
			return null;
		},
	};
}

function externalDracoLoaderAssets() {
	const dracoAssetPattern =
		/new URL\(\s*(['"])\.\.\/libs\/draco\/[^'"]+\1,\s*import\.meta\.url\s*\)\.toString\(\)/g;

	return {
		name: "external-draco-loader-assets",
		transform(code, id) {
			if (!id.replaceAll("\\", "/").endsWith(
				"/three/examples/jsm/loaders/DRACOLoader.js",
			)) {
				return null;
			}

			let replacementCount = 0;
			// loader-utils always calls setDecoderPath(), so Three's bundled fallback URLs are unreachable and would only inline duplicate codecs.
			const transformedCode = code.replace(dracoAssetPattern, () => {
				replacementCount += 1;
				return '""';
			});

			if (replacementCount !== 5) {
				throw new Error(
					`Expected five default Draco decoder assets, found ${replacementCount}`,
				);
			}

			return {
				code: transformedCode,
				map: null,
			};
		},
	};
}

export default defineConfig({
	plugins: [compressedAssets(), externalDracoLoaderAssets()],
	build: {
		outDir: "..",
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
		"process.env.NODE_ENV": JSON.stringify("production"),
	}
});
