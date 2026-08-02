import type {ObjectInstanceResponse} from "./space-api.js";

const DATABASE_NAME = "dt3d-ha-space-cache";
const DATABASE_VERSION = 1;
const SPACE_STORE = "spaces";
const GEOMETRY_STORE = "geometries";
const SPACE_KEY_INDEX = "spaceKey";
const GEOMETRY_FILE_ID_DATA_KEY = "geometryFileId";

type CachedSpace = {
	key: string;
	cacheVersion: number;
	instances: ObjectInstanceResponse[];
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
	private databasePromise: Promise<IDBDatabase | null> | null = null;
	private readonly namespace: string;

	constructor(namespace: string) {
		this.namespace = namespace;
	}

	public async getSpace(
		spaceId: string,
		cacheVersion: number,
	): Promise<ObjectInstanceResponse[] | null> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return null;
			}

			const transaction = database.transaction(SPACE_STORE, "readonly");
			const done = waitForTransaction(transaction);
			const cached = await getRequestResult<CachedSpace | undefined>(
				transaction.objectStore(SPACE_STORE).get(this.getSpaceKey(spaceId)),
			);
			await done;

			if (!cached || cached.cacheVersion !== cacheVersion) {
				return null;
			}

			return cached.instances;
		} catch (error) {
			console.warn("DT3D: Failed to read the local space cache", error);
			return null;
		}
	}

	public async putSpace(
		spaceId: string,
		cacheVersion: number,
		instances: ObjectInstanceResponse[],
	): Promise<void> {
		try {
			const database = await this.openDatabase();
			if (!database) {
				return;
			}

			const spaceKey = this.getSpaceKey(spaceId);
			const referencedGeometryIds = new Set(
				instances
					.map((instance) => instance.data?.[GEOMETRY_FILE_ID_DATA_KEY])
					.filter(
						(geometryId): geometryId is string =>
							typeof geometryId === "string" && geometryId.length > 0,
					),
			);
			const transaction = database.transaction(
				[SPACE_STORE, GEOMETRY_STORE],
				"readwrite",
			);
			const done = waitForTransaction(transaction);
			transaction.objectStore(SPACE_STORE).put({
				key: spaceKey,
				cacheVersion,
				instances,
			} satisfies CachedSpace);

			const geometryStore = transaction.objectStore(GEOMETRY_STORE);
			const cachedGeometries = await getRequestResult<CachedGeometry[]>(
				geometryStore.index(SPACE_KEY_INDEX).getAll(IDBKeyRange.only(spaceKey)),
			);
			for (const geometry of cachedGeometries) {
				const geometryId = geometry.key.slice(spaceKey.length + 1);
				if (!referencedGeometryIds.has(geometryId)) {
					geometryStore.delete(geometry.key);
				}
			}
			await done;
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
				[SPACE_STORE, GEOMETRY_STORE],
				"readwrite",
			);
			const done = waitForTransaction(transaction);
			transaction.objectStore(SPACE_STORE).delete(spaceKey);

			const geometryStore = transaction.objectStore(GEOMETRY_STORE);
			const cachedGeometries = await getRequestResult<CachedGeometry[]>(
				geometryStore.index(SPACE_KEY_INDEX).getAll(IDBKeyRange.only(spaceKey)),
			);
			for (const geometry of cachedGeometries) {
				geometryStore.delete(geometry.key);
			}
			await done;
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
			transaction.objectStore(SPACE_STORE).delete(this.getSpaceKey(spaceId));
			await done;
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
			const cached = await getRequestResult<CachedGeometry | undefined>(
				transaction
					.objectStore(GEOMETRY_STORE)
					.get(this.getGeometryKey(spaceId, geometryId)),
			);
			await done;
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
		if (this.databasePromise) {
			return this.databasePromise;
		}

		if (typeof indexedDB === "undefined") {
			this.databasePromise = Promise.resolve(null);
			return this.databasePromise;
		}

		this.databasePromise = new Promise<IDBDatabase | null>((resolve) => {
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
					this.databasePromise = null;
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
		});

		return this.databasePromise;
	}
}
