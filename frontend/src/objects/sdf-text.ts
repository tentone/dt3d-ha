import type { ColorRepresentation } from "three";
import { Text } from "troika-three-text";

export class SdfText extends Text {
        public constructor(
                text: string,
                fontSize = 0.18,
                color: ColorRepresentation = 0xffffff,
        ) {
                super();

                this.text = text;
                this.fontSize = fontSize;
                this.color = color;
                this.anchorX = "center";
                this.anchorY = "top";
                this.outlineWidth = 0.0025;
                this.outlineColor = 0x000000;
                this.maxWidth = 2.4;
                this.overflowWrap = "break-word";

                this.sync();
        }

        public setText(value: string): void {
                this.text = value;
                this.sync();
        }
}
