import {SpaceDataCache} from "./space-cache.js";

export type SpaceResponse = {
	id: string;
	cache_version?: number;
	name: string;
	description: string;
	is_default: boolean;
	config: Record<string, any> | null;
	created_at: number;
	updated_at: number;
	object_instances: ObjectInstanceResponse[];
};

export type SpacePayload = {
	name: string;
	description: string;
	is_default: boolean;
	config?: Record<string, any> | null;
};

export type ObjectInstanceResponse = {
	id: string;
	space_id: string;
	parent_id: string | null;
	name: string;
	type: string;
	data: Record<string, any> | null;
	created_at: number;
	updated_at: number;
};

export type ObjectInstancePayload = {
	/**
	 * The name of the object instance.
	 */
	name: string;

	/**
	 * The type of the object instance. This should correspond to a registered object type in the system.
	 */
	type: string;

	/**
	 * The data associated with the object instance. This can include properties like dimensions, color, and any other relevant information.
	 */
	data: Record<string, any>;

	/**
	 * The ID of the parent object instance, if this object is a child of another object. If the object has no parent, this should be null.
	 */
	parent_id: string | null;
};

export type GeometryFileResponse = {
	id: string;
	size: number;
};

/**
 * Header key used to pass the service key to the backend API for authentication and authorization purposes.
 */
export const SERVICE_KEY_HEADER = "X-DT3D-Service-Key";

/**
 * Build the base URL for the backend API given an address and port.
 *
 * @param address - The address of the backend server (e.g., "localhost" or "example.com")
 * @param port - The port number of the backend server (e.g., 8080)
 * @returns The full base URL for the backend API (e.g., "http://localhost:8080/api")
 */
export function buildBackendApiUrl(address: string, port: number): string {
	const normalizedAddress = /^https?:\/\//i.test(address)
		? address
		: `http://${address}`;
	return `${normalizedAddress.replace(/\/+$/, "")}:${port}/api`;
}

/**
 * SpaceApi wraps HTTP calls to the backend space endpoints.
 *
 * It centralizes request configuration and response typing.
 */
export class SpaceApi {
	private static sharedCaches = new Map<
		string,
		{
			revision: number;
			invalidation: Promise<void>;
			pending: Map<string, Promise<unknown>>;
		}
	>();
	private baseUrl: string;
	private cacheNamespace: string;
	private serviceKey: string;
	private cache: SpaceDataCache;

	/**
	 * Constructor for space API.
	 *
	 * @param address - The address of the backend server
	 * @param port - The port of the backend server
	 * @param serviceKey - The key required by the backend service
	 */
	constructor(address: string, port: number, serviceKey = "") {
		this.baseUrl = buildBackendApiUrl(address, port);
		this.serviceKey = serviceKey;
		this.cacheNamespace = this.buildCacheNamespace();
		this.cache = new SpaceDataCache(this.cacheNamespace);
	}

	/**
	 * Get a stable, credential-safe namespace for browser-cached API data.
	 */
	public getCacheNamespace(): string {
		return this.cacheNamespace;
	}

	/**
	 * Get lightweight metadata for all spaces from the backend. Object instances are loaded on demand for the selected space.
	 */
	public async listSpaces(
		useCache = true,
		onRefresh?: (spaces: SpaceResponse[]) => void,
	): Promise<SpaceResponse[]> {
		await this.getSharedCache().invalidation;
		const cached = useCache ? await this.cache.getSpaceList() : null;
		const refresh = this.readCached(
			"list",
			async (): Promise<SpaceResponse[] | null> => null,
			() => this.fetchJson<SpaceResponse[]>("/spaces?include_objects=false"),
			(spaces) => this.cache.putSpaceList(spaces),
			() => this.cache.invalidateSpaceList(),
		);
		if (cached !== null) {
			void refresh.then(onRefresh).catch((error) => {
				console.warn(
					"DT3D: Using the cached space list; refresh failed",
					error,
				);
			});
			return cached;
		}
		return refresh;
	}

	/** Read the last complete scene, including configuration and every object attribute. */
	public async getCachedSpace(spaceId: string): Promise<SpaceResponse | null> {
		await this.getSharedCache().invalidation;
		return this.cache.getSpace(spaceId);
	}

	/** Always check the server; HTTP caches must not hide a changed scene. */
	public getSpaceVersion(
		spaceId: string,
	): Promise<{id: string; cache_version: number}> {
		return this.fetchJson(`/spaces/${spaceId}/version`);
	}

	/** Reuse a validated snapshot or fetch one coherent version of the entire scene. */
	public loadSpaceState(spaceId: string): Promise<SpaceResponse> {
		return this.readCached(
			`state:${spaceId}`,
			async () => {
				const [cached, version] = await Promise.all([
					this.cache.getSpace(spaceId),
					this.getSpaceVersion(spaceId),
				]);
				return cached &&
					Number.isSafeInteger(version.cache_version) &&
					version.cache_version >= 1 &&
					cached.cache_version === version.cache_version
					? cached
					: null;
			},
			() => this.fetchJson<SpaceResponse>(`/spaces/${spaceId}`),
			(space) => this.cacheSpaceSnapshot(space),
			() => this.cache.invalidateSpace(spaceId),
		);
	}

	/** Fetch and cache the complete current scene (also used by archive exports). */
	public getSpace(spaceId: string): Promise<SpaceResponse> {
		return this.readCached(
			`space:${spaceId}`,
			async (): Promise<SpaceResponse | null> => null,
			() => this.fetchJson<SpaceResponse>(`/spaces/${spaceId}`),
			(space) => this.cacheSpaceSnapshot(space),
			() => this.cache.invalidateSpace(spaceId),
		);
	}

	/**
	 * Create a new space with the provided name/description.
	 */
	public createSpace(
		name: string,
		description: string,
		config: Record<string, any> | null = null,
		isDefault = false,
	): Promise<SpaceResponse> {
		return this.fetchJson<SpaceResponse>("/spaces", {
			method: "POST",
			body: JSON.stringify({
				name,
				description,
				is_default: isDefault,
				config,
			}),
		});
	}

	/**
	 * Clone a space, including its configuration and object hierarchy.
	 */
	public cloneSpace(spaceId: string, name: string): Promise<SpaceResponse> {
		return this.fetchJson<SpaceResponse>(`/spaces/${spaceId}/clone`, {
			method: "POST",
			body: JSON.stringify({name}),
		});
	}

	/**
	 * Update a space's metadata/configuration.
	 */
	public updateSpace(
		spaceId: string,
		payload: SpacePayload,
	): Promise<SpaceResponse> {
		return this.fetchJson<SpaceResponse>(`/spaces/${spaceId}`, {
			method: "PUT",
			body: JSON.stringify(payload),
		});
	}

	/**
	 * Delete a space and all of its objects.
	 */
	public deleteSpace(spaceId: string): Promise<void> {
		return this.fetchJson<void>(`/spaces/${spaceId}`, {
			method: "DELETE",
		});
	}

	/**
	 * Fetch all object instances for a space.
	 */
	public async listObjects(
		spaceId: string,
		useCache = true,
	): Promise<ObjectInstanceResponse[]> {
		const space = await (useCache
			? this.loadSpaceState(spaceId)
			: this.getSpace(spaceId));
		return space.object_instances;
	}

	/**
	 * Create a new object instance.
	 */
	public createObject(
		spaceId: string,
		payload: ObjectInstancePayload,
	): Promise<ObjectInstanceResponse> {
		return this.fetchJson<ObjectInstanceResponse>(
			`/spaces/${spaceId}/objects`,
			{
				method: "POST",
				body: JSON.stringify(payload),
			},
		);
	}

	/**
	 * Update an existing object instance.
	 */
	public updateObject(
		spaceId: string,
		objectId: string,
		payload: ObjectInstancePayload,
	): Promise<ObjectInstanceResponse> {
		return this.fetchJson<ObjectInstanceResponse>(
			`/spaces/${spaceId}/objects/${objectId}`,
			{
				method: "PUT",
				body: JSON.stringify(payload),
			},
		);
	}

	/**
	 * Delete an object instance from the backend.
	 */
	public deleteObject(spaceId: string, objectId: string): Promise<void> {
		return this.fetchJson<void>(`/spaces/${spaceId}/objects/${objectId}`, {
			method: "DELETE",
		});
	}

	/**
	 * Store binary geometry data for a space.
	 */
	public async uploadGeometry(
		spaceId: string,
		geometry: ArrayBuffer,
	): Promise<GeometryFileResponse> {
		const result = await this.fetchJson<GeometryFileResponse>(
			`/spaces/${spaceId}/geometries`,
			{
				body: geometry,
				headers: {
					"Content-Type": "application/octet-stream",
				},
				method: "POST",
			},
		);
		await this.cache.putGeometry(spaceId, result.id, geometry);
		return result;
	}

	/**
	 * Fetch binary geometry data from the backend.
	 */
	public async getGeometry(
		spaceId: string,
		geometryId: string,
	): Promise<ArrayBuffer> {
		const cached = await this.cache.getGeometry(spaceId, geometryId);
		if (cached) return cached;
		const data = await this.fetchArrayBuffer(
			`/spaces/${spaceId}/geometries/${geometryId}`,
		);
		await this.cache.putGeometry(spaceId, geometryId, data);
		return data;
	}

	private async cacheSpaceSnapshot(space: SpaceResponse): Promise<void> {
		const geometryIds = [
			...new Set(
				space.object_instances
					.map((instance) => instance.data?.geometryFileId)
					.filter(
						(id): id is string => typeof id === "string" && id.length > 0,
					),
			),
		];
		let next = 0;
		await Promise.all(
			Array.from({length: Math.min(3, geometryIds.length)}, async () => {
				while (next < geometryIds.length) {
					const geometryId = geometryIds[next++];
					await this.getGeometry(space.id, geometryId);
				}
			}),
		);
		// Publish the new snapshot only after all referenced binary assets are on disk.
		// A failed download leaves the previous snapshot and its assets available.
		await this.cache.putSpace(space);
	}

	/**
	 * Fetch JSON data from the backend API with proper error handling and authentication headers.
	 *
	 * @param path - The API endpoint path (e.g., "/spaces" or "/spaces/{spaceId}/objects")
	 * @param options - Optional fetch options (e.g., method, headers, body)
	 * @returns Response data parsed as JSON, or throws an error if the request fails.
	 */
	private async fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			cache: "no-store",
			...options,
			headers: {
				"Content-Type": "application/json",
				...this.getAuthHeaders(),
				...(options?.headers ?? {}),
			},
		});

		if (!response.ok) {
			const message = await response.text();
			throw new Error(message || `Request failed: ${response.status}`);
		}

		// Every caller, including archive imports, invalidates the shared cache.
		if (options?.method && options.method !== "GET") {
			await this.invalidateAfterWrite(path, options.method);
		}

		if (response.status === 204) {
			return null as T;
		}

		return response.json() as Promise<T>;
	}

	private getSharedCache() {
		let shared = SpaceApi.sharedCaches.get(this.cacheNamespace);
		if (!shared) {
			shared = {
				revision: 0,
				invalidation: Promise.resolve(),
				pending: new Map(),
			};
			SpaceApi.sharedCaches.set(this.cacheNamespace, shared);
		}
		return shared;
	}

	/** Share pending disk/network reads across cards, while keeping mutable data private. */
	private async readCached<T>(
		key: string,
		read: () => Promise<T | null>,
		fetchValue: () => Promise<T>,
		write: (value: T) => Promise<void>,
		invalidate: () => Promise<void>,
	): Promise<T> {
		const shared = this.getSharedCache();
		const revision = shared.revision;
		const requestKey = `${revision}:${key}`;
		let pending = shared.pending.get(requestKey) as Promise<T> | undefined;
		if (!pending) {
			pending = (async () => {
				await shared.invalidation;
				const cached = await read();
				const value = cached ?? (await fetchValue());
				if (revision === shared.revision && cached === null) {
					await write(value);
					// A write can finish while an IndexedDB transaction is committing.
					if (revision !== shared.revision) await invalidate();
				}
				if (revision !== shared.revision) {
					return this.readCached(key, read, fetchValue, write, invalidate);
				}
				return value;
			})();
			shared.pending.set(requestKey, pending);
		}
		try {
			return structuredClone(await pending);
		} finally {
			if (shared.pending.get(requestKey) === pending) {
				shared.pending.delete(requestKey);
			}
		}
	}

	private async invalidateAfterWrite(
		path: string,
		method: string,
	): Promise<void> {
		const segments = path.split("/");
		if (segments[1] !== "spaces" || segments[3] === "geometries") return;
		const spaceId = segments[2];
		const shared = this.getSharedCache();
		shared.revision += 1;
		shared.invalidation = shared.invalidation.then(async () => {
			await this.cache.invalidateSpaceList();
			if (spaceId) {
				if (method === "DELETE" && segments.length === 3) {
					await this.cache.deleteSpace(spaceId);
				} else {
					await this.cache.invalidateSpace(spaceId);
				}
			}
		});
		await shared.invalidation;
	}

	private async fetchArrayBuffer(
		path: string,
		options?: RequestInit,
	): Promise<ArrayBuffer> {
		const response = await fetch(`${this.baseUrl}${path}`, {
			cache: "no-store",
			...options,
			headers: {
				...this.getAuthHeaders(),
				...(options?.headers ?? {}),
			},
		});

		if (!response.ok) {
			const message = await response.text();
			throw new Error(message || `Request failed: ${response.status}`);
		}

		return response.arrayBuffer();
	}

	/**
	 * Get the authentication headers for the backend API requests.
	 *
	 * If a service key is provided, it will be included in the headers.
	 *
	 * @returns A record of headers to include in the API request, including the service key if available.
	 */
	private getAuthHeaders(): Record<string, string> {
		if (!this.serviceKey) {
			return {};
		}

		return {
			[SERVICE_KEY_HEADER]: this.serviceKey,
		};
	}

	private buildCacheNamespace(): string {
		const value = `${this.baseUrl}\u0000${this.serviceKey}`;
		let first = 0x811c9dc5;
		let second = 0x9e3779b9;

		for (let index = 0; index < value.length; index++) {
			const code = value.charCodeAt(index);
			first = Math.imul(first ^ code, 0x01000193);
			second = Math.imul(second ^ code, 0x85ebca6b);
		}

		return `${(first >>> 0).toString(16)}${(second >>> 0).toString(16)}`;
	}
}
