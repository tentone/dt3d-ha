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

    public render() {
        return html`
        `;
    }
}