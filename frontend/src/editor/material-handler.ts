import type {Material, Object3D} from "three";
import {
	AdditiveBlending,
	AlwaysDepth,
	BackSide,
	BasicDepthPacking,
	DoubleSide,
	EqualDepth,
	FrontSide,
	GreaterDepth,
	GreaterEqualDepth,
	LessDepth,
	LessEqualDepth,
	Line,
	LineBasicMaterial,
	LineDashedMaterial,
	Mesh,
	MeshBasicMaterial,
	MeshDepthMaterial,
	MeshLambertMaterial,
	MeshMatcapMaterial,
	MeshNormalMaterial,
	MeshPhongMaterial,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	MeshToonMaterial,
	MultiplyBlending,
	NeverDepth,
	NoBlending,
	NormalBlending,
	NotEqualDepth,
	Points,
	PointsMaterial,
	RGBADepthPacking,
	Sprite,
	SpriteMaterial,
	SubtractiveBlending,
} from "three";

export type MaterialObject = Object3D & { material: Material | Material[] };

export type MaterialPropertyDefinition = {
	property: string;
	label: string;
	type: "string" | "number" | "boolean" | "color" | "select";
	step?: number;
	min?: number;
	max?: number;
	options?: Array<{ label: string; value: string | number | boolean }>;
};

type MaterialConstructor = new () => Material;

const MATERIAL_CONSTRUCTORS: Record<string, MaterialConstructor> = {
	LineBasicMaterial,
	LineDashedMaterial,
	MeshBasicMaterial,
	MeshDepthMaterial,
	MeshLambertMaterial,
	MeshMatcapMaterial,
	MeshNormalMaterial,
	MeshPhongMaterial,
	MeshPhysicalMaterial,
	MeshStandardMaterial,
	MeshToonMaterial,
	PointsMaterial,
	SpriteMaterial,
};

const MESH_MATERIAL_TYPES = [
	"MeshBasicMaterial",
	"MeshLambertMaterial",
	"MeshPhongMaterial",
	"MeshToonMaterial",
	"MeshStandardMaterial",
	"MeshPhysicalMaterial",
	"MeshNormalMaterial",
	"MeshMatcapMaterial",
	"MeshDepthMaterial",
];

const LINE_MATERIAL_TYPES = ["LineBasicMaterial", "LineDashedMaterial"];

const TRANSFERABLE_PROPERTIES = [
	"name",
	"blending",
	"side",
	"vertexColors",
	"opacity",
	"transparent",
	"alphaHash",
	"alphaTest",
	"depthFunc",
	"depthTest",
	"depthWrite",
	"colorWrite",
	"stencilWrite",
	"stencilWriteMask",
	"stencilFunc",
	"stencilRef",
	"stencilFuncMask",
	"stencilFail",
	"stencilZFail",
	"stencilZPass",
	"polygonOffset",
	"polygonOffsetFactor",
	"polygonOffsetUnits",
	"dithering",
	"alphaToCoverage",
	"premultipliedAlpha",
	"forceSinglePass",
	"visible",
	"toneMapped",
	"fog",
	"color",
	"map",
	"lightMap",
	"lightMapIntensity",
	"aoMap",
	"aoMapIntensity",
	"emissive",
	"emissiveIntensity",
	"emissiveMap",
	"bumpMap",
	"bumpScale",
	"normalMap",
	"normalMapType",
	"normalScale",
	"displacementMap",
	"displacementScale",
	"displacementBias",
	"roughness",
	"roughnessMap",
	"metalness",
	"metalnessMap",
	"alphaMap",
	"envMap",
	"envMapRotation",
	"envMapIntensity",
	"wireframe",
	"wireframeLinewidth",
	"flatShading",
	"specular",
	"specularMap",
	"shininess",
	"reflectivity",
	"refractionRatio",
	"clearcoat",
	"clearcoatMap",
	"clearcoatRoughness",
	"clearcoatRoughnessMap",
	"clearcoatNormalMap",
	"clearcoatNormalScale",
	"ior",
	"sheen",
	"sheenColor",
	"sheenColorMap",
	"sheenRoughness",
	"sheenRoughnessMap",
	"transmission",
	"transmissionMap",
	"thickness",
	"thicknessMap",
	"attenuationDistance",
	"attenuationColor",
	"specularIntensity",
	"specularIntensityMap",
	"specularColor",
	"specularColorMap",
	"iridescence",
	"iridescenceMap",
	"iridescenceIOR",
	"iridescenceThicknessRange",
	"iridescenceThicknessMap",
	"anisotropy",
	"anisotropyRotation",
	"anisotropyMap",
	"matcap",
	"gradientMap",
	"linewidth",
	"linecap",
	"linejoin",
	"scale",
	"dashSize",
	"gapSize",
	"size",
	"sizeAttenuation",
	"rotation",
	"depthPacking",
] as const;

const COMMON_PROPERTY_DEFINITIONS: MaterialPropertyDefinition[] = [
	{property: "name", label: "materialName", type: "string"},
	{property: "color", label: "materialColor", type: "color"},
	{property: "emissive", label: "materialEmissive", type: "color"},
	{
		property: "emissiveIntensity",
		label: "materialEmissiveIntensity",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{property: "specular", label: "materialSpecular", type: "color"},
	{property: "specularColor", label: "materialSpecularColor", type: "color"},
	{
		property: "shininess",
		label: "materialShininess",
		type: "number",
		min: 0,
		step: 0.1,
	},
	{
		property: "roughness",
		label: "materialRoughness",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "metalness",
		label: "materialMetalness",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "bumpScale",
		label: "materialBumpScale",
		type: "number",
		step: 0.01,
	},
	{
		property: "displacementScale",
		label: "materialDisplacementScale",
		type: "number",
		step: 0.01,
	},
	{
		property: "displacementBias",
		label: "materialDisplacementBias",
		type: "number",
		step: 0.01,
	},
	{
		property: "lightMapIntensity",
		label: "materialLightMapIntensity",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "aoMapIntensity",
		label: "materialAoMapIntensity",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "envMapIntensity",
		label: "materialEnvMapIntensity",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "reflectivity",
		label: "materialReflectivity",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "refractionRatio",
		label: "materialRefractionRatio",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "clearcoat",
		label: "materialClearcoat",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "clearcoatRoughness",
		label: "materialClearcoatRoughness",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "ior",
		label: "materialIor",
		type: "number",
		min: 1,
		max: 2.333,
		step: 0.01,
	},
	{
		property: "sheen",
		label: "materialSheen",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{property: "sheenColor", label: "materialSheenColor", type: "color"},
	{
		property: "sheenRoughness",
		label: "materialSheenRoughness",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "transmission",
		label: "materialTransmission",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "thickness",
		label: "materialThickness",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "attenuationDistance",
		label: "materialAttenuationDistance",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "attenuationColor",
		label: "materialAttenuationColor",
		type: "color",
	},
	{
		property: "specularIntensity",
		label: "materialSpecularIntensity",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "iridescence",
		label: "materialIridescence",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "iridescenceIOR",
		label: "materialIridescenceIor",
		type: "number",
		min: 1,
		max: 2.333,
		step: 0.01,
	},
	{
		property: "anisotropy",
		label: "materialAnisotropy",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "anisotropyRotation",
		label: "materialAnisotropyRotation",
		type: "number",
		step: 0.01,
	},
	{property: "wireframe", label: "materialWireframe", type: "boolean"},
	{
		property: "wireframeLinewidth",
		label: "materialWireframeLinewidth",
		type: "number",
		min: 0,
		step: 0.1,
	},
	{property: "flatShading", label: "materialFlatShading", type: "boolean"},
	{
		property: "linewidth",
		label: "materialLinewidth",
		type: "number",
		min: 0,
		step: 0.1,
	},
	{
		property: "dashSize",
		label: "materialDashSize",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "gapSize",
		label: "materialGapSize",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "scale",
		label: "materialDashScale",
		type: "number",
		min: 0,
		step: 0.01,
	},
	{
		property: "size",
		label: "materialPointSize",
		type: "number",
		min: 0,
		step: 0.1,
	},
	{
		property: "sizeAttenuation",
		label: "materialSizeAttenuation",
		type: "boolean",
	},
	{
		property: "rotation",
		label: "materialRotation",
		type: "number",
		step: 0.01,
	},
	{
		property: "opacity",
		label: "materialOpacity",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{property: "transparent", label: "materialTransparent", type: "boolean"},
	{property: "alphaHash", label: "materialAlphaHash", type: "boolean"},
	{
		property: "alphaTest",
		label: "materialAlphaTest",
		type: "number",
		min: 0,
		max: 1,
		step: 0.01,
	},
	{
		property: "side",
		label: "materialSide",
		type: "select",
		options: [
			{label: "Front", value: FrontSide},
			{label: "Back", value: BackSide},
			{label: "Double", value: DoubleSide},
		],
	},
	{
		property: "blending",
		label: "materialBlending",
		type: "select",
		options: [
			{label: "None", value: NoBlending},
			{label: "Normal", value: NormalBlending},
			{label: "Additive", value: AdditiveBlending},
			{label: "Subtractive", value: SubtractiveBlending},
			{label: "Multiply", value: MultiplyBlending},
		],
	},
	{
		property: "depthFunc",
		label: "materialDepthFunction",
		type: "select",
		options: [
			{label: "Never", value: NeverDepth},
			{label: "Always", value: AlwaysDepth},
			{label: "Less", value: LessDepth},
			{label: "Less or equal", value: LessEqualDepth},
			{label: "Equal", value: EqualDepth},
			{label: "Greater or equal", value: GreaterEqualDepth},
			{label: "Greater", value: GreaterDepth},
			{label: "Not equal", value: NotEqualDepth},
		],
	},
	{
		property: "depthPacking",
		label: "materialDepthPacking",
		type: "select",
		options: [
			{label: "Basic", value: BasicDepthPacking},
			{label: "RGBA", value: RGBADepthPacking},
		],
	},
	{property: "depthTest", label: "materialDepthTest", type: "boolean"},
	{property: "depthWrite", label: "materialDepthWrite", type: "boolean"},
	{property: "colorWrite", label: "materialColorWrite", type: "boolean"},
	{property: "vertexColors", label: "materialVertexColors", type: "boolean"},
	{property: "fog", label: "materialFog", type: "boolean"},
	{property: "toneMapped", label: "materialToneMapped", type: "boolean"},
	{property: "dithering", label: "materialDithering", type: "boolean"},
	{
		property: "premultipliedAlpha",
		label: "materialPremultipliedAlpha",
		type: "boolean",
	},
	{
		property: "forceSinglePass",
		label: "materialForceSinglePass",
		type: "boolean",
	},
	{
		property: "polygonOffset",
		label: "materialPolygonOffset",
		type: "boolean",
	},
	{
		property: "polygonOffsetFactor",
		label: "materialPolygonOffsetFactor",
		type: "number",
		step: 0.1,
	},
	{
		property: "polygonOffsetUnits",
		label: "materialPolygonOffsetUnits",
		type: "number",
		step: 0.1,
	},
	{property: "visible", label: "materialVisible", type: "boolean"},
];

export function findMaterialObject(
	object: Object3D | null,
): MaterialObject | null {
	if (!object) return null;
	if (hasMaterial(object)) return object;

	let result: MaterialObject | null = null;
	object.traverse((child) => {
		if (!result && !isInternalDescendant(child, object) && hasMaterial(child)) {
			result = child;
		}
	});
	return result;
}

function isInternalDescendant(child: Object3D, root: Object3D): boolean {
	let current: Object3D | null = child;
	while (current && current !== root) {
		if (current.internal === true) return true;
		current = current.parent;
	}
	return false;
}

function hasMaterial(object: Object3D): object is MaterialObject {
	if (!("material" in object)) return false;
	const material = (object as MaterialObject).material;
	return Array.isArray(material)
		? material.length > 0 && material.every((item) => item?.isMaterial)
		: Boolean(material?.isMaterial);
}

export function getMaterials(object: MaterialObject): Material[] {
	return Array.isArray(object.material) ? object.material : [object.material];
}

export function getPrimaryMaterial(object: MaterialObject): Material | null {
	return getMaterials(object)[0] ?? null;
}

export function getCompatibleMaterialTypes(object: MaterialObject): string[] {
	const currentType = getPrimaryMaterial(object)?.type;
	let supportedTypes: string[] = [];
	if (object instanceof Mesh) supportedTypes = MESH_MATERIAL_TYPES;
	else if (object instanceof Line) supportedTypes = LINE_MATERIAL_TYPES;
	else if (object instanceof Points) supportedTypes = ["PointsMaterial"];
	else if (object instanceof Sprite) supportedTypes = ["SpriteMaterial"];
	else if (currentType && MATERIAL_CONSTRUCTORS[currentType])
		supportedTypes = [currentType];

	return currentType
		? [...new Set([currentType, ...supportedTypes])]
		: supportedTypes;
}

export function getMaterialPropertyDefinitions(
	material: Material,
): MaterialPropertyDefinition[] {
	return COMMON_PROPERTY_DEFINITIONS.filter(
		(definition) => definition.property in material,
	);
}

function cloneMaterialProperty(value: unknown): unknown {
	if (
		value &&
		typeof value === "object" &&
		"clone" in value &&
		typeof (value as { clone?: unknown }).clone === "function"
	) {
		return (value as { clone: () => unknown }).clone();
	}
	if (Array.isArray(value)) return [...value];
	return value;
}

function createCompatibleMaterial(
	type: string,
	source: Material,
): Material | null {
	const Constructor = MATERIAL_CONSTRUCTORS[type];
	if (!Constructor) return null;

	const material = new Constructor();
	const sourceData = source as unknown as Record<string, unknown>;
	const targetData = material as unknown as Record<string, unknown>;
	for (const property of TRANSFERABLE_PROPERTIES) {
		if (property in sourceData && property in targetData) {
			targetData[property] = cloneMaterialProperty(sourceData[property]);
		}
	}
	material.userData = {...source.userData};
	material.needsUpdate = true;
	return material;
}

export function changeMaterialType(
	object: MaterialObject,
	type: string,
): boolean {
	if (!getCompatibleMaterialTypes(object).includes(type)) return false;

	const oldMaterials = getMaterials(object);
	const newMaterials = oldMaterials.map((material) =>
		createCompatibleMaterial(type, material),
	);
	if (newMaterials.some((material) => !material)) return false;

	object.material = Array.isArray(object.material)
		? (newMaterials as Material[])
		: newMaterials[0]!;

	if (
		type === "LineDashedMaterial" &&
		"computeLineDistances" in object &&
		(object as Line).geometry.getAttribute("position")
	) {
		(object as Line).computeLineDistances();
	}
	for (const material of oldMaterials) material.dispose();
	return true;
}

export function setMaterialProperty(
	object: MaterialObject,
	property: string,
	value: unknown,
): boolean {
	let changed = false;
	for (const material of getMaterials(object)) {
		const data = material as unknown as Record<string, any>;
		if (!(property in data)) continue;

		const current = data[property];
		if (current?.isColor) {
			if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value))
				continue;
			current.set(value);
		} else if (typeof current === "number") {
			const numericValue = Number(value);
			if (!Number.isFinite(numericValue)) continue;
			data[property] = numericValue;
		} else if (typeof current === "boolean") {
			data[property] = Boolean(value);
		} else if (typeof current === "string") {
			data[property] = String(value);
		} else {
			continue;
		}
		material.needsUpdate = true;
		changed = true;
	}
	return changed;
}
