import {encodeToKTX2} from "ktx2-encoder";

// A single worker serializes encoding jobs, keeping WASM work off the render thread.
let queue = Promise.resolve();
let wasmUrl: string;
self.onmessage = ({data}) => {
	queue = queue.then(async () => {
		try {
			if (!wasmUrl) {
				wasmUrl = URL.createObjectURL(
					new Blob([data.wasm], {type: "application/wasm"}),
				);
			}
			const result = await encodeToKTX2(new Uint8Array(data.pixels), {
				wasmUrl,
				isUASTC: true,
				uastcLDRQualityLevel: 1,
				isKTX2File: true,
				needSupercompression: true,
				isPerceptual: data.srgb,
				isSetKTX2SRGBTransferFunc: data.srgb,
				isNormalMap: data.normalMap,
				isYFlip: data.flipY,
				generateMipmap: data.mipmaps,
				imageDecoder: async (pixels) => ({
					data: pixels,
					width: data.width,
					height: data.height,
				}),
			});
			self.postMessage({id: data.id, result}, {transfer: [result.buffer]});
		} catch (error) {
			self.postMessage({id: data.id, error: String(error)});
		}
	});
};
