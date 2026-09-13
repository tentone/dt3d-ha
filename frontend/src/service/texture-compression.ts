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
const MAX_TEXTURE_SIZE = 2048;
let maxTextureSize = MAX_TEXTURE_SIZE;
let loader: KTX2Loader | null = null;
let encoder: Worker | null = null;
let encoderIdleTimer: ReturnType<typeof setTimeout> | undefined;
let sequence = 0;
let queue = Promise.resolve();
const sources = new WeakMap<Source<unknown>, string>();
const optimized = new WeakMap<
	Texture,
	{version: number; settings: string; result: Promise<Texture>}
>();

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
	const parse = loader.parse.bind(loader);
	loader.parse = (buffer, onLoad, onError) => {
		// KTX2Loader transfers the input buffer to a worker. Retain portable bytes for saving.
		const portable = buffer.slice(0);
		return parse(
			buffer,
			(texture) => {
				attachPortableSource(texture, portable);
				onLoad?.(texture);
			},
			onError,
		);
	};
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

function attachPortableSource(texture: Texture, data: ArrayBuffer): void {
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
	};
}

export function getPortableTextureUrl(texture: Texture): string | undefined {
	return sources.get(texture.source);
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
	if (
		!loader ||
		getPortableTextureUrl(texture) ||
		"isCompressedTexture" in texture ||
		"isVideoTexture" in texture ||
		"isCanvasTexture" in texture ||
		"isCubeTexture" in texture ||
		texture.isRenderTargetTexture ||
		texture.type !== UnsignedByteType ||
		texture.premultiplyAlpha
	)
		return texture;
	const image = texture.image as CanvasImageSource & {
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
		const width = Math.max(1, Math.round(image.width * scale));
		const height = Math.max(1, Math.round(image.height * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d", {willReadFrequently: true});
		if (!context) return texture;
		if (image.data) {
			// Preserve raw data maps exactly before encoding; HDR/special formats are excluded.
			if (
				texture.format !== RGBAFormat ||
				image.data.length !== image.width * image.height * 4 ||
				scale !== 1
			)
				return texture;
			context.putImageData(
				new ImageData(new Uint8ClampedArray(image.data), width, height),
				0,
				0,
			);
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
