import * as mdiIcons from "@mdi/js";
import {CSS3DSprite} from "three/examples/jsm/renderers/CSS3DRenderer.js";

import type {DTInteractionEvent} from "./dt-object.js";
import {EntityObject} from "./entity-object.js";
import {IconSprite} from "./helpers/icon-sprite.js";

const CAMERA_REFRESH_INTERVAL_MS = 5000;
const CAMERA_ICON = mdiIcons.mdiCctv;

/**
 * Camera entity representation with an always-visible image overlay.
 *
 * The object is still a normal persisted Home Assistant entity object. The
 * camera-specific behavior lives entirely in the visual children: a 3D marker
 * for picking/placement and a CSS3D sprite that shows the latest still image.
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
	 * Periodic still-image refresh timer started when the object is initialized.
	 */
	private refreshTimer: number | null = null;

	/**
	 * Whether camera text should be visible.
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

		this.icon = new IconSprite(CAMERA_ICON, 0x1e90ff, 0.64);
		this.icon.internal = true;
		this.icon.position.y = 0.32;
		this.add(this.icon);

		this.root = document.createElement("div");
		this.root.style.cssText = `
			width: 180px;
			overflow: hidden;
			border: 1px solid rgba(255, 255, 255, 0.75);
			border-radius: 8px;
			background: rgba(12, 16, 22, 0.86);
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
			color: #ffffff;
			font-family: sans-serif;
			pointer-events: none;
			transform-style: preserve-3d;
		`;

		this.image = document.createElement("img");
		this.image.alt = entityId;
		this.image.style.cssText = `
			display: block;
			width: 180px;
			height: 112px;
			object-fit: cover;
			background: #111827;
		`;
		this.image.addEventListener("load", () => this.setStatus(""));
		this.image.addEventListener("error", () => this.setStatus("Camera image unavailable"));
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
		this.title.style.display = "none";
		this.root.appendChild(this.title);

		this.status = document.createElement("div");
		this.status.style.cssText = `
			display: none;
			padding: 0 8px 7px;
			color: #d1d5db;
			font-size: 11px;
			line-height: 1.3;
		`;
		this.root.appendChild(this.status);

		this.overlay = new CSS3DSprite(this.root);
		this.overlay.internal = true;
		this.overlay.position.y = 0.85;
		this.overlay.scale.setScalar(0.0045);
		this.add(this.overlay);

		this.setEntity(entity);
	}

	/**
	 * Start refreshing the camera still image after the object is added to the scene.
	 */
	public override initialize(): void {
		this.startRefreshTimer();
	}

	/**
	 * Stop refresh work and detach DOM resources before the object is removed.
	 */
	public override dispose(): void {
		this.stopRefreshTimer();
		this.root.remove();
	}

	public override onInteraction(event: DTInteractionEvent): void {
		super.onInteraction(event);

		if (event.type === "pointerenter") {
			this.isHovered = true;
			this.updateTextVisibility();
		} else if (event.type === "pointerleave") {
			this.isHovered = false;
			this.updateTextVisibility();
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

		const nextUrl = EntityCamera.resolveImageUrl(entity);
		if (!nextUrl) {
			this.imageUrl = null;
			this.image.removeAttribute("src");
			this.setStatus("Camera image unavailable");
			return;
		}

		const changed = nextUrl !== this.imageUrl;
		this.imageUrl = nextUrl;
		this.icon.setColor(entity.state === "unavailable" ? 0x808080 : 0x1e90ff);

		if (changed || !this.image.src) {
			this.refreshImage();
		}
	}

	/**
	 * Start the periodic camera image refresh loop.
	 */
	private startRefreshTimer(): void {
		this.stopRefreshTimer();
		this.refreshTimer = window.setInterval(() => {
			this.refreshImage();
		}, CAMERA_REFRESH_INTERVAL_MS);
	}

	/**
	 * Stop the periodic camera image refresh loop.
	 */
	private stopRefreshTimer(): void {
		if (this.refreshTimer === null) {
			return;
		}

		window.clearInterval(this.refreshTimer);
		this.refreshTimer = null;
	}

	/**
	 * Refresh the still image with a cache-busting query parameter.
	 */
	private refreshImage(): void {
		if (!this.imageUrl) {
			return;
		}

		if (!this.image.getAttribute("src")) {
			this.setStatus("Loading camera image...");
		}

		const url = new URL(this.imageUrl);
		url.searchParams.set("dt3d_refresh", Date.now().toString());
		this.image.src = url.toString();
	}

	/**
	 * Show or hide the overlay status text.
	 *
	 * @param message - Status message, or an empty string to hide it.
	 */
	private setStatus(message: string): void {
		this.status.textContent = message;
		this.updateTextVisibility();
	}

	private updateTextVisibility(): void {
		this.title.style.display = this.isHovered ? "block" : "none";
		this.status.style.display =
			this.isHovered && this.status.textContent ? "block" : "none";
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
