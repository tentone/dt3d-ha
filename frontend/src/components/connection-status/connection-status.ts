import { html, LitElement, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import componentStyles from "./connection-status.css?inline";

@customElement("connection-status")
export class ConnectionStatus extends LitElement {
    static properties = {
        port: { type: Number, reflect: true },
    };

	static styles = unsafeCSS(componentStyles);

    public port: number = 8080;

    public connectedCallback(): void {
        super.connectedCallback();

		fetch(`http://localhost:${this.port}/api/hello`)
			.then((r) => r.text())
			.then((text) => {
				this.setAttribute('class', 'connection-status-success');
				this.textContent = text;
			})
			.catch(() => {
				this.setAttribute('class', 'connection-status-error');
				this.textContent = `Failed to reach backend on port ${this.port}`;

			});
    }

	public render() {
		return html`<div>
		</div>`;
	}
}