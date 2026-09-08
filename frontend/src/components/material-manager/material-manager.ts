import "../tooltip/tooltip.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {repeat} from "lit/directives/repeat.js";
import type {Material} from "three";

import {MATERIAL_DRAG_MIME} from "../../editor/material-library.js";
import {localManager} from "../../locale/locale.js";
import componentStyles from "./material-manager.css?inline";
import {
	materialPreviewKey,
	MaterialPreviewRenderer,
} from "./material-preview.js";

@customElement("dt3d-material-manager")
export class DT3DMaterialManager extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: Boolean, reflect: true})
	public open = false;

	@property({attribute: false})
	public materials: Material[] = [];

	@property({type: String})
	public selectedMaterialId = "";

	@property({type: String})
	public protectedMaterialId = "";

	@property({attribute: false})
	public usageCounts: Record<string, number> = {};

	@state()
	private searchQuery = "";

	@state()
	private previewUrls = new Map<string, string>();

	private previewFrame: number | null = null;
	private previewGeneration = 0;
	private previewRenderer: MaterialPreviewRenderer | null = null;
	private previewKeys = new Map<string, string>();
	private cancelPreviewYield: (() => void) | null = null;

	protected updated(changed: Map<string, unknown>): void {
		if (changed.has("open") && !this.open) {
			this.cancelPreviewGeneration();
			this.disposePreviewRenderer();
			return;
		}
		if (
			(changed.has("materials") && this.open) ||
			(changed.has("open") && this.open)
		) {
			this.refreshPreviews();
		}
	}

	public connectedCallback(): void {
		super.connectedCallback();
		if (this.open) this.refreshPreviews();
	}

	public disconnectedCallback(): void {
		super.disconnectedCallback();
		this.cancelPreviewGeneration();
		this.disposePreviewRenderer();
		this.previewKeys.clear();
		this.previewUrls = new Map();
	}

	public refreshPreviews(): void {
		if (!this.open || !this.isConnected) return;
		this.cancelPreviewGeneration();
		const generation = this.previewGeneration;
		this.previewFrame = requestAnimationFrame(() => {
			this.previewFrame = null;
			void this.renderMaterialPreviews(generation);
		});
	}

	private cancelPreviewGeneration(): void {
		this.previewGeneration += 1;
		this.cancelPreviewYield?.();
		this.cancelPreviewYield = null;
		if (this.previewFrame !== null) cancelAnimationFrame(this.previewFrame);
		this.previewFrame = null;
	}

	private disposePreviewRenderer(): void {
		this.previewRenderer?.dispose();
		this.previewRenderer = null;
	}

	private async yieldForPreview(generation: number): Promise<boolean> {
		await new Promise<void>((resolve) => {
			const finish = () => {
				this.cancelPreviewYield = null;
				resolve();
			};
			if (window.requestIdleCallback) {
				const id = window.requestIdleCallback(finish, {timeout: 180});
				this.cancelPreviewYield = () => {
					window.cancelIdleCallback(id);
					finish();
				};
			} else {
				const id = setTimeout(finish, 0);
				this.cancelPreviewYield = () => {
					clearTimeout(id);
					finish();
				};
			}
		});
		return (
			generation === this.previewGeneration && this.open && this.isConnected
		);
	}

	private async renderMaterialPreviews(generation: number): Promise<void> {
		const ids = new Set(this.materials.map((material) => material.uuid));
		for (const id of this.previewKeys.keys()) {
			if (!ids.has(id)) this.previewKeys.delete(id);
		}
		this.previewUrls = new Map(
			[...this.previewUrls].filter(([id]) => ids.has(id)),
		);
		if (!ids.size) {
			this.disposePreviewRenderer();
			return;
		}
		const background =
			getComputedStyle(this)
				.getPropertyValue("--secondary-background-color")
				.trim() || "#f1f1f1";
		try {
			for (const material of this.materials) {
				if (!(await this.yieldForPreview(generation))) return;
				const key = materialPreviewKey(material, background);
				if (this.previewKeys.get(material.uuid) === key) continue;
				this.previewRenderer ??= new MaterialPreviewRenderer();
				const url = this.previewRenderer.render(material, background);
				this.previewKeys.set(material.uuid, key);
				this.previewUrls = new Map(this.previewUrls).set(material.uuid, url);
			}
		} catch (error) {
			if (generation !== this.previewGeneration) return;
			console.warn("DT3D: Unable to render material previews", error);
			this.disposePreviewRenderer();
		}
	}

	private dispatch(name: string, detail?: Record<string, unknown>): void {
		this.dispatchEvent(
			new CustomEvent(name, {bubbles: true, composed: true, detail}),
		);
	}

	private selectMaterial(material: Material): void {
		this.dispatch("material-selected", {materialId: material.uuid});
	}

	private startMaterialDrag(event: DragEvent, material: Material): void {
		if (!event.dataTransfer) return;
		event.dataTransfer.effectAllowed = "copy";
		event.dataTransfer.setData(MATERIAL_DRAG_MIME, material.uuid);
		event.dataTransfer.setData("text/plain", material.name || material.type);
	}

	private requestDelete(event: Event, material: Material): void {
		event.stopPropagation();
		this.dispatch("material-delete-request", {materialId: material.uuid});
	}

	private toggleManager(): void {
		this.dispatch("material-manager-toggle");
	}

	private get visibleMaterials(): Material[] {
		const query = this.searchQuery.trim().toLocaleLowerCase();
		return query
			? this.materials.filter((material) =>
				(material.name || material.type).toLocaleLowerCase().includes(query),
			)
			: this.materials;
	}

	protected render() {
		const toggleLabel = localManager.get(
			this.open ? "closeMaterials" : "toggleMaterials",
		);
		return html`
			<dt3d-tooltip .content=${toggleLabel} placement="top">
				<button
					class="collapse-btn"
					@click=${this.toggleManager}
					aria-label=${toggleLabel}
					aria-expanded=${this.open}
				>
					<ha-icon
						icon=${this.open
							? "mdi:arrow-down-drop-circle-outline"
							: "mdi:arrow-up-drop-circle-outline"}
					></ha-icon>
				</button>
			</dt3d-tooltip>
			<section class="manager" aria-hidden=${!this.open}>
				<header>
					<div class="title">
						<ha-icon icon="mdi:palette-swatch"></ha-icon>
						<div>
							<h3>${localManager.get("materials")}</h3>
							<span>${this.materials.length}</span>
						</div>
					</div>
					<input
						type="search"
						.value=${this.searchQuery}
						@input=${(event: Event) => {
							this.searchQuery = (event.currentTarget as HTMLInputElement).value;
						}}
						placeholder=${localManager.get("searchMaterials")}
						aria-label=${localManager.get("searchMaterials")}
					/>
					<dt3d-tooltip .content=${localManager.get("mergeMaterials")} placement="top">
						<button
							class="merge-button"
							@click=${() => this.dispatch("material-merge")}
							aria-label=${localManager.get("mergeMaterials")}
						>
							<ha-icon icon="mdi:merge"></ha-icon>
						</button>
					</dt3d-tooltip>
					<dt3d-tooltip .content=${localManager.get("newMaterial")} placement="top">
						<button
							class="create-button"
							@click=${() => this.dispatch("material-create")}
							aria-label=${localManager.get("newMaterial")}
						>
							<ha-icon icon="mdi:plus"></ha-icon>
						</button>
					</dt3d-tooltip>
				</header>
				<div class="material-grid">
					${repeat(
						this.visibleMaterials,
						(material) => material.uuid,
						(material) => html`
							<article
								class="material-card ${this.selectedMaterialId === material.uuid
									? "selected"
									: ""}"
								tabindex="0"
								role="button"
								aria-pressed=${this.selectedMaterialId === material.uuid}
								.draggable=${true}
								@click=${() => this.selectMaterial(material)}
								@keydown=${(event: KeyboardEvent) => {
									if (event.key === "Enter" || event.key === " ") {
										event.preventDefault();
										this.selectMaterial(material);
									}
								}}
								@dragstart=${(event: DragEvent) =>
									this.startMaterialDrag(event, material)}
							>
								<div class="preview">
									${this.previewUrls.get(material.uuid)
										? html`<img
												src=${this.previewUrls.get(material.uuid)!}
												alt=""
											/>`
										: html`<ha-icon icon="mdi:sphere"></ha-icon>`}
									${material.uuid !== this.protectedMaterialId
										? html`
											<button
												class="delete-button"
												@click=${(event: Event) =>
													this.requestDelete(event, material)}
												aria-label=${localManager.get("deleteMaterial")}
												title=${localManager.get("deleteMaterial")}
											>
												<ha-icon icon="mdi:delete-outline"></ha-icon>
											</button>
										`
										: null}
								</div>
								<div class="card-details">
									<strong>${material.name || material.type}</strong>
									<span>
										${localManager.get("materialUsageCount").replace(
											"{count}",
											String(this.usageCounts[material.uuid] ?? 0),
										)}
									</span>
								</div>
							</article>
						`,
					)}
					${this.visibleMaterials.length === 0
						? html`<div class="empty-state">
								${localManager.get("noMatchingMaterials")}
							</div>`
						: null}
				</div>
			</section>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-material-manager": DT3DMaterialManager;
	}
}
