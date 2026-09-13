import {unzlibSync} from "fflate";
import {LoadingManager} from "three";
import {DRACOLoader} from "three/examples/jsm/loaders/DRACOLoader.js";
import {dracoImportSource, dracoImportWasm} from "virtual:texture-codecs";

import {decodeBase64} from "../utils/base64.js";

let urls: Map<string, string>;

export function createDracoLoader(): DRACOLoader {
	urls ??= new Map(
		[
			["draco_wasm_wrapper.js", dracoImportSource],
			["draco_decoder.wasm", dracoImportWasm],
		].map(([name, data]) => [
			name,
			URL.createObjectURL(
				new Blob([new Uint8Array(unzlibSync(decodeBase64(data)))]),
			),
		]),
	);
	const manager = new LoadingManager();
	manager.setURLModifier((url) => urls.get(url.split("/").pop()!) ?? url);
	return new DRACOLoader(manager)
		.setDecoderConfig({type: "wasm"})
		.setDecoderPath("dt3d-codecs/");
}
