import {
	CanvasTexture,
	Color,
	Group,
	PointLight,
	Sprite,
	SpriteMaterial,
} from "three";
import { TextSprite } from "./text.js";

function createIconSprite(color: Color | number, size = 0.25): Sprite {
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
	const sprite = new Sprite(material);
	sprite.scale.set(size, size, size);
	return sprite;
}

function getLightColor(entity: any): Color {
	const rgbColor = entity.attributes?.rgb_color;
	if (Array.isArray(rgbColor) && rgbColor.length === 3) {
		return new Color(rgbColor[0] / 255, rgbColor[1] / 255, rgbColor[2] / 255);
	}

	const hsColor = entity.attributes?.hs_color;
	if (Array.isArray(hsColor) && hsColor.length === 2) {
		const color = new Color();
		color.setHSL(hsColor[0] / 360, hsColor[1] / 100, 0.5);
		return color;
	}

	return new Color(entity.state === "on" ? 0xffffaa : 0x555555);
}

export class EntityLight extends Group {
	public constructor(entityId: string, entity: any) {
		super();
		this.name = entityId;

		const color = getLightColor(entity);

		const icon = createIconSprite(color, 0.25);
		icon.position.y = 0.1;
		this.add(icon);

		const pointLight = new PointLight(
			color,
			entity.state === "on" ? 1 : 0,
			6,
			2,
		);
		pointLight.position.y = 0.4;
		this.add(pointLight);

		const label = new TextSprite(
			entity.attributes?.friendly_name ?? entityId,
			256,
			96,
		);
		label.position.y = 0.6;
		this.add(label);
	}
}
