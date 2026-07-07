import type {Texture} from "three";
import {Mesh, MeshStandardMaterial, TextureLoader} from "three";
import { isImageFile, readFileAsDataUrl } from "../utils/file-utils";

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
export async function applyImageTextureToMesh(mesh: Mesh, file: File): Promise<void> {
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
export async function applyTextureToMesh(mesh: Mesh, dataUrl: string, textureName = "Texture"): Promise<void> {
	const texture = await loadTexture(dataUrl);
	texture.colorSpace = "srgb";
	texture.needsUpdate = true;

	const existingMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
	if (existingMaterial && (existingMaterial as any)?.map) {
		(existingMaterial as any).map.dispose();
	}

	const material = new MeshStandardMaterial({
		color: existingMaterial && "color" in existingMaterial ? (existingMaterial as any).color.clone() : 0xffffff,
		map: texture,
	});

	mesh.material = material;
	mesh.userData.textureDataUrl = dataUrl;
	mesh.userData.textureName = textureName;
}

export function clearMeshTexture(mesh: Mesh): void {
	const existingMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
	if (existingMaterial && (existingMaterial as any)?.map) {
		(existingMaterial as any).map.dispose();
	}

	const color = existingMaterial && "color" in existingMaterial ? (existingMaterial as any).color.clone() : 0xffffff;
	mesh.material = new MeshStandardMaterial({color});
	delete mesh.userData.textureDataUrl;
	delete mesh.userData.textureName;
}

