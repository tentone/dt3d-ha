import {
        Color,
        Group,
        PointLight,
} from "three";
import { SdfText } from "./sdf-text.js";
import { CircleIconSprite } from "./circle-icon-sprite.js";


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

		const icon = new CircleIconSprite(color, 0.25);
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

                const label = new SdfText(entity.attributes?.friendly_name ?? entityId);
                label.position.y = 0.6;
                this.add(label);
        }
}
