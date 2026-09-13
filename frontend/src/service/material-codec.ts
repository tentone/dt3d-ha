import type {Material} from "three";
import {MaterialLoader, ObjectLoader, Source} from "three";

import {
	copyTextureSettings,
	isKtx2DataUrl,
	loadKtx2DataUrl,
} from "./texture-compression.js";

/** Standard Three material JSON with portable KTX2 image sources. */
export async function parseMaterial(data: unknown): Promise<Material | null> {
	if (!data || typeof data !== "object") return null;
	const json = data as Record<string, any>;
	const materialLoader = new MaterialLoader();
	if (Array.isArray(json.images) && Array.isArray(json.textures)) {
		const objectLoader = new ObjectLoader();
		const compressedImages = json.images.filter((image) =>
			isKtx2DataUrl(image.url),
		);
		const images = await objectLoader.parseImagesAsync(
			json.images.filter((image) => !isKtx2DataUrl(image.url)),
		);
		for (const image of compressedImages) images[image.uuid] = new Source(null);
		const textures = objectLoader.parseTextures(json.textures, images);
		for (const image of compressedImages) {
			const decoded = await loadKtx2DataUrl(image.url);
			decoded.source.uuid = image.uuid;
			for (const descriptor of json.textures.filter(
				(texture) => texture.image === image.uuid,
			)) {
				const texture = decoded.clone();
				copyTextureSettings(textures[descriptor.uuid], texture);
				texture.uuid = descriptor.uuid;
				textures[descriptor.uuid] = texture;
			}
		}
		materialLoader.setTextures(textures);
	}
	return materialLoader.parse(json);
}
