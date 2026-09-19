import type {Group} from "three";

import type {WallConnectionShape,WallObject} from "../objects/house/wall.js";
import type {WallEndpointReference} from "./wall-junctions.js";
import {collectWallEndpoints, groupWallJunctions} from "./wall-junctions.js";
import {resolveWallOcclusionMaterialUuid} from "./wall-occlusion.js";

/** Derives separate corner meshes and wall-body insets from shared endpoints. */
export class WallConnectionManager {
	private signature = "";

	public update(space: Group, shape: WallConnectionShape): void {
		const endpoints = collectWallEndpoints(space);
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

		const junctions = groupWallJunctions(endpoints);

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

	private createSignature(
		endpoints: WallEndpointReference[],
		shape: WallConnectionShape,
	): string {
		const wallParts = new Map<string, string>();
		for (const {wall, endpoint, point} of endpoints) {
			const coordinates = [point.x, point.y, point.z].join(",");
			const part = `${endpoint}:${coordinates}`;
			const materials = Array.isArray(wall.wallMesh.material)
				? wall.wallMesh.material
				: [wall.wallMesh.material];
			const customization = wall.getCustomization();
			wallParts.set(
				wall.uuid,
				`${wallParts.get(wall.uuid) ?? `${wall.uuid}:${wall.height}:${wall.thickness}:${wall.connectionShape}:${wall.connectionShapeRevision}:${customization.baseboardEnabled}:${customization.baseboardHeight}:${customization.baseboardDepth}:${customization.baseboardColor}:${materials.map(resolveWallOcclusionMaterialUuid).join(",")}`}|${part}`,
			);
		}
		return `${shape}|${[...wallParts.values()].sort().join(";")}`;
	}
}
