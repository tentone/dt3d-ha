import "three";

declare module "three" {
	interface Object3D {
		/**
		 * Marks a system-managed object that must not be exposed directly in the
		 * object tree, selection, direct editing, or persistence workflows.
		 */
		internal?: boolean;
	}
}
