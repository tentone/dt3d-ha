import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Object3D } from "three";
import { EntityObject } from "./objects/entity-object.js";

@customElement("dt3d-object-inspector")
export class DT3DObjectInspector extends LitElement {
        static styles = [
                css`
                        :host {
                                display: flex;
                                flex-direction: column;
                                gap: 8px;
                        }

                        h4 {
                                margin: 4px 0 8px 0;
                                font-size: 14px;
                                color: var(--ha-color-primary-60);
                        }
                        .field {
                                display: flex;
                                flex-direction: column;
                                margin-bottom: 8px;
                                gap: 4px;
                        }
                        .field label {
                                font-size: 12px;
                                color: var(--ha-color-neutral-80);
                        }
                        .field input {
                                background: color-mix(
                                        in srgb,
                                        var(--ha-color-neutral-10) 95%,
                                        transparent
                                );
                                border: 1px solid
                                        color-mix(in srgb, var(--ha-color-neutral-30) 80%, transparent);
                                border-radius: 4px;
                                padding: 6px 8px;
                                color: var(--ha-color-neutral-90);
                        }
                        .attribute-list {
                                display: flex;
                                flex-direction: column;
                                gap: 6px;
                        }
                        .attribute-row {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                padding: 6px 8px;
                                border-radius: 4px;
                                border: 1px solid
                                        color-mix(in srgb, var(--ha-color-neutral-30) 80%, transparent);
                                background: color-mix(
                                        in srgb,
                                        var(--ha-color-neutral-10) 95%,
                                        transparent
                                );
                        }
                        .attribute-row .attr-key {
                                font-weight: 600;
                                color: var(--ha-color-neutral-80);
                        }
                        .attribute-row .attr-value {
                                color: var(--ha-color-neutral-90);
                                word-break: break-all;
                                text-align: right;
                        }
                        .group-row {
                                display: grid;
                                grid-template-columns: repeat(3, 1fr);
                                gap: 6px;
                        }
                        .group-row label {
                                display: flex;
                                flex-direction: column;
                                gap: 4px;
                                font-size: 12px;
                                color: var(--ha-color-neutral-80);
                        }
                        .group-row input {
                                width: 100%;
                                padding: 6px 8px;
                                box-sizing: border-box;
                                border-radius: 4px;
                                border: 1px solid
                                        color-mix(in srgb, var(--ha-color-neutral-30) 80%, transparent);
                                background: color-mix(
                                        in srgb,
                                        var(--ha-color-neutral-10) 95%,
                                        transparent
                                );
                                color: var(--ha-color-neutral-90);
                        }
                        .placeholder {
                                color: var(--ha-color-neutral-70);
                                font-size: 13px;
                                line-height: 1.4;
                        }
                `,
        ];

        @property({ attribute: false })
        public selectedObject: Object3D | null = null;

        private isEntityObject(object: Object3D | null): object is EntityObject {
                return object instanceof EntityObject;
        }

        private dispatchUpdated() {
                this.dispatchEvent(
                        new CustomEvent("object-updated", {
                                detail: { object: this.selectedObject },
                                bubbles: true,
                                composed: true,
                        }),
                );
        }

        private handleNameChange(event: Event) {
                if (!this.selectedObject) return;

                const value = (event.target as HTMLInputElement).value;
                this.selectedObject.name = value;
                this.dispatchUpdated();
        }

        private handleVectorChange(type: "position" | "scale", axis: "x" | "y" | "z", event: Event) {
                if (!this.selectedObject) return;

                const value = parseFloat((event.target as HTMLInputElement).value);
                if (Number.isNaN(value)) return;

                if (type === "position") {
                        this.selectedObject.position[axis] = value;
                } else {
                        this.selectedObject.scale[axis] = value;
                }

                this.dispatchUpdated();
                this.requestUpdate();
        }

        private handleRotationChange(axis: "x" | "y" | "z", event: Event) {
                if (!this.selectedObject) return;

                const value = parseFloat((event.target as HTMLInputElement).value);
                if (Number.isNaN(value)) return;

                this.selectedObject.rotation[axis] = (value * Math.PI) / 180;
                this.dispatchUpdated();
                this.requestUpdate();
        }

        private renderVectorControls(label: string, type: "position" | "scale") {
                if (!this.selectedObject) return null;

                const source = type === "position" ? this.selectedObject.position : this.selectedObject.scale;

                return html`
                        <div class="field">
                                <label>${label}</label>
                                <div class="group-row">
                                        ${(["x", "y", "z"] as const).map(
                                                (axis) => html`
                                                        <label
                                                                >${axis.toUpperCase()}
                                                                <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        .value=${source[axis].toFixed(2)}
                                                                        @change=${(event: Event) =>
                                                                                this.handleVectorChange(type, axis, event)}
                                                                />
                                                        </label>
                                                `,
                                        )}
                                </div>
                        </div>
                `;
        }

        private renderRotationControls() {
                if (!this.selectedObject) return null;

                return html`
                        <div class="field">
                                <label>Rotation (degrees)</label>
                                <div class="group-row">
                                        ${(["x", "y", "z"] as const).map(
                                                (axis) => html`
                                                        <label
                                                                >${axis.toUpperCase()}
                                                                <input
                                                                        type="number"
                                                                        step="1"
                                                                        .value=${(
                                                                                (this.selectedObject!.rotation[axis] * 180) /
                                                                                Math.PI
                                                                        ).toFixed(1)}
                                                                        @change=${(event: Event) =>
                                                                                this.handleRotationChange(axis, event)}
                                                                />
                                                        </label>
                                                `,
                                        )}
                                </div>
                        </div>
                `;
        }

        private renderEntityDetails() {
                if (!this.isEntityObject(this.selectedObject)) {
                        return null;
                }

                const entityData = this.selectedObject.getEntity();
                const friendlyName =
                        entityData?.attributes?.friendly_name ?? this.selectedObject.entityId;
                const stateValue = entityData?.state ?? "unknown";
                const attributes = entityData?.attributes ?? {};
                const attributeEntries = Object.entries(attributes);

                return html`
                        <h4>Entity</h4>
                        <div class="field">
                                <label>Entity ID</label>
                                <input type="text" .value=${this.selectedObject.entityId} readonly />
                        </div>
                        <div class="field">
                                <label>Entity Name</label>
                                <input type="text" .value=${friendlyName} readonly />
                        </div>
                        <div class="field">
                                <label>State</label>
                                <input type="text" .value=${String(stateValue)} readonly />
                        </div>
                        <div class="field">
                                <label>Attributes</label>
                                ${attributeEntries.length
                                        ? html`<div class="attribute-list">
                                                        ${attributeEntries.map(
                                                                ([key, value]) => html`<div class="attribute-row">
                                                                        <span class="attr-key">${key}</span>
                                                                        <span class="attr-value">
                                                                                ${typeof value === "object"
                                                                                        ? JSON.stringify(value)
                                                                                        : String(value)}
                                                                        </span>
                                                                </div>`,
                                                        )}
                                                </div>`
                                        : html`<div class="placeholder">No attributes available.</div>`}
                        </div>
                `;
        }

        public render() {
                return html`
                        <h4>Selected Object</h4>
                        ${this.selectedObject
                                ? html`
                                                <div class="field">
                                                        <label>Name</label>
                                                        <input
                                                                type="text"
                                                                .value=${this.selectedObject.name || ""}
                                                                @input=${(event: Event) => this.handleNameChange(event)}
                                                        />
                                                </div>
                                                <div class="field">
                                                        <label>UUID</label>
                                                        <input type="text" .value=${this.selectedObject.uuid} readonly />
                                                </div>
                                                ${this.renderVectorControls("Position", "position")}
                                                ${this.renderVectorControls("Scale", "scale")}
                                                ${this.renderRotationControls()}
                                                ${this.renderEntityDetails()}
                                        `
                                : html`<div class="placeholder">
                                                Select an object from the tree to edit its properties.
                                        </div>`}
                `;
        }
}
