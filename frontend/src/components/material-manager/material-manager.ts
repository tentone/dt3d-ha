import "../tooltip/tooltip.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {repeat} from "lit/directives/repeat.js";
import type {Material} from "three";
import {
	AmbientLight,
	Color,
	DirectionalLight,
	Mesh,
	PerspectiveCamera,
	Scene,
	SphereGeometry,
	SRGBColorSpace,
	WebGLRenderer,
} from "three";

import {MATERIAL_DRAG_MIME} from "../../editor/material-library.js";
import {localManager} from "../../locale/locale.js";
import componentStyles from "./material-manager.css?inline";

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

	protected updated(changed: Map<string, unknown>): void {
		if (changed.has("open") && !this.open) {
			this.cancelPreviewGeneration();
			return;
		}
		if (
			(changed.has("materials") && this.open) ||
			(changed.has("open") && this.open)
		) {
			this.refreshPreviews();
		}
	}

	public disconnectedCallback(): void {
		super.disconnectedCallback();
		this.cancelPreviewGeneration();
	}

	public refreshPreviews(): void {
		if (!this.open) return;
		this.cancelPreviewGeneration();
		const generation = this.previewGeneration;
		this.previewFrame = requestAnimationFrame(() => {
			this.previewFrame = null;
			void this.renderMaterialPreviews(generation);
		});
	}

	private cancelPreviewGeneration(): void {
		this.previewGeneration += 1;
		if (this.previewFrame !== null) cancelAnimationFrame(this.previewFrame);
		this.previewFrame = null;
	}

	private async yieldForPreview(generation: number): Promise<boolean> {
		await new Promise<void>((resolve) => {
			const scheduleIdle = window.requestIdleCallback?.bind(window);
			if (scheduleIdle) {
				scheduleIdle(() => resolve(), {timeout: 180});
			} else {
				setTimeout(resolve, 0);
			}
		});
		return generation === this.previewGeneration && this.open;
	}

	private async renderMaterialPreviews(generation: number): Promise<void> {
		if (this.materials.length === 0) {
			this.previewUrls = new Map();
			return;
		}
		if (!(await this.yieldForPreview(generation))) return;

		let renderer: WebGLRenderer | null = null;
		let geometry: SphereGeometry | null = null;
		try {
			renderer = new WebGLRenderer({
				alpha: true,
				antialias: true,
				preserveDrawingBuffer: true,
			});
			renderer.setPixelRatio(1);
			renderer.setSize(160, 120, false);
			renderer.outputColorSpace = SRGBColorSpace;

			const scene = new Scene();
			const backgroundColor = getComputedStyle(this)
				.getPropertyValue("--secondary-background-color")
				.trim();
			scene.background = new Color(backgroundColor || "#f1f1f1");
			const camera = new PerspectiveCamera(32, 4 / 3, 0.1, 20);
			camera.position.set(0, 0.1, 3.8);
			camera.lookAt(0, 0, 0);
			geometry = new SphereGeometry(0.82, 48, 32);
			const sphere = new Mesh(geometry, this.materials[0]);
			scene.add(sphere);
			scene.add(new AmbientLight(0xffffff, 1.35));
			const keyLight = new DirectionalLight(0xffffff, 2.8);
			keyLight.position.set(3, 4, 4);
			scene.add(keyLight);
			const rimLight = new DirectionalLight(0x87aaff, 0.85);
			rimLight.position.set(-3, 1, -2);
			scene.add(rimLight);

			const previews = new Map<string, string>();
			for (const material of this.materials) {
				if (!(await this.yieldForPreview(generation))) return;
				sphere.material = material;
				renderer.render(scene, camera);
				previews.set(material.uuid, renderer.domElement.toDataURL("image/png"));
				this.previewUrls = new Map(previews);
			}
		} catch (error) {
			if (generation !== this.previewGeneration) return;
			console.warn("DT3D: Unable to render material previews", error);
			this.previewUrls = new Map();
		} finally {
			geometry?.dispose();
			renderer?.dispose();
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
