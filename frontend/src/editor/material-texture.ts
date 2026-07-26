import type {Material, Mesh, Texture} from "three";
import {MeshStandardMaterial, TextureLoader} from "three";

import {isImageFile, readFileAsDataUrl} from "../utils/file-utils";

export type TexturedMaterialData = {
	textureDataUrl?: string;
	textureName?: string;
	texturePredominantColor?: string;
};

export const TEXTURE_PREDOMINANT_COLOR_DATA_KEY = "texturePredominantColor";

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
	shouldApply: () => boolean = () => true,
): Promise<boolean> {
	const texture = await loadTexture(dataUrl);
	if (!shouldApply()) {
		texture.dispose();
		return false;
	}

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
	const predominantColor = getTexturePredominantColor(texture);
	if (predominantColor) {
		mesh.userData[TEXTURE_PREDOMINANT_COLOR_DATA_KEY] = predominantColor;
	} else {
		delete mesh.userData[TEXTURE_PREDOMINANT_COLOR_DATA_KEY];
	}
	return true;
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
	delete mesh.userData[TEXTURE_PREDOMINANT_COLOR_DATA_KEY];
}

/**
 * Find the most common quantized color in a texture. Sampling a small canvas
 * keeps this inexpensive even when the source image is large.
 */
export function getTexturePredominantColor(texture: Texture): string | null {
	const image = texture.image as
		| (CanvasImageSource & { height?: number; width?: number })
		| undefined;
	const width = Number(image?.width);
	const height = Number(image?.height);
	if (
		!image ||
		!Number.isFinite(width) ||
		!Number.isFinite(height) ||
		width <= 0 ||
		height <= 0
	) {
		return null;
	}

	const maxSampleSize = 64;
	const scale = Math.min(1, maxSampleSize / Math.max(width, height));
	const sampleWidth = Math.max(1, Math.round(width * scale));
	const sampleHeight = Math.max(1, Math.round(height * scale));
	const canvas = document.createElement("canvas");
	canvas.width = sampleWidth;
	canvas.height = sampleHeight;
	const context = canvas.getContext("2d", {willReadFrequently: true});
	if (!context) {
		return null;
	}

	try {
		context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
		const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
		const buckets = new Map<
			number,
			{ blue: number; green: number; red: number; weight: number }
		>();

		for (let index = 0; index < pixels.length; index += 4) {
			const alpha = pixels[index + 3];
			if (alpha < 32) {
				continue;
			}

			const red = pixels[index];
			const green = pixels[index + 1];
			const blue = pixels[index + 2];
			const bucketKey = ((red >> 4) << 8) | ((green >> 4) << 4) | (blue >> 4);
			const weight = alpha / 255;
			const bucket = buckets.get(bucketKey) ?? {
				blue: 0,
				green: 0,
				red: 0,
				weight: 0,
			};
			bucket.red += red * weight;
			bucket.green += green * weight;
			bucket.blue += blue * weight;
			bucket.weight += weight;
			buckets.set(bucketKey, bucket);
		}

		let predominant:
			| { blue: number; green: number; red: number; weight: number }
			| undefined;
		for (const bucket of buckets.values()) {
			if (!predominant || bucket.weight > predominant.weight) {
				predominant = bucket;
			}
		}
		if (!predominant || predominant.weight === 0) {
			return null;
		}

		const toHex = (value: number) =>
			Math.round(value / predominant.weight)
				.toString(16)
				.padStart(2, "0");
		return `${toHex(predominant.red)}${toHex(predominant.green)}${toHex(
			predominant.blue,
		)}`;
	} catch {
		// Cross-origin images can make canvas pixel access unavailable.
		return null;
	}
}

function disposeMaterialMaps(materials: Material[]): void {
	const textures = new Set<Texture>();
	for (const material of materials) {
		const map = (material as Material & { map?: Texture | null }).map;
		if (map) textures.add(map);
	}
	for (const texture of textures) texture.dispose();
}
