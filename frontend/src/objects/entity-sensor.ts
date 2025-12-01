import { CanvasTexture, Color, Group, Sprite, SpriteMaterial } from "three";
import { createTextSprite } from "./text.js";

function createIconSprite(color: Color | number, size = 0.25): Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;

    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = typeof color === 'number' ? `#${color.toString(16).padStart(6, '0')}` : `#${color.getHexString()}`;
        ctx.beginPath();
        ctx.arc(64, 64, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.stroke();
    }

    const texture = new CanvasTexture(canvas);
    const material = new SpriteMaterial({ map: texture, transparent: true });
    const sprite = new Sprite(material);
    sprite.scale.set(size, size, size);
    return sprite;
}

export class EntitySensor extends Group {
    public constructor(entityId: string, entity: any) {
        super();
        this.name = entityId;

        const icon = createIconSprite(0x1e90ff, 0.2);
        icon.position.y = 0.1;
        this.add(icon);

        const friendlyName = entity.attributes?.friendly_name ?? entityId;
        const labelText = `${friendlyName}\n${entity.state}`;
        const label = createTextSprite(labelText);
        label.position.y = 0.45;
        this.add(label);
    }
}
