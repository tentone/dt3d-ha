import type {Mesh} from "three";

const SHADOW_SETTINGS_INITIALIZED_KEY = "shadowSettingsInitialized";

export type MeshShadowSettings = {
	castShadow?: boolean;
	receiveShadow?: boolean;
};

/**
 * Apply persisted shadow preferences to a mesh. Missing preferences default to
 * enabled to preserve the rendering behaviour of existing spaces.
 */
export function initializeMeshShadowSettings(
	mesh: Mesh,
	settings: MeshShadowSettings = {},
): void {
	mesh.castShadow = settings.castShadow ?? true;
	mesh.receiveShadow = settings.receiveShadow ?? true;
	mesh.userData[SHADOW_SETTINGS_INITIALIZED_KEY] = true;
}

/**
 * Initialize a mesh once without overwriting preferences changed in the editor.
 */
export function ensureMeshShadowSettings(mesh: Mesh): void {
	if (mesh.userData[SHADOW_SETTINGS_INITIALIZED_KEY] === true) {
		return;
	}

	initializeMeshShadowSettings(mesh);
}
