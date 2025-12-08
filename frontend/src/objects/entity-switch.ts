import { Object3D } from "three";
import { SdfText } from "./sdf-text.js";
import { CircleIconSprite } from "./circle-icon-sprite.js";
import { EntityObject } from "./entity-object.js";

export class EntitySwitch extends EntityObject {
        public label: SdfText;
        private icon: Object3D;

        public constructor(entityId: string, entity: any) {
                super(entityId);

                this.icon = this.createIcon(false);
                this.icon.position.y = 0.1;
                this.add(this.icon);

                this.label = new SdfText("Loading\n...");
                this.label.position.y = 0.45;
                this.add(this.label);

                this.setEntity(entity);
        }

        protected updateFromEntity(entity: any): void {
                const friendlyName = entity.attributes?.friendly_name ?? this.name;
                const labelText = `${friendlyName}\n${entity.state}`;
                this.label.setText(labelText);

                this.refreshIcon(entity.state === "on");
        }

        public async handleClick(hass: any): Promise<void> {
                if (!hass?.callService) {
                        console.warn("DT3D: Unable to toggle switch; hass instance not available");
                        return;
                }

                try {
                        await hass.callService("switch", "toggle", {
                                entity_id: this.entityId,
                        });
                } catch (error) {
                        console.error(`DT3D: Failed to toggle switch ${this.entityId}`, error);
                }
        }

        private refreshIcon(isOn: boolean): void {
                if (this.icon) {
                        this.remove(this.icon);
                }

                this.icon = this.createIcon(isOn);
                this.icon.position.y = 0.1;
                this.add(this.icon);
        }

        private createIcon(isOn: boolean): Object3D {
                const color = isOn ? 0x00ff7f : 0x555555;
                return new CircleIconSprite(color, 0.22);
        }
}
