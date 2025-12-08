import { Text } from "troika-three-text";

export class SdfText extends Text {
        public constructor(text: string, maxWidth = 1.6) {
                super();

                this.text = text;
                this.maxWidth = maxWidth;
                this.anchorX = "center";
                this.anchorY = "middle";
                this.fontSize = 0.18;
                this.color = 0xffffff;
                this.outlineWidth = 0.01;
                this.outlineColor = 0x000000;

                this.onBeforeRender = (
                        _renderer,
                        _scene,
                        camera,
                        _geometry,
                        _material,
                        _group,
                ) => {
                        this.quaternion.copy(camera.quaternion);
                };

                this.sync();
        }

        public setText(text: string): void {
                if (this.text === text) {
                        return;
                }

                this.text = text;
                this.sync();
        }
}
