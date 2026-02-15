import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { CameraMode } from "../../scene.js";
import "../floating-button/floating-button.js";

@customElement("dt3d-camera-toggle")
export class DT3DCameraToggle extends LitElement {
	@property({ type: String })
	public mode: CameraMode = "perspective";

	private handleToggle(): void {
		const nextMode: CameraMode =
			this.mode === "perspective" ? "orthographic" : "perspective";
		this.mode = nextMode;
		this.dispatchEvent(
			new CustomEvent("camera-mode-change", {
				detail: { mode: nextMode },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private getLabel(): string {
		return this.mode === "perspective" ? "3D" : "2D";
	}

	private getAriaLabel(): string {
		return this.mode === "perspective"
			? "Switch to orthographic camera"
			: "Switch to perspective camera";
	}

	private handleFloatingClick(): void {
		this.handleToggle();
	}

	protected render() {
		return html`
			<dt3d-floating-button
				@floating-button-click=${this.handleFloatingClick}
				ariaLabel=${this.getAriaLabel()}
				titleText=${this.getAriaLabel()}>
				${this.getLabel()}
			</dt3d-floating-button>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-camera-toggle": DT3DCameraToggle;
	}
}
