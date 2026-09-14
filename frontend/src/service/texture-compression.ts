import {unzlibSync} from "fflate";
import type {Material, Source, WebGLRenderer} from "three";
import {
	LoadingManager,
	RGBAFormat,
	SRGBColorSpace,
	Texture,
	UnsignedByteType,
} from "three";
import {KTX2Loader} from "three/examples/jsm/loaders/KTX2Loader.js";
import {
	encoderWasm,
	transcoderSource,
	transcoderWasm,
	workerSource,
} from "virtual:texture-codecs";

import {decodeBase64} from "../utils/base64.js";
import type {SpaceDataCache} from "./space-cache.js";

export const COMPRESSION_DATA_KEY = "dt3dCompression";
export const TEXTURE_PREVIEW_DATA_KEY = "dt3dPreview";
const MAX_TEXTURE_SIZE = 2048;
const MAX_TEXTURE_PREVIEW_SIZE = 128;
const GPU_TEXTURE_BLOCK_SIZE = 4;
let maxTextureSize = MAX_TEXTURE_SIZE;
let loader: KTX2Loader | null = null;
let repairLoader: KTX2Loader | null = null;
let encoder: Worker | null = null;
let encoderIdleTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
let queue = Promise.resolve();
const sources = new WeakMap<Source<unknown>, string>();
const optimized = new WeakMap<
	Texture,
	{version: number; settings: string; result: Promise<Texture>}
>();

type CompressionData = {
	version: number;
	codec: string;
	compressed: boolean;
	gpuCompressed?: boolean;
	repairRequired?: boolean;
};

function unpack(value: string): Uint8Array<ArrayBuffer> {
	return new Uint8Array(unzlibSync(decodeBase64(value)));
}

/** Shared codec workers hold capabilities, never the renderer or scene. No CDN requests. */
export function initializeTextureCompression(renderer: WebGLRenderer): void {
	maxTextureSize = Math.min(
		MAX_TEXTURE_SIZE,
		renderer.capabilities.maxTextureSize,
	);
	if (loader) return;
	const urls = new Map([
		[
			"basis_transcoder.js",
			URL.createObjectURL(
				new Blob([unpack(transcoderSource)], {type: "text/javascript"}),
			),
		],
		[
			"basis_transcoder.wasm",
			URL.createObjectURL(
				new Blob([unpack(transcoderWasm)], {type: "application/wasm"}),
			),
		],
	]);
	const manager = new LoadingManager();
	manager.setURLModifier((url) => urls.get(url.split("/").pop()!) ?? url);
	loader = new KTX2Loader(manager)
		.setTranscoderPath("dt3d-codecs/")
		.setWorkerLimit(2)
		.detectSupport(renderer);
	repairLoader = new KTX2Loader(manager)
		.setTranscoderPath("dt3d-codecs/")
		.setWorkerLimit(1);
	// Invalid legacy mip chains cannot be uploaded in a block-compressed GPU format.
	// Decode those to RGBA so the normal optimizer can rebuild a valid KTX2 asset.
	repairLoader.workerConfig = {
		astcSupported: false,
		astcHDRSupported: false,
		etc1Supported: false,
		etc2Supported: false,
		dxtSupported: false,
		bptcSupported: false,
		pvrtcSupported: false,
	};
	const parse = loader.parse.bind(loader);
	const parseForRepair = repairLoader.parse.bind(repairLoader);
	loader.parse = (buffer, onLoad, onError) => {
		// KTX2Loader transfers the input buffer to a worker. Retain portable bytes for saving.
		const portable = buffer.slice(0);
		const repairRequired = hasInvalidCompressedMipDimensions(buffer);
		return (repairRequired ? parseForRepair : parse)(
			buffer,
			(texture) => {
				attachPortableSource(texture, portable, repairRequired);
				onLoad?.(texture);
			},
			onError,
		);
	};
}

function hasInvalidCompressedMipDimensions(buffer: ArrayBuffer): boolean {
	if (buffer.byteLength < 44) return false;
	const bytes = new Uint8Array(buffer, 0, 12);
	const identifier = [171, 75, 84, 88, 32, 50, 48, 187, 13, 10, 26, 10];
	if (!identifier.every((byte, index) => bytes[index] === byte)) return false;
	const header = new DataView(buffer);
	const vkFormat = header.getUint32(12, true);
	const width = header.getUint32(20, true);
	const height = header.getUint32(24, true);
	const levelCount = header.getUint32(40, true);
	return (
		vkFormat === 0 &&
		levelCount > 1 &&
		(width % GPU_TEXTURE_BLOCK_SIZE !== 0 ||
			height % GPU_TEXTURE_BLOCK_SIZE !== 0)
	);
}

export function getCompressedTextureLoader(
	manager?: LoadingManager,
): KTX2Loader | null {
	if (!loader || !manager) return loader;
	// Local model dependencies use the import's URL resolver; decoding shares the codec pool.
	const facade = Object.create(loader) as KTX2Loader;
	facade.manager = manager;
	facade.parse = loader.parse.bind(loader);
	return facade;
}

export function isKtx2DataUrl(value: unknown): value is string {
	return (
		typeof value === "string" && value.startsWith("data:image/ktx2;base64,")
	);
}

function toDataUrl(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
	}
	return `data:image/ktx2;base64,${btoa(binary)}`;
}

function attachPortableSource(
	texture: Texture,
	data: ArrayBuffer,
	repairRequired = false,
): void {
	const url = toDataUrl(data);
	sources.set(texture.source, url);
	// Source is shared by Texture.clone(). Standard Three material/library serialization
	// can therefore retain KTX2 bytes without serializing device-specific GPU blocks.
	texture.source.toJSON = function (meta) {
		const result = {uuid: this.uuid, url};
		if (meta && typeof meta !== "string")
			(meta as {images: Record<string, unknown>}).images[this.uuid] = result;
		return result;
	};
	texture.userData[COMPRESSION_DATA_KEY] = {
		version: 1,
		codec: "ktx2-basis",
		compressed: true,
		gpuCompressed: texture.format !== RGBAFormat,
		...(repairRequired && {repairRequired: true}),
	};
}

export function getPortableTextureUrl(texture: Texture): string | undefined {
	return sources.get(texture.source);
}

/** A small browser-readable thumbnail retained when the live image becomes GPU-only. */
export function getTexturePreviewDataUrl(texture: Texture): string | undefined {
	const value = texture.userData[TEXTURE_PREVIEW_DATA_KEY];
	return typeof value === "string" && value.startsWith("data:image/")
		? value
		: undefined;
}

function createTexturePreviewDataUrl(source: CanvasImageSource): string | undefined {
	const dimensions = source as CanvasImageSource & {
		height?: number;
		width?: number;
	};
	const sourceWidth = Number(dimensions.width);
	const sourceHeight = Number(dimensions.height);
	if (sourceWidth <= 0 || sourceHeight <= 0) return undefined;

	try {
		const scale = Math.min(
			1,
			MAX_TEXTURE_PREVIEW_SIZE / Math.max(sourceWidth, sourceHeight),
		);
		const preview = document.createElement("canvas");
		preview.width = Math.max(1, Math.round(sourceWidth * scale));
		preview.height = Math.max(1, Math.round(sourceHeight * scale));
		const context = preview.getContext("2d");
		if (!context) return undefined;
		context.drawImage(source, 0, 0, preview.width, preview.height);
		return preview.toDataURL("image/webp", 0.82);
	} catch {
		return undefined;
	}
}

export function decodeKtx2(data: ArrayBuffer): Promise<Texture> {
	if (!loader)
		return Promise.reject(
			new Error("Texture codec requires renderer initialization"),
		);
	return new Promise((resolve, reject) =>
		loader!.parse(data.slice(0), resolve, reject),
	);
}

export async function loadKtx2DataUrl(url: string): Promise<Texture> {
	return decodeKtx2(
		new Uint8Array(decodeBase64(url.slice(url.indexOf(",") + 1))).buffer,
	);
}

/** Preserve sampler/UV settings, but retain the transcoder's device-specific pixel format. */
export function copyTextureSettings(source: Texture, target: Texture): void {
	target.name = source.name;
	target.mapping = source.mapping;
	target.channel = source.channel;
	target.wrapS = source.wrapS;
	target.wrapT = source.wrapT;
	target.magFilter = source.magFilter;
	target.minFilter = source.minFilter;
	target.anisotropy = source.anisotropy;
	target.offset.copy(source.offset);
	target.repeat.copy(source.repeat);
	target.center.copy(source.center);
	target.rotation = source.rotation;
	target.matrix.copy(source.matrix);
	target.matrixAutoUpdate = source.matrixAutoUpdate;
	target.colorSpace = source.colorSpace;
	target.userData = {
		...source.userData,
		[COMPRESSION_DATA_KEY]: target.userData[COMPRESSION_DATA_KEY],
	};
	// Y orientation is baked into the encoded pixels; compressed uploads cannot flip them.
	target.flipY = false;
	target.generateMipmaps = false;
	target.needsUpdate = true;
}

export function assetContentKey(pixels: Uint8Array, settings: string): string {
	let a = 0x811c9dc5,
		b = 0x9e3779b9;
	for (const byte of pixels) {
		a = Math.imul(a ^ byte, 0x01000193);
		b = Math.imul(b ^ byte, 0x85ebca6b);
	}
	return `asset-v1:${settings}:${pixels.byteLength}:${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`;
}

function encodePixels(
	pixels: Uint8Array<ArrayBuffer>,
	options: Record<string, unknown>,
): Promise<ArrayBuffer> {
	const run = queue.then(
		() =>
			new Promise<ArrayBuffer>((resolve, reject) => {
				clearTimeout(encoderIdleTimer);
				let wasm: Uint8Array<ArrayBuffer> | undefined;
				if (!encoder) {
					const url = URL.createObjectURL(
						new Blob([unpack(workerSource)], {type: "text/javascript"}),
					);
					try {
						encoder = new Worker(url);
					} finally {
						URL.revokeObjectURL(url);
					}
					wasm = unpack(encoderWasm);
				}
				const worker = encoder;
				const id = ++sequence;
				const finish = () => {
					clearTimeout(timeout);
					worker.onmessage = null;
					worker.onerror = null;
				};
				const fail = (error: unknown) => {
					finish();
					worker.terminate();
					encoder = null;
					reject(error);
				};
				const timeout = setTimeout(
					() => fail(new Error("Texture compression timed out")),
					120000,
				);
				worker.onerror = (event) => fail(new Error(event.message));
				worker.onmessage = ({data}) => {
					if (data.id !== id) return;
					finish();
					encoderIdleTimer = setTimeout(() => {
						worker.terminate();
						if (encoder === worker) encoder = null;
					}, 30000);
					if (data.error) reject(new Error(data.error));
					else resolve(new Uint8Array(data.result).buffer);
				};
				try {
					worker.postMessage({id, pixels: pixels.buffer, wasm, ...options}, [
						pixels.buffer,
					]);
				} catch (error) {
					fail(error);
				}
			}),
	);
	queue = run.then(
		() => {},
		() => {},
	);
	return run;
}

async function compressTexture(
	texture: Texture,
	property: string,
	cache: SpaceDataCache,
): Promise<Texture> {
	const compressionData = texture.userData[
		COMPRESSION_DATA_KEY
	] as CompressionData | undefined;
	const repairRequired = compressionData?.repairRequired === true;
	if (
		!loader ||
		(!repairRequired && getPortableTextureUrl(texture)) ||
		(!repairRequired && "isCompressedTexture" in texture) ||
		"isVideoTexture" in texture ||
		"isCanvasTexture" in texture ||
		"isCubeTexture" in texture ||
		texture.isRenderTargetTexture ||
		texture.type !== UnsignedByteType ||
		texture.premultiplyAlpha
	)
		return texture;
	const repairTexture = texture as Texture & {
		mipmaps?: Array<{
			width: number;
			height: number;
			data: Uint8Array;
		}>;
	};
	const repairMip = repairRequired ? repairTexture.mipmaps?.[0] : undefined;
	const image = (repairMip ?? texture.image) as CanvasImageSource & {
		width: number;
		height: number;
		data?: Uint8Array;
	};
	if (!image?.width || !image?.height) return texture;
	try {
		const scale = Math.min(
			1,
			maxTextureSize / Math.max(image.width, image.height),
		);
		const width = alignTextureDimension(Math.round(image.width * scale));
		const height = alignTextureDimension(Math.round(image.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d", {willReadFrequently: true});
		if (!context) return texture;
		if (image.data) {
			// HDR/special formats are excluded. Use an intermediate canvas so raw maps can
			// be resized to GPU block boundaries just like browser image sources.
			if (
				texture.format !== RGBAFormat ||
				image.data.length !== image.width * image.height * 4
			)
				return texture;
			const sourceCanvas = document.createElement("canvas");
			sourceCanvas.width = image.width;
			sourceCanvas.height = image.height;
			const sourceContext = sourceCanvas.getContext("2d");
			if (!sourceContext) return texture;
			sourceContext.putImageData(
				new ImageData(
					new Uint8ClampedArray(image.data),
					image.width,
					image.height,
				),
				0,
				0,
			);
			context.drawImage(sourceCanvas, 0, 0, width, height);
		} else context.drawImage(image, 0, 0, width, height);
		const pixels = new Uint8Array(
			context.getImageData(0, 0, width, height).data.buffer,
		);
		const options = {
			width,
			height,
			srgb: texture.colorSpace === SRGBColorSpace,
			flipY: texture.flipY,
			normalMap: property === "normalMap",
			mipmaps: texture.generateMipmaps,
		};
		const previewDataUrl =
			getTexturePreviewDataUrl(texture) ??
			createTexturePreviewDataUrl(canvas);
		const key = assetContentKey(pixels, JSON.stringify(options));
		let data = await cache.getDerivedAsset(key);
		let result: Texture | undefined;
		if (data) {
			try {
				result = await decodeKtx2(data);
			} catch {
				data = null;
			}
		}
		if (!result) {
			data = await encodePixels(pixels, options);
			result = await decodeKtx2(data);
			await cache.putDerivedAsset(key, data);
		}
		copyTextureSettings(texture, result);
		if (previewDataUrl) {
			result.userData[TEXTURE_PREVIEW_DATA_KEY] = previewDataUrl;
		}
		return result;
	} catch (error) {
		console.warn(
			`DT3D: Keeping original texture ${texture.name}; compression failed`,
			error,
		);
		texture.userData[COMPRESSION_DATA_KEY] = {
			version: 1,
			codec: "none",
			compressed: false,
		};
		return texture;
	}
}

function alignTextureDimension(value: number): number {
	const maximum = Math.max(
		GPU_TEXTURE_BLOCK_SIZE,
		Math.floor(maxTextureSize / GPU_TEXTURE_BLOCK_SIZE) *
			GPU_TEXTURE_BLOCK_SIZE,
	);
	return Math.min(
		maximum,
		Math.max(
			GPU_TEXTURE_BLOCK_SIZE,
			Math.ceil(value / GPU_TEXTURE_BLOCK_SIZE) * GPU_TEXTURE_BLOCK_SIZE,
		),
	);
}

/** Converts every static material map (including normal/roughness/alpha), once per source revision. */
export async function optimizeMaterialTextures(
	material: Material | Material[],
	cache: SpaceDataCache,
): Promise<boolean> {
	let changed = false;
	for (const item of Array.isArray(material) ? material : [material]) {
		for (const [property, value] of Object.entries(item)) {
			if (!(value instanceof Texture)) continue;
			const properties = item as unknown as Record<string, unknown>;
			const version = value.version;
			const settings = `${value.source.uuid}:${value.source.version}:${value.colorSpace}:${value.flipY}:${value.generateMipmaps}:${property === "normalMap"}`;
			let pending = optimized.get(value);
			if (
				!pending ||
				pending.version !== version ||
				pending.settings !== settings
			) {
				pending = {
					version,
					settings,
					result: compressTexture(value, property, cache),
				};
				optimized.set(value, pending);
			}
			const compressed = await pending.result;
			if (
				compressed !== value &&
				properties[property] === value &&
				value.version === version
			) {
				properties[property] = compressed;
				item.needsUpdate = true;
				// dispose releases GPU storage only; shared source images remain valid for other users/undo.
				value.dispose();
				changed = true;
			}
		}
	}
	return changed;
}
