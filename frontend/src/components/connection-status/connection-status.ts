import "../tooltip/tooltip.js";

import {html, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import {LocalizedElement} from "../../locale/localized-element.js";
import {buildBackendApiUrl, SERVICE_KEY_HEADER} from "../../service/space-api.js";
import componentStyles from "./connection-status.css?inline";

@customElement("dt3d-connection-status")
export class ConnectionStatus extends LocalizedElement {
	static properties = {
		port: {type: Number, reflect: true},
		address: {type: String, reflect: true},
		serviceKey: {type: String, reflect: true},
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

	/**
	 * Key required by the backend service.
	 */
	public serviceKey: string = "";

	@property({attribute: false})
	private status: "waiting" | "connectedToBackend" | "failedToReachBackend" = "waiting";

	/**
	 * Flag to define if the comunication was successfull or not.
	 */
	@property()
	public success: boolean = true;

	public connectedCallback(): void {
		super.connectedCallback();

		const headers: Record<string, string> = {};
		if (this.serviceKey) {
			headers[SERVICE_KEY_HEADER] = this.serviceKey;
		}

		fetch(`${buildBackendApiUrl(this.address, this.port)}/hello`, {headers})
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Request failed: ${response.status}`);
				}

				return response.text();
			})
			.then(() => {
				this.status = "connectedToBackend";
				this.success = true;
			})
			.catch(() => {
				this.status = "failedToReachBackend";
				this.success = false;
			});
	}

	public render() {
		const label = this.locale.get(this.status);
		const message = this.status === "waiting" ? label : `${label} ${this.address}:${this.port}`;
		return html`
		<dt3d-tooltip .content=${`${message} · ${BUILD_TIMESTAMP}`} placement="right">
			<span tabindex="0" role="status" aria-label=${message} class="connection-status-container ${this.success ? "connection-status-success" : "connection-status-error"}">
				<ha-icon icon=${this.success ? "mdi:lan-connect" : "mdi:lan-disconnect"}></ha-icon>
			</span>
		</dt3d-tooltip>`;
	}
}
