import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";
import componentStyles from "./connection-status.css?inline";

@customElement("dt3d-connection-status")
export class ConnectionStatus extends LitElement {
	static properties = {
		port: {type: Number, reflect: true},
		address: {type: String, reflect: true},
	};

	static styles = unsafeCSS(componentStyles);

	/**
	 * Address to connect to the backend.
	 */
	public address: string = "localhost";

	/**
	 * Port to connect to the backend.
	 */
	public port: number = 8080;

	@property()
	public msg: string = localManager.get("waiting");

	/**
	 * Flag to define if the comunication was successfull or not.
	 */
	@property()
	public success: boolean = true;

	public connectedCallback(): void {
		super.connectedCallback();

		fetch(`http://${this.address}:${this.port}/api/hello`)
			.then((r) => r.text())
			.then((text) => {
				this.msg = `${localManager.get("connectedToBackend")} ${this.address}:${this.port}`;
				this.success = true;
			})
			.catch(() => {
				this.msg = `${localManager.get("failedToReachBackend")} ${this.address}:${this.port}`;
				this.success = false;
			});
	}

	public render() {
		return html`<div style="margin: 5px;" class="${this.success ? "connection-status-success" : "connection-status-error"}">
			${this.msg}<br>${BUILD_TIMESTAMP}
		</div>`;
	}
}
