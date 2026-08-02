import {CSS3DSprite} from "three/examples/jsm/renderers/CSS3DRenderer.js";

import {resolveEntityIconPath} from "../utils/icon-utils.js";
import type {DTInteractionEvent} from "./dt-object.js";
import {EntityObject} from "./entity-object.js";
import {IconSprite} from "./helpers/icon-sprite.js";

// 334 ms keeps request starts at or below three frames per second.
const CAMERA_MIN_FRAME_INTERVAL_MS = 334;

/**
 * Camera entity representation with an image preview shown on pointer hover.
 *
 * The object is still a normal persisted Home Assistant entity object. The camera-specific behavior lives entirely in the visual children: a round 3D marker for picking/placement and a CSS3D sprite with the latest still image.
 */
export class EntityCamera extends EntityObject {
	/**
	 * Small 3D marker used to locate and select the camera in the scene.
	 */
	private readonly icon: IconSprite;

	/**
	 * CSS3D sprite that keeps the DOM overlay anchored to this object.
	 */
	private readonly overlay: CSS3DSprite;

	/**
	 * Root DOM node rendered by the CSS3D renderer.
	 */
	private readonly root: HTMLDivElement;

	/**
	 * Image element updated from the camera entity_picture attribute.
	 */
	private readonly image: HTMLImageElement;

	/**
	 * Friendly name displayed below the camera image.
	 */
	private readonly title: HTMLDivElement;

	/**
	 * Optional loading/error text shown when no usable image is available.
	 */
	private readonly status: HTMLDivElement;

	/**
	 * Normalized image URL without the refresh cache-busting parameter.
	 */
	private imageUrl: string | null = null;

	/**
	 * Next-frame timer active only while the preview is visible.
	 */
	private refreshTimer: number | null = null;

	/** Whether a camera image request is currently in flight. */
	private imageRequestPending = false;

	/** Start time of the most recent image request, used to enforce the FPS cap. */
	private lastImageRequestAt = 0;

	/**
	 * Whether the camera preview should be visible.
	 */
	private isHovered = false;

	/**
	 * Create a camera entity object.
	 *
	 * @param entityId - Home Assistant camera entity ID.
	 * @param entity - Current Home Assistant entity state.
	 */
	public constructor(entityId: string, entity: any) {
		super(entityId);

		this.icon = new IconSprite(
			resolveEntityIconPath(entityId, entity?.attributes?.icon),
			0x1e90ff,
			0.64,
		);
		this.icon.internal = true;
		this.icon.position.y = 0.32;
		this.add(this.icon);

		this.root = document.createElement("div");
		this.root.style.cssText = `
			width: 320px;
			overflow: hidden;
			border: 1px solid var(--divider-color);
			border-radius: 12px;
			background: color-mix(in srgb, var(--card-background-color) 90%, transparent);
			box-shadow: 0 8px 24px var(--shadow-color);
			color: var(--primary-text-color);
			font-family: sans-serif;
			pointer-events: none;
			transform-style: preserve-3d;
		`;

		this.image = document.createElement("img");
		this.image.alt = entityId;
		this.image.style.cssText = `
			display: block;
			width: 320px;
			height: 200px;
			object-fit: cover;
			background: var(--secondary-background-color);
		`;
		this.image.addEventListener("load", () =>
			this.handleImageRequestSettled(true),
		);
		this.image.addEventListener("error", () =>
			this.handleImageRequestSettled(false),
		);
		this.root.appendChild(this.image);

		this.title = document.createElement("div");
		this.title.style.cssText = `
			overflow: hidden;
			padding: 6px 8px;
			font-size: 12px;
			font-weight: 600;
			text-overflow: ellipsis;
			white-space: nowrap;
		`;
		this.root.appendChild(this.title);

		this.status = document.createElement("div");
		this.status.style.cssText = `
			display: none;
			padding: 0 8px 7px;
			color: var(--secondary-text-color);
			font-size: 11px;
			line-height: 1.3;
		`;
		this.root.appendChild(this.status);

		this.overlay = new CSS3DSprite(this.root);
		this.overlay.internal = true;
		this.overlay.position.y = 1.2;
		this.overlay.scale.setScalar(0.0045);
		this.overlay.visible = false;
		this.add(this.overlay);

		this.setEntity(entity);
	}

	/**
	 * Stop refresh work and detach DOM resources before the object is removed.
	 */
	public override dispose(): void {
		this.isHovered = false;
		this.stopRefreshTimer();
		this.image.removeAttribute("src");
		this.root.remove();
	}

	public override onInteraction(event: DTInteractionEvent): void {
		super.onInteraction(event);

		if (event.type === "pointerenter") {
			this.isHovered = true;
			this.updatePreviewVisibility();
			this.startRefreshTimer();
		} else if (event.type === "pointerleave") {
			this.isHovered = false;
			this.updatePreviewVisibility();
			this.stopRefreshTimer();
		}
	}

	/**
	 * Update the camera overlay from the latest Home Assistant state.
	 *
	 * @param entity - Current Home Assistant entity state.
	 */
	protected updateFromEntity(entity: any): void {
		const friendlyName = this.friendlyName(entity);
		this.title.textContent = friendlyName;
		this.image.alt = friendlyName;
		this.icon.setIcon(
			resolveEntityIconPath(this.entityId, entity?.attributes?.icon),
		);

		const nextUrl = EntityCamera.resolveImageUrl(entity);
		if (!nextUrl) {
			this.imageUrl = null;
			this.stopRefreshTimer();
			if (!this.imageRequestPending) {
				this.image.removeAttribute("src");
			}
			this.setStatus("Camera image unavailable");
			return;
		}

		const changed = nextUrl !== this.imageUrl;
		this.imageUrl = nextUrl;
		this.icon.setColor(entity.state === "unavailable" ? 0x808080 : 0x1e90ff);

		if (this.isHovered && (changed || !this.image.getAttribute("src"))) {
			this.scheduleNextRefresh();
		}
	}

	protected createEntityClone(): this {
		return new EntityCamera(this.entityId, this.getEntity()) as this;
	}

	/**
	 * Start the completion-driven camera image refresh loop.
	 */
	private startRefreshTimer(): void {
		this.stopRefreshTimer();
		this.scheduleNextRefresh();
	}

	/**
	 * Stop any scheduled camera image refresh.
	 */
	private stopRefreshTimer(): void {
		if (this.refreshTimer === null) {
			return;
		}

		window.clearTimeout(this.refreshTimer);
		this.refreshTimer = null;
	}

	/**
	 * Schedule a request after both the previous request has settled and the minimum frame interval has elapsed.
	 */
	private scheduleNextRefresh(): void {
		if (
			!this.isHovered ||
			!this.imageUrl ||
			this.imageRequestPending ||
			this.refreshTimer !== null
		) {
			return;
		}

		const elapsed = Date.now() - this.lastImageRequestAt;
		const delay = Math.max(0, CAMERA_MIN_FRAME_INTERVAL_MS - elapsed);
		if (delay === 0) {
			this.refreshImage();
			return;
		}

		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			this.refreshImage();
		}, delay);
	}

	/** Finish one request before allowing the next frame to be requested. */
	private handleImageRequestSettled(loaded: boolean): void {
		this.imageRequestPending = false;

		if (!this.imageUrl) {
			this.image.removeAttribute("src");
			this.setStatus("Camera image unavailable");
			return;
		}

		this.setStatus(loaded ? "" : "Camera image unavailable");
		this.scheduleNextRefresh();
	}

	/**
	 * Refresh the still image with a cache-busting query parameter.
	 */
	private refreshImage(): void {
		if (!this.isHovered || !this.imageUrl || this.imageRequestPending) {
			return;
		}

		if (!this.image.getAttribute("src")) {
			this.setStatus("Loading camera image...");
		}

		const url = new URL(this.imageUrl);
		url.searchParams.set("dt3d_refresh", Date.now().toString());
		this.imageRequestPending = true;
		this.lastImageRequestAt = Date.now();
		this.image.src = url.toString();
	}

	/**
	 * Update the overlay status text.
	 *
	 * @param message - Status message, or an empty string to hide it.
	 */
	private setStatus(message: string): void {
		this.status.textContent = message;
		this.status.style.display = message ? "block" : "none";
	}

	private updatePreviewVisibility(): void {
		this.overlay.visible = this.isHovered;
	}

	/**
	 * Resolve the Home Assistant camera image URL from entity_picture.
	 *
	 * Root-relative Home Assistant paths are resolved against the current frontend origin.
	 *
	 * Absolute URLs are accepted only for HTTP(S) images.
	 *
	 * @param entity - Home Assistant entity state.
	 * @returns Normalized image URL, or null if the entity has no usable image.
	 */
	private static resolveImageUrl(entity: any): string | null {
		const picture = entity?.attributes?.entity_picture;
		if (typeof picture !== "string" || !picture) {
			return null;
		}

		try {
			if (picture.startsWith("/")) {
				return new URL(picture, window.location.origin).toString();
			}

			const url = new URL(picture);
			if (url.protocol !== "http:" && url.protocol !== "https:") {
				return null;
			}

			return url.toString();
		} catch {
			return null;
		}
	}
}
