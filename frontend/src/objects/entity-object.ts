import { Group } from "three";

/**
 * Base 3D representation for Home Assistant entities.
 */
export abstract class EntityObject extends Group {
        public readonly entityId: string;
        private entityData: any;

        protected constructor(entityId: string, entity?: any) {
                super();
                this.entityId = entityId;
                this.name = entityId;

                if (entity) {
                        this.setEntity(entity);
                }
        }

        /**
         * Update the entity data and refresh the visual representation.
         */
        public setEntity(entity: any): void {
                this.entityData = entity;
                this.updateFromEntity(entity);
        }

        /**
         * Retrieve the latest entity state stored on this object.
         */
        public getEntity(): any {
                return this.entityData;
        }

        /**
         * Handle pointer click interaction.
         * Subclasses can override this to perform entity-specific actions.
         */
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        public handleClick(_hass: any): void {
                // Default: no-op
        }

        /**
         * Refresh the visuals based on the provided entity data.
         */
        protected abstract updateFromEntity(entity: any): void;
}
