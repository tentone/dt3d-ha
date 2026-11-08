import "../floating-button/floating-button.js";
import "../tooltip/tooltip.js";

import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

import type {CameraMode} from "../../editor/scene.js";
import {localManager} from "../../locale/locale.js";

@customElement("dt3d-camera-toggle")
export class DT3DCameraToggle extends LitElement {
	static styles = css`
		:host {
			display: block;
			position: absolute;
			width: 48px;
			height: 48px;
			z-index: 5;
		}

		:host([hidden]) {
			display: none;
		}

		dt3d-floating-button {
			right: 0;
			bottom: 0;
		}
	`;

	@property({type: String})
	public mode: CameraMode = "perspective";

	private handleToggle(): void {
		const nextMode: CameraMode =
			this.mode === "perspective" ? "orthographic" : "perspective";
		this.mode = nextMode;
		this.dispatchEvent(
			new CustomEvent("camera-mode-change", {
				detail: {mode: nextMode},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private getAriaLabel(): string {
		return this.mode === "perspective"
			? localManager.get("switchToOrthographic")
			: localManager.get("switchToPerspective");
	}

	private handleFloatingClick(): void {
		this.handleToggle();
	}

	protected render() {
		return html`
			<dt3d-tooltip .content=${this.getAriaLabel()} placement="left">
			<dt3d-floating-button
				@floating-button-click=${this.handleFloatingClick}
				ariaLabel=${this.getAriaLabel()}
				>
				<ha-icon icon=${this.mode === "perspective" ? "mdi:cube-outline" : "mdi:view-dashboard-outline"}></ha-icon>
			</dt3d-floating-button>
			</dt3d-tooltip>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-camera-toggle": DT3DCameraToggle;
	}
}
