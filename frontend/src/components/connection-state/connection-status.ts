import { html, LitElement, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import componentStyles from "./connection-status.css?inline";

@customElement("connection-status")
export class ConnectionStatus extends LitElement {

    static styles = unsafeCSS(componentStyles);

    static properties = {
        collapsed: { type: Boolean, reflect: true },
    };

    public collapsed = true;

    public connectedCallback(): void {
        super.connectedCallback();

		fetch(`http://localhost:${port}/api/hello`)
			.then((r) => r.text())
			.then((text) => {
				const msg = document.createElement("p");
				msg.style.cssText = `
					color: white;
					z-index: 10;
					position: absolute;
					top: 10px;
					right: 10px;
					background: rgba(0,0,0,0.5);
					padding: 5px;
					border-radius: 5px;
				`;

				msg.textContent = text;
			})
			.catch(() => {
				const err = document.createElement("p");
				err.style.cssText = `
					color: red;
					z-index: 10;
					position: absolute;
					bottom: 10px;
					right: 10px;
					background: rgba(0,0,0,0.5);
					padding: 5px;
					border-radius: 5px;
				`;

				err.textContent = `Failed to reach backend on port ${port}`;
			});
    }
    
    public render() {
        return html`
        `;
    }
}