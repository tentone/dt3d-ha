import type {PropertyValues} from "lit";
import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property, query, state} from "lit/decorators.js";

import type {
	FloorplanCalibration,
	ImagePoint,
} from "../../editor/floorplan-reference.js";
import {localManager} from "../../locale/locale.js";
import componentStyles from "./floorplan-calibration-modal.css?inline";

export type FloorplanCalibrationSubmitDetail = FloorplanCalibration;

const MAX_CANVAS_DIMENSION = 4096;

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

	@query("canvas")
	private canvas: HTMLCanvasElement;

	private sourceImage: HTMLImageElement | null = null;

	private canvasResizeObserver: ResizeObserver | null = null;

	private imageLoadSequence = 0;

	private close(): void {
		this.dispatchEvent(new CustomEvent("modal-close", {
			bubbles: true,
			composed: true,
		}));
	}

	protected firstUpdated(): void {
		this.canvasResizeObserver = new ResizeObserver(() => this.drawCanvas());
		this.canvasResizeObserver.observe(this.canvas);
	}

	protected updated(changedProperties: PropertyValues): void {
		if (changedProperties.has("imageUrl")) {
			this.loadImage();
		} else if (changedProperties.has("points")) {
			this.drawCanvas();
		}
	}

	public disconnectedCallback(): void {
		super.disconnectedCallback();
		this.imageLoadSequence += 1;
		this.canvasResizeObserver?.disconnect();
		this.canvasResizeObserver = null;
	}

	private loadImage(): void {
		const sequence = ++this.imageLoadSequence;
		const image = new Image();
		image.addEventListener("load", () => {
			if (sequence !== this.imageLoadSequence) {
				return;
			}

			this.sourceImage = image;
			this.imageWidth = image.naturalWidth;
			this.imageHeight = image.naturalHeight;
			this.points = [];
			void this.updateComplete.then(() => this.drawCanvas());
		});
		image.addEventListener("error", () => {
			if (sequence !== this.imageLoadSequence) {
				return;
			}
			this.sourceImage = null;
			this.imageWidth = 0;
			this.imageHeight = 0;
			this.drawCanvas();
		});
		image.src = this.imageUrl;
	}

	private drawCanvas(): void {
		if (!this.canvas) {
			return;
		}

		const context = this.canvas.getContext("2d");
		if (!context) {
			return;
		}

		if (!this.sourceImage || !this.imageWidth || !this.imageHeight) {
			context.clearRect(0, 0, this.canvas.width, this.canvas.height);
			return;
		}

		const resolutionScale = Math.min(
			1,
			MAX_CANVAS_DIMENSION / Math.max(this.imageWidth, this.imageHeight),
		);
		const canvasWidth = Math.max(1, Math.round(this.imageWidth * resolutionScale));
		const canvasHeight = Math.max(
			1,
			Math.round(this.imageHeight * resolutionScale),
		);
		if (
			this.canvas.width !== canvasWidth ||
			this.canvas.height !== canvasHeight
		) {
			this.canvas.width = canvasWidth;
			this.canvas.height = canvasHeight;
		}

		context.clearRect(0, 0, canvasWidth, canvasHeight);
		context.drawImage(this.sourceImage, 0, 0, canvasWidth, canvasHeight);

		const bounds = this.canvas.getBoundingClientRect();
		const cssToCanvasScale =
			bounds.width > 0 ? canvasWidth / bounds.width : 1;
		const canvasPoints = this.points.map((point): ImagePoint => ({
			x: point.x * (canvasWidth / this.imageWidth),
			y: point.y * (canvasHeight / this.imageHeight),
		}));

		if (canvasPoints.length === 2) {
			context.save();
			context.beginPath();
			context.moveTo(canvasPoints[0].x, canvasPoints[0].y);
			context.lineTo(canvasPoints[1].x, canvasPoints[1].y);
			context.strokeStyle = "#ff2d55";
			context.lineWidth = 4 * cssToCanvasScale;
			context.lineCap = "round";
			context.stroke();
			context.restore();
		}

		canvasPoints.forEach((point, index) => {
			const radius = 10 * cssToCanvasScale;
			context.save();
			context.beginPath();
			context.arc(point.x, point.y, radius, 0, Math.PI * 2);
			context.fillStyle = index === 0 ? "#00b84a" : "#ff2d55";
			context.fill();
			context.strokeStyle = "white";
			context.lineWidth = 3 * cssToCanvasScale;
			context.stroke();
			context.fillStyle = "white";
			context.font = `bold ${12 * cssToCanvasScale}px sans-serif`;
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.fillText(String(index + 1), point.x, point.y);
			context.restore();
		});
	}

	private selectPoint(event: PointerEvent): void {
		if (!this.imageWidth || !this.imageHeight) {
			return;
		}
		event.preventDefault();

		const canvas = event.currentTarget as HTMLCanvasElement;
		const bounds = canvas.getBoundingClientRect();
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
						<canvas
							role="img"
							aria-label=${this.imageName}
							@pointerdown=${this.selectPoint}
						></canvas>
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
