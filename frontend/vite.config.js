import * as mdiIcons from "@mdi/js";
import {Buffer} from "node:buffer";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {deflateSync} from "node:zlib";
import {dirname, resolve} from "node:path";
import {buildSync} from "esbuild";
import {fileURLToPath} from "node:url";
import {defineConfig} from "vite";

const MDI_CATALOG_ID = "virtual:mdi-icon-catalog";
const RESOLVED_MDI_CATALOG_ID = `\0${MDI_CATALOG_ID}`;
const DRACO_WASM_ID = "virtual:draco-wasm";
const RESOLVED_DRACO_WASM_ID = `\0${DRACO_WASM_ID}`;
const require = createRequire(import.meta.url);
const TEXTURE_CODEC_ID = "virtual:texture-codecs";

function compressToBase64(value) {
	return Buffer.from(deflateSync(value, {level: 9})).toString("base64");
}

// Keep the complete runtime icon/codec support without storing large, gzip-friendly data verbatim in the single-file HACS artifact.
const mdiIconCatalog = compressToBase64(
	JSON.stringify(
		Object.fromEntries(
			Object.entries(mdiIcons).filter(
				([name, value]) => name.startsWith("mdi") && typeof value === "string",
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
			if (id === TEXTURE_CODEC_ID) return `\0${TEXTURE_CODEC_ID}`;
			if (id === MDI_CATALOG_ID) return RESOLVED_MDI_CATALOG_ID;
			if (id === DRACO_WASM_ID) return RESOLVED_DRACO_WASM_ID;
			return null;
		},
		load(id) {
			if (id === `\0${TEXTURE_CODEC_ID}`) {
				const encoderRoot = resolve(
					dirname(fileURLToPath(import.meta.resolve("ktx2-encoder"))),
					"..",
				);
				const threeRoot = resolve(dirname(require.resolve("three")), "..");
				const worker = buildSync({
					entryPoints: ["src/service/texture-encoder-worker.ts"],
					bundle: true,
					write: false,
					minify: true,
					platform: "browser",
					format: "iife",
					external: ["module"], // Unreachable Emscripten Node branch in the browser worker.
					// The worker always receives the bundled WASM explicitly.
					define: {
						"import.meta.url": JSON.stringify("https://dt3d.invalid/"),
						process: "undefined",
					},
				}).outputFiles[0].contents;
				return Object.entries({
					workerSource: worker,
					encoderWasm: readFileSync(
						resolve(encoderRoot, "basis/basis_encoder.wasm"),
					),
					transcoderSource: readFileSync(
						resolve(threeRoot, "examples/jsm/libs/basis/basis_transcoder.js"),
					),
					transcoderWasm: readFileSync(
						resolve(threeRoot, "examples/jsm/libs/basis/basis_transcoder.wasm"),
					),
					dracoImportSource: readFileSync(
						resolve(
							threeRoot,
							"examples/jsm/libs/draco/gltf/draco_wasm_wrapper.js",
						),
					),
					dracoImportWasm: readFileSync(
						resolve(
							threeRoot,
							"examples/jsm/libs/draco/gltf/draco_decoder.wasm",
						),
					),
				})
					.map(
						([name, bytes]) =>
							`export const ${name} = ${JSON.stringify(compressToBase64(bytes))};`,
					)
					.join("\n");
			}
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
			if (
				id
					.replaceAll("\\", "/")
					.endsWith("/three/examples/jsm/loaders/KTX2Loader.js")
			) {
				return {
					code: code
						.replace(
							/new URL\([^;]+?import\.meta\.url\s*\)\.toString\(\)/g,
							'""',
						)
						// Odd legacy mip chains are decoded as RGBA and immediately repaired.
						.replace(
							/console\.warn\( 'THREE\.KTX2Loader: ETC1S and UASTC textures should use multiple-of-four dimensions\.' \);/g,
							"",
						),
					map: null,
				};
			}
			if (
				!id
					.replaceAll("\\", "/")
					.endsWith("/three/examples/jsm/loaders/DRACOLoader.js")
			) {
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
	},
});
