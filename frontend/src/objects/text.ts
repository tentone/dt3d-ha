import { CanvasTexture, Sprite, SpriteMaterial } from "three";

export class TextSprite extends Sprite {
	public constructor(text: string, width = 256, height = 128) {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext("2d");
		if (ctx) {
			ctx.fillStyle = "rgba(0, 0, 0, 0)";
			ctx.fillRect(0, 0, width, height);

			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 28px sans-serif";
			ctx.textBaseline = "top";

			const lines = text.split("\n");
			lines.forEach((line, index) => {
				ctx.fillText(line, 10, 10 + index * 32);
			});
		}

		const texture = new CanvasTexture(canvas);
		const material = new SpriteMaterial({ map: texture, transparent: true });
		super(material);
		this.scale.set(1.2, 0.6, 1);
		this.position.y = 0.35;
	}
}
