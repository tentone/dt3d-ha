import type {BufferGeometry, Material, Object3D} from "three";
import {BoxGeometry, CapsuleGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, Mesh, OctahedronGeometry, PlaneGeometry, RingGeometry, SphereGeometry, TetrahedronGeometry, TorusGeometry, TorusKnotGeometry} from "three";

export type MeshOption = {
	type: string;
	label: string;
};

export type MeshGeometryParameterType = "number" | "integer" | "boolean";

export type MeshGeometryParameterDefinition = {
	name: string;
	label: string;
	type: MeshGeometryParameterType;
	defaultValue: number | boolean;
	min?: number;
	step?: number;
};

export type MeshGeometryParameters = Record<string, number | boolean>;

/**
 * List of possible mesh options to present on the GUI.
 */
export const MESH_OPTIONS: MeshOption[] = [
	{type: "cube", label: "Cube"},
	{type: "sphere", label: "Sphere"},
	{type: "plane", label: "Plane"},
	{type: "capsule", label: "Capsule"},
	{type: "circle", label: "Circle"},
	{type: "cone", label: "Cone"},
	{type: "cylinder", label: "Cylinder"},
	{type: "dodecahedron", label: "Dodecahedron"},
	{type: "icosahedron", label: "Icosahedron"},
	{type: "octahedron", label: "Octahedron"},
	{type: "ring", label: "Ring"},
	{type: "tetrahedron", label: "Tetrahedron"},
	{type: "torus", label: "Torus"},
	{type: "torusKnot", label: "Torus Knot"},
];

const TWO_PI = Math.PI * 2;
const int = (name: string, label: string, defaultValue: number, min = 1): MeshGeometryParameterDefinition => ({name, label, type: "integer", defaultValue, min, step: 1});
const num = (name: string, label: string, defaultValue: number, min = 0, step = 0.01): MeshGeometryParameterDefinition => ({name, label, type: "number", defaultValue, min, step});
const bool = (name: string, label: string, defaultValue: boolean): MeshGeometryParameterDefinition => ({name, label, type: "boolean", defaultValue});

/**
 * Constructor parameters supported by each built-in three.js geometry exposed by the mesh menu.
 */
export const MESH_GEOMETRY_PARAMETER_DEFINITIONS: Record<string, MeshGeometryParameterDefinition[]> = {
	cube: [num("width", "Width", 1), num("height", "Height", 1), num("depth", "Depth", 1), int("widthSegments", "Width Segments", 1), int("heightSegments", "Height Segments", 1), int("depthSegments", "Depth Segments", 1)],
	sphere: [num("radius", "Radius", 0.6), int("widthSegments", "Width Segments", 32, 3), int("heightSegments", "Height Segments", 16, 2), num("phiStart", "Phi Start", 0), num("phiLength", "Phi Length", TWO_PI), num("thetaStart", "Theta Start", 0), num("thetaLength", "Theta Length", Math.PI)],
	plane: [num("width", "Width", 1), num("height", "Height", 1), int("widthSegments", "Width Segments", 1), int("heightSegments", "Height Segments", 1)],
	capsule: [num("radius", "Radius", 0.4), num("length", "Length", 1), int("capSegments", "Cap Segments", 6), int("radialSegments", "Radial Segments", 12, 3)],
	circle: [num("radius", "Radius", 0.6), int("segments", "Segments", 32, 3), num("thetaStart", "Theta Start", 0), num("thetaLength", "Theta Length", TWO_PI)],
	cone: [num("radius", "Radius", 0.5), num("height", "Height", 1), int("radialSegments", "Radial Segments", 32, 3), int("heightSegments", "Height Segments", 1), bool("openEnded", "Open Ended", false), num("thetaStart", "Theta Start", 0), num("thetaLength", "Theta Length", TWO_PI)],
	cylinder: [num("radiusTop", "Top Radius", 0.4), num("radiusBottom", "Bottom Radius", 0.4), num("height", "Height", 1), int("radialSegments", "Radial Segments", 32, 3), int("heightSegments", "Height Segments", 1), bool("openEnded", "Open Ended", false), num("thetaStart", "Theta Start", 0), num("thetaLength", "Theta Length", TWO_PI)],
	dodecahedron: [num("radius", "Radius", 0.6), int("detail", "Detail", 0, 0)],
	icosahedron: [num("radius", "Radius", 0.6), int("detail", "Detail", 0, 0)],
	octahedron: [num("radius", "Radius", 0.6), int("detail", "Detail", 0, 0)],
	ring: [num("innerRadius", "Inner Radius", 0.3), num("outerRadius", "Outer Radius", 0.6), int("thetaSegments", "Theta Segments", 32, 3), int("phiSegments", "Phi Segments", 1), num("thetaStart", "Theta Start", 0), num("thetaLength", "Theta Length", TWO_PI)],
	tetrahedron: [num("radius", "Radius", 0.6), int("detail", "Detail", 0, 0)],
	torus: [num("radius", "Radius", 0.5), num("tube", "Tube", 0.2), int("radialSegments", "Radial Segments", 16, 3), int("tubularSegments", "Tubular Segments", 60, 3), num("arc", "Arc", TWO_PI)],
	torusKnot: [num("radius", "Radius", 0.4), num("tube", "Tube", 0.15), int("tubularSegments", "Tubular Segments", 80, 3), int("radialSegments", "Radial Segments", 12, 3), int("p", "P", 2, 1), int("q", "Q", 3, 1)],
};

function normalizeGeometryParameters(type: string, parameters: MeshGeometryParameters = {}): MeshGeometryParameters {
	const definitions = MESH_GEOMETRY_PARAMETER_DEFINITIONS[type] ?? [];
	return Object.fromEntries(definitions.map((definition) => {
		const value = parameters[definition.name] ?? definition.defaultValue;
		if (definition.type === "boolean") {
			return [definition.name, Boolean(value)];
		}
		const numericValue = Number(value);
		const fallback = Number(definition.defaultValue);
		const normalized = Number.isFinite(numericValue) ? numericValue : fallback;
		const clamped = definition.min == null ? normalized : Math.max(definition.min, normalized);
		return [definition.name, definition.type === "integer" ? Math.round(clamped) : clamped];
	}));
}

export function getMeshGeometryParameters(object: Object3D): MeshGeometryParameters | null {
	const meshType = resolveMeshType(object);
	if (!meshType || !(object instanceof Mesh)) {
		return null;
	}

	return normalizeGeometryParameters(meshType, object.userData.geometryParameters ?? object.geometry?.parameters ?? {});
}

function createGeometry(type: string, parameters: MeshGeometryParameters): BufferGeometry | null {
	const params = normalizeGeometryParameters(type, parameters) as any;
	switch (type) {
		case "cube": return new BoxGeometry(params.width, params.height, params.depth, params.widthSegments, params.heightSegments, params.depthSegments);
		case "sphere": return new SphereGeometry(params.radius, params.widthSegments, params.heightSegments, params.phiStart, params.phiLength, params.thetaStart, params.thetaLength);
		case "plane": return new PlaneGeometry(params.width, params.height, params.widthSegments, params.heightSegments);
		case "capsule": return new CapsuleGeometry(params.radius, params.length, params.capSegments, params.radialSegments);
		case "circle": return new CircleGeometry(params.radius, params.segments, params.thetaStart, params.thetaLength);
		case "cone": return new ConeGeometry(params.radius, params.height, params.radialSegments, params.heightSegments, params.openEnded, params.thetaStart, params.thetaLength);
		case "cylinder": return new CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, params.radialSegments, params.heightSegments, params.openEnded, params.thetaStart, params.thetaLength);
		case "dodecahedron": return new DodecahedronGeometry(params.radius, params.detail);
		case "icosahedron": return new IcosahedronGeometry(params.radius, params.detail);
		case "octahedron": return new OctahedronGeometry(params.radius, params.detail);
		case "ring": return new RingGeometry(params.innerRadius, params.outerRadius, params.thetaSegments, params.phiSegments, params.thetaStart, params.thetaLength);
		case "tetrahedron": return new TetrahedronGeometry(params.radius, params.detail);
		case "torus": return new TorusGeometry(params.radius, params.tube, params.radialSegments, params.tubularSegments, params.arc);
		case "torusKnot": return new TorusKnotGeometry(params.radius, params.tube, params.tubularSegments, params.radialSegments, params.p, params.q);
		default: return null;
	}
}

export function updateMeshGeometry(object: Object3D, parameters: MeshGeometryParameters): boolean {
	const meshType = resolveMeshType(object);
	if (!meshType || !(object instanceof Mesh)) {
		return false;
	}
	const normalizedParameters = normalizeGeometryParameters(meshType, parameters);
	const geometry = createGeometry(meshType, normalizedParameters);
	if (!geometry) {
		return false;
	}
	object.geometry.dispose();
	object.geometry = geometry;
	object.userData.geometryParameters = normalizedParameters;
	return true;
}

/**
 * Resolve the mesh type of an object based on its geometry or user data.
 */
export function resolveMeshType(object: Object3D): string | null {
	const meshType = object.userData.meshType as string | undefined;
	if (meshType) {
		return meshType;
	}

	if (object instanceof Mesh) {
		switch (object.geometry?.type) {
			case "BoxGeometry":
			case "BoxBufferGeometry":
				return "cube";
			case "SphereGeometry":
			case "SphereBufferGeometry":
				return "sphere";
			case "PlaneGeometry":
			case "PlaneBufferGeometry":
				return "plane";
			case "CapsuleGeometry":
			case "CapsuleBufferGeometry":
				return "capsule";
			case "CircleGeometry":
			case "CircleBufferGeometry":
				return "circle";
			case "ConeGeometry":
			case "ConeBufferGeometry":
				return "cone";
			case "CylinderGeometry":
			case "CylinderBufferGeometry":
				return "cylinder";
			case "DodecahedronGeometry":
			case "DodecahedronBufferGeometry":
				return "dodecahedron";
			case "IcosahedronGeometry":
			case "IcosahedronBufferGeometry":
				return "icosahedron";
			case "OctahedronGeometry":
			case "OctahedronBufferGeometry":
				return "octahedron";
			case "RingGeometry":
			case "RingBufferGeometry":
				return "ring";
			case "TetrahedronGeometry":
			case "TetrahedronBufferGeometry":
				return "tetrahedron";
			case "TorusGeometry":
			case "TorusBufferGeometry":
				return "torus";
			case "TorusKnotGeometry":
			case "TorusKnotBufferGeometry":
				return "torusKnot";
			default:
				return null;
		}
	}

	return null;
}

/**
 * Create a mesh object of the specified type with the given material.
 */
export function createMeshObject(type: string, material: Material, parameters: MeshGeometryParameters = {}): Mesh {
	const geometry = createGeometry(type, parameters);
	let object: Mesh = null;

	if (geometry) {
		object = new Mesh(geometry, material);
		object.userData.geometryParameters = normalizeGeometryParameters(type, parameters);
	}

	switch (type) {
		case "cube": object.name = "Cube"; break;
		case "sphere": object.name = "Sphere"; break;
		case "plane": object.rotation.x = -Math.PI / 2; object.position.y = -1; object.name = "Plane"; break;
		case "capsule": object.name = "Capsule"; break;
		case "circle": object.name = "Circle"; break;
		case "cone": object.name = "Cone"; break;
		case "cylinder": object.name = "Cylinder"; break;
		case "dodecahedron": object.name = "Dodecahedron"; break;
		case "icosahedron": object.name = "Icosahedron"; break;
		case "octahedron": object.name = "Octahedron"; break;
		case "ring": object.name = "Ring"; break;
		case "tetrahedron": object.name = "Tetrahedron"; break;
		case "torus": object.name = "Torus"; break;
		case "torusKnot": object.name = "Torus Knot"; break;
		default: break;
	}

	return object;
}
