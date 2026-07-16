import type {Camera} from "three";
import {Vector3} from "three";
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

	private readonly cameraSpacePosition = new Vector3();

	private readonly parentWorldScale = new Vector3();

	private readonly worldPosition = new Vector3();

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
		this.onBeforeRender = (renderer, _scene, camera) => {
			this.updateScreenScale(renderer, camera);
		};

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

	/**
	 * Counteract camera projection so the DOM text keeps a constant screen size.
	 *
	 * @param renderer - Active CSS renderer.
	 * @param camera - Active scene camera.
	 */
	private updateScreenScale(renderer: unknown, camera: Camera): void {
		if (!CSSText.hasSize(renderer)) {
			return;
		}

		const {height} = renderer.getSize();
		const projectionScale = Math.abs(camera.projectionMatrix.elements[5]) * height / 2;
		if (!Number.isFinite(projectionScale) || projectionScale <= 0) {
			return;
		}

		this.getWorldPosition(this.worldPosition);
		this.cameraSpacePosition
			.copy(this.worldPosition)
			.applyMatrix4(camera.matrixWorldInverse);

		const isPerspectiveCamera = (camera as Camera & {isPerspectiveCamera?: boolean})
			.isPerspectiveCamera === true;
		const depth = isPerspectiveCamera
			? Math.max(Math.abs(this.cameraSpacePosition.z), 0.0001)
			: 1;
		const worldScale = depth / projectionScale;

		if (this.parent) {
			this.parent.getWorldScale(this.parentWorldScale);
		} else {
			this.parentWorldScale.set(1, 1, 1);
		}

		this.scale.set(
			worldScale / Math.max(Math.abs(this.parentWorldScale.x), 0.0001),
			worldScale / Math.max(Math.abs(this.parentWorldScale.y), 0.0001),
			worldScale / Math.max(Math.abs(this.parentWorldScale.z), 0.0001),
		);
		this.updateMatrixWorld(true);
	}

	private static hasSize(renderer: unknown): renderer is {
		getSize(): {height: number; width: number};
	} {
		return typeof (renderer as {getSize?: unknown})?.getSize === "function";
	}
}
