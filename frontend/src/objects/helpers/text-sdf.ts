import type { ColorRepresentation } from "three";
import {Text} from 'troika-three-text'

export type TextSDFOptions = {
	font?: string;
	fontSize?: number;
	color?: ColorRepresentation;
	maxWidth?: number;
	lineHeight?: number;
	letterSpacing?: number;
	textAlign?: "left" | "right" | "center" | "justify";
	anchorX?: number | "left" | "center" | "right";
	anchorY?: number | "top" | "middle" | "bottom" | "baseline";
	outlineWidth?: number;
	outlineColor?: ColorRepresentation;
	outlineOpacity?: number;
	curveRadius?: number;
	depthOffset?: number;
};

/**
 * Signed-distance-field text mesh powered by troika-three-text.
 *
 * This object is not used directly in the scene yet but can be instantiated elsewhere to render crisp text in 3D space.
 */
export class TextSDF extends Text {
	/**
	 * Create a new SDF text instance with optional styling overrides.
	 *
	 * @param text - Text content.
	 * @param options - Rendering and layout options.
	 */
	public constructor(text: string, options: TextSDFOptions = {}) {
		super();

		this.text = text;
		this.fontSize = 0.25;
		this.color = "#ffffff";
		this.textAlign = "center";
		this.anchorX = "center";
		this.anchorY = "middle";

		this.applyOptions(options);
		this.sync();
	}

	/**
	 * Update the text content and re-sync the glyph layout.
	 *
	 * @param text - New text to render.
	 */
	public setText(text: string): void {
		if (this.text === text) {
			return;
		}

		this.text = text;
		this.sync();
	}

	/**
	 * Apply troika text options to this instance.
	 *
	 * @param options - Rendering and layout options.
	 */
	public applyOptions(options: TextSDFOptions): void {
		if (options.font !== undefined) {
			this.font = options.font;
		}

		if (options.fontSize !== undefined) {
			this.fontSize = options.fontSize;
		}

		if (options.color !== undefined) {
			this.color = options.color;
		}

		if (options.maxWidth !== undefined) {
			this.maxWidth = options.maxWidth;
		}

		if (options.lineHeight !== undefined) {
			this.lineHeight = options.lineHeight;
		}

		if (options.letterSpacing !== undefined) {
			this.letterSpacing = options.letterSpacing;
		}

		if (options.textAlign !== undefined) {
			this.textAlign = options.textAlign;
		}

		if (options.anchorX !== undefined) {
			this.anchorX = options.anchorX;
		}

		if (options.anchorY !== undefined) {
			this.anchorY = options.anchorY;
		}

		if (options.outlineWidth !== undefined) {
			this.outlineWidth = options.outlineWidth;
		}

		if (options.outlineColor !== undefined) {
			this.outlineColor = options.outlineColor;
		}

		if (options.outlineOpacity !== undefined) {
			this.outlineOpacity = options.outlineOpacity;
		}

		if (options.curveRadius !== undefined) {
			this.curveRadius = options.curveRadius;
		}

		if (options.depthOffset !== undefined) {
			this.depthOffset = options.depthOffset;
		}
	}
}
