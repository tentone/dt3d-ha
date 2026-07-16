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

		// Ensure that the browser doesn't cache a pre-rendered element.
		this.element.style.transformStyle = "preserve-3d";
		this.element.style.backfaceVisibility = "visible";
		this.element.style.willChange = "transform";

		this.element.className = options.className ?? "";
		this.element.style.background = "rgba(0, 0, 0, 0.65)";
		this.element.style.borderRadius = "4px";
		this.element.style.boxSizing = "border-box";
		this.element.style.color = "#ffffff";
		this.element.style.fontFamily = "sans-serif";
		this.element.style.fontSize = "12px";
		this.element.style.fontWeight = "600";
		this.element.style.lineHeight = "1.35";
		this.element.style.padding = "4px 7px";
		this.element.style.pointerEvents = "none";
		this.element.style.textAlign = "center";
		this.element.style.whiteSpace = "pre-line";
		this.element.textContent = text;
		this.scale.setScalar(0.004);

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
