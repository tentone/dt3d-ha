import type {PropertyValues} from "lit";
import {html, LitElement, nothing, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";

import type {
	ModelCategoryId,
	ModelLibraryEntry,
} from "../../editor/model-library.js";
import {
	filterModels,
	MODEL_CATEGORIES,
	MODEL_LIBRARY,
	MODEL_ROOMS,
	modelLabel,
} from "../../editor/model-library.js";
import {ModelPreviewRenderer} from "../../editor/model-preview.js";
import {localManager} from "../../locale/locale.js";
import componentStyles from "./model-library.css?inline";

@customElement("dt3d-model-library")
export class DT3DModelLibrary extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: Number}) public x = 8;
	@property({type: Number}) public y = 8;
	@state() private query = "";
	@state() private room = "all";
	@state() private category: ModelCategoryId | "all" = "all";

	private previews = new ModelPreviewRenderer();
	private attempted = new Set<string>();
	private generation = 0;
	private generating = false;
	private frame: number | null = null;

	public override connectedCallback(): void {
		super.connectedCallback();
		this.requestUpdate();
	}

	public override disconnectedCallback(): void {
		super.disconnectedCallback();
		this.generation++;
		if (this.frame !== null) cancelAnimationFrame(this.frame);
		this.frame = null;
		this.generating = false;
		this.attempted.clear();
		this.previews.dispose();
	}

	protected override firstUpdated(): void {
		this.renderRoot.querySelector<HTMLInputElement>("input")?.focus();
	}

	protected override updated(changed: PropertyValues): void {
		if (
			changed.has("query") ||
			changed.has("category") ||
			changed.has("room")
		) {
			this.renderRoot.querySelector(".results")?.scrollTo({top: 0});
		}
		this.generatePreviews();
	}

	/** Yield between thumbnails so search, category changes, and closing remain responsive. */
	private generatePreviews(): void {
		if (this.generating || !this.isConnected) return;
		const entry = filterModels(this.query, this.category, this.room).find(
			(item) =>
				!this.attempted.has(item.type) && !this.previews.cached(item.type),
		);
		if (!entry) return;
		this.generating = true;
		const generation = this.generation;
		this.frame = requestAnimationFrame(() => {
			this.frame = null;
			if (generation !== this.generation || !this.isConnected) return;
			this.attempted.add(entry.type);
			this.previews.render(entry);
			this.generating = false;
			this.requestUpdate();
		});
	}

	private close(): void {
		this.dispatchEvent(
			new CustomEvent("modal-close", {bubbles: true, composed: true}),
		);
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (event.key === "Escape") {
			event.stopPropagation();
			this.close();
		} else if (event.key === "Tab") {
			const controls = [
				...this.renderRoot.querySelectorAll<HTMLElement>(
					"button, input, select",
				),
			];
			const first = controls[0];
			const last = controls[controls.length - 1];
			const active = this.shadowRoot?.activeElement;
			if (event.shiftKey && active === first) {
				event.preventDefault();
				last?.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first?.focus();
			}
		}
	}

	private select(entry: ModelLibraryEntry): void {
		this.dispatchEvent(
			new CustomEvent(
				entry.kind === "opening" ? "wall-tool-selected" : "add-object",
				{
					detail:
						entry.kind === "opening"
							? {mode: entry.type}
							: {type: entry.type},
					bubbles: true,
					composed: true,
				},
			),
		);
		this.close();
	}

	private upload(directory: boolean): void {
		this.dispatchEvent(
			new CustomEvent("upload-selected", {
				detail: {action: directory ? "model-directory" : "model-files"},
				bubbles: true,
				composed: true,
			}),
		);
		this.close();
	}

	private renderModel(entry: ModelLibraryEntry) {
		const label = modelLabel(entry);
		const preview = this.previews.cached(entry.type);
		return html`
			<button
				class="model"
				@click=${() => this.select(entry)}
				aria-label=${`${localManager.get("add")} ${label}`}
				title=${label}
			>
				<span class="preview">
					${preview
						? html`<img src=${preview} alt="" width="240" height="180" />`
						: html`<ha-icon icon=${entry.icon}></ha-icon>`}
					<span class="add-indicator" aria-hidden="true">+</span>
				</span>
				<span class="model-name">${label}</span>
			</button>
		`;
	}

	public override render() {
		const results = filterModels(this.query, this.category, this.room);
		const matching = filterModels(this.query, "all", this.room);
		const roomModels = filterModels("", "all", this.room);
		const order = MODEL_ROOMS.find((room) => room.id === this.room)?.categories;
		const categories = MODEL_CATEGORIES.filter(
			(category) =>
				this.room === "all" ||
				roomModels.some((entry) => entry.category === category.id),
		).sort((a, b) => (order ? order.indexOf(a.id) - order.indexOf(b.id) : 0));
		return html`
			<div class="overlay" @click=${this.close}></div>
			<section
				class="library"
				style=${`--menu-x: ${this.x}px; --menu-y: ${this.y}px;`}
				role="dialog"
				aria-modal="true"
				aria-labelledby="library-title"
				@keydown=${this.handleKeyDown}
			>
				<header>
					<div>
						<h2 id="library-title">${localManager.get("modelLibrary")}</h2>
						<p>${localManager.get("modelLibraryHint")}</p>
					</div>
					<button
						class="icon-button"
						@click=${this.close}
						aria-label=${localManager.get("closeModelLibrary")}
					>
						<ha-icon icon="mdi:close"></ha-icon>
					</button>
				</header>
				<div class="search-row">
					<label class="search"
						><ha-icon icon="mdi:magnify"></ha-icon>
						<input
							type="search"
							.value=${this.query}
							placeholder=${localManager.get("searchModels")}
							aria-label=${localManager.get("searchModels")}
							@input=${(event: Event) => {
								this.query = (event.target as HTMLInputElement).value;
							}}
						/>
					</label>
					<select
						class="room-filter"
						aria-label=${localManager.get("filterModelRoom")}
						.value=${this.room}
						@change=${(event: Event) => {
							this.room = (event.target as HTMLSelectElement).value;
							this.category = "all";
						}}
					>
						<option value="all">${localManager.get("allModelRooms")}</option>
						${MODEL_ROOMS.map(
							(room) =>
								html`<option value=${room.id}>
									${localManager.get(room.labelKey)}
								</option>`,
						)}
					</select>
				</div>
				<div class="explorer">
					<nav aria-label=${localManager.get("modelCategories")}>
						<button
							class=${this.category === "all"
								? "category selected"
								: "category"}
							aria-pressed=${this.category === "all"}
							@click=${() => {
								this.category = "all";
							}}
						>
							<ha-icon icon="mdi:view-grid-outline"></ha-icon
							><span>${localManager.get("allModels")}</span
							><span class="count">${matching.length}</span>
						</button>
						${categories.map(
							(category) => html`
								<button
									class=${this.category === category.id
										? "category selected"
										: "category"}
									aria-pressed=${this.category === category.id}
									@click=${() => {
										this.category = category.id;
									}}
								>
									<ha-icon icon=${category.icon}></ha-icon
									><span>${localManager.get(category.labelKey)}</span
									><span class="count"
										>${matching.filter(
											(entry) => entry.category === category.id,
										).length}</span
									>
								</button>
							`,
						)}
					</nav>
					<div class="results">
						<p class="results-count" role="status">
							${localManager
								.get("modelResultCount")
								.replace("{count}", String(results.length))
								.replace("{total}", String(MODEL_LIBRARY.length))}
						</p>
						${results.length
							? categories.map((category) => {
									const models = results.filter(
										(entry) => entry.category === category.id,
									);
									return models.length
										? html`<section
												class="model-section"
												aria-labelledby=${`category-${category.id}`}
											>
												<h3 id=${`category-${category.id}`}>
													${localManager.get(category.labelKey)}
												</h3>
												${category.id === "openings"
													? html`<p class="opening-hint">
															${localManager.get("modelOpeningsHint")}
														</p>`
													: nothing}
												<div class="model-grid">
													${models.map((entry) => this.renderModel(entry))}
												</div>
											</section>`
										: nothing;
								})
							: html`<div class="empty">
									<ha-icon icon="mdi:magnify"></ha-icon>
									<p>${localManager.get("noMatchingModels")}</p>
									<button
										@click=${() => {
											this.query = "";
											this.category = "all";
											this.room = "all";
										}}
									>
										${localManager.get("clearModelFilters")}
									</button>
								</div>`}
					</div>
				</div>
				<footer>
					<button @click=${() => this.upload(false)}>
						<ha-icon icon="mdi:file-upload-outline"></ha-icon
						>${localManager.get("uploadModelFiles")}
					</button>
					<button @click=${() => this.upload(true)}>
						<ha-icon icon="mdi:folder-upload-outline"></ha-icon
						>${localManager.get("uploadModelDirectory")}
					</button>
				</footer>
			</section>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-model-library": DT3DModelLibrary;
	}
}
