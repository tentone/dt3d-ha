declare module "troika-three-text" {
	import type { BufferGeometry, ColorRepresentation, Material, Mesh } from "three";

	export type TroikaTextAlign = "left" | "right" | "center" | "justify";
	export type TroikaTextAnchorX = number | "left" | "center" | "right";
	export type TroikaTextAnchorY = number | "top" | "middle" | "bottom" | "baseline";

	export class Text extends Mesh<BufferGeometry, Material | Material[]> {
		text: string;
		font?: string;
		fontSize: number;
		color: ColorRepresentation;
		maxWidth?: number;
		lineHeight?: number;
		letterSpacing?: number;
		textAlign: TroikaTextAlign;
		anchorX: TroikaTextAnchorX;
		anchorY: TroikaTextAnchorY;
		outlineWidth?: number;
		outlineColor?: ColorRepresentation;
		outlineOpacity?: number;
		curveRadius?: number;
		depthOffset?: number;

		sync(callback?: () => void): void;
	}
}
