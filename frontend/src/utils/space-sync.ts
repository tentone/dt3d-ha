import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from "three";
import type { SceneManager } from "../scene.js";
import type { DT3DTree } from "../components/object-tree/object-tree.js";
import { createMeshObject } from "../mesh-options.js";
import { DTObject } from "../objects/dt-object.js";
import { WallObject } from "../objects/house/wall.js";
import { DoorObject } from "../objects/house/door.js";
import { WindowObject } from "../objects/house/window.js";
import { EntityObject } from "../objects/entity-object.js";
import {
	SpaceApi,
	type ObjectInstancePayload,
	type ObjectInstanceResponse,
} from "./space-api.js";

type SpaceSyncDependencies = {
	apiClient: SpaceApi;
	sceneManager: SceneManager;
	space: Group;
	tree: DT3DTree;
	resolveMeshType: (object: Object3D) => string | null;
	createEntityObject: (entityId: string) => Object3D | null;
};

/**
 * SpaceSync handles loading spaces and syncing object changes with the API.
 */
export class SpaceSync {
	private apiClient: SpaceApi;
	private sceneManager: SceneManager;
	private space: Group;
	private tree: DT3DTree;
	private resolveMeshType: (object: Object3D) => string | null;
	private createEntityObject: (entityId: string) => Object3D | null;
	private objectApiIds: Map<string, string> = new Map();
	private isSyncingFromApi = false;

	public activeSpaceId: string | null = null;

	constructor({
		apiClient,
		sceneManager,
		space,
		tree,
		resolveMeshType,
		createEntityObject,
	}: SpaceSyncDependencies) {
		this.apiClient = apiClient;
		this.sceneManager = sceneManager;
		this.space = space;
		this.tree = tree;
		this.resolveMeshType = resolveMeshType;
		this.createEntityObject = createEntityObject;
	}

	/**
	 * Clear all objects from the active space and reset API mappings.
	 */
	public clearSpace(): void {
		this.space.clear();
		this.objectApiIds.clear();
	}

	/**
	 * Fetch spaces from the API and load the first available space.
	 * When no spaces exist, a default space is created automatically.
	 */
	public async initializeSpaceFromApi(): Promise<void> {
		this.isSyncingFromApi = true;

		try {
			const spaces = await this.apiClient.listSpaces();
			let space = spaces[0];

			if (!space) {
				space = await this.apiClient.createSpace(
					"Default Space",
					"Auto-created space",
				);
			}

			this.activeSpaceId = space.id;

			const instances = await this.apiClient.listObjects(space.id);

			if (instances.length === 0) {
				this.clearSpace();
				this.sceneManager.createDefaultScene();
				this.tree.updateTreeFromScene(this.space, true);
				this.isSyncingFromApi = false;
				await this.syncAllObjectsToApi();
				return;
			}

			this.loadObjectsFromApi(instances);
			this.tree.updateTreeFromScene(this.space, true);
		} catch (error) {
			console.error("DT3D: Failed to load spaces from API", error);
			this.clearSpace();
			this.sceneManager.createDefaultScene();
			this.tree.updateTreeFromScene(this.space, true);
		} finally {
			this.isSyncingFromApi = false;
		}
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

		for (const instance of instances) {
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
		let object: Object3D | null = null;

		if (instance.type === "mesh") {
			const meshType = data.meshType as string | undefined;
			if (!meshType) {
				return null;
			}

			const color = typeof data.color === "string" ? parseInt(data.color, 16) : 0xffffff;
			if (meshType === "wall") {
				const wallData = data.wall as { length?: number; height?: number; thickness?: number } | undefined;
				object = new WallObject(
					{
						length: wallData?.length,
						height: wallData?.height,
						thickness: wallData?.thickness,
					},
					color,
				);
			} else if (meshType === "door" || meshType === "window") {
				const dims = data.dimensions as { width?: number; height?: number; thickness?: number } | undefined;
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
					windowObj.setOpen(openState);
					object = windowObj;
				}
			} else {
				const material = new MeshStandardMaterial({ color });
				object = createMeshObject(meshType, material);
			}
			if (object) {
				object.userData.meshType = meshType;
			}
		} else if (instance.type === "entity") {
			const entityId = data.entityId as string | undefined;
			if (!entityId) {
				return null;
			}

			object = this.createEntityObject(entityId);
			if (object) {
				object.userData.entityId = entityId;
			}
		} else if (instance.type === "group") {
			object = new Group();
		}

		if (!object) {
			return null;
		}

		object.name = instance.name || object.name;
		this.applyObjectTransform(object, data);

		if (object instanceof DTObject && typeof data.locked === "boolean") {
			object.locked = data.locked;
		}

		return object;
	}

	/**
	 * Build an API payload from a three.js object.
	 */
	public buildObjectPayload(object: Object3D): ObjectInstancePayload | null {
		if (!this.activeSpaceId || !this.shouldPersistObject(object)) {
			return null;
		}

		let type = "group";
		const data: Record<string, any> = {
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

		if (object instanceof EntityObject) {
			type = "entity";
			data.entityId = object.entityId;
		} else if (object instanceof WallObject) {
			type = "mesh";
			data.meshType = "wall";
			data.wall = {
				length: object.length,
				height: object.height,
				thickness: object.thickness,
			};
			const material = object.getWallMaterial();
			if (material?.color?.getHexString) {
				data.color = material.color.getHexString();
			}
		} else if (object instanceof DoorObject) {
			type = "mesh";
			data.meshType = "door";
			data.open = object.open;
			data.dimensions = {
				width: object.width,
				height: object.height,
				thickness: object.thickness,
			};
			const material = object.getDoorMaterial();
			if (material?.color?.getHexString) {
				data.color = material.color.getHexString();
			}
		} else if (object instanceof WindowObject) {
			type = "mesh";
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
		} else {
			const meshType = this.resolveMeshType(object);
			if (meshType) {
				type = "mesh";
				data.meshType = meshType;

				const material = (object as Mesh).material as any;
				if (material?.color?.getHexString) {
					data.color = material.color.getHexString();
				}

				if (object instanceof Mesh && object.geometry instanceof BoxGeometry) {
					const params = object.geometry.parameters as { width?: number; height?: number; depth?: number };
					data.dimensions = {
						width: params?.width,
						height: params?.height,
						depth: params?.depth,
					};
				}
			}
		}

		if (object instanceof DTObject) {
			data.locked = object.locked;
		}

		const parent = object.parent && object.parent !== this.space ? object.parent : null;
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
		if (this.isSyncingFromApi || !this.shouldPersistObject(object)) {
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
		if (!this.activeSpaceId || this.isSyncingFromApi) {
			return;
		}

		if (this.getObjectApiId(object)) {
			await this.syncObjectUpdate(object);
			return;
		}

		const payload = this.buildObjectPayload(object);
		if (!payload) {
			return;
		}

		const response = await this.apiClient.createObject(this.activeSpaceId, payload);
		this.setObjectApiId(object, response.id);
	}

	/**
	 * Update a single object in the API.
	 */
	public async syncObjectUpdate(object: Object3D): Promise<void> {
		if (!this.activeSpaceId || this.isSyncingFromApi) {
			return;
		}

		if (!this.shouldPersistObject(object)) {
			return;
		}

		const objectId = this.getObjectApiId(object);
		if (!objectId) {
			await this.syncObjectCreate(object);
			return;
		}

		const payload = this.buildObjectPayload(object);
		if (!payload) {
			return;
		}

		await this.apiClient.updateObject(this.activeSpaceId, objectId, payload);
	}

	/**
	 * Delete an object in the API and clear all stored mappings.
	 */
	public async syncObjectDelete(object: Object3D): Promise<void> {
		if (!this.activeSpaceId || this.isSyncingFromApi) {
			return;
		}

		const objectId = this.getObjectApiId(object);
		if (!objectId) {
			return;
		}

		await this.apiClient.deleteObject(this.activeSpaceId, objectId);
		this.clearObjectMapping(object);
	}

	public syncAllObjectsToApi(): Promise<void[]> {
		return Promise.all(this.space.children.map((child) => this.syncObjectHierarchyCreate(child)));
	}

	private applyObjectTransform(object: Object3D, data: Record<string, any>): void {
		const position = data.position as { x?: number; y?: number; z?: number } | undefined;
		if (position) {
			object.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
		}

		const rotation = data.rotation as { x?: number; y?: number; z?: number } | undefined;
		if (rotation) {
			object.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
		}

		const scale = data.scale as { x?: number; y?: number; z?: number } | undefined;
		if (scale) {
			object.scale.set(scale.x ?? 1, scale.y ?? 1, scale.z ?? 1);
		}
	}

	private shouldPersistObject(object: Object3D): boolean {
		if (object === this.space) {
			return false;
		}

		if ((object as any).internal === true) {
			return false;
		}

		return object.parent === this.space || this.isDescendant(object, this.space);
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
		delete object.userData.apiId;

		for (const child of object.children) {
			this.clearObjectMapping(child);
		}
	}
}
