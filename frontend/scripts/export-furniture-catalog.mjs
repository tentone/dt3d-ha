import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(
	join(frontend, "node_modules", ".furniture-catalog-"),
);
try {
	const bundle = join(temporary, "registry.mjs");
	await build({
		entryPoints: [
			join(frontend, "src/objects/furniture/furniture-registry.ts"),
		],
		outfile: bundle,
		bundle: true,
		platform: "node",
		format: "esm",
		packages: "external",
	});
	const { createFurnitureObject, FURNITURE_OPTIONS } = await import(
		pathToFileURL(bundle).href
	);
	const locale = JSON.parse(
		await readFile(join(frontend, "src/locale/en.json"), "utf8"),
	);
	const entries = FURNITURE_OPTIONS.map(
		({ furnitureType, type, labelKey, category }) => {
			const object = createFurnitureObject(type);
			const defaults = object.getParameters();
			const color = object.furnitureMesh.material.color?.getHexString();
			const parameters = Object.fromEntries(
				object.parameterDefinitions.map(({ name, options, min, max }) => [
					name,
					options
						? {
								default: defaults[name],
								options: options.map(({ value }) => value),
							}
						: min !== undefined || max !== undefined
							? { default: defaults[name], min, max }
							: defaults[name],
				]),
			);
			return {
				id: furnitureType,
				name: locale[labelKey] ?? furnitureType,
				category,
				color,
				parameters,
			};
		},
	);
	const output =
		"[\n" +
		entries.map((entry) => "\t" + JSON.stringify(entry)).join(",\n") +
		"\n]\n";
	const destination = resolve(
		frontend,
		"../addon/backend/mcpserver/furniture.json",
	);
	if (process.argv.includes("--check")) {
		if ((await readFile(destination, "utf8")) !== output)
			throw new Error(
				"Run npm run export:mcp-furniture to update the MCP furniture catalog.",
			);
	} else {
		await writeFile(destination, output);
	}
} finally {
	await rm(temporary, { recursive: true, force: true });
}
