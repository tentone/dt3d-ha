declare module "draco3d" {
	type DracoModuleFactoryOptions = {
		locateFile?: (path: string) => string;
		wasmBinary?: Uint8Array;
	};

	type Draco3D = {
		createDecoderModule(options?: DracoModuleFactoryOptions): Promise<any>;
		createEncoderModule(options?: DracoModuleFactoryOptions): Promise<any>;
	};

	const draco3d: Draco3D;
	export default draco3d;
}

declare module "*.wasm?url&inline" {
	const url: string;
	export default url;
}
