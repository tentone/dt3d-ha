import type {Material, Object3D, Texture} from "three";
import {
	MaterialLoader,
	Mesh,
	MeshStandardMaterial,
	ObjectLoader,
} from "three";

import type {MaterialObject} from "./material-handler.js";
import {getMaterials} from "./material-handler.js";

export const MATERIAL_DRAG_MIME = "application/x-dt3d-material";
export const STANDARD_MATERIAL_DATA_KEY = "dt3dStandardMaterial";
export const GENERATED_MATERIAL_DATA_KEY = "dt3dGeneratedMaterial";
export const USER_MANAGED_MATERIAL_DATA_KEY = "dt3dUserManagedMaterial";

export type SerializedMaterial = Record<string, any>;

export type MaterialUsage = {
	material: Material;
	owner: Object3D;
	target: MaterialObject;
};

export function isUserManagedMaterial(material: Material): boolean {
	return (
		material.userData[USER_MANAGED_MATERIAL_DATA_KEY] === true ||
		material.userData[STANDARD_MATERIAL_DATA_KEY] === true
	);
}

export function isGeneratedMaterial(material: Material): boolean {
	return (
		material.userData[GENERATED_MATERIAL_DATA_KEY] === true &&
		!isUserManagedMaterial(material)
	);
}

export function markMaterialGenerated(material: Material): void {
	if (isUserManagedMaterial(material)) return;
	material.userData[GENERATED_MATERIAL_DATA_KEY] = true;
}

export function markMaterialUserManaged(material: Material): void {
	material.userData[USER_MANAGED_MATERIAL_DATA_KEY] = true;
	delete material.userData[GENERATED_MATERIAL_DATA_KEY];
}

function isMaterialTarget(object: Object3D): object is MaterialObject {
	if (!(object instanceof Mesh)) return false;
	const material = object.material;
	return Array.isArray(material)
		? material.length > 0 && material.every((item) => item?.isMaterial)
		: Boolean(material?.isMaterial);
}

/**
 * Only expose materials the object inspector can apply back to a user-managed
 * object. Internal decoration meshes remain implementation details unless the
 * owning object explicitly marks one as its editable material target.
 */
export function getMaterialTargets(root: Object3D | null): MaterialObject[] {
	if (!root) return [];

	const targets: MaterialObject[] = [];
	root.traverse((object) => {
		if (
			isMaterialTarget(object) &&
			(object.internal !== true || object.userData.ownerMaterialTarget === true)
		) {
			targets.push(object);
		}
	});
	return targets;
}

function resolveMaterialOwner(target: Object3D, root: Object3D): Object3D {
	if (target.userData.ownerMaterialTarget !== true) return target;

	let owner: Object3D = target;
	let current = target.parent;
	while (current && current !== root) {
		owner = current;
		if (current.internal !== true) return current;
		current = current.parent;
	}
	return owner;
}

export function getMaterialUsages(
	root: Object3D | null,
	materialOrUuid?: Material | string,
): MaterialUsage[] {
	if (!root) return [];
	const uuid =
		typeof materialOrUuid === "string"
			? materialOrUuid
			: materialOrUuid?.uuid;
	const usages: MaterialUsage[] = [];

	for (const target of getMaterialTargets(root)) {
		for (const material of getMaterials(target)) {
			if (uuid && material.uuid !== uuid) continue;
			usages.push({
				material,
				owner: resolveMaterialOwner(target, root),
				target,
			});
		}
	}
	return usages;
}

export function getUniqueMaterials(root: Object3D | null): Material[] {
	const materials = new Map<string, Material>();
	for (const usage of getMaterialUsages(root)) {
		if (usage.material.name === "Loading material") continue;
		if (
			typeof usage.owner.userData.meshType === "string" &&
			!isUserManagedMaterial(usage.material)
		) {
			markMaterialGenerated(usage.material);
		}
		if (isGeneratedMaterial(usage.material)) continue;
		materials.set(usage.material.uuid, usage.material);
	}
	return [...materials.values()];
}

/** Replace separately loaded copies sharing a UUID with the library instance. */
export function reconcileSceneMaterials(
	root: Object3D | null,
	materials: Material[],
): Material[] {
	const canonical = new Map(materials.map((material) => [material.uuid, material]));
	if (!root) return [...canonical.values()];

	for (const target of getMaterialTargets(root)) {
		const next = getMaterials(target).map((material) => {
			const existing = canonical.get(material.uuid);
			if (existing) {
				if (isUserManagedMaterial(material)) {
					markMaterialUserManaged(existing);
				} else if (isGeneratedMaterial(material)) {
					markMaterialGenerated(existing);
				}
				return existing;
			}
			if (
				material.name !== "Loading material" &&
				!isGeneratedMaterial(material)
			) {
				canonical.set(material.uuid, material);
			}
			return material;
		});
		target.material = Array.isArray(target.material) ? next : next[0];
	}

	return [...canonical.values()].filter(
		(material) => !isGeneratedMaterial(material),
	);
}

export function createStandardMaterial(name = "Standard"): MeshStandardMaterial {
	const material = new MeshStandardMaterial({
		color: 0xd8d8d8,
		metalness: 0,
		roughness: 0.72,
	});
	material.name = name;
	material.userData[STANDARD_MATERIAL_DATA_KEY] = true;
	markMaterialUserManaged(material);
	return material;
}

export function serializeMaterialLibrary(
	materials: Material[],
): SerializedMaterial[] {
	return materials.flatMap((material) => {
		try {
			return [material.toJSON() as SerializedMaterial];
		} catch (error) {
			console.warn("DT3D: Failed to serialize library material", error);
			return [];
		}
	});
}

function collectSerializedUuids(
	value: unknown,
	aliases: Map<string, string>,
): void {
	if (Array.isArray(value)) {
		for (const item of value) collectSerializedUuids(item, aliases);
		return;
	}
	if (!value || typeof value !== "object") return;

	for (const [key, item] of Object.entries(value)) {
		if (
			key.toLocaleLowerCase() === "uuid" &&
			typeof item === "string" &&
			!aliases.has(item)
		) {
			aliases.set(item, `@uuid:${aliases.size}`);
		}
		collectSerializedUuids(item, aliases);
	}
}

function normalizeSerializedMaterial(
	value: unknown,
	uuidAliases: Map<string, string>,
): unknown {
	if (typeof value === "string") return uuidAliases.get(value) ?? value;
	if (Array.isArray(value)) {
		return value.map((item) => normalizeSerializedMaterial(item, uuidAliases));
	}
	if (!value || typeof value !== "object") return value;

	const normalized = Object.fromEntries(
		Object.entries(value)
			.filter(
				([key]) =>
					key.toLocaleLowerCase() !== "uuid" &&
					key !== GENERATED_MATERIAL_DATA_KEY &&
					key !== USER_MANAGED_MATERIAL_DATA_KEY,
			)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => [
				key,
				normalizeSerializedMaterial(item, uuidAliases),
			]),
	);
	const userData = normalized.userData;
	if (
		userData &&
		typeof userData === "object" &&
		!Array.isArray(userData) &&
		Object.keys(userData).length === 0
	) {
		delete normalized.userData;
	}
	return normalized;
}

/** Stable material definition key, excluding UUIDs and DT3D ownership metadata. */
export function getMaterialEqualityKey(material: Material): string | null {
	try {
		const serialized = material.toJSON() as SerializedMaterial;
		const uuidAliases = new Map<string, string>();
		collectSerializedUuids(serialized, uuidAliases);
		return JSON.stringify(normalizeSerializedMaterial(serialized, uuidAliases));
	} catch (error) {
		console.warn("DT3D: Failed to compare library material", error);
		return null;
	}
}

export async function parseSerializedLibraryMaterial(
	data: unknown,
): Promise<Material | null> {
	if (!data || typeof data !== "object") return null;

	try {
		const materialData = data as Record<string, any>;
		const materialLoader = new MaterialLoader();
		if (
			Array.isArray(materialData.images) &&
			Array.isArray(materialData.textures)
		) {
			const objectLoader = new ObjectLoader();
			const images = await objectLoader.parseImagesAsync(materialData.images);
			const textures: Record<string, Texture> = objectLoader.parseTextures(
				materialData.textures,
				images,
			);
			materialLoader.setTextures(textures);
		}
		return materialLoader.parse(materialData);
	} catch (error) {
		console.warn("DT3D: Failed to parse library material", error);
		return null;
	}
}

export async function parseMaterialLibrary(data: unknown): Promise<Material[]> {
	if (!Array.isArray(data)) return [];
	const parsed = await Promise.all(data.map(parseSerializedLibraryMaterial));
	return parsed.filter((material): material is Material => Boolean(material));
}
