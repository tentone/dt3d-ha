import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

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
export class SyncProgressComponent extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public progress: SyncProgressSnapshot = EMPTY_PROGRESS;

	protected render() {
		const progress = this.progress ?? EMPTY_PROGRESS;
		if (!progress.active) {
			return html``;
		}

		const finished = progress.completed + progress.failed;
		const total = Math.max(progress.total, finished + progress.items.length, 1);
		const percent = Math.min(100, Math.max(0, Math.round((finished / total) * 100)));
		const activeItems = progress.items.slice(0, 4);
		const remainingItems = Math.max(0, progress.items.length - activeItems.length);

		return html`
			<div class="sync-progress" role="status" aria-live="polite">
				<div class="sync-header">
					<div class="sync-title">Syncing scene</div>
					<div class="sync-count">${finished}/${total}</div>
				</div>
				<div class="sync-bar" aria-hidden="true">
					<div class="sync-bar-fill" style="width: ${percent}%"></div>
				</div>
				${activeItems.length > 0
					? html`
						<div class="sync-list">
							${activeItems.map((item) => html`
								<div class="sync-item">
									<span class="sync-operation">${item.operation}</span>
									<span class="sync-label">${item.label}</span>
								</div>
							`)}
							${remainingItems > 0
								? html`
									<div class="sync-item">
										<span class="sync-operation">Queued</span>
										<span class="sync-label">${remainingItems} more</span>
									</div>
								`
								: null}
						</div>
					`
					: null}
				${progress.failed > 0
					? html`<div class="sync-failed">${progress.failed} failed</div>`
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
