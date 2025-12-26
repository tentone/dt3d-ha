import { Sprite, Color, CanvasTexture, SpriteMaterial } from "three";

/**
 * Icon with a gradient circle of a specific color.
 */
export class CircleIconSprite extends Sprite {
	public constructor(color: Color | number, size = 0.25) {
		const canvas = document.createElement("canvas");
		canvas.width = 128;
		canvas.height = 128;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle =
				typeof color === "number"
					? `#${color.toString(16).padStart(6, "0")}`
					: `#${color.getHexString()}`;
			ctx.beginPath();
			ctx.arc(64, 64, 40, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 4;
			ctx.stroke();
		}

		const texture = new CanvasTexture(canvas);
		const material = new SpriteMaterial({ map: texture, transparent: true });

		super(material);
		this.scale.set(size, size, size);
	}

	public setColor(color: Color | number): void {
		const newSprite = new CircleIconSprite(color, this.scale.x);
		if (this.material.map) {
			this.material.map.dispose();
		}
		this.material = newSprite.material;
	}
}
