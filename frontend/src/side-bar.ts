import { LitElement, html, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import componentStyles from "./side-bar.css?inline";

@customElement("dt3d-sidebar")
export class DT3DSidebar extends LitElement {
	static styles = unsafeCSS(componentStyles);

	static properties = {
		collapsed: { type: Boolean, reflect: true },
	};

	public collapsed = true;

	private resizing = false;
	private startX = 0;
	private startWidth = 220;

	private handleResizeMove = (event: MouseEvent) => {
		if (!this.resizing) {
			return;
		}

		const delta = event.clientX - this.startX;
		const nextWidth = Math.min(Math.max(this.startWidth + delta, 160), 400);
		this.style.width = `${nextWidth}px`;
	};

	private handleResizeEnd = () => {
		if (!this.resizing) {
			return;
		}

		this.resizing = false;
		document.body.style.cursor = "";
		window.removeEventListener("mousemove", this.handleResizeMove);
		window.removeEventListener("mouseup", this.handleResizeEnd);
	};

	public disconnectedCallback(): void {
		super.disconnectedCallback();
		this.handleResizeEnd();
	}

	private startResize(event: MouseEvent) {
		if (this.collapsed) {
			return;
		}

		this.resizing = true;
		this.startX = event.clientX;
		this.startWidth = this.getBoundingClientRect().width;
		document.body.style.cursor = "ew-resize";

		window.addEventListener("mousemove", this.handleResizeMove);
		window.addEventListener("mouseup", this.handleResizeEnd);
	}

	private toggleCollapse() {
		this.collapsed = !this.collapsed;

		this.requestUpdate();
	}

	private handleTransformSelect(tool: string) {
		this.dispatchEvent(
			new CustomEvent("transform-tool-selected", {
				detail: { tool },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleAddObject(type: string) {
		this.dispatchEvent(
			new CustomEvent("add-object", {
				detail: { type },
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleMeasurementSelect(mode: "distance" | "angle" | "none") {
		this.dispatchEvent(
			new CustomEvent("measurement-mode-selected", {
				detail: { mode },
				bubbles: true,
				composed: true,
			}),
		);
	}

	render() {
		return html`
			<button
				class="collapse-btn"
				@click=${this.toggleCollapse}
				title="Collapse sidebar"
			>
				${this.collapsed ? "⮞" : "⮜"}
			</button>
			<div
				class="resize-handle"
				@mousedown=${(event: MouseEvent) => this.startResize(event)}
			></div>
			<div class="sidebar-section">
				<div class="sidebar-title">Controls</div>
				<button @click=${() => this.handleTransformSelect("translate")}>
					Translate
				</button>
				<button @click=${() => this.handleTransformSelect("rotate")}>
					Rotate
				</button>
				<button @click=${() => this.handleTransformSelect("scale")}>
					Scale
				</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Add</div>
				<button @click=${() => this.handleAddObject("cube")}>Cube</button>
				<button @click=${() => this.handleAddObject("sphere")}>Sphere</button>
				<button @click=${() => this.handleAddObject("plane")}>Plane</button>
				<button @click=${() => this.handleAddObject("upload")}>Upload</button>
				<button @click=${() => this.handleAddObject("entity")}>Entity</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Measure</div>
				<button @click=${() => this.handleMeasurementSelect("distance")}>
					Distance
				</button>
				<button @click=${() => this.handleMeasurementSelect("angle")}>
					Angle
				</button>
				<button @click=${() => this.handleMeasurementSelect("none")}>
					Clear
				</button>
			</div>
			<div class="sidebar-section">
				<div class="sidebar-title">Edit</div>
				<button @click=${() => this.handleAddObject("cube")}>Delete</button>
			</div>
		`;
	}
}
