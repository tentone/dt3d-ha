import "../floating-button/floating-button.js";

import {css, html, LitElement, nothing} from "lit";
import {customElement, property} from "lit/decorators.js";

import {localManager} from "../../locale/locale.js";

export type XrMode = "vr" | "ar";

@customElement("dt3d-xr-controls")
export class DT3DXrControls extends LitElement {
	static styles = css`
		:host {
			display: flex;
			position: absolute;
			width: 48px;
			flex-direction: column;
			gap: 8px;
			z-index: 5;
		}

		:host([hidden]) {
			display: none;
		}

		:host([busy]) {
			opacity: 0.65;
			pointer-events: none;
		}

		dt3d-floating-button {
			position: static;
		}
	`;

	@property({type: Boolean})
	public vrAvailable = false;

	@property({type: Boolean})
	public arAvailable = false;

	@property({type: String})
	public activeMode: XrMode | "" = "";

	@property({type: Boolean, reflect: true})
	public busy = false;

	private requestSessionToggle(mode: XrMode): void {
		this.dispatchEvent(
			new CustomEvent("xr-session-toggle", {
				detail: {mode},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private getAriaLabel(mode: XrMode): string {
		if (this.activeMode === mode) {
			return localManager.get(mode === "vr" ? "exitVr" : "exitAr");
		}

		return localManager.get(mode === "vr" ? "enterVr" : "enterAr");
	}

	protected render() {
		return html`
			${this.vrAvailable && (!this.activeMode || this.activeMode === "vr")
				? html`
						<dt3d-floating-button
							@floating-button-click=${() => this.requestSessionToggle("vr")}
							ariaLabel=${this.getAriaLabel("vr")}
							titleText=${this.getAriaLabel("vr")}
						>
							${this.activeMode === "vr" ? localManager.get("exitXr") : "VR"}
						</dt3d-floating-button>
					`
				: nothing}
			${this.arAvailable && (!this.activeMode || this.activeMode === "ar")
				? html`
						<dt3d-floating-button
							@floating-button-click=${() => this.requestSessionToggle("ar")}
							ariaLabel=${this.getAriaLabel("ar")}
							titleText=${this.getAriaLabel("ar")}
						>
							${this.activeMode === "ar" ? localManager.get("exitXr") : "AR"}
						</dt3d-floating-button>
					`
				: nothing}
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-xr-controls": DT3DXrControls;
	}
}
