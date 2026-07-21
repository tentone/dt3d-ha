import {
	CanvasTexture,
	LinearFilter,
	LinearMipMapLinearFilter,
	Sprite,
	SpriteMaterial,
	SRGBColorSpace,
} from "three";

import {
	type IconCanvasColor,
	renderIconPathToCanvas,
} from "../../utils/icon-utils.js";

/**
 * Sprite that renders an icon centered in a colored circle.
 */
export class IconSprite extends Sprite {
	/**
	 * Path of the icon.
	 */
	private iconPath: string;

	/**
	 * Background color.
	 */
	private backgroundColor: IconCanvasColor;

	/**
	 * Optional text rendered below the icon inside the same circle.
	 */
	private label: string;

	/**
	 * @param iconPath - SVG path data for the icon.
	 * @param backgroundColor - Circle color.
	 * @param size - Size of the sprite.
	 * @param label - Optional text rendered below the icon.
	 */
	public constructor(
		iconPath: string,
		backgroundColor: IconCanvasColor,
		size = 0.35,
		label = "",
	) {
		const texture = IconSprite.createTexture(iconPath, backgroundColor, label);
		const material = new SpriteMaterial({map: texture, transparent: true});

		super(material);

		this.iconPath = iconPath;
		this.backgroundColor = backgroundColor;
		this.label = label;
		this.scale.set(size, size, size);
	}

	/**
	 * Update the background color of the sprite.
	 *
	 * @param color - New circle color.
	 */
	public setColor(color: IconCanvasColor): void {
		if (this.backgroundColor === color) {
			return;
		}

		this.backgroundColor = color;
		this.refreshTexture();
	}

	/**
	 * Update the icon displayed in the sprite.
	 *
	 * @param iconPath - SVG path data of the icon.
	 */
	public setIcon(iconPath: string): void {
		if (this.iconPath === iconPath) {
			return;
		}

		this.iconPath = iconPath;
		this.refreshTexture();
	}

	/**
	 * Update the icon, circle color, and optional label with one texture refresh.
	 *
	 * @param iconPath - SVG path data of the icon.
	 * @param backgroundColor - Circle color.
	 * @param label - Optional text rendered below the icon.
	 */
	public setAppearance(
		iconPath: string,
		backgroundColor: IconCanvasColor,
		label = "",
	): void {
		if (
			this.iconPath === iconPath &&
			this.backgroundColor === backgroundColor &&
			this.label === label
		) {
			return;
		}

		this.iconPath = iconPath;
		this.backgroundColor = backgroundColor;
		this.label = label;
		this.refreshTexture();
	}

	/**
	 * Refresh the texture of the sprite after changes.
	 */
	private refreshTexture(): void {
		const texture = IconSprite.createTexture(
			this.iconPath,
			this.backgroundColor,
			this.label,
		);
		const spriteMaterial = this.material as SpriteMaterial;

		if (spriteMaterial.map) {
			spriteMaterial.map.dispose();
		}

		spriteMaterial.map = texture;
		spriteMaterial.needsUpdate = true;
	}

	private static createTexture(
		iconPath: string,
		backgroundColor: IconCanvasColor,
		label = "",
	): CanvasTexture {
		const canvas = renderIconPathToCanvas(iconPath, {
			backgroundColor,
			label,
		});
		const texture = new CanvasTexture(canvas);
		texture.colorSpace = SRGBColorSpace;
		texture.magFilter = LinearFilter;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.generateMipmaps = true;
		texture.needsUpdate = true;
		return texture;
	}
}
