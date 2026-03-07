import {html, LitElement, unsafeCSS} from "lit";
import {customElement} from "lit/decorators.js";

import componentStyles from "./config-editor.css?inline";

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
		const key = e.target.dataset.key;
		const value = e.target.value;

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

		const content = html`
			<div>
				<div>
					<label>Configuration</label>
					<input
						type="number"
						data-key="port"
						.value=${port ?? ""}
						@input=${this.onValueChanged}
						placeholder="8080"
					/>
				</div>
				<div>
					<label>Address</label>
					<input
						type="text"
						data-key="address"
						.value=${address ?? ""}
						@input=${this.onValueChanged}
						placeholder="localhost"
					/>
				</div>
			</div>
		`;

		return content;
	}
}
