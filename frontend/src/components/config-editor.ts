import {html, LitElement, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import {normalizeEntityInteractionConfig} from "../editor/entity-actions.js";
import {normalizeCardGeneralConfig} from "../editor/general-config.js";
import {normalizeNavigationControlsType} from "../editor/scene.js";
import {localManager} from "../locale/locale.js";
import type {SpaceResponse} from "../service/space-api.js";
import {SpaceApi} from "../service/space-api.js";
import componentStyles from "./config-editor.css?inline";

const booleanConfig = (value: unknown): boolean =>
	value === true || value === "true" || value === "1";

const cloneConfig = (value: unknown): any => {
	if (Array.isArray(value)) {
		return value.map((item) => cloneConfig(item));
	}

	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
				key,
				cloneConfig(entry),
			]),
		);
	}

	return value;
};

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
		const entityInteractions = normalizeEntityInteractionConfig(config);
		this._config = {
			address: "localhost",
			port: 8080,
			service_key: "",
			default_space: "",
			default_viewport: "",
			navigation_controls: "orbit",
			orientation_cube: false,
			visualization_only: false,
			entity_click_action: entityInteractions.click,
			entity_double_click_action: entityInteractions.doubleClick,
			...config,
			general: normalizeCardGeneralConfig(config?.general ?? config ?? {}),
		};
		this._config.default_space =
			config?.default_space ?? config?.defaultSpace ?? "";
		this._config.default_viewport =
			config?.default_viewport ?? config?.defaultViewport ?? "";
		this._config.orientation_cube = booleanConfig(
			config?.orientation_cube ?? config?.orientationCube,
		);
		this._config.navigation_controls = normalizeNavigationControlsType(
			config?.navigation_controls ??
				config?.navigationControls ??
				config?.navigation_control ??
				config?.navigationControl,
		);
		this._config.entity_click_action = entityInteractions.click;
		this._config.entity_double_click_action = entityInteractions.doubleClick;
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
	 * @param patch - Card configuration patch.
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

	private updateNestedConfig(path: string, value: unknown): void {
		const nextConfig = cloneConfig(this._config);
		const keys = path.split(".");
		let current = nextConfig;

		for (let index = 0; index < keys.length - 1; index += 1) {
			const key = keys[index];
			current[key] =
				current[key] && typeof current[key] === "object"
					? {...current[key]}
					: {};
			current = current[key];
		}

		current[keys[keys.length - 1]] = value;
		nextConfig.general = normalizeCardGeneralConfig(nextConfig.general ?? {});
		this.updateConfig(nextConfig);
	}

	/**
	 * Update the config on change.
	 *
	 * @param event - Input event.
	 */
	public onValueChanged(event: Event) {
		const target = event.target as HTMLInputElement;
		const key = target.dataset.key;
		if (!key) {
			return;
		}

		const value =
			target.type === "checkbox"
				? target.checked
				: target.dataset.valueType === "number"
					? Number(target.value)
					: target.value;

		if (key.includes(".")) {
			this.updateNestedConfig(key, value);
			return;
		}

		this.updateConfig({[key]: value});
		if (key === "address" || key === "port" || key === "service_key") {
			this.spacesConnectionKey = this.getSpacesConnectionKey();
			this.scheduleSpacesReload();
		}
	}

	private onDefaultSpaceChanged(event: Event): void {
		const target = event.target as HTMLSelectElement;
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
		const orientationCube = booleanConfig(this._config.orientation_cube);
		const navigationControls = normalizeNavigationControlsType(
			this._config.navigation_controls,
		);
		const entityInteractions = normalizeEntityInteractionConfig(this._config);
		const general = normalizeCardGeneralConfig(this._config.general ?? {});

		return html`
			<div class="config-sections">
				<details open>
					<summary>${localManager.get("connectionSettings")}</summary>
					<div class="section-content">
						<div class="field">
							<label>${localManager.get("address")}</label>
							<input
								type="text"
								data-key="address"
								.value=${address ?? ""}
								@input=${this.onValueChanged}
								placeholder="http://localhost"
							/>
						</div>
						<div class="field">
							<label>${localManager.get("port")}</label>
							<input
								type="number"
								data-key="port"
								.value=${port ?? ""}
								@input=${this.onValueChanged}
								placeholder="8080"
							/>
						</div>
						<div class="field">
							<label>${localManager.get("serviceKey")}</label>
							<input
								type="password"
								data-key="service_key"
								.value=${serviceKey ?? ""}
								@input=${this.onValueChanged}
								autocomplete="off"
							/>
						</div>
					</div>
				</details>

				<details open>
					<summary>${localManager.get("viewAndBehavior")}</summary>
					<div class="section-content">
						<div class="field">
							<label>${localManager.get("navigationControls")}</label>
							<select
								data-key="navigation_controls"
								.value=${navigationControls}
								@change=${this.onValueChanged}>
								<option value="orbit">${localManager.get("orbitControls")}</option>
								<option value="map">${localManager.get("mapControls")}</option>
								<option value="fly">${localManager.get("flyControls")}</option>
							</select>
							<p>${localManager.get("navigationControlsDescription")}</p>
						</div>
						${this._spaces.length > 0
							? html`
									<div class="field">
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
									<div class="field">
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
								id="orientation-cube"
								type="checkbox"
								data-key="orientation_cube"
								?checked=${orientationCube}
								@change=${this.onValueChanged}
							/>
							<div>
								<label for="orientation-cube"
									>${localManager.get("orientationCube")}</label
								>
								<p>${localManager.get("orientationCubeDescription")}</p>
							</div>
						</div>
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
						<div class="field">
							<label>${localManager.get("entityClickAction")}</label>
							<select
								data-key="entity_click_action"
								.value=${entityInteractions.click}
								@change=${this.onValueChanged}>
								<option value="open">${localManager.get("openEntity")}</option>
								<option value="toggle">${localManager.get("toggleEntity")}</option>
								<option value="nothing">${localManager.get("nothing")}</option>
							</select>
							<p>${localManager.get("entityClickActionDescription")}</p>
						</div>
						<div class="field">
							<label>${localManager.get("entityDoubleClickAction")}</label>
							<select
								data-key="entity_double_click_action"
								.value=${entityInteractions.doubleClick}
								@change=${this.onValueChanged}>
								<option value="open">${localManager.get("openEntity")}</option>
								<option value="toggle">${localManager.get("toggleEntity")}</option>
								<option value="nothing">${localManager.get("nothing")}</option>
							</select>
							<p>${localManager.get("entityDoubleClickActionDescription")}</p>
						</div>
					</div>
				</details>

				<details open>
					<summary>${localManager.get("rendering")}</summary>
					<div class="section-content">
						<div class="checkbox-field">
							<input
								id="rendering-antialiasing"
								type="checkbox"
								data-key="general.rendering.antialiasing"
								?checked=${general.rendering.antialiasing}
								@change=${this.onValueChanged}
							/>
							<div>
								<label for="rendering-antialiasing"
									>${localManager.get("antialiasing")}</label
								>
								<p>${localManager.get("antialiasingTooltip")}</p>
							</div>
						</div>
						<div class="field">
							<label>${localManager.get("resolution")}</label>
							<select
								data-key="general.rendering.resolution"
								data-value-type="number"
								.value=${String(general.rendering.resolution)}
								@change=${this.onValueChanged}>
								<option value="1">100%</option>
								<option value="0.75">75%</option>
								<option value="0.5">50%</option>
							</select>
							<p>${localManager.get("resolutionTooltip")}</p>
						</div>
						<div class="subsection">
							<h4>${localManager.get("shadowMap")}</h4>
							<div class="checkbox-field">
								<input
									id="shadow-map-enabled"
									type="checkbox"
									data-key="general.rendering.shadowMap.enabled"
									?checked=${general.rendering.shadowMap.enabled}
									@change=${this.onValueChanged}
								/>
								<div>
									<label for="shadow-map-enabled"
										>${localManager.get("enabled")}</label
									>
									<p>${localManager.get("shadowMapEnabledTooltip")}</p>
								</div>
							</div>
							<div class="field">
								<label>${localManager.get("shadowMapType")}</label>
								<select
									data-key="general.rendering.shadowMap.type"
									.value=${general.rendering.shadowMap.type}
									@change=${this.onValueChanged}>
									<option value="basic">
										${localManager.get("shadowMapBasic")}
									</option>
									<option value="pcf">
										${localManager.get("shadowMapPcf")}
									</option>
									<option value="pcf_soft">
										${localManager.get("shadowMapPcfSoft")}
									</option>
									<option value="vsm">
										${localManager.get("shadowMapVsm")}
									</option>
								</select>
								<p>${localManager.get("shadowMapTypeTooltip")}</p>
							</div>
							<div class="field">
								<label>${localManager.get("shadowMapResolution")}</label>
								<select
									data-key="general.rendering.shadowMap.resolution"
									data-value-type="number"
									.value=${String(general.rendering.shadowMap.resolution)}
									@change=${this.onValueChanged}>
									<option value="256">256</option>
									<option value="512">512</option>
									<option value="1024">1024</option>
									<option value="2048">2048</option>
									<option value="4096">4096</option>
								</select>
								<p>${localManager.get("shadowMapResolutionTooltip")}</p>
							</div>
						</div>
					</div>
				</details>

				<details>
					<summary>${localManager.get("developmentMode")}</summary>
					<div class="section-content">
						<div class="checkbox-field">
							<input
								id="development-mode-enabled"
								type="checkbox"
								data-key="general.developmentMode.enabled"
								?checked=${general.developmentMode.enabled}
								@change=${this.onValueChanged}
							/>
							<div>
								<label for="development-mode-enabled"
									>${localManager.get("enabled")}</label
								>
								<p>${localManager.get("developmentModeTooltip")}</p>
							</div>
						</div>
					</div>
				</details>
			</div>
		`;
	}
}
