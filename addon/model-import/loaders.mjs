import { resolveObjectURL } from "node:buffer";
import { readFile } from "node:fs/promises";
import { Worker } from "node:worker_threads";

import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";

export function installImageLoader() {
	const fetchAsset = globalThis.fetch;
	globalThis.fetch = (request, options) => {
		const url = request instanceof Request ? request.url : String(request);
		if (!/^(data:|blob:nodedata:)/i.test(url)) {
			return Promise.reject(
				new Error("Only uploaded model assets can be loaded"),
			);
		}
		return fetchAsset(request, options);
	};

	class PortableImage extends EventTarget {
		set src(url) {
			this.readImage(url).catch(() => this.dispatchEvent(new Event("error")));
		}

		get src() {
			return this.dataURL;
		}

		async readImage(url) {
			if (!/^(data:|blob:nodedata:)/i.test(url))
				throw new Error("Image was not uploaded");
			const response = await fetch(url);
			const image = await response.blob();
			if (
				!response.ok ||
				!/^image\/(png|jpe?g|webp|avif|gif|bmp|ktx2)$/i.test(image.type) ||
				image.size === 0
			) {
				throw new Error("Unsupported or empty texture image");
			}
			this.dataURL = `data:${image.type};base64,${Buffer.from(await image.arrayBuffer()).toString("base64")}`;
			this.complete = true;
			this.dispatchEvent(new Event("load"));
		}
	}
	globalThis.self = globalThis;
	globalThis.window = globalThis;
	globalThis.ProgressEvent = class extends Event {
		constructor(type, details) {
			super(type);
			Object.assign(this, details);
		}
	};
	globalThis.HTMLImageElement = PortableImage;
	globalThis.document = {
		createElementNS(_namespace, name) {
			if (name !== "img") throw new Error(`Unsupported DOM element: ${name}`);
			return new PortableImage();
		},
	};
}

export function createDracoLoader() {
	const manager = new (class extends DRACOLoader {
		async _loadLibrary(url, type) {
			// DRACOLoader supplies these URLs from its own installation.
			const result = await readFile(new URL(url));
			return type === "text"
				? result.toString("utf8")
				: result.buffer.slice(
						result.byteOffset,
						result.byteOffset + result.byteLength,
					);
		}
	})();
	manager.setWorkerLimit(1);
	globalThis.Worker = class {
		constructor(source) {
			const blob = resolveObjectURL(source);
			const prelude = `
				const {parentPort} = require("node:worker_threads");
				globalThis.self = globalThis;
				globalThis.onmessage = null;
				self.postMessage = (data, transfer) => parentPort.postMessage(data, transfer);
				parentPort.on("message", (data) => self.onmessage({data}));
			`;
			this.ready = blob.text().then((script) => {
				const worker = new Worker(prelude + script, { eval: true });
				worker.on("message", (data) => this.onmessage({ data }));
				return worker;
			});
		}

		postMessage(data, transfer) {
			this.ready.then((worker) => worker.postMessage(data, transfer));
		}

		terminate() {
			this.ready.then((worker) => worker.terminate());
		}
	};
	return manager;
}
