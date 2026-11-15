import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, join, posix } from "node:path";

import { DOMParser } from "linkedom";
import {
	LoadingManager,
	Mesh,
	MeshStandardMaterial,
	TextureLoader,
} from "three";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { TDSLoader } from "three/addons/loaders/TDSLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

import { createDracoLoader, installImageLoader } from "./loaders.mjs";

const directory = process.argv[2];
const assetRoot = new URL("https://dt3d-model.invalid/");
const maxBytes = 64 * 1024 * 1024;
const mimeTypes = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".avif": "image/avif",
	".gif": "image/gif",
	".bmp": "image/bmp",
	".ktx2": "image/ktx2",
};

function assetURL(path) {
	const portable = path.replaceAll("\\", "/");
	if (
		isAbsolute(portable) ||
		portable
			.split("/")
			.some((part) => !part || part === ".." || part === ".") ||
		/[:?#]/.test(portable)
	) {
		throw new Error(
			"Upload names must be relative paths without '..', query strings or fragments.",
		);
	}
	return new URL(
		portable.split("/").map(encodeURIComponent).join("/"),
		assetRoot,
	).href;
}

function makeAssetManager(mainURL, entries) {
	const assets = new Map();
	const assetNames = new Map();
	const basenameIndex = new Map();
	for (const { name, base64 } of entries) {
		const url = assetURL(name);
		if (assets.has(url)) throw new Error(`Duplicate upload name ${name}`);
		const mime =
			mimeTypes[posix.extname(name).toLowerCase()] ??
			"application/octet-stream";
		const blobURL = URL.createObjectURL(
			new Blob([Buffer.from(base64, "base64")], { type: mime }),
		);
		assets.set(url, blobURL);
		assetNames.set(blobURL, name);
		const basename = posix.basename(new URL(url).pathname);
		basenameIndex.set(basename, basenameIndex.has(basename) ? null : url);
	}
	const missing = new Set();
	const manager = new LoadingManager();
	const findAsset = (reference) => {
		const resolved = new URL(reference.replaceAll("\\", "/"), mainURL);
		const fallback = basenameIndex.get(posix.basename(resolved.pathname));
		return (
			resolved.origin === assetRoot.origin &&
			(assets.has(resolved.href) ? resolved.href : fallback)
		);
	};
	manager.setURLModifier((reference) => {
		if (/^(data:|blob:nodedata:)/i.test(reference)) return reference;
		const url = findAsset(reference);
		if (url) return assets.get(url);
		missing.add(reference);
		// FileLoader expects a resolvable URL even on failure.
		return "blob:nodedata:00000000-0000-0000-0000-000000000000";
	});
	manager.onError = (url) => {
		if (assetNames.has(url)) missing.add(assetNames.get(url));
		else if (!missing.size) missing.add("embedded model asset");
	};
	return { manager, missing, findAsset };
}

async function loadModel(input) {
	const mainURL = assetURL(input.file.name);
	const uploadedAssets = input.assets ?? [];
	const { manager, missing, findAsset } = makeAssetManager(mainURL, [
		input.file,
		...uploadedAssets,
	]);
	installImageLoader();
	globalThis.DOMParser = DOMParser;
	const draco = createDracoLoader();
	let finishAssets;
	const imagesReady = new Promise((resolve) => {
		finishAssets = resolve;
	});
	manager.onLoad = finishAssets;
	let model;
	try {
		switch (posix.extname(input.file.name).toLowerCase()) {
			case ".gltf":
			case ".glb": {
				const loader = new GLTFLoader(manager);
				loader.setDRACOLoader(draco);
				loader.setMeshoptDecoder(MeshoptDecoder);
				// The card already decodes KTX2 data URLs. Keep compressed source images intact.
				loader.setKTX2Loader(new TextureLoader(manager));
				const gltf = await loader.loadAsync(mainURL);
				model = gltf.scene ?? gltf.scenes[0];
				break;
			}
			case ".obj": {
				const loader = new OBJLoader(manager);
				const text = Buffer.from(input.file.base64, "base64").toString("utf8");
				const referenced = text.match(/^\s*mtllib\s+(.+?)\s*$/im)?.[1];
				const onlyLibrary = uploadedAssets.filter(({ name }) =>
					/\.mtl$/i.test(name),
				);
				const material =
					(referenced && findAsset(referenced)) ||
					(onlyLibrary.length === 1 && assetURL(onlyLibrary[0].name));
				manager.itemStart(mainURL);
				try {
					if (material)
						loader.setMaterials(
							await new MTLLoader(manager).loadAsync(material),
						);
					model = loader.parse(text);
				} finally {
					manager.itemEnd(mainURL);
				}
				break;
			}
			case ".fbx":
				model = await new FBXLoader(manager).loadAsync(mainURL);
				break;
			case ".dae":
				model = (await new ColladaLoader(manager).loadAsync(mainURL))?.scene;
				break;
			case ".stl":
				model = new Mesh(
					await new STLLoader(manager).loadAsync(mainURL),
					new MeshStandardMaterial({ color: 0xb2b2b2 }),
				);
				break;
			case ".3ds":
				model = await new TDSLoader(manager).loadAsync(mainURL);
				break;
			default:
				throw new Error(
					"Supported model formats are GLB, glTF, OBJ, FBX, DAE, STL and 3DS.",
				);
		}
		await imagesReady;
		if (missing.size)
			throw new Error(
				`Model dependencies could not be loaded: ${[...missing].slice(0, 5).join(", ")}`,
			);
		return model;
	} catch (error) {
		if (missing.size)
			throw new Error(
				`Model dependencies could not be loaded: ${[...missing].slice(0, 5).join(", ")}`,
				{ cause: error },
			);
		throw error;
	} finally {
		draco.dispose();
	}
}

function packGeometry(geometry) {
	const chunks = [];
	let byteOffset = 0;
	function pack(attribute) {
		const array = attribute.isInterleavedBufferAttribute
			? attribute.clone().array
			: attribute.array;
		const bytes = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
		const entry = {
			arrayType: array.constructor.name,
			byteOffset,
			byteLength: bytes.length,
			count: attribute.count,
			itemSize: attribute.itemSize,
			normalized: attribute.normalized,
			name: attribute.name || undefined,
		};
		byteOffset += bytes.length;
		chunks.push(bytes);
		return entry;
	}
	const metadata = {
		version: 1,
		groups: geometry.groups,
		index: geometry.index ? pack(geometry.index) : undefined,
		attributes: Object.fromEntries(
			Object.entries(geometry.attributes).map(([name, attribute]) => [
				name,
				pack(attribute),
			]),
		),
		morphTargetsRelative: geometry.morphTargetsRelative,
		morphAttributes: Object.fromEntries(
			Object.entries(geometry.morphAttributes).map(([name, attributes]) => [
				name,
				attributes.map(pack),
			]),
		),
	};
	if (
		geometry.drawRange.start !== 0 ||
		Number.isFinite(geometry.drawRange.count)
	) {
		metadata.drawRange = {
			start: geometry.drawRange.start,
			count: Number.isFinite(geometry.drawRange.count)
				? geometry.drawRange.count
				: -1,
		};
	}
	const header = Buffer.from(JSON.stringify(metadata));
	const prefix = Buffer.from("DT3DGEO1\0\0\0\0");
	prefix.writeUInt32LE(header.length, 8);
	return Buffer.concat([prefix, header, ...chunks]);
}

async function exportScene(model) {
	if (!model) throw new Error("Model contains no editable meshes.");
	const objects = [];
	const geometries = new Map();
	const materials = new Set();
	const materialMeta = { materials: {}, textures: {}, images: {} };
	let convertedBytes = 0;
	let meshCount = 0;
	const coordinates = ({ x, y, z }) => ({ x, y, z });

	function materialID(material) {
		if (!materials.has(material.uuid)) {
			materials.add(material.uuid);
			materialMeta.materials[material.uuid] = material.toJSON(materialMeta);
		}
		return material.uuid;
	}

	async function visit(node, parent) {
		if (objects.length >= 2000)
			throw new Error("The model exceeds the 2000 object import limit.");
		const rotation = node.rotation.clone().reorder("XYZ");
		const data = {
			position: coordinates(node.position),
			rotation: coordinates(rotation),
			scale: coordinates(node.scale),
		};
		const index = objects.length;
		const mesh =
			node.isMesh &&
			!node.isInstancedMesh &&
			node.geometry?.getAttribute("position")?.count;
		const name = node.name || (mesh ? "Mesh" : "Group");
		const entry = { name, parent, data, type: mesh ? "mesh" : "group" };
		objects.push(entry);
		if (mesh) {
			meshCount++;
			const geometry = node.geometry;
			let key = geometries.get(geometry.uuid);
			if (key === undefined) {
				key = geometries.size;
				const binary = packGeometry(geometry);
				convertedBytes += binary.length;
				if (convertedBytes > maxBytes)
					throw new Error(
						"Converted geometry exceeds the 64 MiB import limit.",
					);
				await writeFile(join(directory, `geometry-${key}.dt3dgeo`), binary);
				geometries.set(geometry.uuid, key);
			}
			geometry.computeBoundingBox();
			const { min, max } = geometry.boundingBox;
			if (![...min, ...max].every(Number.isFinite))
				throw new Error("Model contains invalid vertex positions.");
			data.geometryBoundingBox = {
				min: coordinates(min),
				max: coordinates(max),
			};
			data.material = Array.isArray(node.material)
				? node.material.map(materialID)
				: materialID(node.material);
			entry.geometry = key;
		}
		for (const child of node.children) {
			await visit(child, index);
		}
		if (node.isInstancedMesh) {
			for (let i = 0; i < node.count; i++) {
				const instance = new Mesh(node.geometry, node.material);
				instance.name = `${name} ${i + 1}`;
				node.getMatrixAt(i, instance.matrix);
				instance.matrix.decompose(
					instance.position,
					instance.quaternion,
					instance.scale,
				);
				await visit(instance, index);
			}
		}
		if (!mesh && objects.length === index + 1) objects.pop();
	}

	await visit(model, -1);
	if (!meshCount)
		throw new Error("Model contains no editable triangle meshes.");
	for (const material of Object.values(materialMeta.materials)) {
		const textures = Object.values(materialMeta.textures).filter(({ uuid }) =>
			Object.values(material).includes(uuid),
		);
		if (textures.length) {
			material.textures = textures;
			material.images = Object.values(materialMeta.images).filter(({ uuid }) =>
				textures.some(({ image }) => image === uuid),
			);
		}
	}
	const result = JSON.stringify({
		objects,
		materials: Object.values(materialMeta.materials),
		geometries: geometries.size,
	});
	if (Buffer.byteLength(result) > maxBytes)
		throw new Error(
			"Converted scene metadata exceeds the 64 MiB import limit.",
		);
	await writeFile(join(directory, "scene.json"), result);
}

try {
	const input = JSON.parse(
		await readFile(join(directory, "input.json"), "utf8"),
	);
	await exportScene(await loadModel(input));
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	await writeFile(join(directory, "error.txt"), message.slice(0, 1500));
	process.exitCode = 1;
}
