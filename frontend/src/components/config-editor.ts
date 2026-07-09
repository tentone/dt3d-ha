import {html, LitElement, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import {normalizeGeneralConfig} from "../editor/general-config.js";
import {localManager} from "../locale/locale.js";
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
	};
	private _config: any;

	/**
	 * Set the configuration of the card.
	 *
	 * @param config - Configuration object.
	 */
	public setConfig(config: any) {
		this._config = {
			address: "localhost",
			port: 8080,
			service_key: "",
			general: normalizeGeneralConfig(config?.general ?? {}),
			visualization_only: false,
			...config,
		};
		this._config.general = normalizeGeneralConfig(this._config.general ?? {});
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
		nextConfig.general = normalizeGeneralConfig(nextConfig.general ?? {});
		this.updateConfig(nextConfig);
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

		const value =
			target.type === "checkbox"
				? target.checked
				: target.dataset.valueType === "number"
					? Number(target.value)
					: target.value;

		console.log("DT3d: Updating config", key, value);

		if (key.includes(".")) {
			this.updateNestedConfig(key, value);
			return;
		}

		this.updateConfig({[key]: value});
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
		const visualizationOnly = booleanConfig(this._config.visualization_only);
		const general = normalizeGeneralConfig(this._config.general ?? {});

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

				<section>
					<h3>${localManager.get("generalConfiguration")}</h3>
					<h4>${localManager.get("rendering")}</h4>
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
					<div>
						<label>${localManager.get("toneMapping")}</label>
						<select
							data-key="general.rendering.toneMapping"
							.value=${general.rendering.toneMapping}
							@change=${this.onValueChanged}
						>
							<option value="none">
								${localManager.get("toneMappingNone")}
							</option>
							<option value="linear">
								${localManager.get("toneMappingLinear")}
							</option>
							<option value="reinhard">
								${localManager.get("toneMappingReinhard")}
							</option>
							<option value="cineon">
								${localManager.get("toneMappingCineon")}
							</option>
							<option value="aces_filmic">
								${localManager.get("toneMappingAcesFilmic")}
							</option>
						</select>
					</div>
					<div>
						<label>${localManager.get("resolution")}</label>
						<select
							data-key="general.rendering.resolution"
							data-value-type="number"
							.value=${String(general.rendering.resolution)}
							@change=${this.onValueChanged}
						>
							<option value="1">100%</option>
							<option value="0.75">75%</option>
							<option value="0.5">50%</option>
						</select>
					</div>
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
					<div>
						<label>${localManager.get("shadowMapType")}</label>
						<select
							data-key="general.rendering.shadowMap.type"
							.value=${general.rendering.shadowMap.type}
							@change=${this.onValueChanged}
						>
							<option value="basic">
								${localManager.get("shadowMapBasic")}
							</option>
							<option value="pcf">${localManager.get("shadowMapPcf")}</option>
							<option value="pcf_soft">
								${localManager.get("shadowMapPcfSoft")}
							</option>
							<option value="vsm">${localManager.get("shadowMapVsm")}</option>
						</select>
					</div>
					<h4>${localManager.get("developmentMode")}</h4>
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
				</section>
			</div>
		`;

		return content;
	}
}
