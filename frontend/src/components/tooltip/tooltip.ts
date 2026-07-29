import {html, LitElement, type PropertyValues, unsafeCSS} from "lit";
import {customElement, property, query} from "lit/decorators.js";

import componentStyles from "./tooltip.css?inline";

export type TooltipPlacement = "top" | "right" | "bottom" | "left";

const TOOLTIP_GAP = 10;
const VIEWPORT_PADDING = 5;
const HIDE_ANIMATION_DURATION = 150;
let tooltipId = 0;

/**
 * Tooltip for a single slotted control.
 *
 * The tooltip opens on hover or keyboard focus and is rendered in the browser's
 * top layer so it is not clipped by scrollable toolbars and sidebars.
 */
@customElement("dt3d-tooltip")
export class DT3DTooltip extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: String})
	public content = "";

	@property({type: String, reflect: true})
	public placement: TooltipPlacement = "top";

	@query(".tooltip")
	private tooltipElement!: HTMLElement;

	private readonly tooltipElementId = `dt3d-tooltip-${++tooltipId}`;
	private isOpen = false;
	private supportsPopover = false;
	private hideTimer?: number;
	private frame?: number;

	private readonly reposition = (): void => {
		if (!this.isOpen) {
			return;
		}

		this.positionTooltip();
	};

	public connectedCallback(): void {
		super.connectedCallback();
		this.addEventListener("mouseenter", this.handleMouseEnter);
		this.addEventListener("mouseleave", this.handleMouseLeave);
		this.addEventListener("focusin", this.handleFocusIn);
		this.addEventListener("focusout", this.handleFocusOut);
		this.addEventListener("keydown", this.handleKeyDown);
	}

	public disconnectedCallback(): void {
		this.hide(true);
		this.removeEventListener("mouseenter", this.handleMouseEnter);
		this.removeEventListener("mouseleave", this.handleMouseLeave);
		this.removeEventListener("focusin", this.handleFocusIn);
		this.removeEventListener("focusout", this.handleFocusOut);
		this.removeEventListener("keydown", this.handleKeyDown);
		super.disconnectedCallback();
	}

	protected firstUpdated(): void {
		this.supportsPopover =
			typeof this.tooltipElement.showPopover === "function";
		if (!this.supportsPopover) {
			this.tooltipElement.removeAttribute("popover");
		}
	}

	protected updated(changedProperties: PropertyValues<this>): void {
		if (
			this.isOpen &&
			(changedProperties.has("content") || changedProperties.has("placement"))
		) {
			this.positionTooltip();
		}

		if (this.isOpen && !this.content) {
			this.hide(true);
		}
	}

	private readonly handleMouseEnter = (): void => {
		this.show();
	};

	private readonly handleMouseLeave = (): void => {
		if (!this.matches(":focus-within")) {
			this.hide();
		}
	};

	private readonly handleFocusIn = (): void => {
		this.show();
	};

	private readonly handleFocusOut = (): void => {
		queueMicrotask(() => {
			if (!this.matches(":focus-within")) {
				this.hide();
			}
		});
	};

	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			this.hide();
		}
	};

	private get triggerElement(): HTMLElement | undefined {
		return Array.from(this.children).find(
			(element): element is HTMLElement => element instanceof HTMLElement,
		);
	}

	private show(): void {
		if (!this.content || this.isOpen) {
			return;
		}

		const trigger = this.triggerElement;
		if (!trigger) {
			return;
		}

		window.clearTimeout(this.hideTimer);
		this.isOpen = true;
		this.addDescription(trigger);
		this.tooltipElement.dataset.open = "";

		if (this.supportsPopover) {
			this.tooltipElement.showPopover();
		}

		this.positionTooltip();
		window.addEventListener("resize", this.reposition);
		window.addEventListener("scroll", this.reposition, true);

		this.frame = window.requestAnimationFrame(() => {
			if (this.isOpen) {
				this.tooltipElement.dataset.visible = "";
			}
		});
	}

	private hide(immediately = false): void {
		window.clearTimeout(this.hideTimer);
		window.cancelAnimationFrame(this.frame ?? 0);
		this.isOpen = false;
		this.removeDescription(this.triggerElement);
		window.removeEventListener("resize", this.reposition);
		window.removeEventListener("scroll", this.reposition, true);

		if (!this.tooltipElement) {
			return;
		}

		delete this.tooltipElement.dataset.visible;

		const finishHiding = (): void => {
			if (this.isOpen) {
				return;
			}

			if (
				this.supportsPopover &&
				this.tooltipElement.matches(":popover-open")
			) {
				this.tooltipElement.hidePopover();
			}
			delete this.tooltipElement.dataset.open;
		};

		if (immediately) {
			finishHiding();
			return;
		}

		this.hideTimer = window.setTimeout(finishHiding, HIDE_ANIMATION_DURATION);
	}

	private positionTooltip(): void {
		const trigger = this.triggerElement;
		if (!trigger || !this.tooltipElement) {
			return;
		}

		const triggerRect = trigger.getBoundingClientRect();
		const tooltipRect = this.tooltipElement.getBoundingClientRect();
		const viewportWidth = document.documentElement.clientWidth;
		const viewportHeight = document.documentElement.clientHeight;
		let placement = this.placement;

		if (
			placement === "top" &&
			triggerRect.top - tooltipRect.height - TOOLTIP_GAP < VIEWPORT_PADDING &&
			triggerRect.bottom + TOOLTIP_GAP + tooltipRect.height <=
				viewportHeight - VIEWPORT_PADDING
		) {
			placement = "bottom";
		} else if (
			placement === "bottom" &&
			triggerRect.bottom + TOOLTIP_GAP + tooltipRect.height >
				viewportHeight - VIEWPORT_PADDING &&
			triggerRect.top - tooltipRect.height - TOOLTIP_GAP >= VIEWPORT_PADDING
		) {
			placement = "top";
		} else if (
			placement === "right" &&
			triggerRect.right + TOOLTIP_GAP + tooltipRect.width >
				viewportWidth - VIEWPORT_PADDING &&
			triggerRect.left - tooltipRect.width - TOOLTIP_GAP >= VIEWPORT_PADDING
		) {
			placement = "left";
		} else if (
			placement === "left" &&
			triggerRect.left - tooltipRect.width - TOOLTIP_GAP < VIEWPORT_PADDING &&
			triggerRect.right + TOOLTIP_GAP + tooltipRect.width <=
				viewportWidth - VIEWPORT_PADDING
		) {
			placement = "right";
		}

		const preferredPosition = this.getPreferredPosition(
			placement,
			triggerRect,
			tooltipRect,
		);
		const left = this.clamp(
			preferredPosition.left,
			VIEWPORT_PADDING,
			viewportWidth - tooltipRect.width - VIEWPORT_PADDING,
		);
		const top = this.clamp(
			preferredPosition.top,
			VIEWPORT_PADDING,
			viewportHeight - tooltipRect.height - VIEWPORT_PADDING,
		);

		this.tooltipElement.style.left = `${Math.round(left)}px`;
		this.tooltipElement.style.top = `${Math.round(top)}px`;
		this.tooltipElement.dataset.placement = placement;

		const arrowOffset =
			placement === "top" || placement === "bottom"
				? this.clamp(
					triggerRect.left + triggerRect.width / 2 - left,
					8,
					tooltipRect.width - 8,
				)
				: this.clamp(
					triggerRect.top + triggerRect.height / 2 - top,
					8,
					tooltipRect.height - 8,
				);
		this.tooltipElement.style.setProperty(
			"--tooltip-arrow-offset",
			`${Math.round(arrowOffset)}px`,
		);
	}

	private getPreferredPosition(
		placement: TooltipPlacement,
		triggerRect: DOMRect,
		tooltipRect: DOMRect,
	): {left: number; top: number} {
		switch (placement) {
			case "right":
				return {
					left: triggerRect.right + TOOLTIP_GAP,
					top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
				};
			case "bottom":
				return {
					left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
					top: triggerRect.bottom + TOOLTIP_GAP,
				};
			case "left":
				return {
					left: triggerRect.left - tooltipRect.width - TOOLTIP_GAP,
					top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
				};
			case "top":
			default:
				return {
					left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
					top: triggerRect.top - tooltipRect.height - TOOLTIP_GAP,
				};
		}
	}

	private clamp(value: number, minimum: number, maximum: number): number {
		return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
	}

	private addDescription(trigger: HTMLElement): void {
		const describedBy = new Set(
			(trigger.getAttribute("aria-describedby") ?? "")
				.split(/\s+/)
				.filter(Boolean),
		);
		describedBy.add(this.tooltipElementId);
		trigger.setAttribute("aria-describedby", Array.from(describedBy).join(" "));
	}

	private removeDescription(trigger?: HTMLElement): void {
		if (!trigger) {
			return;
		}

		const describedBy = (trigger.getAttribute("aria-describedby") ?? "")
			.split(/\s+/)
			.filter((id) => id && id !== this.tooltipElementId);
		if (describedBy.length) {
			trigger.setAttribute("aria-describedby", describedBy.join(" "));
		} else {
			trigger.removeAttribute("aria-describedby");
		}
	}

	render() {
		return html`
			<slot></slot>
			<div
				id=${this.tooltipElementId}
				class="tooltip"
				role="tooltip"
				popover="manual"
			>
				${this.content}
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-tooltip": DT3DTooltip;
	}
}
