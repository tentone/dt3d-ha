import type {Material, Mesh, Texture} from "three";
import {MeshStandardMaterial, TextureLoader} from "three";

import {isImageFile, readFileAsDataUrl} from "../utils/file-utils";

export type TexturedMaterialData = {
	textureDataUrl?: string;
	textureName?: string;
};

/**
 * Async method to load a texture from a data URL.
 *
 * @param dataUrl The data URL of the texture.
 * @returns A promise that resolves with the loaded texture.
 */
export function loadTexture(dataUrl: string): Promise<Texture> {
	return new Promise((resolve, reject) => {
		new TextureLoader().load(dataUrl, resolve, undefined, reject);
	});
}

/**
 * Apply an image file as a texture to a mesh. The image file is read as a data URL and then applied to the mesh's material.
 *
 * @param mesh - Mesh to apply the texture to
 * @param file - Image file to read texture from
 */
export async function applyImageTextureToMesh(
	mesh: Mesh,
	file: File,
): Promise<void> {
	if (!isImageFile(file)) {
		throw new Error("Only image files can be used as mesh textures.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	await applyTextureToMesh(mesh, dataUrl, file.name);
}

/**
 * Apply a texture to a mesh
 *
 * @param mesh - Mesh to apply the texture (to material map if possible)
 * @param dataUrl - Data URL to read texture from
 * @param textureName - Texture name (optional, defaults to "Texture")
 */
export async function applyTextureToMesh(
	mesh: Mesh,
	dataUrl: string,
	textureName = "Texture",
): Promise<void> {
	const texture = await loadTexture(dataUrl);
	texture.colorSpace = "srgb";
	texture.needsUpdate = true;

	const materials = Array.isArray(mesh.material)
		? mesh.material
		: [mesh.material];
	const mappableMaterials = materials.filter((material) => "map" in material);
	if (mappableMaterials.length === 0) {
		const existingMaterial = materials[0];
		const material = new MeshStandardMaterial({
			color:
				existingMaterial && "color" in existingMaterial
					? (existingMaterial as any).color.clone()
					: 0xffffff,
			map: texture,
		});
		for (const oldMaterial of materials) oldMaterial.dispose();
		mesh.material = material;
	} else {
		disposeMaterialMaps(mappableMaterials);
		for (const material of mappableMaterials) {
			(material as Material & { map: Texture | null }).map = texture;
			material.needsUpdate = true;
		}
	}

	mesh.userData.textureDataUrl = dataUrl;
	mesh.userData.textureName = textureName;
}

export function clearMeshTexture(mesh: Mesh): void {
	const materials = Array.isArray(mesh.material)
		? mesh.material
		: [mesh.material];
	const mappableMaterials = materials.filter((material) => "map" in material);
	disposeMaterialMaps(mappableMaterials);
	for (const material of mappableMaterials) {
		(material as Material & { map: Texture | null }).map = null;
		material.needsUpdate = true;
	}
	delete mesh.userData.textureDataUrl;
	delete mesh.userData.textureName;
}

function disposeMaterialMaps(materials: Material[]): void {
	const textures = new Set<Texture>();
	for (const material of materials) {
		const map = (material as Material & { map?: Texture | null }).map;
		if (map) textures.add(map);
	}
	for (const texture of textures) texture.dispose();
}
