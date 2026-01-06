import "three";

declare module "three" {
	interface Object3D {
		/**
		 * Marks helper or system objects that should not appear in the object tree
		 * and must be ignored by pointer interactions.
		 */
		internal?: boolean;
	}
}
