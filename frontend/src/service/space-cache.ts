import type {SpaceResponse} from "./space-api.js";

const DATABASE_NAME = "dt3d-ha-space-cache";
const DATABASE_VERSION = 3;
const SPACE_LIST_STORE = "spaceLists";
const SPACE_STORE = "spaces";
const GEOMETRY_STORE = "geometries";
const SPACE_KEY_INDEX = "spaceKey";
const GEOMETRY_FILE_ID_DATA_KEY = "geometryFileId";

type CachedSpaceList = {
	key: string;
	savedAt: number;
	spaces: SpaceResponse[];
};

type CachedSpace = {
	key: string;
	savedAt: number;
	space: SpaceResponse;
};

type CachedGeometry = {
	key: string;
	spaceKey: string;
	data: ArrayBuffer;
};

function getRequestResult<T>(request: IDBRequest<T>): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		transaction.oncomplete = () => resolve();
		transaction.onerror = () => reject(transaction.error);
		transaction.onabort = () => reject(transaction.error);
	});
}

/**
 * Persistent browser cache for the data and binary assets required to render a space. IndexedDB is used because geometry files can be much larger than the synchronous localStorage quota.
 */
export class SpaceDataCache {
	private static databasePromise: Promise<IDBDatabase | null> | null = null;
	private readonly namespace: string;

	constructor(namespace: string) {
		this.namespace = namespace;
	}

	public async getSpaceList(): Promise<SpaceResponse[] | null> {
		try {
			const database = await this.openDatabase();
			if (!database) return null;
			const transaction = database.transaction(SPACE_LIST_STORE, "readonly");
			const done = waitForTransaction(transaction);
			const [cached] = await Promise.all([
				getRequestResult<CachedSpaceList | undefined>(
					transaction.objectStore(SPACE_LIST_STORE).get(this.namespace),
				),
				done,
			]);
			return cached?.spaces ?? null;
		} catch (error) {
			console.warn("DT3D: Failed to read the cached space list", error);
			return null;
		}
	}

	public async putSpaceList(spaces: SpaceResponse[]): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) return;
			const transaction = database.transaction(SPACE_LIST_STORE, "readwrite");
			const done = waitForTransaction(transaction);
			transaction.objectStore(SPACE_LIST_STORE).put({
				key: this.namespace,
				savedAt: Date.now(),
				spaces: spaces.map(
					(space): SpaceResponse => ({...space, object_instances: []}),
				),
			} satisfies CachedSpaceList);
			await done;
		} catch (error) {
			console.warn("DT3D: Failed to cache the space list", error);
		}
	}

	public async invalidateSpaceList(): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) return;
			const transaction = database.transaction(SPACE_LIST_STORE, "readwrite");
			const done = waitForTransaction(transaction);
			// The list is always refreshed by SpaceApi. Keep it available offline even
			// after an edit or a failed request; scene versions are checked separately.
			const store = transaction.objectStore(SPACE_LIST_STORE);
			await Promise.all([
				getRequestResult<CachedSpaceList | undefined>(
					store.get(this.namespace),
				).then((cached) => {
					if (cached) store.put({...cached, savedAt: 0});
				}),
				done,
			]);
		} catch (error) {
			console.warn("DT3D: Failed to invalidate the cached space list", error);
		}
	}

	public async getSpace(spaceId: string): Promise<SpaceResponse | null> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return null;
			}

			const transaction = database.transaction(SPACE_STORE, "readonly");
			const done = waitForTransaction(transaction);
			const [cached] = await Promise.all([
				getRequestResult<CachedSpace | undefined>(
					transaction.objectStore(SPACE_STORE).get(this.getSpaceKey(spaceId)),
				),
				done,
			]);

			// Old records lack configuration and cannot represent a complete scene.
			return cached?.space ?? null;
		} catch (error) {
			console.warn("DT3D: Failed to read the local space cache", error);
			return null;
		}
	}

	public async putSpace(space: SpaceResponse): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return;
			}

			const spaceKey = this.getSpaceKey(space.id);
			const referencedGeometryIds = new Set(
				space.object_instances
					.map((instance) => instance.data?.[GEOMETRY_FILE_ID_DATA_KEY])
					.filter(
						(geometryId): geometryId is string =>
							typeof geometryId === "string" && geometryId.length > 0,
					),
			);
			const transaction = database.transaction(
				[SPACE_LIST_STORE, SPACE_STORE, GEOMETRY_STORE],
				"readwrite",
			);
			const done = waitForTransaction(transaction);
			const spaceStore = transaction.objectStore(SPACE_STORE);
			const listStore = transaction.objectStore(SPACE_LIST_STORE);
			const geometryStore = transaction.objectStore(GEOMETRY_STORE);
			await Promise.all([
				Promise.all([
					getRequestResult<CachedSpace | undefined>(spaceStore.get(spaceKey)),
					getRequestResult<CachedSpaceList | undefined>(
						listStore.get(this.namespace),
					),
					// Prune keys without reading potentially large geometry buffers.
					getRequestResult(
						geometryStore
							.index(SPACE_KEY_INDEX)
							.getAllKeys(IDBKeyRange.only(spaceKey)),
					),
				]).then(([previous, list, keys]) => {
					// A delayed response (including another tab) must not roll the cache back.
					if (previous?.space?.cache_version > space.cache_version) return;
					spaceStore.put({
						key: spaceKey,
						savedAt: Date.now(),
						space,
					} satisfies CachedSpace);
					const metadata = {...space, object_instances: []} as SpaceResponse;
					const spaces = list?.spaces ?? [];
					const index = spaces.findIndex(
						(candidate) => candidate.id === space.id,
					);
					if (index < 0) spaces.push(metadata);
					else spaces[index] = metadata;
					listStore.put({
						key: this.namespace,
						savedAt: Date.now(),
						spaces,
					} satisfies CachedSpaceList);
					for (const key of keys) {
						if (
							typeof key === "string" &&
							!referencedGeometryIds.has(key.slice(spaceKey.length + 1))
						) {
							geometryStore.delete(key);
						}
					}
				}),
				done,
			]);
		} catch (error) {
			console.warn("DT3D: Failed to update the local space cache", error);
		}
	}

	public async deleteSpace(spaceId: string): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return;
			}

			const spaceKey = this.getSpaceKey(spaceId);
			const transaction = database.transaction(
				[SPACE_LIST_STORE, SPACE_STORE, GEOMETRY_STORE],
				"readwrite",
			);
			const done = waitForTransaction(transaction);
			transaction.objectStore(SPACE_STORE).delete(spaceKey);

			const listStore = transaction.objectStore(SPACE_LIST_STORE);
			const geometryStore = transaction.objectStore(GEOMETRY_STORE);
			await Promise.all([
				getRequestResult<CachedSpaceList | undefined>(
					listStore.get(this.namespace),
				).then((list) => {
					if (list)
						listStore.put({
							...list,
							spaces: list.spaces.filter((space) => space.id !== spaceId),
						});
				}),
				getRequestResult(
					geometryStore
						.index(SPACE_KEY_INDEX)
						.getAllKeys(IDBKeyRange.only(spaceKey)),
				).then((keys) => {
					for (const key of keys) geometryStore.delete(key);
				}),
				done,
			]);
		} catch (error) {
			console.warn("DT3D: Failed to delete the local space cache", error);
		}
	}

	public async invalidateSpace(spaceId: string): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return;
			}

			const transaction = database.transaction(SPACE_STORE, "readwrite");
			const done = waitForTransaction(transaction);
			const store = transaction.objectStore(SPACE_STORE);
			await Promise.all([
				getRequestResult<CachedSpace | undefined>(
					store.get(this.getSpaceKey(spaceId)),
				).then((cached) => {
					if (cached?.space) {
						// Retain the last scene for immediate display, but require validation.
						delete cached.space.cache_version;
						store.put(cached);
					}
				}),
				done,
			]);
		} catch (error) {
			console.warn("DT3D: Failed to invalidate the local space cache", error);
		}
	}

	public async getGeometry(
		spaceId: string,
		geometryId: string,
	): Promise<ArrayBuffer | null> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return null;
			}

			const transaction = database.transaction(GEOMETRY_STORE, "readonly");
			const done = waitForTransaction(transaction);
			const [cached] = await Promise.all([
				getRequestResult<CachedGeometry | undefined>(
					transaction
						.objectStore(GEOMETRY_STORE)
						.get(this.getGeometryKey(spaceId, geometryId)),
				),
				done,
			]);
			return cached?.data ?? null;
		} catch (error) {
			console.warn("DT3D: Failed to read cached geometry", error);
			return null;
		}
	}

	public async putGeometry(
		spaceId: string,
		geometryId: string,
		data: ArrayBuffer,
	): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return;
			}

			const transaction = database.transaction(GEOMETRY_STORE, "readwrite");
			const done = waitForTransaction(transaction);
			transaction.objectStore(GEOMETRY_STORE).put({
				key: this.getGeometryKey(spaceId, geometryId),
				spaceKey: this.getSpaceKey(spaceId),
				data,
			} satisfies CachedGeometry);
			await done;
		} catch (error) {
			console.warn("DT3D: Failed to cache geometry", error);
		}
	}

	public async deleteGeometry(
		spaceId: string,
		geometryId: string,
	): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return;
			}

			const transaction = database.transaction(GEOMETRY_STORE, "readwrite");
			const done = waitForTransaction(transaction);
			transaction
				.objectStore(GEOMETRY_STORE)
				.delete(this.getGeometryKey(spaceId, geometryId));
			await done;
		} catch (error) {
			console.warn("DT3D: Failed to delete cached geometry", error);
		}
	}

	private getSpaceKey(spaceId: string): string {
		return `${this.namespace}:${spaceId}`;
	}

	private getGeometryKey(spaceId: string, geometryId: string): string {
		return `${this.getSpaceKey(spaceId)}:${geometryId}`;
	}

	private openDatabase(): Promise<IDBDatabase | null> {
		if (SpaceDataCache.databasePromise) {
			return SpaceDataCache.databasePromise;
		}

		if (typeof indexedDB === "undefined") {
			return Promise.resolve(null);
		}

		SpaceDataCache.databasePromise = new Promise<IDBDatabase | null>(
			(resolve) => {
				const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
				let settled = false;
				const resolveOnce = (database: IDBDatabase | null) => {
					if (settled) {
						database?.close();
						return;
					}
					settled = true;
					resolve(database);
				};
				request.onupgradeneeded = () => {
					const database = request.result;
					if (!database.objectStoreNames.contains(SPACE_LIST_STORE)) {
						database.createObjectStore(SPACE_LIST_STORE, {keyPath: "key"});
					}
					if (!database.objectStoreNames.contains(SPACE_STORE)) {
						database.createObjectStore(SPACE_STORE, {keyPath: "key"});
					}
					if (!database.objectStoreNames.contains(GEOMETRY_STORE)) {
						const store = database.createObjectStore(GEOMETRY_STORE, {
							keyPath: "key",
						});
						store.createIndex(SPACE_KEY_INDEX, "spaceKey");
					}
				};
				request.onsuccess = () => {
					const database = request.result;
					database.onversionchange = () => {
						database.close();
						SpaceDataCache.databasePromise = null;
					};
					resolveOnce(database);
				};
				request.onerror = () => {
					console.warn("DT3D: Local space cache is unavailable", request.error);
					resolveOnce(null);
				};
				request.onblocked = () => {
					console.warn("DT3D: Local space cache upgrade is blocked");
					resolveOnce(null);
				};
			},
		);

		return SpaceDataCache.databasePromise;
	}
}
