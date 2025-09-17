import { LitElement, html} from "lit";
import { customElement } from "lit/decorators.js";

@customElement('dt3d-card-editor')
export class DT3DCardEditor extends LitElement {
	static properties = {
		_config: { state: true },
	};
	private _config: any;

	setConfig(config: any) {
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
	updateConfig(patch: any) {
		this._config = { ...this._config, ...patch };
		this.dispatchEvent(
			new CustomEvent("config-changed", {
				detail: { config: this._config },
				bubbles: true,
				composed: true,
			})
		);
	}

	onValueChanged(e: any) {
		const key = e.target.dataset.key;
		const value = e.target.value;
		this.updateConfig({ [key]: value });
	}


	/**
	 * Presented to the user to configure the card.
	 */
	render() {
		if (!this._config) {
			return html``;
		}

		const { port } = this._config;

		const content= html`
			<div>
				<div>
					<label>Header</label>
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

		console.log(content);
		return content;
	}
}
