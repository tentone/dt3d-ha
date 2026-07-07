import {html, LitElement, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import {localManager} from "../locale/locale.js";
import componentStyles from "./config-editor.css?inline";

const booleanConfig = (value: unknown): boolean =>
	value === true || value === "true" || value === "1";

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
			visualization_only: false,
			...config,
		};
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

		const content = html`
			<div>
				<div>
					<label>${localManager.get("configuration")}</label>
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
						<label for="visualization-only">${localManager.get("visualizationOnly")}</label>
						<p>${localManager.get("visualizationOnlyDescription")}</p>
					</div>
				</div>
			</div>
		`;

		return content;
	}
}
