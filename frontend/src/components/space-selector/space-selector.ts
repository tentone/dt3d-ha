import "../tooltip/tooltip.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import type {SpaceResponse} from "../../service/space-api.js";
import componentStyles from "./space-selector.css?inline";

@customElement("dt3d-space-selector")
export class DT3DSpaceSelector extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public spaces: SpaceResponse[] = [];

	@property({type: String})
	public selectedSpaceId = "";

	@property({type: Boolean})
	public loading = false;

	@property({type: Boolean})
	public editingBlocked = false;

	private handleChange(event: Event): void {
		const spaceId = (event.target as HTMLSelectElement).value;
		this.selectedSpaceId = spaceId;
		this.dispatchEvent(
			new CustomEvent("space-change", {
				detail: {spaceId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private requestCreate(): void {
		this.dispatchEvent(
			new CustomEvent("space-create-request", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private requestDelete(): void {
		if (!this.selectedSpaceId) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent("space-delete-request", {
				detail: {spaceId: this.selectedSpaceId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private requestConfigure(): void {
		if (!this.selectedSpaceId) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent("space-config-request", {
				detail: {spaceId: this.selectedSpaceId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private requestClone(): void {
		if (!this.selectedSpaceId) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent("space-clone-request", {
				detail: {spaceId: this.selectedSpaceId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private requestExport(): void {
		if (!this.selectedSpaceId) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent("space-export-request", {
				detail: {spaceId: this.selectedSpaceId},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private requestImport(): void {
		const input =
			this.renderRoot.querySelector<HTMLInputElement>("#space-import");
		input?.click();
	}

	private handleImportFile(event: Event): void {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = "";
		if (!file) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent("space-import-request", {
				detail: {file},
				bubbles: true,
				composed: true,
			}),
		);
	}

	protected updated(): void {
		// Updating the options can reset the browser's selection after Lit sets .value.
		const select = this.renderRoot.querySelector("select");
		if (select) select.value = this.selectedSpaceId;
	}

	private renderAction(labelKey: string, icon: string, action: () => void, needsSpace = true) {
		const label = localManager.get(labelKey);
		return html`<dt3d-tooltip .content=${this.loading ? localManager.get("loadingSpace") : label} placement="bottom">
			<button type="button" class=${labelKey === "deleteSpace" ? "delete-button" : ""}
				?disabled=${this.loading || this.editingBlocked || (needsSpace && !this.selectedSpaceId)}
				@click=${action} aria-label=${label}>
				<ha-icon icon=${icon}></ha-icon>
			</button>
		</dt3d-tooltip>`;
	}

	protected render() {
		return html`
			<div class="selector" aria-busy=${this.loading}>
				<label for="active-space"><ha-icon icon="mdi:home-city-outline"></ha-icon><span>${localManager.get("space")}</span></label>
				<div class="space-field">
					<select id="active-space" .value=${this.selectedSpaceId}
						?disabled=${this.spaces.length === 0} @change=${this.handleChange}>
						${this.spaces.length === 0 ? html`<option value="">${localManager.get("noSpaces")}</option>` : null}
						${this.spaces.map((space) => html`<option value=${space.id}>${space.name}</option>`)}
					</select>
					${this.loading ? html`<span class="loading-indicator" role="status" aria-label=${localManager.get("loading")}></span>` : null}
				</div>
				<div class="space-actions" role="group" aria-label=${localManager.get("space")}>
					${this.renderAction("spaceConfiguration", "mdi:cog-outline", () => this.requestConfigure())}
					${this.renderAction("createSpace", "mdi:plus", () => this.requestCreate(), false)}
					${this.renderAction("cloneSpace", "mdi:content-copy", () => this.requestClone())}
					${this.renderAction("exportSpace", "mdi:download", () => this.requestExport())}
					${this.renderAction("importSpace", "mdi:upload", () => this.requestImport(), false)}
					${this.renderAction("deleteSpace", "mdi:delete-outline", () => this.requestDelete())}
				</div>
				<input id="space-import" type="file" accept=".dt3d,application/vnd.dt3d+zip" @change=${this.handleImportFile} />
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-space-selector": DT3DSpaceSelector;
	}
}
