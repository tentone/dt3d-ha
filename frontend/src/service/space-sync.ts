import type {Material, Object3D, Texture} from "three";
import {
	BoxGeometry,
	BufferGeometryLoader,
	Group,
	MaterialLoader,
	Mesh,
	MeshStandardMaterial,
	ObjectLoader,
} from "three";

import type {DT3DTree} from "../components/object-tree/object-tree.js";
import {applyTextureToMesh} from "../editor/material-texture.js";
import {
	createMeshObject,
	getMeshGeometryParameters,
} from "../editor/mesh-handler.js";
import type {CameraViewportConfig, SceneManager} from "../editor/scene.js";
import {DTObject} from "../objects/dt-object.js";
import {EntityLight} from "../objects/entity-light.js";
import {EntityObject} from "../objects/entity-object.js";
import {DoorObject} from "../objects/house/door.js";
import {WallObject} from "../objects/house/wall.js";
import {WindowObject} from "../objects/house/window.js";
import {StaticLightObject} from "../objects/static-light.js";
import {ViewportObject} from "../objects/viewport-object.js";
import {
	deserializeGeometryBinary,
	serializeGeometryToBinary,
} from "./geometry-binary.js";
import type {
	ObjectInstancePayload,
	ObjectInstanceResponse,
	SpaceApi,
	SpaceResponse,
} from "./space-api.js";

type SpaceSyncDependencies = {
	apiClient: SpaceApi;
	readOnly?: boolean;
	sceneManager: SceneManager;
	space: Group;
	tree: DT3DTree;
	resolveMeshType: (object: Object3D) => string | null;
	createEntityObject: (entityId: string) => Object3D | null;
};

export type SyncProgressItem = {
	id: string;
	label: string;
	operation: string;
};

export type SyncProgressSnapshot = {
	active: boolean;
	completed: number;
	failed: number;
	items: SyncProgressItem[];
	total: number;
};

const OBJECT_INSTANCE_TYPE_USER_DATA_KEY = "objectInstanceType";
const GEOMETRY_FILE_ID_DATA_KEY = "geometryFileId";
const GEOMETRY_FILE_GEOMETRY_UUID_USER_DATA_KEY = "geometryFileGeometryUuid";

function serializeMaterial(
	material: Material | Material[],
): Record<string, any> | Record<string, any>[] | null {
	try {
		if (Array.isArray(material)) {
			return material.map((item) => item.toJSON() as Record<string, any>);
		}

		return material.toJSON() as Record<string, any>;
	} catch (error) {
		console.warn("DT3D: Failed to serialize mesh material", error);
		return null;
	}
}

function parseSerializedMaterial(data: unknown): Material | null {
	if (!data || typeof data !== "object") {
		return null;
	}

	const materialData = data as Record<string, any>;
	const materialLoader = new MaterialLoader();

	if (
		Array.isArray(materialData.images) &&
		Array.isArray(materialData.textures)
	) {
		const objectLoader = new ObjectLoader();
		let textures: Record<string, Texture> = {};
		const images = objectLoader.parseImages(materialData.images, () => {
			for (const texture of Object.values(textures)) {
				texture.needsUpdate = true;
			}
		});
		textures = objectLoader.parseTextures(materialData.textures, images);
		materialLoader.setTextures(textures);
	}

	return materialLoader.parse(materialData);
}

function deserializeMaterial(
	data: unknown,
	fallbackColor: number,
): Material | Material[] {
	try {
		if (Array.isArray(data)) {
			const materials = data
				.map((item) => parseSerializedMaterial(item))
				.filter(
					(material): material is Material =>
						material instanceof MeshStandardMaterial || Boolean(material),
				);
			if (materials.length > 0) {
				return materials;
			}
		} else if (data && typeof data === "object") {
			const material = parseSerializedMaterial(data);
			if (material) {
				return material;
			}
		}
	} catch (error) {
		console.warn("DT3D: Failed to deserialize mesh material", error);
	}

	return new MeshStandardMaterial({color: fallbackColor});
}

function replaceMeshMaterial(mesh: Mesh, material: Material | Material[]): void {
	const oldMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
	mesh.material = material;
	for (const oldMaterial of oldMaterials) oldMaterial.dispose();
}

function normalizeObjectInstanceType(
	type: string,
): "mesh" | "entity" | "group" | "viewport" | "static-light" | null {
	switch (type.trim().toLowerCase()) {
		case "mesh":
			return "mesh";
		case "entity":
			return "entity";
		case "viewport":
			return "viewport";
		case "static-light":
		case "static_light":
			return "static-light";
		case "group":
		case "3dmodel":
			return "group";
		default:
			return null;
	}
}

function getDeclaredObjectInstanceType(object: Object3D): string | null {
	const type = object.userData[OBJECT_INSTANCE_TYPE_USER_DATA_KEY];
	if (typeof type !== "string") {
		return null;
	}

	const trimmedType = type.trim();
	return trimmedType || null;
}

/**
 * SpaceSync handles loading spaces and syncing object changes with the API.
 */
export class SpaceSync {
	private apiClient: SpaceApi;
	private readOnly: boolean;
	private sceneManager: SceneManager;
	private space: Group;
	private tree: DT3DTree;
	private resolveMeshType: (object: Object3D) => string | null;
	private createEntityObject: (entityId: string) => Object3D | null;
	private objectApiIds: Map<string, string> = new Map();
	private pendingObjectCreates: Map<string, Promise<void>> = new Map();
	private progressCompleted = 0;
	private progressFailed = 0;
	private progressItems: Map<string, SyncProgressItem> = new Map();
	private progressListeners: Set<(progress: SyncProgressSnapshot) => void> =
		new Set();
	private progressResetTimer: number | null = null;
	private progressSequence = 0;
	private progressTotal = 0;
	private isSyncingFromApi = false;

	public activeSpaceId: string | null = null;

	public activeSpace: SpaceResponse | null = null;

	public availableSpaces: SpaceResponse[] = [];

	constructor({
		apiClient,
		readOnly = false,
		sceneManager,
		space,
		tree,
		resolveMeshType,
		createEntityObject,
	}: SpaceSyncDependencies) {
		this.apiClient = apiClient;
		this.readOnly = readOnly;
		this.sceneManager = sceneManager;
		this.space = space;
		this.tree = tree;
		this.resolveMeshType = resolveMeshType;
		this.createEntityObject = createEntityObject;
	}

	public setReadOnly(readOnly: boolean): void {
		this.readOnly = readOnly;
	}

	public addProgressListener(
		listener: (progress: SyncProgressSnapshot) => void,
	): () => void {
		this.progressListeners.add(listener);
		listener(this.getProgressSnapshot());

		return () => {
			this.progressListeners.delete(listener);
		};
	}

	/**
	 * Clear all objects from the active space and reset API mappings.
	 */
	public clearSpace(): void {
		this.space.traverse((child) => {
			if (child instanceof DTObject) {
				child.dispose();
			}
		});
		this.space.clear();
		this.objectApiIds.clear();
		this.pendingObjectCreates.clear();
	}

	/**
	 * Fetch spaces from the API and load the configured space when available.
	 * When no spaces exist, a default space is created automatically.
	 */
	public async initializeSpaceFromApi(
		preferredSpaceId?: string,
	): Promise<SpaceResponse | null> {
		this.isSyncingFromApi = true;

		try {
			const spaces = await this.apiClient.listSpaces();
			this.availableSpaces = spaces;
			let space = preferredSpaceId
				? spaces.find((candidate) => candidate.id === preferredSpaceId)
				: undefined;
			space ??= spaces[0];

			if (!space) {
				if (this.readOnly) {
					this.activeSpaceId = null;
					this.activeSpace = null;
					this.clearSpace();
					this.sceneManager.createDefaultScene();
					this.tree.updateTreeFromScene(this.space, true);
					return null;
				}

				space = await this.apiClient.createSpace(
					"Default Space",
					"Auto-created space",
				);
				this.availableSpaces = [space];
			}

			return await this.loadSpace(space);
		} catch (error) {
			console.error("DT3D: Failed to load spaces from API", error);
			this.availableSpaces = [];
			this.activeSpaceId = null;
			this.activeSpace = null;
			this.clearSpace();
			this.sceneManager.createDefaultScene();
			this.tree.updateTreeFromScene(this.space, true);
			return null;
		} finally {
			this.isSyncingFromApi = false;
		}
	}

	/**
	 * Replace the active editor contents with a different API space.
	 */
	public async loadSpaceFromApi(spaceId: string): Promise<SpaceResponse> {
		const space = this.availableSpaces.find(
			(candidate) => candidate.id === spaceId,
		);
		if (!space) {
			throw new Error(`Space not found: ${spaceId}`);
		}

		this.isSyncingFromApi = true;
		try {
			return await this.loadSpace(space);
		} finally {
			this.isSyncingFromApi = false;
		}
	}

	/**
	 * Create and activate a new space.
	 */
	public async createSpace(
		name: string,
		description: string,
	): Promise<SpaceResponse> {
		const space = await this.apiClient.createSpace(name, description);
		this.availableSpaces = [...this.availableSpaces, space];
		return this.loadSpaceFromApi(space.id);
	}

	/**
	 * Delete a space. When the active space is deleted, activate the next
	 * available space or reset the editor to an unsaved default scene.
	 */
	public async deleteSpace(spaceId: string): Promise<SpaceResponse | null> {
		await this.apiClient.deleteSpace(spaceId);
		this.availableSpaces = this.availableSpaces.filter(
			(space) => space.id !== spaceId,
		);

		if (this.activeSpaceId !== spaceId) {
			return this.activeSpace;
		}

		this.activeSpaceId = null;
		this.activeSpace = null;
		this.clearSpace();

		const nextSpace = this.availableSpaces[0];
		if (nextSpace) {
			return this.loadSpaceFromApi(nextSpace.id);
		}

		this.sceneManager.createDefaultScene();
		this.tree.updateTreeFromScene(this.space, true);
		return null;
	}

	private async loadSpace(space: SpaceResponse): Promise<SpaceResponse> {
		const instances = await this.apiClient.listObjects(space.id);

		this.activeSpaceId = space.id;
		this.activeSpace = space;

		if (instances.length === 0) {
			this.clearSpace();
			this.sceneManager.createDefaultScene();
			this.tree.updateTreeFromScene(this.space, true);
			if (!this.readOnly) {
				this.isSyncingFromApi = false;
				await this.syncAllObjectsToApi();
				this.isSyncingFromApi = true;
			}
			return space;
		}

		this.loadObjectsFromApi(instances);
		this.tree.updateTreeFromScene(this.space, true);
		return space;
	}

	public async updateActiveSpaceConfig(
		config: Record<string, any>,
	): Promise<SpaceResponse | null> {
		if (!this.activeSpaceId || !this.activeSpace) {
			return null;
		}

		const spaceId = this.activeSpaceId;
		const activeSpace = this.activeSpace;
		const updatedSpace = await this.apiClient.updateSpace(spaceId, {
			name: activeSpace.name,
			description: activeSpace.description,
			config,
		});
		if (this.activeSpaceId === spaceId) {
			this.activeSpace = updatedSpace;
		}
		this.availableSpaces = this.availableSpaces.map((space) =>
			space.id === updatedSpace.id ? updatedSpace : space,
		);

		return updatedSpace;
	}

	/**
	 * Load object instances into the space and reconstruct hierarchy.
	 */
	public loadObjectsFromApi(instances: ObjectInstanceResponse[]): void {
		this.clearSpace();

		const objectsById = new Map<string, Object3D>();

		for (const instance of instances) {
			const object = this.createObjectFromInstance(instance);
			if (!object) {
				continue;
			}

			object.userData.apiId = instance.id;
			this.objectApiIds.set(object.uuid, instance.id);
			objectsById.set(instance.id, object);
		}

		const originalOrder = new Map(
			instances.map((instance, index) => [instance.id, index]),
		);
		const orderedInstances = [...instances].sort((left, right) => {
			const leftParent = left.parent_id ?? "";
			const rightParent = right.parent_id ?? "";
			if (leftParent !== rightParent) {
				return leftParent.localeCompare(rightParent);
			}

			const leftOrder = left.data?.sortOrder;
			const rightOrder = right.data?.sortOrder;
			const leftIndex = originalOrder.get(left.id) ?? 0;
			const rightIndex = originalOrder.get(right.id) ?? 0;
			const normalizedLeft =
				typeof leftOrder === "number" && Number.isFinite(leftOrder)
					? leftOrder
					: leftIndex;
			const normalizedRight =
				typeof rightOrder === "number" && Number.isFinite(rightOrder)
					? rightOrder
					: rightIndex;

			return normalizedLeft - normalizedRight || leftIndex - rightIndex;
		});

		for (const instance of orderedInstances) {
			const object = objectsById.get(instance.id);
			if (!object) {
				continue;
			}

			const parentId = instance.parent_id;
			const parent = parentId ? objectsById.get(parentId) : null;
			if (parent) {
				parent.add(object);
			} else {
				this.space.add(object);
			}

			if (object instanceof DTObject) {
				object.init();
			}
		}
	}

	/**
	 * Convert an API object instance into a three.js object.
	 */
	public createObjectFromInstance(
		instance: ObjectInstanceResponse,
	): Object3D | null {
		const data = instance.data ?? {};
		const declaredType = instance.type.trim();
		const instanceType = normalizeObjectInstanceType(instance.type);
		let object: Object3D | null = null;

		if (instanceType === "mesh") {
			const meshType = data.meshType as string | undefined;
			const color =
				typeof data.color === "string" ? parseInt(data.color, 16) : 0xffffff;
			const geometryFileId = data[GEOMETRY_FILE_ID_DATA_KEY] as
				| string
				| undefined;
			if (typeof geometryFileId === "string" && geometryFileId) {
				const material = deserializeMaterial(data.material, color);
				const mesh = new Mesh(new BoxGeometry(1, 1, 1), material);
				mesh.userData[GEOMETRY_FILE_ID_DATA_KEY] = geometryFileId;
				void this.loadMeshGeometryFile(mesh, geometryFileId, instance.name);
				object = mesh;
			} else if (data.geometry && typeof data.geometry === "object") {
				try {
					const geometry = new BufferGeometryLoader().parse(data.geometry);
					const material = deserializeMaterial(data.material, color);
					object = new Mesh(geometry, material);
				} catch (error) {
					console.warn("DT3D: Failed to load persisted mesh geometry", error);
					return null;
				}
			} else if (!meshType) {
				return null;
			} else if (meshType === "wall") {
				const wallData = data.wall as
					| { length?: number; height?: number; thickness?: number }
					| undefined;
				const wall = new WallObject(
					{
						length: wallData?.length,
						height: wallData?.height,
						thickness: wallData?.thickness,
					},
					color,
				);
				replaceMeshMaterial(wall.wallMesh, deserializeMaterial(data.material, color));
				object = wall;
			} else if (meshType === "door" || meshType === "window") {
				const dims = data.dimensions as
					| { width?: number; height?: number; thickness?: number }
					| undefined;
				const openState = data.open === true;
				if (meshType === "door") {
					const door = new DoorObject(
						{
							width: dims?.width,
							height: dims?.height,
							thickness: dims?.thickness,
						},
						color,
					);
					replaceMeshMaterial(door.doorMesh, deserializeMaterial(data.material, color));
					door.setOpen(openState);
					object = door;
				} else {
					const windowObj = new WindowObject(
						{
							width: dims?.width,
							height: dims?.height,
							thickness: dims?.thickness,
						},
						color,
					);
					const windowMesh = windowObj.getObjectByName(
						"Window Panel",
					) as Mesh | null;
					if (windowMesh) replaceMeshMaterial(windowMesh, deserializeMaterial(data.material, color));
					windowObj.setOpen(openState);
					object = windowObj;
				}
			} else {
				const material = deserializeMaterial(data.material, color);
				const geometryParameters = data.geometryParameters as
					| Record<string, number | boolean>
					| undefined;
				object = createMeshObject(meshType, material, geometryParameters);
			}
			if (object && meshType) {
				object.userData.meshType = meshType;
			}
		} else if (instanceType === "entity") {
			const entityId = data.entityId as string | undefined;
			if (!entityId) {
				return null;
			}

			object = this.createEntityObject(entityId);
			if (object) {
				object.userData.entityId = entityId;
				if (object instanceof EntityLight && data.light) {
					object.setLightSettings(data.light);
				}
			}
		} else if (instanceType === "viewport") {
			const viewport = data.viewport as
				| Partial<CameraViewportConfig>
				| undefined;
			object = new ViewportObject(
				viewport,
				instance.name || "Viewport",
				data.defaultViewport === true,
			);
		} else if (instanceType === "static-light") {
			object = new StaticLightObject(data.light ?? {});
		} else if (instanceType === "group" || declaredType) {
			object = new Group();
		}

		if (!object) {
			return null;
		}

		object.name = instance.name || object.name;
		object.userData[OBJECT_INSTANCE_TYPE_USER_DATA_KEY] =
			declaredType || instance.type;
		this.applyObjectTransform(object, data);

		if (object instanceof Mesh && typeof data.textureDataUrl === "string") {
			void applyTextureToMesh(
				object,
				data.textureDataUrl,
				typeof data.textureName === "string" ? data.textureName : "Texture",
			);
		}

		if (object instanceof DTObject && typeof data.locked === "boolean") {
			object.locked = data.locked;
		}

		return object;
	}

	/**
	 * Build an API payload from a three.js object.
	 *
	 * @param object - The three.js object to convert into an API payload.
	 * @returns The API payload representing the object, or null if the object should not be persisted.
	 */
	public async buildObjectPayload(
		object: Object3D,
	): Promise<ObjectInstancePayload | null> {
		if (!this.activeSpaceId || !this.shouldPersistObject(object)) {
			return null;
		}

		const declaredType = getDeclaredObjectInstanceType(object);
		let type = declaredType ?? "group";
		const data: Record<string, any> = {
			sortOrder: object.parent
				? object.parent.children
					.filter((child) => child.internal !== true)
					.indexOf(object)
				: 0,
			position: {
				x: object.position.x,
				y: object.position.y,
				z: object.position.z,
			},
			rotation: {
				x: object.rotation.x,
				y: object.rotation.y,
				z: object.rotation.z,
			},
			scale: {
				x: object.scale.x,
				y: object.scale.y,
				z: object.scale.z,
			},
		};

		if (object instanceof StaticLightObject) {
			type = declaredType ?? "static-light";
			data.light = object.getLightSettings();
		} else if (object instanceof ViewportObject) {
			type = declaredType ?? "viewport";
			data.viewport = object.getViewportConfig();
			data.defaultViewport = object.defaultViewport;
		} else if (object instanceof EntityObject) {
			type = declaredType ?? "entity";
			data.entityId = object.entityId;
			if (object instanceof EntityLight) {
				data.light = object.getLightSettings();
			}
		} else if (object instanceof WallObject) {
			type = declaredType ?? "mesh";
			data.meshType = "wall";
			data.wall = {
				length: object.length,
				height: object.height,
				thickness: object.thickness,
			};
			const material = object.wallMesh.material as any;
			if (material?.color?.getHexString) {
				data.color = material.color.getHexString();
			}
			data.material = serializeMaterial(object.wallMesh.material);
		} else if (object instanceof DoorObject) {
			type = declaredType ?? "mesh";
			data.meshType = "door";
			data.open = object.open;
			data.dimensions = {
				width: object.width,
				height: object.height,
				thickness: object.thickness,
			};
			const material = object.doorMesh.material as any;
			if (material?.color?.getHexString) {
				data.color = material.color.getHexString();
			}
			data.material = serializeMaterial(object.doorMesh.material);
		} else if (object instanceof WindowObject) {
			type = declaredType ?? "mesh";
			data.meshType = "window";
			data.open = object.open;
			data.dimensions = {
				width: object.width,
				height: object.height,
				thickness: object.thickness,
			};
			const material = object.getWindowMaterial();
			if (material?.color?.getHexString) {
				data.color = material.color.getHexString();
			}
			data.material = serializeMaterial(material);
		} else if (object instanceof Mesh) {
			const meshType = this.resolveMeshType(object);
			if (meshType) {
				type = declaredType ?? "mesh";
				data.meshType = meshType;

				const material = (object as Mesh).material as any;
				if (material?.color?.getHexString) {
					data.color = material.color.getHexString();
				}

				if (typeof object.userData.textureDataUrl === "string") {
					data.textureDataUrl = object.userData.textureDataUrl;
					data.textureName = object.userData.textureName;
				}

				data.material = serializeMaterial(object.material);

				if (object instanceof Mesh) {
					const geometryParameters = getMeshGeometryParameters(object);
					if (geometryParameters) {
						data.geometryParameters = geometryParameters;
					}
				}
			} else {
				type = declaredType ?? "mesh";
				const geometryFileId = await this.ensureMeshGeometryFile(object);
				if (!geometryFileId) {
					return null;
				}
				data[GEOMETRY_FILE_ID_DATA_KEY] = geometryFileId;

				const material = serializeMaterial(object.material);
				if (material) {
					data.material = material;
				}

				const materialWithColor = Array.isArray(object.material)
					? object.material[0]
					: object.material;
				if (
					materialWithColor &&
					"color" in materialWithColor &&
					materialWithColor.color?.getHexString
				) {
					data.color = materialWithColor.color.getHexString();
				}
			}
		}

		if (object instanceof DTObject) {
			data.locked = object.locked;
		}

		const parent =
			object.parent && object.parent !== this.space ? object.parent : null;
		const parentId = parent ? this.getObjectApiId(parent) : null;

		return {
			name: object.name || "Object",
			type,
			data,
			parent_id: parentId ?? null,
		};
	}

	/**
	 * Sync a full object subtree to the API (creates/updates as needed).
	 */
	public async syncObjectHierarchyCreate(object: Object3D): Promise<void> {
		if (
			this.readOnly ||
			this.isSyncingFromApi ||
			!this.shouldPersistObject(object)
		) {
			return;
		}

		await this.syncObjectCreate(object);

		for (const child of object.children) {
			await this.syncObjectHierarchyCreate(child);
		}
	}

	/**
	 * Create a single object in the API or update if already present.
	 */
	public async syncObjectCreate(object: Object3D): Promise<void> {
		if (this.readOnly || !this.activeSpaceId || this.isSyncingFromApi) {
			return;
		}

		if (this.getObjectApiId(object)) {
			await this.syncObjectUpdate(object);
			return;
		}

		const pendingCreate = this.pendingObjectCreates.get(object.uuid);
		if (pendingCreate) {
			await pendingCreate;
			return;
		}

		const payload = await this.buildObjectPayload(object);
		if (!payload) {
			return;
		}

		const createPromise = this.trackProgress(
			"Create object",
			this.getObjectLabel(object),
			() =>
				this.apiClient
					.createObject(this.activeSpaceId, payload)
					.then((response) => {
						this.setObjectApiId(object, response.id);
					}),
		);

		this.pendingObjectCreates.set(object.uuid, createPromise);

		try {
			await createPromise;
		} finally {
			if (this.pendingObjectCreates.get(object.uuid) === createPromise) {
				this.pendingObjectCreates.delete(object.uuid);
			}
		}
	}

	/**
	 * Update a single object in the API.
	 */
	public async syncObjectUpdate(object: Object3D): Promise<void> {
		if (this.readOnly || !this.activeSpaceId || this.isSyncingFromApi) {
			return;
		}

		if (!this.shouldPersistObject(object)) {
			return;
		}

		const objectId = this.getObjectApiId(object);
		if (!objectId) {
			await this.syncObjectCreate(object);
			if (this.getObjectApiId(object)) {
				await this.syncObjectUpdate(object);
			}
			return;
		}

		const payload = await this.buildObjectPayload(object);
		if (!payload) {
			return;
		}

		await this.trackProgress("Update object", this.getObjectLabel(object), () =>
			this.apiClient.updateObject(this.activeSpaceId, objectId, payload),
		);
	}

	/**
	 * Delete an object in the API and clear all stored mappings.
	 */
	public async syncObjectDelete(object: Object3D): Promise<void> {
		if (this.readOnly || !this.activeSpaceId || this.isSyncingFromApi) {
			return;
		}

		const objectId = this.getObjectApiId(object);
		if (!objectId) {
			return;
		}

		await this.trackProgress("Delete object", this.getObjectLabel(object), () =>
			this.apiClient.deleteObject(this.activeSpaceId, objectId),
		);
		this.clearObjectMapping(object);
	}

	public syncAllObjectsToApi(): Promise<void[]> {
		if (this.readOnly) {
			return Promise.resolve([]);
		}

		return Promise.all(
			this.space.children.map((child) => this.syncObjectHierarchyCreate(child)),
		);
	}

	private applyObjectTransform(
		object: Object3D,
		data: Record<string, any>,
	): void {
		const position = data.position as
			| { x?: number; y?: number; z?: number }
			| undefined;
		if (position) {
			object.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
		}

		const rotation = data.rotation as
			| { x?: number; y?: number; z?: number }
			| undefined;
		if (rotation) {
			object.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
		}

		const scale = data.scale as
			| { x?: number; y?: number; z?: number }
			| undefined;
		if (scale) {
			object.scale.set(scale.x ?? 1, scale.y ?? 1, scale.z ?? 1);
		}
	}

	private async ensureMeshGeometryFile(object: Mesh): Promise<string | null> {
		if (!this.activeSpaceId) {
			return null;
		}

		const existingGeometryFileId = object.userData[GEOMETRY_FILE_ID_DATA_KEY];
		const uploadedGeometryUuid =
			object.userData[GEOMETRY_FILE_GEOMETRY_UUID_USER_DATA_KEY];
		if (
			typeof existingGeometryFileId === "string" &&
			(!uploadedGeometryUuid || uploadedGeometryUuid === object.geometry.uuid)
		) {
			return existingGeometryFileId;
		}

		const geometryData = serializeGeometryToBinary(object.geometry);
		const response = await this.trackProgress(
			"Upload geometry",
			this.getObjectLabel(object),
			() => this.apiClient.uploadGeometry(this.activeSpaceId, geometryData),
		);
		object.userData[GEOMETRY_FILE_ID_DATA_KEY] = response.id;
		object.userData[GEOMETRY_FILE_GEOMETRY_UUID_USER_DATA_KEY] =
			object.geometry.uuid;

		return response.id;
	}

	private async loadMeshGeometryFile(
		object: Mesh,
		geometryFileId: string,
		label?: string,
	): Promise<void> {
		if (!this.activeSpaceId) {
			return;
		}

		try {
			const geometryData = await this.trackProgress(
				"Load geometry",
				label || this.getObjectLabel(object),
				() => this.apiClient.getGeometry(this.activeSpaceId, geometryFileId),
			);
			const geometry = deserializeGeometryBinary(geometryData);
			if (object.userData[GEOMETRY_FILE_ID_DATA_KEY] !== geometryFileId) {
				geometry.dispose();
				return;
			}

			const placeholderGeometry = object.geometry;
			object.geometry = geometry;
			object.userData[GEOMETRY_FILE_GEOMETRY_UUID_USER_DATA_KEY] =
				geometry.uuid;
			placeholderGeometry.dispose();
			this.tree.refreshSelectedObject();
		} catch (error) {
			console.error("DT3D: Failed to load mesh geometry file", error);
		}
	}

	private async trackProgress<T>(
		operation: string,
		label: string,
		task: () => Promise<T>,
	): Promise<T> {
		const id = `${Date.now()}-${this.progressSequence}`;
		this.progressSequence += 1;
		this.progressTotal += 1;
		if (this.progressResetTimer !== null) {
			window.clearTimeout(this.progressResetTimer);
			this.progressResetTimer = null;
		}
		this.progressItems.set(id, {
			id,
			label,
			operation,
		});
		this.emitProgress();

		try {
			const result = await task();
			this.progressCompleted += 1;
			return result;
		} catch (error) {
			this.progressFailed += 1;
			throw error;
		} finally {
			this.progressItems.delete(id);
			this.emitProgress();
			this.resetProgressIfIdle();
		}
	}

	private getProgressSnapshot(): SyncProgressSnapshot {
		const items = Array.from(this.progressItems.values());

		return {
			active: items.length > 0 || this.progressTotal > 0,
			completed: this.progressCompleted,
			failed: this.progressFailed,
			items,
			total: this.progressTotal,
		};
	}

	private emitProgress(): void {
		const snapshot = this.getProgressSnapshot();
		for (const listener of this.progressListeners) {
			listener(snapshot);
		}
	}

	private resetProgressIfIdle(): void {
		if (this.progressItems.size > 0) {
			return;
		}

		this.progressResetTimer = window.setTimeout(() => {
			if (this.progressItems.size > 0) {
				return;
			}

			this.progressCompleted = 0;
			this.progressFailed = 0;
			this.progressTotal = 0;
			this.progressResetTimer = null;
			this.emitProgress();
		}, 600);
	}

	private getObjectLabel(object: Object3D): string {
		return object.name || object.type || "Object";
	}

	private shouldPersistObject(object: Object3D): boolean {
		if (object === this.space) {
			return false;
		}

		if ((object as any).internal === true) {
			return false;
		}

		return (
			object.parent === this.space || this.isDescendant(object, this.space)
		);
	}

	private isDescendant(object: Object3D, ancestor: Object3D): boolean {
		let current = object.parent;
		while (current) {
			if (current === ancestor) {
				return true;
			}
			current = current.parent;
		}

		return false;
	}

	private getObjectApiId(object: Object3D): string | undefined {
		return this.objectApiIds.get(object.uuid) ?? object.userData.apiId;
	}

	private setObjectApiId(object: Object3D, id: string): void {
		this.objectApiIds.set(object.uuid, id);
		object.userData.apiId = id;
	}

	private clearObjectMapping(object: Object3D): void {
		this.objectApiIds.delete(object.uuid);
		this.pendingObjectCreates.delete(object.uuid);
		delete object.userData.apiId;

		for (const child of object.children) {
			this.clearObjectMapping(child);
		}
	}
}
