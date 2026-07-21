import type {Object3D} from "three";
import {LoadingManager, Mesh, MeshStandardMaterial} from "three";
import {ColladaLoader} from "three/examples/jsm/loaders/ColladaLoader.js";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import {FBXLoader} from "three/examples/jsm/loaders/FBXLoader.js";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import {MTLLoader} from "three/examples/jsm/loaders/MTLLoader.js";
import {OBJLoader} from "three/examples/jsm/loaders/OBJLoader.js";
import {STLLoader} from "three/examples/jsm/loaders/STLLoader.js";
import {TDSLoader} from "three/examples/jsm/loaders/TDSLoader.js";

import {
	getFileExtension,
	LocalFileAssets,
	readFileAsText,
} from "./file-utils.js";

const MODEL_FILE_EXTENSIONS = new Set([
	"gltf",
	"glb",
	"obj",
	"fbx",
	"dae",
	"stl",
	"3ds",
]);

export type LoadedModelHandler = (object: Object3D, file: File) => void;

export function isModelFile(file: File): boolean {
	const extension = getFileExtension(file);
	return extension !== null && MODEL_FILE_EXTENSIONS.has(extension);
}

/** Parse and load every supported model in a local file selection. */
export async function loadModelsFromFiles(
	files: File[],
	onLoaded: LoadedModelHandler,
): Promise<void> {
	const modelFiles = files.filter(isModelFile);
	if (modelFiles.length === 0) return;

	const assets = new LocalFileAssets(files);
	try {
		await Promise.all(
			modelFiles.map((file) => loadModelFromFile(file, assets, onLoaded)),
		);
	} finally {
		assets.dispose();
	}
}

function createLoadingManager(assets: LocalFileAssets): LoadingManager {
	const manager = new LoadingManager();
	manager.setURLModifier((url) => assets.resolveUrl(url));
	return manager;
}

function loadModelFromFile(
	file: File,
	assets: LocalFileAssets,
	onLoaded: LoadedModelHandler,
): Promise<void> {
	const extension = getFileExtension(file);
	if (!extension) {
		console.warn("Unable to detect model file extension:", file.name);
		return Promise.resolve();
	}

	return new Promise((resolve) => {
		const manager = createLoadingManager(assets);
		const url = assets.getVirtualUrl(file);
		let loaderFinished = false;
		let managerFinished = false;

		const finishIfReady = () => {
			if (loaderFinished && managerFinished) resolve();
		};
		manager.onStart = () => {
			managerFinished = false;
		};
		manager.onLoad = () => {
			managerFinished = true;
			finishIfReady();
		};

		const addLoadedModel = (object: Object3D | null | undefined) => {
			if (object) onLoaded(object, file);
			loaderFinished = true;
			finishIfReady();
		};
		const onError = (error: unknown) => {
			console.error(`Failed to load ${extension} model`, error);
			loaderFinished = true;
			finishIfReady();
		};

		if (extension === "gltf" || extension === "glb") {
			const loader = new GLTFLoader(manager);
			const dracoLoader = new DRACOLoader(manager);
			dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/");
			loader.setDRACOLoader(dracoLoader);
			loader.load(
				url,
				(gltf: any) => {
					dracoLoader.dispose();
					addLoadedModel(gltf.scene ?? gltf.scenes?.[0]);
				},
				undefined,
				(error: unknown) => {
					dracoLoader.dispose();
					onError(error);
				},
			);
			return;
		}

		if (extension === "obj") {
			void loadObjModel(file, assets, manager, url)
				.then(addLoadedModel)
				.catch(onError);
			return;
		}

		if (extension === "fbx") {
			new FBXLoader(manager).load(url, addLoadedModel, undefined, onError);
			return;
		}

		if (extension === "dae") {
			new ColladaLoader(manager).load(
				url,
				(collada) => addLoadedModel(collada.scene),
				undefined,
				onError,
			);
			return;
		}

		if (extension === "stl") {
			new STLLoader(manager).load(
				url,
				(geometry) => {
					const material = new MeshStandardMaterial({color: 0xb2b2b2});
					addLoadedModel(new Mesh(geometry, material));
				},
				undefined,
				onError,
			);
			return;
		}

		if (extension === "3ds") {
			new TDSLoader(manager).load(url, addLoadedModel, undefined, onError);
			return;
		}

		console.warn("DT3D: Unsupported model format:", extension);
		loaderFinished = true;
		managerFinished = true;
		finishIfReady();
	});
}

async function loadObjModel(
	file: File,
	assets: LocalFileAssets,
	manager: LoadingManager,
	url: string,
): Promise<Object3D> {
	const source = await readFileAsText(file);
	const materialReferences = [
		...source.matchAll(/^\s*mtllib\s+(.+?)\s*$/gim),
	].map((match) => match[1]);
	const materialFile = findObjMaterialFile(file, assets, materialReferences);
	const loader = new OBJLoader(manager);

	if (materialFile) {
		try {
			const materials = await new MTLLoader(manager).loadAsync(
				assets.getVirtualUrl(materialFile),
			);
			materials.preload();
			loader.setMaterials(materials);
		} catch (error) {
			console.warn(`Failed to load materials for ${file.name}`, error);
		}
	}

	return loader.loadAsync(url);
}

function findObjMaterialFile(
	objFile: File,
	assets: LocalFileAssets,
	references: string[],
): File | null {
	for (const reference of references) {
		const file = assets.findReferencedFile(reference, objFile);
		if (file) return file;
	}

	const expectedName = objFile.name.replace(/\.obj$/i, ".mtl");
	const matchingFile = assets.findReferencedFile(expectedName, objFile);
	if (matchingFile) return matchingFile;

	const siblingMaterialFiles = assets.findSiblingFiles(objFile, "mtl");
	return siblingMaterialFiles.length === 1 ? siblingMaterialFiles[0] : null;
}
