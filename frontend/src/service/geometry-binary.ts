import {BufferAttribute, BufferGeometry} from "three";

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
	new(buffer: ArrayBuffer): GeometryTypedArray;
	new(length: number): GeometryTypedArray;
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

const MAGIC = "DT3DGEO1";
const HEADER_OFFSET = 12;
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
			for (let componentIndex = 0; componentIndex < attribute.itemSize; componentIndex += 1) {
				array[itemIndex * attribute.itemSize + componentIndex] =
					sourceArray[itemIndex * attribute.data.stride + attribute.offset + componentIndex];
			}
		}
		return array;
	}

	return sourceArray.slice(0) as GeometryTypedArray;
}

function serializeAttribute(attribute: any, chunks: Uint8Array[]): AttributeMetadata {
	const array = getAttributeArray(attribute);
	const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
	const byteOffset = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);

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

function deserializeAttribute(metadata: AttributeMetadata, body: Uint8Array): BufferAttribute {
	const constructor = getTypedArrayConstructor(metadata.arrayType);
	const bytes = body.slice(metadata.byteOffset, metadata.byteOffset + metadata.byteLength);
	const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
	const array = new constructor(arrayBuffer);
	const attribute = new BufferAttribute(array, metadata.itemSize, metadata.normalized);

	if (metadata.name) {
		attribute.name = metadata.name;
	}

	return attribute;
}

/**
 * Serialize a BufferGeometry into a compact binary payload.
 *
 * The database stores only the returned file id; this payload is stored by the
 * backend as an opaque file and decoded by the frontend when the mesh hydrates.
 */
export function serializeGeometryToBinary(geometry: BufferGeometry): ArrayBuffer {
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
			count: geometry.drawRange.count === Infinity ? -1 : geometry.drawRange.count,
			start: geometry.drawRange.start,
		};
	}

	const encoder = new TextEncoder();
	const magic = encoder.encode(MAGIC);
	const header = encoder.encode(JSON.stringify(metadata));
	const bodyLength = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
	const output = new Uint8Array(HEADER_OFFSET + header.byteLength + bodyLength);
	const view = new DataView(output.buffer);

	output.set(magic, 0);
	view.setUint32(8, header.byteLength, true);
	output.set(header, HEADER_OFFSET);

	let offset = HEADER_OFFSET + header.byteLength;
	for (const chunk of chunks) {
		output.set(chunk, offset);
		offset += chunk.byteLength;
	}

	return output.buffer;
}

/**
 * Deserialize a geometry binary payload produced by serializeGeometryToBinary.
 */
export function deserializeGeometryBinary(buffer: ArrayBuffer): BufferGeometry {
	const bytes = new Uint8Array(buffer);
	const decoder = new TextDecoder();
	const magic = decoder.decode(bytes.slice(0, 8));
	if (magic !== MAGIC) {
		throw new Error("Invalid DT3D geometry file");
	}

	const view = new DataView(buffer);
	const headerLength = view.getUint32(8, true);
	const headerEnd = HEADER_OFFSET + headerLength;
	const metadata = JSON.parse(decoder.decode(bytes.slice(HEADER_OFFSET, headerEnd))) as GeometryMetadata;
	const body = bytes.slice(headerEnd);
	const geometry = new BufferGeometry();

	if (metadata.version !== 1) {
		throw new Error(`Unsupported DT3D geometry file version: ${metadata.version}`);
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
