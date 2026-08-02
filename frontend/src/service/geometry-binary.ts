import draco3d from "draco3d";
import {unzlibSync} from "fflate";
import {BufferAttribute, BufferGeometry} from "three";
import {decoderWasm, encoderWasm} from "virtual:draco-wasm";

import {decodeBase64} from "../utils/base64.js";

type GeometryTypedArray =
	| Float32Array
	| Float64Array
	| Int8Array
	| Int16Array
	| Int32Array
	| Uint8Array
	| Uint8ClampedArray
	| Uint16Array
	| Uint32Array;

type GeometryTypedArrayConstructor = {
	new (buffer: ArrayBuffer): GeometryTypedArray;
	new (length: number): GeometryTypedArray;
	readonly BYTES_PER_ELEMENT: number;
};

type AttributeMetadata = {
	arrayType: string;
	byteLength: number;
	byteOffset: number;
	count: number;
	itemSize: number;
	name?: string;
	normalized: boolean;
};

type GeometryMetadata = {
	attributes: Record<string, AttributeMetadata>;
	drawRange?: {
		count: number;
		start: number;
	};
	groups: Array<{
		count: number;
		materialIndex?: number;
		start: number;
	}>;
	index?: AttributeMetadata;
	version: 1;
};

type DracoAttributeMetadata = {
	arrayType: string;
	count: number;
	itemSize: number;
	name?: string;
	normalized: boolean;
	uniqueId: number;
};

type DracoGeometryMetadata = {
	attributes: Record<string, DracoAttributeMetadata>;
	drawRange?: {
		count: number;
		start: number;
	};
	groups: Array<{
		count: number;
		materialIndex?: number;
		start: number;
	}>;
	indexArrayType?: string;
	indexed: boolean;
	version: 2;
};

const LEGACY_MAGIC = "DT3DGEO1";
const DRACO_MAGIC = "DT3DGEO2";
const HEADER_OFFSET = 12;
const POSITION_QUANTIZATION_BITS = 14;
const NORMAL_QUANTIZATION_BITS = 10;
const TEX_COORD_QUANTIZATION_BITS = 12;
const COLOR_QUANTIZATION_BITS = 8;
const typedArrayConstructors: Record<string, GeometryTypedArrayConstructor> = {
	Float32Array,
	Float64Array,
	Int8Array,
	Int16Array,
	Int32Array,
	Uint8Array,
	Uint8ClampedArray,
	Uint16Array,
	Uint32Array,
};
let decoderModulePromise: Promise<any> | null = null;
let encoderModulePromise: Promise<any> | null = null;

function getTypedArrayConstructor(name: string): GeometryTypedArrayConstructor {
	const constructor = typedArrayConstructors[name];
	if (!constructor) {
		throw new Error(`Unsupported geometry attribute array type: ${name}`);
	}

	return constructor;
}

function getAttributeArray(attribute: any): GeometryTypedArray {
	const sourceArray = attribute.array as GeometryTypedArray;
	const constructor = sourceArray.constructor as GeometryTypedArrayConstructor;

	if (attribute.isInterleavedBufferAttribute) {
		const array = new constructor(attribute.count * attribute.itemSize);
		for (let itemIndex = 0; itemIndex < attribute.count; itemIndex += 1) {
			for (
				let componentIndex = 0;
				componentIndex < attribute.itemSize;
				componentIndex += 1
			) {
				array[itemIndex * attribute.itemSize + componentIndex] =
					sourceArray[
						itemIndex * attribute.data.stride +
							attribute.offset +
							componentIndex
					];
			}
		}
		return array;
	}

	return sourceArray.slice(0) as GeometryTypedArray;
}

function serializeAttribute(
	attribute: any,
	chunks: Uint8Array[],
): AttributeMetadata {
	const array = getAttributeArray(attribute);
	const bytes = new Uint8Array(
		array.buffer,
		array.byteOffset,
		array.byteLength,
	);
	const byteOffset = chunks.reduce(
		(total, chunk) => total + chunk.byteLength,
		0,
	);

	chunks.push(new Uint8Array(bytes));

	return {
		arrayType: array.constructor.name,
		byteLength: bytes.byteLength,
		byteOffset,
		count: attribute.count,
		itemSize: attribute.itemSize,
		name: attribute.name || undefined,
		normalized: attribute.normalized === true,
	};
}

function deserializeAttribute(
	metadata: AttributeMetadata,
	body: Uint8Array,
): BufferAttribute {
	const constructor = getTypedArrayConstructor(metadata.arrayType);
	const bytes = body.slice(
		metadata.byteOffset,
		metadata.byteOffset + metadata.byteLength,
	);
	const arrayBuffer = bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	);
	const array = new constructor(arrayBuffer);
	const attribute = new BufferAttribute(
		array,
		metadata.itemSize,
		metadata.normalized,
	);

	if (metadata.name) {
		attribute.name = metadata.name;
	}

	return attribute;
}

function createBinaryPayload(
	magicValue: string,
	metadata: GeometryMetadata | DracoGeometryMetadata,
	body: Uint8Array,
): ArrayBuffer {
	const encoder = new TextEncoder();
	const magic = encoder.encode(magicValue);
	const header = encoder.encode(JSON.stringify(metadata));
	const output = new Uint8Array(
		HEADER_OFFSET + header.byteLength + body.byteLength,
	);
	const view = new DataView(output.buffer);

	output.set(magic, 0);
	view.setUint32(8, header.byteLength, true);
	output.set(header, HEADER_OFFSET);
	output.set(body, HEADER_OFFSET + header.byteLength);

	return output.buffer;
}

function serializeGeometryLegacy(geometry: BufferGeometry): ArrayBuffer {
	const chunks: Uint8Array[] = [];
	const metadata: GeometryMetadata = {
		attributes: {},
		groups: geometry.groups.map((group) => ({
			count: group.count,
			materialIndex: group.materialIndex,
			start: group.start,
		})),
		version: 1,
	};

	if (geometry.index) {
		metadata.index = serializeAttribute(geometry.index, chunks);
	}

	for (const [name, attribute] of Object.entries(geometry.attributes)) {
		metadata.attributes[name] = serializeAttribute(attribute, chunks);
	}

	if (geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) {
		metadata.drawRange = {
			count:
				geometry.drawRange.count === Infinity ? -1 : geometry.drawRange.count,
			start: geometry.drawRange.start,
		};
	}

	const bodyLength = chunks.reduce(
		(total, chunk) => total + chunk.byteLength,
		0,
	);
	const body = new Uint8Array(bodyLength);
	let offset = 0;
	for (const chunk of chunks) {
		body.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return createBinaryPayload(LEGACY_MAGIC, metadata, body);
}

function decodeCompressedWasm(value: string): Uint8Array {
	return unzlibSync(decodeBase64(value));
}

function addDracoAttribute(
	module: any,
	builder: any,
	mesh: any,
	name: string,
	attribute: any,
): DracoAttributeMetadata {
	const array = getAttributeArray(attribute);
	const attributeType =
		name === "position"
			? module.POSITION
			: name === "normal"
				? module.NORMAL
				: name === "color"
					? module.COLOR
					: name === "uv" || /^uv\d+$/.test(name)
						? module.TEX_COORD
						: module.GENERIC;
	let uniqueId: number;

	switch (array.constructor.name) {
		case "Float32Array":
			uniqueId = builder.AddFloatAttribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				array,
			);
			break;
		case "Float64Array":
			uniqueId = builder.AddFloatAttribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				new Float32Array(array),
			);
			break;
		case "Int8Array":
			uniqueId = builder.AddInt8Attribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				array,
			);
			break;
		case "Uint8Array":
		case "Uint8ClampedArray":
			uniqueId = builder.AddUInt8Attribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				array,
			);
			break;
		case "Int16Array":
			uniqueId = builder.AddInt16Attribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				array,
			);
			break;
		case "Uint16Array":
			uniqueId = builder.AddUInt16Attribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				array,
			);
			break;
		case "Int32Array":
			uniqueId = builder.AddInt32Attribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				array,
			);
			break;
		case "Uint32Array":
			uniqueId = builder.AddUInt32Attribute(
				mesh,
				attributeType,
				attribute.count,
				attribute.itemSize,
				array,
			);
			break;
		default:
			throw new Error(
				`Unsupported Draco attribute array type: ${array.constructor.name}`,
			);
	}

	if (uniqueId < 0) {
		throw new Error(`Draco failed to add geometry attribute "${name}"`);
	}
	builder.SetNormalizedFlagForAttribute?.(
		mesh,
		uniqueId,
		attribute.normalized === true,
	);

	return {
		arrayType: array.constructor.name,
		count: attribute.count,
		itemSize: attribute.itemSize,
		name: attribute.name || undefined,
		normalized: attribute.normalized === true,
		uniqueId,
	};
}

async function serializeGeometryDraco(
	geometry: BufferGeometry,
): Promise<ArrayBuffer> {
	encoderModulePromise ??= draco3d.createEncoderModule({
		wasmBinary: decodeCompressedWasm(encoderWasm),
	});
	const module = await encoderModulePromise;
	const builder = new module.MeshBuilder();
	const mesh = new module.Mesh();
	const encoder = new module.Encoder();
	const encodedData = new module.DracoInt8Array();

	try {
		const position = geometry.getAttribute("position");
		const sourceIndex = geometry.index
			? getAttributeArray(geometry.index)
			: Uint32Array.from({length: position.count}, (_, index) => index);
		const indices = new Uint32Array(sourceIndex);
		if (!builder.AddFacesToMesh(mesh, indices.length / 3, indices)) {
			throw new Error("Draco failed to add geometry faces");
		}

		const attributes: Record<string, DracoAttributeMetadata> = {};
		for (const [name, attribute] of Object.entries(geometry.attributes)) {
			attributes[name] = addDracoAttribute(
				module,
				builder,
				mesh,
				name,
				attribute,
			);
		}

		encoder.SetSpeedOptions(5, 5);
		// Sequential encoding retains face order, which keeps material groups valid.
		encoder.SetEncodingMethod(module.MESH_SEQUENTIAL_ENCODING);
		encoder.SetAttributeQuantization(
			module.POSITION,
			POSITION_QUANTIZATION_BITS,
		);
		encoder.SetAttributeQuantization(module.NORMAL, NORMAL_QUANTIZATION_BITS);
		encoder.SetAttributeQuantization(
			module.TEX_COORD,
			TEX_COORD_QUANTIZATION_BITS,
		);
		encoder.SetAttributeQuantization(module.COLOR, COLOR_QUANTIZATION_BITS);

		const encodedLength = encoder.EncodeMeshToDracoBuffer(mesh, encodedData);
		if (encodedLength <= 0) {
			throw new Error("Draco geometry encoding failed");
		}

		const body = new Uint8Array(encodedLength);
		for (let index = 0; index < encodedLength; index += 1) {
			body[index] = encodedData.GetValue(index);
		}

		const metadata: DracoGeometryMetadata = {
			attributes,
			groups: geometry.groups.map((group) => ({
				count: group.count,
				materialIndex: group.materialIndex,
				start: group.start,
			})),
			indexArrayType: geometry.index
				? getAttributeArray(geometry.index).constructor.name
				: undefined,
			indexed: geometry.index !== null,
			version: 2,
		};

		if (
			geometry.drawRange.start !== 0 ||
			geometry.drawRange.count !== Infinity
		) {
			metadata.drawRange = {
				count:
					geometry.drawRange.count === Infinity ? -1 : geometry.drawRange.count,
				start: geometry.drawRange.start,
			};
		}

		return createBinaryPayload(DRACO_MAGIC, metadata, body);
	} finally {
		module.destroy(encodedData);
		module.destroy(encoder);
		module.destroy(mesh);
		module.destroy(builder);
	}
}

/**
 * Serialize a BufferGeometry into a compact binary payload.
 *
 * The database stores only the returned file id; this payload is stored by the backend as an opaque file and decoded by the frontend when the mesh hydrates.
 */
export async function serializeGeometryToBinary(
	geometry: BufferGeometry,
): Promise<ArrayBuffer> {
	const position = geometry.getAttribute("position");
	const elementCount = geometry.index?.count ?? position?.count ?? 0;
	if (
		!position ||
		position.count === 0 ||
		elementCount % 3 !== 0 ||
		!Object.values(geometry.attributes).every(
			(attribute) => attribute.count === position.count,
		)
	) {
		return serializeGeometryLegacy(geometry);
	}

	try {
		return await serializeGeometryDraco(geometry);
	} catch (error) {
		console.warn(
			"DT3D: Draco compression failed; uploading uncompressed geometry",
			error,
		);
		return serializeGeometryLegacy(geometry);
	}
}

function deserializeGeometryLegacy(
	metadata: GeometryMetadata,
	body: Uint8Array,
): BufferGeometry {
	const geometry = new BufferGeometry();

	if (metadata.version !== 1) {
		throw new Error(
			`Unsupported DT3D geometry file version: ${metadata.version}`,
		);
	}

	if (metadata.index) {
		geometry.setIndex(deserializeAttribute(metadata.index, body));
	}

	for (const [name, attributeMetadata] of Object.entries(metadata.attributes)) {
		geometry.setAttribute(name, deserializeAttribute(attributeMetadata, body));
	}

	for (const group of metadata.groups) {
		geometry.addGroup(group.start, group.count, group.materialIndex ?? 0);
	}

	if (metadata.drawRange) {
		geometry.setDrawRange(
			metadata.drawRange.start,
			metadata.drawRange.count < 0 ? Infinity : metadata.drawRange.count,
		);
	}

	geometry.computeBoundingBox();
	geometry.computeBoundingSphere();

	return geometry;
}

function getDecodedAttributeArray(
	module: any,
	decoder: any,
	mesh: any,
	attribute: any,
	metadata: DracoAttributeMetadata,
): GeometryTypedArray {
	const constructor = getTypedArrayConstructor(metadata.arrayType);
	const length = mesh.num_points() * metadata.itemSize;
	let dracoArray: any;
	let readAttribute: (mesh: any, attribute: any, output: any) => boolean;

	switch (metadata.arrayType) {
		case "Float32Array":
		case "Float64Array":
			dracoArray = new module.DracoFloat32Array();
			readAttribute = decoder.GetAttributeFloatForAllPoints.bind(decoder);
			break;
		case "Int8Array":
			dracoArray = new module.DracoInt8Array();
			readAttribute = decoder.GetAttributeInt8ForAllPoints.bind(decoder);
			break;
		case "Uint8Array":
		case "Uint8ClampedArray":
			dracoArray = new module.DracoUInt8Array();
			readAttribute = decoder.GetAttributeUInt8ForAllPoints.bind(decoder);
			break;
		case "Int16Array":
			dracoArray = new module.DracoInt16Array();
			readAttribute = decoder.GetAttributeInt16ForAllPoints.bind(decoder);
			break;
		case "Uint16Array":
			dracoArray = new module.DracoUInt16Array();
			readAttribute = decoder.GetAttributeUInt16ForAllPoints.bind(decoder);
			break;
		case "Int32Array":
			dracoArray = new module.DracoInt32Array();
			readAttribute = decoder.GetAttributeInt32ForAllPoints.bind(decoder);
			break;
		case "Uint32Array":
			dracoArray = new module.DracoUInt32Array();
			readAttribute = decoder.GetAttributeUInt32ForAllPoints.bind(decoder);
			break;
		default:
			throw new Error(
				`Unsupported Draco geometry attribute array type: ${metadata.arrayType}`,
			);
	}

	try {
		if (
			!readAttribute(mesh, attribute, dracoArray) ||
			dracoArray.size() !== length
		) {
			throw new Error("Draco failed to decode a geometry attribute");
		}

		const output = new constructor(length);
		for (let index = 0; index < length; index += 1) {
			output[index] = dracoArray.GetValue(index);
		}
		return output;
	} finally {
		module.destroy(dracoArray);
	}
}

async function deserializeGeometryDraco(
	metadata: DracoGeometryMetadata,
	body: Uint8Array,
): Promise<BufferGeometry> {
	if (metadata.version !== 2) {
		throw new Error(
			`Unsupported DT3D geometry file version: ${metadata.version}`,
		);
	}

	decoderModulePromise ??= draco3d.createDecoderModule({
		wasmBinary: decodeCompressedWasm(decoderWasm),
	});
	const module = await decoderModulePromise;
	const buffer = new module.DecoderBuffer();
	const decoder = new module.Decoder();
	const mesh = new module.Mesh();

	try {
		buffer.Init(
			new Int8Array(body.buffer, body.byteOffset, body.byteLength),
			body.byteLength,
		);
		if (decoder.GetEncodedGeometryType(buffer) !== module.TRIANGULAR_MESH) {
			throw new Error("DT3D Draco payload is not a triangular mesh");
		}

		const status = decoder.DecodeBufferToMesh(buffer, mesh);
		if (!status.ok() || mesh.ptr === 0) {
			throw new Error(status.error_msg() || "Draco geometry decoding failed");
		}

		let geometry = new BufferGeometry();
		for (const [name, attributeMetadata] of Object.entries(
			metadata.attributes,
		)) {
			const dracoAttribute = decoder.GetAttributeByUniqueId(
				mesh,
				attributeMetadata.uniqueId,
			);
			if (!dracoAttribute || dracoAttribute.ptr === 0) {
				throw new Error(`Draco geometry attribute "${name}" is missing`);
			}

			const array = getDecodedAttributeArray(
				module,
				decoder,
				mesh,
				dracoAttribute,
				attributeMetadata,
			);
			const attribute = new BufferAttribute(
				array,
				attributeMetadata.itemSize,
				attributeMetadata.normalized,
			);
			if (attributeMetadata.name) {
				attribute.name = attributeMetadata.name;
			}
			geometry.setAttribute(name, attribute);
		}

		const indexConstructor = metadata.indexArrayType
			? getTypedArrayConstructor(metadata.indexArrayType)
			: Uint32Array;
		const indices = new indexConstructor(mesh.num_faces() * 3);
		const face = new module.DracoInt32Array();
		try {
			for (let faceIndex = 0; faceIndex < mesh.num_faces(); faceIndex += 1) {
				if (!decoder.GetFaceFromMesh(mesh, faceIndex, face)) {
					throw new Error("Draco failed to decode geometry faces");
				}
				const offset = faceIndex * 3;
				indices[offset] = face.GetValue(0);
				indices[offset + 1] = face.GetValue(1);
				indices[offset + 2] = face.GetValue(2);
			}
		} finally {
			module.destroy(face);
		}
		geometry.setIndex(new BufferAttribute(indices, 1));

		for (const group of metadata.groups) {
			geometry.addGroup(group.start, group.count, group.materialIndex ?? 0);
		}

		if (!metadata.indexed) {
			const indexedGeometry = geometry;
			geometry = indexedGeometry.toNonIndexed();
			indexedGeometry.dispose();
		}

		if (metadata.drawRange) {
			geometry.setDrawRange(
				metadata.drawRange.start,
				metadata.drawRange.count < 0 ? Infinity : metadata.drawRange.count,
			);
		}

		geometry.computeBoundingBox();
		geometry.computeBoundingSphere();
		return geometry;
	} finally {
		module.destroy(mesh);
		module.destroy(decoder);
		module.destroy(buffer);
	}
}

/**
 * Deserialize a geometry binary payload produced by serializeGeometryToBinary.
 */
export async function deserializeGeometryBinary(
	buffer: ArrayBuffer,
): Promise<BufferGeometry> {
	if (buffer.byteLength < HEADER_OFFSET) {
		throw new Error("Invalid DT3D geometry file");
	}

	const bytes = new Uint8Array(buffer);
	const decoder = new TextDecoder();
	const magic = decoder.decode(bytes.slice(0, 8));
	const view = new DataView(buffer);
	const headerLength = view.getUint32(8, true);
	const headerEnd = HEADER_OFFSET + headerLength;
	if (headerEnd > buffer.byteLength) {
		throw new Error("Invalid DT3D geometry file");
	}

	const metadata = JSON.parse(
		decoder.decode(bytes.slice(HEADER_OFFSET, headerEnd)),
	) as GeometryMetadata | DracoGeometryMetadata;
	const body = bytes.slice(headerEnd);

	if (magic === LEGACY_MAGIC) {
		return deserializeGeometryLegacy(metadata as GeometryMetadata, body);
	}
	if (magic === DRACO_MAGIC) {
		return deserializeGeometryDraco(metadata as DracoGeometryMetadata, body);
	}

	throw new Error("Invalid DT3D geometry file");
}
