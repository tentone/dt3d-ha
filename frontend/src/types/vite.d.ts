declare module "virtual:mdi-icon-catalog" {
	const compressedCatalog: string;
	export default compressedCatalog;
}

declare module "virtual:draco-wasm" {
	export const decoderWasm: string;
	export const encoderWasm: string;
}

declare module "virtual:texture-codecs" {
	export const dracoImportSource: string;
	export const dracoImportWasm: string;
	export const workerSource: string;
	export const encoderWasm: string;
	export const transcoderSource: string;
	export const transcoderWasm: string;
}
