import type { Scene, Camera, WebGLRenderer } from "three";
import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export type CSSTextOptions = {
	className?: string;
	style?: Partial<CSSStyleDeclaration>;
};

/**
 * Text rendered via CSS3DRenderer using DOM elements.
 */
export class CSSText extends CSS3DObject {
	public element: HTMLDivElement;

	public constructor(text: string, options: CSSTextOptions = {}) {
		const element = document.createElement("div");

		super(element);

		this.element.style.transformStyle =  "preserve-3d";
		this.element.style.backfaceVisibility = "hidden";
		this.element.style.willChange = "transform";

		this.element.style.padding = "4px 8px";
		this.element.style.borderRadius = "8px";
		this.element.style.color = "#ffffff";
		this.element.style.fontSize = "12px";
		this.element.style.fontWeight = "600";
		this.element.style.whiteSpace = "nowrap";
		this.element.style.pointerEvents = "none";
		this.element.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.35)";
		this.element.textContent = text;

		if (options?.style) {
			this.applyStyle(options.style);
		}
	}

	/**
	 * Update the text contents.
	 *
	 * @param text - New text.
	 */
	public setText(text: string): void {
		if (this.element.textContent === text) {
			return;
		}

		this.element.textContent = text;
	}

	/**
	 * Apply custom styles to the DOM element.
	 *
	 * @param style - CSS style overrides.
	 */
	public applyStyle(style?: Partial<CSSStyleDeclaration>): void {
		if (!style) {
			return;
		}

		Object.entries(style).forEach(([property, value]) => {
			if (value === undefined) {
				return;
			}

			(this.element.style as any)[property] = value;
		});
	}
}
