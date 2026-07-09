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
	 * @param iconPath - SVG path data for the icon.
	 * @param backgroundColor - Circle color.
	 * @param size - Size of the sprite.
	 */
	public constructor(
		iconPath: string,
		backgroundColor: IconCanvasColor,
		size = 0.35,
	) {
		const texture = IconSprite.createTexture(iconPath, backgroundColor);
		const material = new SpriteMaterial({map: texture, transparent: true});

		super(material);

		this.iconPath = iconPath;
		this.backgroundColor = backgroundColor;
		this.scale.set(size, size, size);
	}

	/**
	 * Update the background color of the sprite.
	 *
	 * @param color - New circle color.
	 */
	public setColor(color: IconCanvasColor): void {
		this.backgroundColor = color;
		this.refreshTexture();
	}

	/**
	 * Update the icon displayed in the sprite.
	 *
	 * @param iconPath - SVG path data of the icon.
	 */
	public setIcon(iconPath: string): void {
		this.iconPath = iconPath;
		this.refreshTexture();
	}

	/**
	 * Refresh the texture of the sprite after changes.
	 */
	private refreshTexture(): void {
		const texture = IconSprite.createTexture(this.iconPath, this.backgroundColor);
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
	): CanvasTexture {
		const canvas = renderIconPathToCanvas(iconPath, {backgroundColor});
		const texture = new CanvasTexture(canvas);
		texture.colorSpace = SRGBColorSpace;
		texture.magFilter = LinearFilter;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.generateMipmaps = true;
		texture.needsUpdate = true;
		return texture;
	}
}
