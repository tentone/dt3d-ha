import type {Group} from "three";
import {Vector3} from "three";

import {WallObject} from "../objects/house/wall.js";

export type WallEndpointReference = {
	wall: WallObject;
	endpoint: "start" | "end";
	point: Vector3;
};

export const WALL_JUNCTION_EPSILON = 1e-4;

export function sameWallJunctionPoint(left: Vector3, right: Vector3): boolean {
	return (
		Math.abs(left.y - right.y) <= WALL_JUNCTION_EPSILON &&
		Math.hypot(left.x - right.x, left.z - right.z) <= WALL_JUNCTION_EPSILON
	);
}

export function collectWallEndpoints(space: Group): WallEndpointReference[] {
	const endpoints: WallEndpointReference[] = [];
	space.updateWorldMatrix(true, true);
	space.traverse((wall) => {
		if (!(wall instanceof WallObject) || wall.internal || !wall.parent) {
			return;
		}
		for (const endpoint of ["start", "end"] as const) {
			endpoints.push({
				wall,
				endpoint,
				point: space.worldToLocal(
					wall.localToWorld(
						new Vector3(
							endpoint === "start" ? -wall.length / 2 : wall.length / 2,
							0,
							0,
						),
					),
				),
			});
		}
	});
	return endpoints;
}

/** Each endpoint shares its entire junction, including connections through peers. */
export function groupWallJunctions(
	endpoints: WallEndpointReference[],
): WallEndpointReference[][] {
	const junctions: WallEndpointReference[][] = [];
	for (const endpoint of endpoints) {
		const connected = [endpoint];
		for (let index = junctions.length - 1; index >= 0; index--) {
			if (
				junctions[index].some((peer) =>
					sameWallJunctionPoint(peer.point, endpoint.point),
				)
			) {
				connected.push(...junctions[index]);
				junctions.splice(index, 1);
			}
		}
		junctions.push(connected);
	}
	return junctions;
}
