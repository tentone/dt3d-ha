import * as mdiIcons from "@mdi/js";
import {
	BufferGeometry,
	Line,
	LineBasicMaterial,
	type Material,
	type Object3D,
	Quaternion,
	Vector3,
} from "three";

import type {CameraMode, CameraViewportConfig} from "../editor/scene.js";
import type {DTInteractionEvent} from "./dt-object.js";
import {DTObject} from "./dt-object.js";
import {IconSprite} from "./helpers/icon-sprite.js";
import {TextSprite} from "./helpers/text-sprite.js";

const DEFAULT_VIEWPORT_CONFIG: CameraViewportConfig = {
	direction: {
		x: 0,
		y: 0,
		z: -1,
	},
	fov: 75,
	mode: "perspective",
	position: {
		x: 0,
		y: 0,
		z: 3,
	},
	quaternion: {
		w: 1,
		x: 0,
		y: 0,
		z: 0,
	},
	targetDistance: 3,
	zoom: 1,
};

const FORWARD = new Vector3(0, 0, -1);
const VIEWPORT_OBJECT_TYPE = "viewport";

const numberOrDefault = (value: unknown, fallback: number): number => (
	typeof value === "number" && Number.isFinite(value) ? value : fallback
);


const normalizeVector = (
	value: unknown,
	fallback: { x: number; y: number; z: number },
): { x: number; y: number; z: number } => {
	const source = value && typeof value === "object"
		? value as { x?: unknown; y?: unknown; z?: unknown }
		: {};

	return {
		x: numberOrDefault(source.x, fallback.x),
		y: numberOrDefault(source.y, fallback.y),
		z: numberOrDefault(source.z, fallback.z),
	};
};

const normalizeQuaternion = (
	value: unknown,
	fallback: { w: number; x: number; y: number; z: number },
): { w: number; x: number; y: number; z: number } => {
	const source = value && typeof value === "object"
		? value as { w?: unknown; x?: unknown; y?: unknown; z?: unknown }
		: {};

	return {
		w: numberOrDefault(source.w, fallback.w),
		x: numberOrDefault(source.x, fallback.x),
		y: numberOrDefault(source.y, fallback.y),
		z: numberOrDefault(source.z, fallback.z),
	};
};

const normalizeViewportConfig = (config: Partial<CameraViewportConfig> = {},): CameraViewportConfig => {
	const fallback = DEFAULT_VIEWPORT_CONFIG;
	const normalized: CameraViewportConfig = {
		direction: normalizeVector(config.direction, fallback.direction),
		fov: numberOrDefault(config.fov, fallback.fov ?? 75),
		mode: config.mode === "orthographic" || config.mode === "perspective" ? config.mode : fallback.mode,
		position: normalizeVector(config.position, fallback.position),
		targetDistance: numberOrDefault(
			config.targetDistance,
			fallback.targetDistance ?? 3,
		),
		zoom: numberOrDefault(config.zoom, fallback.zoom ?? 1),
	};

	if (config.quaternion) {
		normalized.quaternion = normalizeQuaternion(
			config.quaternion,
			fallback.quaternion!,
		);
	}

	if (config.target) {
		normalized.target = normalizeVector(config.target, config.position ?? fallback.position);
	}

	return normalized;
};

const cloneViewportConfig = (config: Partial<CameraViewportConfig>): CameraViewportConfig => normalizeViewportConfig(config);

/**
 * Saved camera viewport marker.
 */
export class ViewportObject extends DTObject {
	/**
	 * Projection and orbit metadata captured for this viewport.
	 */
	public viewport: CameraViewportConfig;

	private readonly label: TextSprite;


	public constructor(
		config: Partial<CameraViewportConfig> = DEFAULT_VIEWPORT_CONFIG,
		name = "Viewport",
	) {
		super();

		this.type = "ViewportObject";
		this.name = name;
		this.viewport = cloneViewportConfig(config);
		this.userData.objectInstanceType = VIEWPORT_OBJECT_TYPE;

		const icon = new IconSprite(mdiIcons.mdiCameraOutline, 0x2f80ed, 0.4);
		icon.internal = true;
		icon.position.y = 0.14;
		this.add(icon);


		this.label = new TextSprite(name, 44, {
			background: "rgba(14, 22, 34, 0.82)",
			borderRadius: 6,
			color: "#ffffff",
			fontWeight: "600",
			padding: 7,
		});
		this.label.internal = true;
		this.label.position.y = 0.48;
		this.label.visible = false;
		this.add(this.label);

		this.applyConfigToTransform(this.viewport);
	}

	/**
	 * Get the camera config represented by the current object transform.
	 */
	public getViewportConfig(): CameraViewportConfig {
		const direction = FORWARD.clone().applyQuaternion(this.quaternion).normalize();
		const targetDistance = this.viewport.targetDistance ?? 10;
		const target = this.position.clone().add(
			direction.clone().multiplyScalar(targetDistance),
		);

		return {
			...cloneViewportConfig(this.viewport),
			direction: {
				x: direction.x,
				y: direction.y,
				z: direction.z,
			},
			position: {
				x: this.position.x,
				y: this.position.y,
				z: this.position.z,
			},
			quaternion: {
				w: this.quaternion.w,
				x: this.quaternion.x,
				y: this.quaternion.y,
				z: this.quaternion.z,
			},
			target: {
				x: target.x,
				y: target.y,
				z: target.z,
			},
			targetDistance,
		};
	}

	public override onInteraction(event: DTInteractionEvent): void {
		this.label.setText(this.name || "Viewport");
		this.label.visible = event.type === "pointerenter";
	}

	public override dispose(): void {
		this.traverse((child: Object3D) => {
			const material = (child as any).material as Material | Material[] | undefined;
			const geometry = (child as any).geometry as BufferGeometry | undefined;

			geometry?.dispose();

			if (Array.isArray(material)) {
				for (const item of material) {
					item.dispose();
				}
			} else {
				material?.dispose();
			}
		});
	}

	public override copy(source: this, recursive: boolean = true): this {
		super.copy(source, false);
		this.viewport = cloneViewportConfig(source.getViewportConfig());
		this.label.setText(this.name || "Viewport");
		this.userData.objectInstanceType = VIEWPORT_OBJECT_TYPE;

		if (recursive) {
			for (const child of source.children) {
				if ((child as any).internal === true) {
					continue;
				}

				this.add(child.clone());
			}
		}

		return this;
	}

	public override clone(recursive: boolean = true): this {
		return new ViewportObject(
			this.getViewportConfig(),
			this.name || "Viewport",
		).copy(this, recursive) as this;
	}

	/**
	 * Apply the given camera config to the object transform.
	 * 
	 * @param config - The camera config to apply.
	 */
	private applyConfigToTransform(config: CameraViewportConfig): void {
		this.position.set(config.position.x, config.position.y, config.position.z);

		if (config.quaternion) {
			this.quaternion.copy(new Quaternion(
				config.quaternion.x,
				config.quaternion.y,
				config.quaternion.z,
				config.quaternion.w,
			));
			return;
		}

		const direction = new Vector3(
			config.direction.x,
			config.direction.y,
			config.direction.z,
		).normalize();
		const distance = config.targetDistance ?? 10;
		const target = config.target
			? new Vector3(config.target.x, config.target.y, config.target.z)
			: this.position.clone().add(direction.multiplyScalar(distance));

		this.lookAt(target);
	}
}
