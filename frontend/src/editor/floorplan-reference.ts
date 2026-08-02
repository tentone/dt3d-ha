import type {Mesh} from "three";
import {DoubleSide, MeshBasicMaterial} from "three";

import {applyImageTextureToMesh} from "./material-texture.js";
import {createMeshObject} from "./mesh-handler.js";

export type ImagePoint = {
	x: number;
	y: number;
};

export type FloorplanCalibration = {
	distanceMeters: number;
	imageHeight: number;
	imageWidth: number;
	pointA: ImagePoint;
	pointB: ImagePoint;
};

export type FloorplanDimensions = {
	heightMeters: number;
	metersPerPixel: number;
	widthMeters: number;
};

/** Calculate real floorplan dimensions from a known distance in the image. */
export function calculateFloorplanDimensions(
	calibration: FloorplanCalibration,
): FloorplanDimensions {
	const pixelDistance = Math.hypot(
		calibration.pointB.x - calibration.pointA.x,
		calibration.pointB.y - calibration.pointA.y,
	);

	if (
		!Number.isFinite(pixelDistance) ||
		pixelDistance <= 0 ||
		!Number.isFinite(calibration.distanceMeters) ||
		calibration.distanceMeters <= 0 ||
		!Number.isFinite(calibration.imageWidth) ||
		calibration.imageWidth <= 0 ||
		!Number.isFinite(calibration.imageHeight) ||
		calibration.imageHeight <= 0
	) {
		throw new Error("Floorplan calibration requires two distinct points and a positive distance.");
	}

	const metersPerPixel = calibration.distanceMeters / pixelDistance;
	return {
		heightMeters: calibration.imageHeight * metersPerPixel,
		metersPerPixel,
		widthMeters: calibration.imageWidth * metersPerPixel,
	};
}

/** Build a horizontal, correctly scaled plane with the floorplan image applied. */
export async function createFloorplanReferenceMesh(
	file: File,
	calibration: FloorplanCalibration,
): Promise<Mesh> {
	const dimensions = calculateFloorplanDimensions(calibration);
	const material = new MeshBasicMaterial({
		color: 0xffffff,
		side: DoubleSide,
		toneMapped: false,
	});
	const mesh = createMeshObject("plane", material, {
		height: dimensions.heightMeters,
		heightSegments: 1,
		width: dimensions.widthMeters,
		widthSegments: 1,
	});

	// Keep it just below the floor/grid plane to avoid coplanar z-fighting.
	mesh.position.y = -0.001;
	mesh.userData.meshType = "plane";
	mesh.userData.floorplanReference = true;
	mesh.userData.floorplanCalibration = {
		distanceMeters: calibration.distanceMeters,
		metersPerPixel: dimensions.metersPerPixel,
		pointA: {...calibration.pointA},
		pointB: {...calibration.pointB},
	};

	try {
		await applyImageTextureToMesh(mesh, file);
	} catch (error) {
		mesh.geometry.dispose();
		material.dispose();
		throw error;
	}

	return mesh;
}
