import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { CameraMode } from "./scene.js";

@customElement("dt3d-camera-toggle")
export class DT3DCameraToggle extends LitElement {
	@property({ type: String })
	public mode: CameraMode = "perspective";

	static styles = css`
		:host {
			position: absolute;
			right: 16px;
			bottom: 16px;
			z-index: 5;
			display: block;
		}

		button {
			width: 48px;
			height: 48px;
			border-radius: 999px;
			border: none;
			background: rgba(0, 0, 0, 0.65);
			color: #ffffff;
			font-size: 12px;
			font-weight: 600;
			letter-spacing: 0.5px;
			box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition: transform 0.15s ease, background 0.15s ease;
		}

		button:hover {
			background: rgba(0, 0, 0, 0.8);
			transform: translateY(-1px);
		}

		button:active {
			transform: translateY(0);
		}

		button:focus-visible {
			outline: 2px solid rgba(255, 255, 255, 0.9);
			outline-offset: 2px;
		}
	`;

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

	protected render() {
		return html`
			<button
				@click=${this.handleToggle}
				aria-pressed=${this.mode === "orthographic"}
				aria-label=${this.getAriaLabel()}
				title=${this.getAriaLabel()}>
				${this.getLabel()}
			</button>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-camera-toggle": DT3DCameraToggle;
	}
}
