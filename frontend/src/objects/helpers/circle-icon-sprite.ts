import type {Color} from "three";
import {
	CanvasTexture,
	LinearFilter,
	LinearMipMapLinearFilter,
	Sprite,
	SpriteMaterial,
	SRGBColorSpace,
} from "three";

import {renderIconPathToCanvas} from "../../utils/icon-utils.js";

/**
 * Icon with a gradient circle of a specific color.
 */
export class CircleIconSprite extends Sprite {
	/**
	 * @param color - Color of the sprite icon.
	 * @param size - Size of the sprite.
	 */
	public constructor(color: Color | number, size = 0.5) {
		const canvas = renderIconPathToCanvas("", {backgroundColor: color});
		const texture = new CanvasTexture(canvas);
		texture.colorSpace = SRGBColorSpace;
		texture.magFilter = LinearFilter;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.generateMipmaps = true;
		const material = new SpriteMaterial({map: texture, transparent: true});

		super(material);
		this.scale.set(size, size, size);
	}

	/**
	 * Change color of the sprite icon.
	 *
	 * @param color - Color to set the sprite icon to.
	 */
	public setColor(color: Color | number): void {
		const newSprite = new CircleIconSprite(color, this.scale.x);
		if (this.material.map) {
			this.material.map.dispose();
		}
		this.material = newSprite.material;
	}
}
