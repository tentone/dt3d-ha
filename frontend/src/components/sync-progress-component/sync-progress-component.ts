import {html, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {LocalizedElement} from "../../locale/localized-element.js";
import type {SyncProgressSnapshot} from "../../service/space-sync.js";
import componentStyles from "./sync-progress-component.css?inline";

const EMPTY_PROGRESS: SyncProgressSnapshot = {
	active: false,
	completed: 0,
	failed: 0,
	items: [],
	total: 0,
};

@customElement("sync-progress-component")
export class SyncProgressComponent extends LocalizedElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public progress: SyncProgressSnapshot = EMPTY_PROGRESS;

	@property({
		type: Boolean,
		reflect: true,
		attribute: "object-sidebar-collapsed",
	})
	public objectSidebarCollapsed = true;

	protected render() {
		const progress = this.progress ?? EMPTY_PROGRESS;
		if (!progress.active) {
			return html``;
		}

		const finished = progress.completed + progress.failed;
		const total = Math.max(progress.total, finished + progress.items.length, 1);
		const percent = Math.min(
			100,
			Math.max(0, Math.round((finished / total) * 100)),
		);
		const activeItems = progress.items.slice(0, 4);
		const remainingItems = Math.max(
			0,
			progress.items.length - activeItems.length,
		);
		const isLoading = progress.items.some((item) =>
			/^sync(Load|Prepare)/.test(item.operation),
		);
		const title = this.locale.get(
			progress.items.length === 0
				? progress.failed > 0
					? "syncSceneWithErrors"
					: "syncSceneReady"
				: isLoading
					? "syncLoadingScene"
					: "syncSyncingScene",
		);

		return html`
			<div class="sync-progress" role="status" aria-live="polite" aria-label=${title}>
				<div class="sync-header">
					<div class="sync-title">${title}</div>
					<div class="sync-count">${finished}/${total}</div>
				</div>
				<div class="sync-bar" aria-hidden="true">
					<div class="sync-bar-fill" style="width: ${percent}%"></div>
				</div>
				${activeItems.length > 0
					? html`
							<div class="sync-list">
								${activeItems.map(
									(item) => html`
										<div class="sync-item">
											<span class="sync-operation">${this.locale.get(item.operation)}</span>
											<span class="sync-label">${item.operation === "syncLoadSpaces" ? this.locale.get("syncAvailableSpaces") : item.label}</span>
										</div>
									`,
								)}
								${remainingItems > 0
									? html`
											<div class="sync-item">
												<span class="sync-operation">${this.locale.get("syncQueued")}</span>
												<span class="sync-label">${this.locale.get("syncMore").replace("{count}", String(remainingItems))}</span>
											</div>
										`
									: null}
							</div>
						`
					: null}
				${progress.failed > 0
					? html`<div class="sync-failed">${this.locale.get("syncFailed").replace("{count}", String(progress.failed))}</div>`
					: null}
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"sync-progress-component": SyncProgressComponent;
	}
}
