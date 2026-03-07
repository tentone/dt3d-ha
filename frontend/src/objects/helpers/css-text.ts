import {CSS3DSprite} from "three/examples/jsm/renderers/CSS3DRenderer.js";

export type CSSTextOptions = {
	className?: string;
	style?: Partial<CSSStyleDeclaration>;
};

/**
 * Text rendered via CSS3DRenderer using DOM elements.
 */
export class CSSText extends CSS3DSprite {
	public element: HTMLDivElement;

	public constructor(text: string, options: CSSTextOptions = {}) {
		const element = document.createElement("div");

		super(element);

		// Ensure that the browser dont cache pre-rendered element
		this.element.style.transformStyle =  "preserve-3d";
		this.element.style.backfaceVisibility = "visible";
		this.element.style.willChange = "transform";

		this.element.style.color = "#ffffff";
		this.element.style.fontSize = "12px";
		this.element.style.fontWeight = "600";
		this.element.style.whiteSpace = "nowrap";
		this.element.style.pointerEvents = "none";
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
