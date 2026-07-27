import type {Material, Mesh, Texture} from "three";
import {
	EquirectangularReflectionMapping,
	MeshStandardMaterial,
	NearestFilter,
	NoColorSpace,
	SRGBColorSpace,
	TextureLoader,
} from "three";

import {isImageFile, readFileAsDataUrl} from "../utils/file-utils";

export type TexturedMaterialData = {
	textureDataUrl?: string;
	textureName?: string;
	texturePredominantColor?: string;
};

export const TEXTURE_PREDOMINANT_COLOR_DATA_KEY = "texturePredominantColor";

type MaterialTarget = {
	material: Material | Material[];
};

const COLOR_TEXTURE_PROPERTIES = new Set([
	"map",
	"emissiveMap",
	"matcap",
	"sheenColorMap",
	"specularColorMap",
]);

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
 * Apply an image file to a specific texture property on every compatible
 * material in the target.
 */
export async function applyImageTextureToMaterial(
	target: MaterialTarget,
	property: string,
	file: File,
	shouldApply: () => boolean = () => true,
): Promise<boolean> {
	if (!isImageFile(file)) {
		throw new Error("Only image files can be used as material textures.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const texture = await loadTexture(dataUrl);
	if (!shouldApply()) {
		texture.dispose();
		return false;
	}
	texture.name = file.name;
	configureTexture(texture, property);

	const materials = getMaterials(target).filter(
		(material) => property in material,
	);
	if (materials.length === 0) {
		texture.dispose();
		return false;
	}

	const replacedTextures = getMaterialTextures(materials, property);
	for (const material of materials) {
		(material as unknown as Record<string, unknown>)[property] = texture;
		material.needsUpdate = true;
	}
	disposeUnreferencedTextures(target, replacedTextures);

	if (property === "map" && isMesh(target)) {
		updateLegacyTextureData(target, dataUrl, file.name, texture);
	}
	return true;
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

	texture.name = textureName;
	configureTexture(texture, "map");

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
		const replacedTextures = getMaterialTextures(mappableMaterials, "map");
		for (const material of mappableMaterials) {
			(material as Material & {map: Texture | null}).map = texture;
			material.needsUpdate = true;
		}
		disposeUnreferencedTextures(mesh, replacedTextures);
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
	clearMaterialTexture(mesh, "map");
}

/**
 * Clear a specific texture property on every compatible material in the target.
 */
export function clearMaterialTexture(
	target: MaterialTarget,
	property: string,
): boolean {
	const materials = getMaterials(target).filter(
		(material) => property in material,
	);
	if (materials.length === 0) {
		return false;
	}

	const replacedTextures = getMaterialTextures(materials, property);
	for (const material of materials) {
		(material as unknown as Record<string, unknown>)[property] = null;
		material.needsUpdate = true;
	}
	disposeUnreferencedTextures(target, replacedTextures);

	if (property === "map" && isMesh(target)) {
		clearLegacyTextureData(target);
	}
	return true;
}

function clearLegacyTextureData(mesh: Mesh): void {
	delete mesh.userData.textureDataUrl;
	delete mesh.userData.textureName;
	delete mesh.userData[TEXTURE_PREDOMINANT_COLOR_DATA_KEY];
}

function configureTexture(texture: Texture, property: string): void {
	texture.colorSpace = COLOR_TEXTURE_PROPERTIES.has(property)
		? SRGBColorSpace
		: NoColorSpace;
	if (property === "envMap") {
		texture.mapping = EquirectangularReflectionMapping;
		texture.colorSpace = SRGBColorSpace;
	}
	if (property === "gradientMap") {
		texture.minFilter = NearestFilter;
		texture.magFilter = NearestFilter;
		texture.generateMipmaps = false;
	}
	texture.needsUpdate = true;
}

function getMaterials(target: MaterialTarget): Material[] {
	return Array.isArray(target.material) ? target.material : [target.material];
}

function getMaterialTextures(
	materials: Material[],
	property: string,
): Set<Texture> {
	const textures = new Set<Texture>();
	for (const material of materials) {
		const value = (material as unknown as Record<string, unknown>)[property];
		if (value && typeof value === "object" && "isTexture" in value) {
			textures.add(value as Texture);
		}
	}
	return textures;
}

function disposeUnreferencedTextures(
	target: MaterialTarget,
	textures: Set<Texture>,
): void {
	for (const texture of textures) {
		const stillReferenced = getMaterials(target).some((material) =>
			Object.values(material).some((value) => value === texture),
		);
		if (!stillReferenced) {
			texture.dispose();
		}
	}
}

function isMesh(target: MaterialTarget): target is Mesh {
	return "isMesh" in target && target.isMesh === true;
}

function updateLegacyTextureData(
	mesh: Mesh,
	dataUrl: string,
	textureName: string,
	texture: Texture,
): void {
	mesh.userData.textureDataUrl = dataUrl;
	mesh.userData.textureName = textureName;
	const predominantColor = getTexturePredominantColor(texture);
	if (predominantColor) {
		mesh.userData[TEXTURE_PREDOMINANT_COLOR_DATA_KEY] = predominantColor;
	} else {
		delete mesh.userData[TEXTURE_PREDOMINANT_COLOR_DATA_KEY];
	}
}

/**
 * Find the most common quantized color in a texture. Sampling a small canvas
 * keeps this inexpensive even when the source image is large.
 */
export function getTexturePredominantColor(texture: Texture): string | null {
	const image = texture.image as
		| (CanvasImageSource & {height?: number; width?: number})
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
			{blue: number; green: number; red: number; weight: number}
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
			| {blue: number; green: number; red: number; weight: number}
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
