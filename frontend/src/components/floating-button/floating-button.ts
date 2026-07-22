import {css, html, LitElement} from "lit";
import {customElement, property} from "lit/decorators.js";

@customElement("dt3d-floating-button")
export class DT3DFloatingButton extends LitElement {
	@property({type: String})
	public ariaLabel = "";

	@property({type: String})
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
			border: 1px solid var(--divider-color);
			background: color-mix(
				in srgb,
				var(--card-background-color) 92%,
				transparent
			);
			color: var(--primary-text-color);
			font-size: 12px;
			font-weight: 600;
			letter-spacing: 0.5px;
			box-shadow: 0 6px 16px var(--shadow-color);
			cursor: pointer;
			display: flex;
			align-items: center;
			justify-content: center;
			transition:
				transform 0.15s ease,
				background 0.15s ease;
		}

		button:hover {
			background: var(--secondary-background-color);
			transform: translateY(-1px);
		}

		button:active {
			transform: translateY(0);
		}

		button:focus-visible {
			outline: 2px solid var(--primary-color);
			outline-offset: 2px;
		}
	`;

	private handleClick(event: MouseEvent): void {
		this.dispatchEvent(
			new CustomEvent("floating-button-click", {
				detail: {event},
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
				title=${this.titleText}
			>
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
