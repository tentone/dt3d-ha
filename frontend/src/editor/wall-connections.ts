import type {Group} from "three";
import {Vector3} from "three";

import type {WallConnectionShape} from "../objects/house/wall.js";
import {WallObject} from "../objects/house/wall.js";

type WallEndpoint = {
	wall: WallObject;
	endpoint: "start" | "end";
	point: Vector3;
};

const CONNECTION_EPSILON = 1e-5;

/** Derives separate corner meshes and wall-body insets from shared endpoints. */
export class WallConnectionManager {
	private signature = "";

	public update(space: Group, shape: WallConnectionShape): void {
		const endpoints = this.collectEndpoints(space);
		const signature = this.createSignature(endpoints, shape);
		if (signature === this.signature) {
			return;
		}
		this.signature = signature;

		const walls = [...new Set(endpoints.map(({wall}) => wall))];
		for (const wall of walls) {
			wall.clearJunctionConnections();
			wall.setConnectedEndpoints(false, false);
		}

		const junctions: WallEndpoint[][] = [];
		for (const endpoint of endpoints) {
			const junction = junctions.find(({0: first}) =>
				this.samePoint(first.point, endpoint.point),
			);
			if (junction) {
				junction.push(endpoint);
			} else {
				junctions.push([endpoint]);
			}
		}

		const connected = new Map<WallObject, Set<"start" | "end">>();
		for (const junction of junctions.filter((items) => items.length > 1)) {
			for (const endpoint of junction) {
				const wallEndpoints = connected.get(endpoint.wall) ?? new Set();
				wallEndpoints.add(endpoint.endpoint);
				connected.set(endpoint.wall, wallEndpoints);
			}
		}
		for (const wall of walls) {
			const wallEndpoints = connected.get(wall);
			wall.setConnectedEndpoints(
				wallEndpoints?.has("start") === true,
				wallEndpoints?.has("end") === true,
			);
		}

		for (const junction of junctions.filter((items) => items.length > 1)) {
			const owner = junction.reduce((latest, endpoint) =>
				endpoint.wall.connectionShapeRevision >
				latest.wall.connectionShapeRevision
					? endpoint
					: latest,
			);
			owner.wall.addJunctionConnection(
				owner.endpoint,
				owner.wall.connectionShape ?? shape,
				Math.max(...junction.map(({wall}) => wall.thickness)),
				Math.max(...junction.map(({wall}) => wall.height)),
			);
		}
	}

	public invalidate(): void {
		this.signature = "";
	}

	private collectEndpoints(space: Group): WallEndpoint[] {
		const endpoints: WallEndpoint[] = [];
		space.updateWorldMatrix(true, true);
		space.traverse((object) => {
			if (!(object instanceof WallObject) || object.internal || !object.parent) {
				return;
			}
			endpoints.push(
				{
					wall: object,
					endpoint: "start",
					point: space.worldToLocal(
						object.localToWorld(new Vector3(-object.length / 2, 0, 0)),
					),
				},
				{
					wall: object,
					endpoint: "end",
					point: space.worldToLocal(
						object.localToWorld(new Vector3(object.length / 2, 0, 0)),
					),
				},
			);
		});
		return endpoints;
	}

	private createSignature(
		endpoints: WallEndpoint[],
		shape: WallConnectionShape,
	): string {
		const wallParts = new Map<string, string>();
		for (const {wall, endpoint, point} of endpoints) {
			const coordinates = [point.x, point.y, point.z]
				.map((value) => Math.round(value / CONNECTION_EPSILON))
				.join(",");
			const part = `${endpoint}:${coordinates}`;
			const materials = Array.isArray(wall.wallMesh.material)
				? wall.wallMesh.material
				: [wall.wallMesh.material];
			const customization = wall.getCustomization();
			wallParts.set(
				wall.uuid,
				`${wallParts.get(wall.uuid) ?? `${wall.uuid}:${wall.height}:${wall.thickness}:${wall.connectionShape}:${wall.connectionShapeRevision}:${customization.baseboardEnabled}:${customization.baseboardHeight}:${customization.baseboardDepth}:${customization.baseboardColor}:${materials.map(({uuid}) => uuid).join(",")}`}|${part}`,
			);
		}
		return `${shape}|${[...wallParts.values()].sort().join(";")}`;
	}

	private samePoint(left: Vector3, right: Vector3): boolean {
		return (
			Math.abs(left.y - right.y) <= CONNECTION_EPSILON &&
			Math.hypot(left.x - right.x, left.z - right.z) <= CONNECTION_EPSILON
		);
	}
}
