import {strFromU8, strToU8, unzip, zip} from "fflate";

import type {
	ObjectInstancePayload,
	ObjectInstanceResponse,
	SpaceApi,
	SpaceResponse,
} from "./space-api.js";

export const DT3D_ARCHIVE_MIME_TYPE = "application/vnd.dt3d+zip";
export const DT3D_ARCHIVE_EXTENSION = ".dt3d";

const ARCHIVE_FORMAT = "dt3d-space";
const ARCHIVE_VERSION = 1;
const MANIFEST_PATH = "space.json";
const GEOMETRY_PATH_PREFIX = "assets/geometries/";
const EMBEDDED_ASSET_PATH_PREFIX = "assets/embedded/";
const EMBEDDED_ASSET_REFERENCE_PREFIX = "dt3d-asset:";
const MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 32 * 1024 * 1024;
const MAX_ARCHIVE_FILES = 10000;

type EmbeddedAsset = {
	mime_type: string;
	path: string;
};

type ArchivedSpace = {
	id: string;
	name: string;
	description: string;
	is_default?: boolean;
	config: Record<string, any> | null;
	created_at: number;
	updated_at: number;
	object_instances: ObjectInstanceResponse[];
};

type SpaceArchive = {
	format: typeof ARCHIVE_FORMAT;
	version: typeof ARCHIVE_VERSION;
	exported_at: string;
	space: ArchivedSpace;
	assets: {
		embedded: EmbeddedAsset[];
	};
};

type ArchiveFiles = Record<string, Uint8Array>;

type ParsedArchive = {
	archive: SpaceArchive;
	files: ArchiveFiles;
	orderedInstances: ObjectInstanceResponse[];
};

/**
 * Build a complete .dt3d archive in the browser.
 */
export async function exportSpaceArchive(
	apiClient: SpaceApi,
	spaceId: string,
): Promise<Blob> {
	const [space, objectInstances] = await Promise.all([
		apiClient.getSpace(spaceId),
		apiClient.listObjects(spaceId),
	]);
	const files: ArchiveFiles = {};
	const embeddedAssets: EmbeddedAsset[] = [];
	const embeddedAssetPaths = new Map<string, string>();
	const archivedInstances = structuredClone(objectInstances);

	for (const instance of archivedInstances) {
		instance.data = externalizeDataUrls(
			instance.data,
			files,
			embeddedAssets,
			embeddedAssetPaths,
		) as Record<string, any> | null;
	}

	const archivedConfig = externalizeDataUrls(
		structuredClone(space.config),
		files,
		embeddedAssets,
		embeddedAssetPaths,
	) as Record<string, any> | null;
	const geometryIds = collectGeometryIds({
		config: archivedConfig,
		object_instances: archivedInstances,
	});

	await Promise.all(
		Array.from(geometryIds, async (geometryId) => {
			const data = await apiClient.getGeometry(spaceId, geometryId);
			files[geometryArchivePath(geometryId)] = new Uint8Array(data);
		}),
	);

	const archive: SpaceArchive = {
		format: ARCHIVE_FORMAT,
		version: ARCHIVE_VERSION,
		exported_at: new Date().toISOString(),
		space: {
			id: space.id,
			name: space.name,
			description: space.description,
			is_default: space.is_default,
			config: archivedConfig,
			created_at: space.created_at,
			updated_at: space.updated_at,
			object_instances: archivedInstances,
		},
		assets: {
			embedded: embeddedAssets,
		},
	};
	files[MANIFEST_PATH] = strToU8(JSON.stringify(archive, null, "\t"));

	const zipped = await zipFiles(files);
	return new Blob([zipped], {type: DT3D_ARCHIVE_MIME_TYPE});
}

/**
 * Validate a .dt3d archive and recreate its space through the existing API.
 * A partially imported space is deleted if any upload or database write fails.
 */
export async function importSpaceArchive(
	apiClient: SpaceApi,
	file: File,
): Promise<SpaceResponse> {
	if (!file.name.toLowerCase().endsWith(DT3D_ARCHIVE_EXTENSION)) {
		throw new Error(`Select a ${DT3D_ARCHIVE_EXTENSION} file.`);
	}
	if (file.size === 0) {
		throw new Error("The DT3D archive is empty.");
	}
	if (file.size > MAX_ARCHIVE_BYTES) {
		throw new Error("The DT3D archive is too large.");
	}

	const parsed = await parseSpaceArchive(
		new Uint8Array(await file.arrayBuffer()),
	);
	const {archive, files, orderedInstances} = parsed;
	let createdSpace: SpaceResponse | null = null;

	try {
		createdSpace = await apiClient.createSpace(
			archive.space.name,
			archive.space.description,
			null,
		);

		const idMap = new Map<string, string>();
		const geometryIdMap = new Map<string, string>();
		const geometryIds = collectGeometryIds({
			config: archive.space.config,
			object_instances: archive.space.object_instances,
		});

		for (const oldGeometryId of geometryIds) {
			const geometry = files[geometryArchivePath(oldGeometryId)];
			const response = await apiClient.uploadGeometry(
				createdSpace.id,
				toArrayBuffer(geometry),
			);
			geometryIdMap.set(oldGeometryId, response.id);
		}

		for (const instance of orderedInstances) {
			const parentId = instance.parent_id
				? (idMap.get(instance.parent_id) ?? null)
				: null;
			const restoredData = restoreEmbeddedAssets(
				instance.data,
				archive.assets.embedded,
				files,
			);
			const data = remapExactStringReferences(restoredData, [
				geometryIdMap,
				idMap,
			]) as Record<string, any>;
			const payload: ObjectInstancePayload = {
				name: instance.name,
				type: instance.type,
				data,
				parent_id: parentId,
			};
			const createdInstance = await apiClient.createObject(
				createdSpace.id,
				payload,
			);
			idMap.set(instance.id, createdInstance.id);
		}

		const restoredConfig = restoreEmbeddedAssets(
			archive.space.config,
			archive.assets.embedded,
			files,
		);
		const config = remapExactStringReferences(restoredConfig, [
			geometryIdMap,
			idMap,
		]) as Record<string, any> | null;

		return await apiClient.updateSpace(createdSpace.id, {
			name: archive.space.name,
			description: archive.space.description,
			is_default: false,
			config,
		});
	} catch (error) {
		if (createdSpace) {
			try {
				await apiClient.deleteSpace(createdSpace.id);
			} catch (cleanupError) {
				console.error(
					"DT3D: Failed to remove an incomplete imported space",
					cleanupError,
				);
			}
		}
		throw error;
	}
}

function externalizeDataUrls(
	value: unknown,
	files: ArchiveFiles,
	assets: EmbeddedAsset[],
	knownPaths: Map<string, string>,
): unknown {
	if (typeof value === "string") {
		const parsed = parseDataUrl(value);
		if (!parsed) {
			return value;
		}

		let assetPath = knownPaths.get(value);
		if (!assetPath) {
			assetPath = `${EMBEDDED_ASSET_PATH_PREFIX}asset-${assets.length + 1}${extensionForMimeType(parsed.mimeType)}`;
			knownPaths.set(value, assetPath);
			files[assetPath] = parsed.data;
			assets.push({
				mime_type: parsed.mimeType,
				path: assetPath,
			});
		}
		return `${EMBEDDED_ASSET_REFERENCE_PREFIX}${assetPath}`;
	}

	if (Array.isArray(value)) {
		return value.map((item) =>
			externalizeDataUrls(item, files, assets, knownPaths),
		);
	}

	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				externalizeDataUrls(item, files, assets, knownPaths),
			]),
		);
	}

	return value;
}

function restoreEmbeddedAssets(
	value: unknown,
	assets: EmbeddedAsset[],
	files: ArchiveFiles,
): unknown {
	const assetByPath = new Map(assets.map((asset) => [asset.path, asset]));

	const restore = (current: unknown): unknown => {
		if (
			typeof current === "string" &&
			current.startsWith(EMBEDDED_ASSET_REFERENCE_PREFIX)
		) {
			const path = current.slice(EMBEDDED_ASSET_REFERENCE_PREFIX.length);
			const asset = assetByPath.get(path);
			const data = files[path];
			if (!asset || !data) {
				throw new Error(
					`The DT3D archive is missing embedded asset "${path}".`,
				);
			}
			return toDataUrl(data, asset.mime_type);
		}
		if (Array.isArray(current)) {
			return current.map(restore);
		}
		if (isRecord(current)) {
			return Object.fromEntries(
				Object.entries(current).map(([key, item]) => [key, restore(item)]),
			);
		}
		return current;
	};

	return restore(value);
}

async function parseSpaceArchive(data: Uint8Array): Promise<ParsedArchive> {
	let files: ArchiveFiles;
	try {
		files = await unzipFiles(data);
	} catch {
		throw new Error("The selected file is not a valid DT3D archive.");
	}

	const fileNames = Object.keys(files);
	if (fileNames.length > MAX_ARCHIVE_FILES) {
		throw new Error("The DT3D archive contains too many files.");
	}

	let expandedBytes = 0;
	for (const [path, contents] of Object.entries(files)) {
		if (!isSafeArchivePath(path)) {
			throw new Error(`The DT3D archive contains an invalid path "${path}".`);
		}
		expandedBytes += contents.byteLength;
		if (expandedBytes > MAX_ARCHIVE_BYTES) {
			throw new Error("The DT3D archive expands beyond the allowed size.");
		}
	}

	const manifestData = files[MANIFEST_PATH];
	if (!manifestData) {
		throw new Error(`The DT3D archive does not contain ${MANIFEST_PATH}.`);
	}
	if (manifestData.byteLength > MAX_MANIFEST_BYTES) {
		throw new Error(`${MANIFEST_PATH} is too large.`);
	}

	let archive: SpaceArchive;
	try {
		archive = JSON.parse(strFromU8(manifestData)) as SpaceArchive;
	} catch {
		throw new Error(`${MANIFEST_PATH} is not valid JSON.`);
	}
	validateArchiveManifest(archive, files);

	return {
		archive,
		files,
		orderedInstances: orderObjectInstances(archive.space.object_instances),
	};
}

function validateArchiveManifest(
	archive: SpaceArchive,
	files: ArchiveFiles,
): void {
	if (!isRecord(archive) || archive.format !== ARCHIVE_FORMAT) {
		throw new Error("The file is not a DT3D space archive.");
	}
	if (archive.version !== ARCHIVE_VERSION) {
		throw new Error(
			`Unsupported DT3D archive version ${String(archive.version)}.`,
		);
	}
	if (
		!isRecord(archive.space) ||
		typeof archive.space.name !== "string" ||
		!archive.space.name.trim()
	) {
		throw new Error(`${MANIFEST_PATH} does not contain a space name.`);
	}
	if (!Array.isArray(archive.space.object_instances)) {
		throw new Error(`${MANIFEST_PATH} does not contain an object list.`);
	}
	if (!isRecord(archive.assets) || !Array.isArray(archive.assets.embedded)) {
		throw new Error(`${MANIFEST_PATH} does not contain a valid asset list.`);
	}

	const supportedPaths = new Set([MANIFEST_PATH]);
	const embeddedPaths = new Set<string>();
	for (const asset of archive.assets.embedded) {
		if (
			!isRecord(asset) ||
			typeof asset.path !== "string" ||
			typeof asset.mime_type !== "string" ||
			!asset.mime_type
		) {
			throw new Error(`${MANIFEST_PATH} contains an invalid embedded asset.`);
		}
		if (
			!asset.path.startsWith(EMBEDDED_ASSET_PATH_PREFIX) ||
			!isSafeArchivePath(asset.path) ||
			embeddedPaths.has(asset.path)
		) {
			throw new Error(
				`${MANIFEST_PATH} contains an invalid embedded asset path.`,
			);
		}
		if (!files[asset.path]) {
			throw new Error(`The DT3D archive is missing asset "${asset.path}".`);
		}
		embeddedPaths.add(asset.path);
		supportedPaths.add(asset.path);
	}

	const geometryIds = collectGeometryIds({
		config: archive.space.config,
		object_instances: archive.space.object_instances,
	});
	for (const geometryId of geometryIds) {
		const path = geometryArchivePath(geometryId);
		if (!files[path]) {
			throw new Error(`The DT3D archive is missing geometry "${geometryId}".`);
		}
		supportedPaths.add(path);
	}

	for (const path of Object.keys(files)) {
		if (!supportedPaths.has(path)) {
			throw new Error(`The DT3D archive contains unsupported file "${path}".`);
		}
	}

	restoreEmbeddedAssets(
		{
			config: archive.space.config,
			object_instances: archive.space.object_instances,
		},
		archive.assets.embedded,
		files,
	);
}

function orderObjectInstances(
	instances: ObjectInstanceResponse[],
): ObjectInstanceResponse[] {
	const byId = new Map<string, ObjectInstanceResponse>();
	for (const instance of instances) {
		if (
			!isRecord(instance) ||
			typeof instance.id !== "string" ||
			!instance.id ||
			typeof instance.name !== "string" ||
			!instance.name.trim() ||
			typeof instance.type !== "string" ||
			!instance.type.trim() ||
			byId.has(instance.id)
		) {
			throw new Error(
				`${MANIFEST_PATH} contains an invalid or duplicate object.`,
			);
		}
		byId.set(instance.id, instance);
	}

	const ordered: ObjectInstanceResponse[] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();
	const visit = (instance: ObjectInstanceResponse): void => {
		if (visited.has(instance.id)) {
			return;
		}
		if (visiting.has(instance.id)) {
			throw new Error(`${MANIFEST_PATH} contains a cyclic object hierarchy.`);
		}

		visiting.add(instance.id);
		if (instance.parent_id) {
			const parent = byId.get(instance.parent_id);
			if (!parent) {
				throw new Error(
					`${MANIFEST_PATH} contains an object with a missing parent.`,
				);
			}
			visit(parent);
		}
		visiting.delete(instance.id);
		visited.add(instance.id);
		ordered.push(instance);
	};

	for (const instance of instances) {
		visit(instance);
	}
	return ordered;
}

function collectGeometryIds(value: unknown): Set<string> {
	const ids = new Set<string>();
	const walk = (current: unknown): void => {
		if (Array.isArray(current)) {
			current.forEach(walk);
			return;
		}
		if (!isRecord(current)) {
			return;
		}
		for (const [key, child] of Object.entries(current)) {
			if (key === "geometryFileId" && typeof child === "string" && child) {
				ids.add(child);
			}
			walk(child);
		}
	};
	walk(value);
	return ids;
}

function remapExactStringReferences(
	value: unknown,
	maps: Map<string, string>[],
): unknown {
	if (typeof value === "string") {
		for (const map of maps) {
			const replacement = map.get(value);
			if (replacement) {
				return replacement;
			}
		}
		return value;
	}
	if (Array.isArray(value)) {
		return value.map((item) => remapExactStringReferences(item, maps));
	}
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [
				key,
				remapExactStringReferences(item, maps),
			]),
		);
	}
	return value;
}

function geometryArchivePath(geometryId: string): string {
	if (!/^[a-zA-Z0-9_-]+$/.test(geometryId)) {
		throw new Error(`Invalid geometry id "${geometryId}".`);
	}
	return `${GEOMETRY_PATH_PREFIX}${geometryId}.dt3dgeo`;
}

function parseDataUrl(
	value: string,
): { data: Uint8Array; mimeType: string } | null {
	const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(value);
	if (!match) {
		return null;
	}

	const mimeType = match[1] || "application/octet-stream";
	const payload = match[3];
	try {
		if (match[2]) {
			const binary = atob(payload);
			const data = new Uint8Array(binary.length);
			for (let index = 0; index < binary.length; index += 1) {
				data[index] = binary.charCodeAt(index);
			}
			return {data, mimeType};
		}
		return {data: strToU8(decodeURIComponent(payload)), mimeType};
	} catch {
		return null;
	}
}

function toDataUrl(data: Uint8Array, mimeType: string): string {
	let binary = "";
	const chunkSize = 0x8000;
	for (let offset = 0; offset < data.length; offset += chunkSize) {
		binary += String.fromCharCode(...data.subarray(offset, offset + chunkSize));
	}
	return `data:${mimeType};base64,${btoa(binary)}`;
}

function extensionForMimeType(mimeType: string): string {
	const extensions: Record<string, string> = {
		"image/avif": ".avif",
		"image/gif": ".gif",
		"image/jpeg": ".jpg",
		"image/png": ".png",
		"image/svg+xml": ".svg",
		"image/webp": ".webp",
	};
	return extensions[mimeType.toLowerCase()] ?? ".bin";
}

function isSafeArchivePath(path: string): boolean {
	return (
		Boolean(path) &&
		!path.startsWith("/") &&
		!path.startsWith("\\") &&
		!path.includes("\\") &&
		!path
			.split("/")
			.some((part) => part === "" || part === "." || part === "..")
	);
}

function isRecord(value: unknown): value is Record<string, any> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
	return data.slice().buffer;
}

function zipFiles(files: ArchiveFiles): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		zip(files, {level: 6}, (error, data) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(data);
		});
	});
}

function unzipFiles(data: Uint8Array): Promise<ArchiveFiles> {
	return new Promise((resolve, reject) => {
		unzip(data, (error, files) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(files);
		});
	});
}
