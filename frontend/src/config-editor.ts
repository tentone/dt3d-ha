import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("dt3d-config-editor")
export class DT3DConfigEditor extends LitElement {
	static styles = [
		css`
			:host {
				display: block;
				color: var(--ha-color-neutral-95);
				background: var(--ha-color-neutral-20);
				padding: 8px;
				border: 1px solid var(--ha-color-primary-40);
				border-radius: 8px;
				box-shadow: 0 2px 4px
					color-mix(in srgb, var(--ha-color-neutral-05) 10%, transparent);
				font-family: "Roboto", "Noto", sans-serif;
			}

			label {
				display: block;
				margin-bottom: 6px;
				font-weight: 600;
				color: var(--ha-color-neutral-80);
			}

			input {
				width: 100%;
				padding: 8px;
				border-radius: 6px;
				border: 1px solid var(--ha-color-primary-40);
				background: var(--ha-color-neutral-80);
				color: var(--ha-color-neutral-95);
				box-sizing: border-box;
				font-size: 1em;
			}

			input:focus {
				border-color: var(--ha-color-primary-60);
				outline: none;
				box-shadow: 0 0 0 2px
					color-mix(in srgb, var(--ha-color-primary-60-light) 50%, transparent);
			}
		`,
	];
	static properties = {
		_config: { state: true },
	};
	private _config: any;

	public setConfig(config: any) {
		this._config = {
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
		this._config = { ...this._config, ...patch };
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config: this._config },
				bubbles: true,
				composed: true,
			}),
		);
	}

	public onValueChanged(e: any) {
		const key = e.target.dataset.key;
		const value = e.target.value;

		console.log("DT3d: Updating config", key, value);

		this.updateConfig({ [key]: value });
	}

	/**
	 * Presented to the user to configure the card.
	 */
	public render() {
		if (!this._config) {
			return html``;
		}

		const { port } = this._config;

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
			</div>
		`;

		return content;
	}
}
