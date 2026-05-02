import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import componentStyles from "./hint-box.css?inline";

/**
 * HintBox displays a contextual instruction message to guide the user
 * while a tool (measurement, wall, door, window) is active.
 */
@customElement("dt3d-hint-box")
export class DT3DHintBox extends LitElement {
	static styles = unsafeCSS(componentStyles);

	/**
	 * The instruction message to display.
	 * Set to an empty string to hide the box.
	 */
	@property({type: String})
	public message = "";

	protected render() {
		if (!this.message) {
			return html``;
		}

		return html`
			<div class="hint-box" role="status" aria-live="polite">
				<ha-icon class="hint-icon" icon="mdi:information-outline"></ha-icon>
				<span>${this.message}</span>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-hint-box": DT3DHintBox;
	}
}
