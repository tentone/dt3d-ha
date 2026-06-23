import type {Material, Object3D, Texture} from "three";
import {Mesh, MeshStandardMaterial, TextureLoader} from "three";

export type TexturedMaterialData = {
	textureDataUrl?: string;
	textureName?: string;
};

const imageFilePattern = /^image\//;

export function isImageFile(file: File): boolean {
	return imageFilePattern.test(file.type);
}

export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.addEventListener("load", () => {
			if (typeof reader.result === "string") {
				resolve(reader.result);
			} else {
				reject(new Error("Unable to read image file."));
			}
		});
		reader.addEventListener("error", () => reject(reader.error ?? new Error("Unable to read image file.")));
		reader.readAsDataURL(file);
	});
}

export function loadTexture(dataUrl: string): Promise<Texture> {
	return new Promise((resolve, reject) => {
		new TextureLoader().load(dataUrl, resolve, undefined, reject);
	});
}

function disposeMaterialMap(material: Material): void {
	const map = (material as any).map as Texture | null | undefined;
	if (map) {
		map.dispose();
	}
}

export async function applyImageTextureToMesh(mesh: Mesh, file: File): Promise<void> {
	if (!isImageFile(file)) {
		throw new Error("Only image files can be used as mesh textures.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	await applyTextureDataUrlToMesh(mesh, dataUrl, file.name);
}

export async function applyTextureDataUrlToMesh(mesh: Mesh, dataUrl: string, textureName = "Texture"): Promise<void> {
	const texture = await loadTexture(dataUrl);
	texture.colorSpace = "srgb";
	texture.needsUpdate = true;

	const existingMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
	if (existingMaterial) {
		disposeMaterialMap(existingMaterial);
	}

	const material = new MeshStandardMaterial({
		color: existingMaterial && "color" in existingMaterial ? (existingMaterial as any).color.clone() : 0xffffff,
		map: texture,
	});

	mesh.material = material;
	mesh.userData.textureDataUrl = dataUrl;
	mesh.userData.textureName = textureName;
}

export function clearMeshTexture(mesh: Mesh): void {
	const existingMaterial = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
	if (existingMaterial) {
		disposeMaterialMap(existingMaterial);
	}

	const color = existingMaterial && "color" in existingMaterial ? (existingMaterial as any).color.clone() : 0xffffff;
	mesh.material = new MeshStandardMaterial({color});
	delete mesh.userData.textureDataUrl;
	delete mesh.userData.textureName;
}

export function findMesh(object: Object3D | null): Mesh | null {
	if (!object) {
		return null;
	}
	if (object instanceof Mesh) {
		return object;
	}
	let mesh: Mesh | null = null;
	object.traverse((child) => {
		if (!mesh && child instanceof Mesh) {
			mesh = child;
		}
	});
	return mesh;
}
