import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("dt3d-floating-button")
export class DT3DFloatingButton extends LitElement {
	@property({ type: String })
	public ariaLabel = "";

	@property({ type: String })
	public titleText = "";

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

	private handleClick(event: MouseEvent): void {
		this.dispatchEvent(
			new CustomEvent("floating-button-click", {
				detail: { event },
				bubbles: true,
				composed: true,
			}),
		);
	}

	protected render() {
		return html`
			<button
				@click=${this.handleClick}
				aria-label=${this.ariaLabel}
				title=${this.titleText}>
				<slot></slot>
			</button>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-floating-button": DT3DFloatingButton;
	}
}
