export type SpaceResponse = {
	id: string;
	name: string;
	description: string;
	created_at: number;
	updated_at: number;
	object_instances: ObjectInstanceResponse[];
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
	name: string;
	type: string;
	data: Record<string, any>;
	parent_id: string | null;
};

export const SERVICE_KEY_HEADER = "X-DT3D-Service-Key";

export function buildBackendApiUrl(address: string, port: number): string {
	const normalizedAddress = /^https?:\/\//i.test(address) ? address : `http://${address}`;
	return `${normalizedAddress.replace(/\/+$/, "")}:${port}/api`;
}

/**
 * SpaceApi wraps HTTP calls to the backend space endpoints.
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
	 * Create a new space with the provided name/description.
	 */
	public createSpace(name: string, description: string): Promise<SpaceResponse> {
		return this.fetchJson<SpaceResponse>("/spaces", {
			method: "POST",
			body: JSON.stringify({name, description}),
		});
	}

	/**
	 * Fetch all object instances for a space.
	 */
	public listObjects(spaceId: string): Promise<ObjectInstanceResponse[]> {
		return this.fetchJson<ObjectInstanceResponse[]>(`/spaces/${spaceId}/objects`);
	}

	/**
	 * Create a new object instance.
	 */
	public createObject(
		spaceId: string,
		payload: ObjectInstancePayload,
	): Promise<ObjectInstanceResponse> {
		return this.fetchJson<ObjectInstanceResponse>(`/spaces/${spaceId}/objects`, {
			method: "POST",
			body: JSON.stringify(payload),
		});
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

	private getAuthHeaders(): Record<string, string> {
		if (!this.serviceKey) {
			return {};
		}

		return {
			[SERVICE_KEY_HEADER]: this.serviceKey,
		};
	}
}
