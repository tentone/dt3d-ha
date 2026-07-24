export type SpaceResponse = {
	id: string;
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
	private baseUrl: string;
	private serviceKey: string;

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
	}

	/**
	 * Get all spaces from the backend.
	 */
	public listSpaces(): Promise<SpaceResponse[]> {
		return this.fetchJson<SpaceResponse[]>("/spaces");
	}

	/**
	 * Get one space, including its current configuration.
	 */
	public getSpace(spaceId: string): Promise<SpaceResponse> {
		return this.fetchJson<SpaceResponse>(`/spaces/${spaceId}`);
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
	public listObjects(spaceId: string): Promise<ObjectInstanceResponse[]> {
		return this.fetchJson<ObjectInstanceResponse[]>(
			`/spaces/${spaceId}/objects`,
		);
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
	public uploadGeometry(
		spaceId: string,
		geometry: ArrayBuffer,
	): Promise<GeometryFileResponse> {
		return this.fetchJson<GeometryFileResponse>(
			`/spaces/${spaceId}/geometries`,
			{
				body: geometry,
				headers: {
					"Content-Type": "application/octet-stream",
				},
				method: "POST",
			},
		);
	}

	/**
	 * Fetch binary geometry data from the backend.
	 */
	public getGeometry(
		spaceId: string,
		geometryId: string,
	): Promise<ArrayBuffer> {
		return this.fetchArrayBuffer(`/spaces/${spaceId}/geometries/${geometryId}`);
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

		if (response.status === 204) {
			return null as T;
		}

		return response.json() as Promise<T>;
	}

	private async fetchArrayBuffer(
		path: string,
		options?: RequestInit,
	): Promise<ArrayBuffer> {
		const response = await fetch(`${this.baseUrl}${path}`, {
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
}
