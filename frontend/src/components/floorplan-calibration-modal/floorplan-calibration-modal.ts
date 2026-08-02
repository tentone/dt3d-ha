import {html, LitElement, nothing, unsafeCSS} from "lit";
import {customElement, property, state} from "lit/decorators.js";

import type {
	FloorplanCalibration,
	ImagePoint,
} from "../../editor/floorplan-reference.js";
import {localManager} from "../../locale/locale.js";
import componentStyles from "./floorplan-calibration-modal.css?inline";

export type FloorplanCalibrationSubmitDetail = FloorplanCalibration;

@customElement("dt3d-floorplan-calibration-modal")
export class DT3DFloorplanCalibrationModal extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({type: String})
	public imageUrl = "";

	@property({type: String})
	public imageName = "";

	@state()
	private points: ImagePoint[] = [];

	@state()
	private distanceMeters = "";

	@state()
	private imageWidth = 0;

	@state()
	private imageHeight = 0;

	private close(): void {
		this.dispatchEvent(new CustomEvent("modal-close", {
			bubbles: true,
			composed: true,
		}));
	}

	private handleImageLoad(event: Event): void {
		const image = event.currentTarget as HTMLImageElement;
		this.imageWidth = image.naturalWidth;
		this.imageHeight = image.naturalHeight;
	}

	private selectPoint(event: PointerEvent): void {
		if (!this.imageWidth || !this.imageHeight) {
			return;
		}
		event.preventDefault();

		const image = event.currentTarget as HTMLImageElement;
		const bounds = image.getBoundingClientRect();
		const point = {
			x: Math.min(
				this.imageWidth,
				Math.max(0, ((event.clientX - bounds.left) / bounds.width) * this.imageWidth),
			),
			y: Math.min(
				this.imageHeight,
				Math.max(0, ((event.clientY - bounds.top) / bounds.height) * this.imageHeight),
			),
		};

		this.points = this.points.length < 2 ? [...this.points, point] : [point];
	}

	private updateDistance(event: Event): void {
		this.distanceMeters = (event.currentTarget as HTMLInputElement).value;
	}

	private resetPoints(): void {
		this.points = [];
	}

	private get parsedDistance(): number {
		return Number(this.distanceMeters);
	}

	private get selectedPixelDistance(): number {
		if (this.points.length !== 2) {
			return 0;
		}

		return Math.hypot(
			this.points[1].x - this.points[0].x,
			this.points[1].y - this.points[0].y,
		);
	}

	private get canSubmit(): boolean {
		return (
			this.points.length === 2 &&
			this.selectedPixelDistance > 0 &&
			Number.isFinite(this.parsedDistance) &&
			this.parsedDistance > 0 &&
			this.imageWidth > 0 &&
			this.imageHeight > 0
		);
	}

	private submit(event: Event): void {
		event.preventDefault();
		if (!this.canSubmit) {
			return;
		}

		this.dispatchEvent(
			new CustomEvent<FloorplanCalibrationSubmitDetail>("floorplan-calibrated", {
				detail: {
					distanceMeters: this.parsedDistance,
					imageHeight: this.imageHeight,
					imageWidth: this.imageWidth,
					pointA: {...this.points[0]},
					pointB: {...this.points[1]},
				},
				bubbles: true,
				composed: true,
			}),
		);
	}

	private handleKeyDown(event: KeyboardEvent): void {
		if (event.key === "Escape") {
			event.preventDefault();
			this.close();
		}
	}

	public render() {
		const [pointA, pointB] = this.points;
		const markerRadius = Math.max(this.imageWidth, this.imageHeight) * 0.01;
		return html`
			<div class="overlay" @click=${this.close} @keydown=${this.handleKeyDown}>
				<form
					class="dialog"
					role="dialog"
					aria-modal="true"
					aria-labelledby="floorplan-calibration-heading"
					@submit=${this.submit}
					@click=${(event: Event) => event.stopPropagation()}
				>
					<header>
						<div>
							<h3 id="floorplan-calibration-heading">
								${localManager.get("calibrateFloorplan")}
							</h3>
							<p>${localManager.get("floorplanCalibrationDescription")}</p>
						</div>
						<button
							type="button"
							class="icon-button"
							@click=${this.close}
							aria-label=${localManager.get("cancel")}
						>
							<ha-icon icon="mdi:close"></ha-icon>
						</button>
					</header>

					<div class="image-stage">
						<img
							src=${this.imageUrl}
							alt=${this.imageName}
							draggable="false"
							@load=${this.handleImageLoad}
							@pointerdown=${this.selectPoint}
						/>
						${this.imageWidth && this.imageHeight
							? html`
								<svg
									viewBox=${`0 0 ${this.imageWidth} ${this.imageHeight}`}
									aria-hidden="true"
								>
									${pointA && pointB
										? html`<line
												class="reference-line"
												x1=${pointA.x}
												y1=${pointA.y}
												x2=${pointB.x}
												y2=${pointB.y}
												vector-effect="non-scaling-stroke"
											></line>`
										: nothing}
									${this.points.map(
										(point, index) => html`
											<circle
												class=${`point-marker ${index === 0 ? "start-point" : "end-point"}`}
												cx=${point.x}
												cy=${point.y}
												r=${markerRadius}
												vector-effect="non-scaling-stroke"
											></circle>
											<text
												x=${point.x}
												y=${point.y}
												dy=${-markerRadius * 1.6}
												style=${`font-size: ${markerRadius * 2.5}px`}
											>
												${index + 1}
											</text>
										`,
									)}
								</svg>
							`
							: nothing}
					</div>

					<div class="calibration-controls">
						<div class="point-status" aria-live="polite">
							${localManager.get("floorplanPointsSelected").replace(
								"{count}",
								String(this.points.length),
							)}
							<button
								type="button"
								class="reset-button"
								?disabled=${this.points.length === 0}
								@click=${this.resetPoints}
							>
								${localManager.get("resetPoints")}
							</button>
						</div>
						<label>
							<span>${localManager.get("realDistanceMeters")}</span>
							<input
								type="number"
								min="0.000001"
								step="any"
								inputmode="decimal"
								required
								.value=${this.distanceMeters}
								@input=${this.updateDistance}
							/>
						</label>
					</div>

					<div class="actions">
						<button type="button" class="cancel-button" @click=${this.close}>
							${localManager.get("cancel")}
						</button>
						<button type="submit" class="confirm-button" ?disabled=${!this.canSubmit}>
							${localManager.get("addFloorplan")}
						</button>
					</div>
				</form>
			</div>
		`;
	}
}

declare global {
	interface HTMLElementTagNameMap {
		"dt3d-floorplan-calibration-modal": DT3DFloorplanCalibrationModal;
	}
}
