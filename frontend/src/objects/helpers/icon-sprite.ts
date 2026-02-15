import {CanvasTexture, Color, Sprite, SpriteMaterial} from "three";

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
	private backgroundColor: Color;

	/**
	 * @param iconPath - SVG path data for the icon.
	 * @param backgroundColor - Circle color.
	 * @param size - Size of the sprite.
	 */
	public constructor(iconPath: string, backgroundColor: Color | number, size = 0.35) {
		const color = new Color(backgroundColor);
		const texture = IconSprite.createTexture(iconPath, color);
		const material = new SpriteMaterial({map: texture, transparent: true});

		super(material);

		this.iconPath = iconPath;
		this.backgroundColor = color;
		this.scale.set(size, size, size);
	}

	/**
	 * Update the background color of the sprite.
	 *
	 * @param color - New circle color.
	 */
	public setColor(color: Color | number): void {
		this.backgroundColor = color instanceof Color ? color : new Color(color);
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

	private static createTexture(iconPath: string, backgroundColor: Color): CanvasTexture {
		const canvas = document.createElement("canvas");
		canvas.width = 128;
		canvas.height = 128;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Circle background.
			ctx.fillStyle = `#${backgroundColor.getHexString()}`;
			ctx.beginPath();
			ctx.arc(64, 64, 42, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 4;
			ctx.stroke();

			// Icon
			if (iconPath) {
				const path = new Path2D(iconPath);
				ctx.save();
				ctx.fillStyle = "#ffffff";
				ctx.translate(64, 64);

				// Icons are drawn in a 24x24 viewbox; scale to fit the circle.
				const scale = 2.4;
				ctx.scale(scale, scale);
				ctx.translate(-12, -12);
				ctx.fill(path);
				ctx.restore();
			}
		}

		const texture = new CanvasTexture(canvas);
		texture.needsUpdate = true;
		return texture;
	}
}
