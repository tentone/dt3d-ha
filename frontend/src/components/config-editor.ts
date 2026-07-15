import {html, LitElement, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import {localManager} from "../locale/locale.js";
import type {SpaceResponse} from "../service/space-api.js";
import {SpaceApi} from "../service/space-api.js";
import componentStyles from "./config-editor.css?inline";

const booleanConfig = (value: unknown): boolean =>
	value === true || value === "true" || value === "1";

@customElement("dt3d-config-editor")
export class DT3DConfigEditor extends LitElement {
	static styles = unsafeCSS(componentStyles);

	static properties = {
		_config: {state: true},
		_spaces: {state: true},
	};
	private _config: any;
	private _spaces: SpaceResponse[] = [];
	private spacesConnectionKey = "";
	private spacesReloadTimer: number | null = null;
	private spacesRequestSequence = 0;

	/**
	 * Set the configuration of the card.
	 *
	 * @param config - Configuration object.
	 */
	public setConfig(config: any) {
		const cardConfig = {...config};
		delete cardConfig.general;

		this._config = {
			address: "localhost",
			port: 8080,
			service_key: "",
			default_space: "",
			default_viewport: "",
			visualization_only: false,
			...cardConfig,
		};
		this._config.default_space =
			config?.default_space ?? config?.defaultSpace ?? "";
		this._config.default_viewport =
			config?.default_viewport ?? config?.defaultViewport ?? "";
		const connectionKey = this.getSpacesConnectionKey();
		if (connectionKey !== this.spacesConnectionKey) {
			this.spacesConnectionKey = connectionKey;
			this.scheduleSpacesReload();
		}
	}

	public disconnectedCallback(): void {
		super.disconnectedCallback();
		if (this.spacesReloadTimer !== null) {
			window.clearTimeout(this.spacesReloadTimer);
			this.spacesReloadTimer = null;
		}
		this.spacesRequestSequence += 1;
	}

	private getSpacesConnectionKey(): string {
		return JSON.stringify([
			String(this._config?.address ?? "").trim(),
			Number(this._config?.port),
			String(this._config?.service_key ?? ""),
		]);
	}

	private scheduleSpacesReload(): void {
		this._spaces = [];
		this.spacesRequestSequence += 1;
		const requestSequence = this.spacesRequestSequence;

		if (this.spacesReloadTimer !== null) {
			window.clearTimeout(this.spacesReloadTimer);
		}

		this.spacesReloadTimer = window.setTimeout(() => {
			this.spacesReloadTimer = null;
			void this.reloadSpaces(requestSequence);
		}, 300);
	}

	private async reloadSpaces(requestSequence: number): Promise<void> {
		const address = String(this._config?.address ?? "").trim();
		const port = Number(this._config?.port);
		if (!address || !Number.isInteger(port) || port < 1 || port > 65535) {
			return;
		}

		try {
			const spaces = await new SpaceApi(
				address,
				port,
				String(this._config?.service_key ?? ""),
			).listSpaces();
			if (requestSequence === this.spacesRequestSequence) {
				this._spaces = spaces;
			}
		} catch {
			if (requestSequence === this.spacesRequestSequence) {
				this._spaces = [];
			}
		}
	}

	/**
	 * Update the config and fire the "config-changed" event.
	 *
	 * This will update the card in the UI.
	 *
	 * @param {*} patch
	 */
	public updateConfig(patch: any) {
		this._config = {...this._config, ...patch};
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: {config: this._config},
				bubbles: true,
				composed: true,
			}),
		);
	}

	/**
	 * Update the config on change.
	 *
	 * @param e - Event
	 */
	public onValueChanged(e: any) {
		const target = e.target as HTMLInputElement;
		const key = target.dataset.key;
		if (!key) {
			return;
		}

		const value = target.type === "checkbox" ? target.checked : target.value;

		console.log("DT3d: Updating config", key, value);

		this.updateConfig({[key]: value});
		if (key === "address" || key === "port" || key === "service_key") {
			this.spacesConnectionKey = this.getSpacesConnectionKey();
			this.scheduleSpacesReload();
		}
	}

	private onDefaultSpaceChanged(e: Event): void {
		const target = e.target as HTMLSelectElement;
		this.updateConfig({
			default_space: target.value,
			default_viewport: "",
		});
	}

	/**
	 * Presented to the user to configure the card.
	 */
	public render() {
		if (!this._config) {
			return html``;
		}

		const port = this._config.port;
		const address = this._config.address;
		const serviceKey = this._config.service_key;
		const defaultSpace = this._config.default_space ?? "";
		const defaultViewport =
			this._config.default_viewport ?? this._config.defaultViewport ?? "";
		const selectedSpace =
			this._spaces.find((space) => space.id === defaultSpace) ?? this._spaces[0];
		const viewports = (selectedSpace?.object_instances ?? []).filter(
			(instance) => instance.type === "viewport",
		);
		const visualizationOnly = booleanConfig(this._config.visualization_only);

		const content = html`
			<div class="config-sections">
				<section>
					<h3>${localManager.get("configuration")}</h3>
					<div>
						<label>${localManager.get("port")}</label>
						<input
							type="number"
							data-key="port"
							.value=${port ?? ""}
							@input=${this.onValueChanged}
							placeholder="8080"
						/>
					</div>
					<div>
						<label>${localManager.get("address")}</label>
						<input
							type="text"
							data-key="address"
							.value=${address ?? ""}
							@input=${this.onValueChanged}
							placeholder="localhost"
						/>
					</div>
					<div>
						<label>${localManager.get("serviceKey")}</label>
						<input
							type="password"
							data-key="service_key"
							.value=${serviceKey ?? ""}
							@input=${this.onValueChanged}
							autocomplete="off"
						/>
					</div>
					${this._spaces.length > 0
						? html`
								<div>
									<label>${localManager.get("defaultSpace")}</label>
									<select
										data-key="default_space"
										.value=${defaultSpace}
										@change=${this.onDefaultSpaceChanged}>
										<option value="">
											${localManager.get("firstAvailableSpace")}
										</option>
										${this._spaces.map(
											(space) => html`<option value=${space.id}>
												${space.name}
											</option>`,
										)}
									</select>
									<p>${localManager.get("defaultSpaceDescription")}</p>
								</div>
								<div>
									<label>${localManager.get("cardViewport")}</label>
									<select
										data-key="default_viewport"
										.value=${defaultViewport}
										@change=${this.onValueChanged}>
										<option value="">
											${localManager.get("spaceDefaultViewport")}
										</option>
										${viewports.map(
											(viewport) => html`<option value=${viewport.id}>
												${viewport.name}
											</option>`,
										)}
									</select>
									<p>${localManager.get("cardViewportDescription")}</p>
								</div>
							`
						: ""}
					<div class="checkbox-field">
						<input
							id="visualization-only"
							type="checkbox"
							data-key="visualization_only"
							?checked=${visualizationOnly}
							@change=${this.onValueChanged}
						/>
						<div>
							<label for="visualization-only"
								>${localManager.get("visualizationOnly")}</label
							>
							<p>${localManager.get("visualizationOnlyDescription")}</p>
						</div>
					</div>
				</section>
			</div>
		`;

		return content;
	}
}
