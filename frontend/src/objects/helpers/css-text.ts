import { CSS3DObject } from "three/examples/jsm/renderers/CSS3DRenderer.js";

export type CSSTextOptions = {
	className?: string;
	style?: Partial<CSSStyleDeclaration>;
};

/**
 * Text rendered via CSS3DRenderer using DOM elements.
 */
export class CSSText extends CSS3DObject {
	private readonly element: HTMLDivElement;

	public constructor(text: string, options: CSSTextOptions = {}) {
		const element = document.createElement("div");
		element.className = options.className ?? "dt3d-css-text";
		element.textContent = text;

		element.style.position = "absolute";
		element.style.padding = "4px 8px";
		element.style.borderRadius = "8px";
		element.style.background = "rgba(0, 0, 0, 0.7)";
		element.style.color = "#ffffff";
		element.style.fontSize = "12px";
		element.style.fontWeight = "600";
		element.style.whiteSpace = "nowrap";
		element.style.pointerEvents = "none";
		element.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.35)";

		super(element);

		this.element = element;

		this.applyStyle(options.style);

		this.onBeforeRender = (_renderer, _scene, camera) => {
			this.quaternion.copy(camera.quaternion);
		};
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
