import * as mdiIcons from "@mdi/js";
import {Color} from "three";

export const DEFAULT_HA_ICON = mdiIcons.mdiHelpCircleOutline;
export const HA_ICON_CANVAS_SIZE = 256;

const ICON_VIEWBOX_SIZE = 24;

export type IconCanvasColor = Color | number | string;

export type IconCanvasOptions = {
	backgroundColor?: IconCanvasColor;
	canvasSize?: number;
	circleRadius?: number;
	iconColor?: string;
	strokeColor?: string;
	strokeWidth?: number;
};

export type HaIconCanvasOptions = IconCanvasOptions & {
	fallbackIcon?: string;
};

/**
 * Resolve a Home Assistant MDI icon name to SVG path data.
 *
 * @param icon - Home Assistant icon name, e.g. "mdi:lightbulb".
 * @param fallbackIcon - SVG path used when the icon is not available.
 * @returns SVG path data.
 */
export function resolveHaIconPath(
	icon?: string,
	fallbackIcon = DEFAULT_HA_ICON,
): string {
	if (!icon || typeof icon !== "string") {
		return fallbackIcon;
	}

	const [prefix, name] = icon.split(":");
	if (prefix !== "mdi" || !name) {
		return fallbackIcon;
	}

	const exportName =
		"mdi" +
		name
			.split("-")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join("");

	return (mdiIcons as Record<string, string>)[exportName] ?? fallbackIcon;
}

/**
 * Render a Home Assistant icon into a high-resolution circular canvas.
 *
 * @param icon - Home Assistant icon name, e.g. "mdi:lightbulb".
 * @param options - Canvas and circle rendering options.
 * @returns Canvas containing the rendered icon.
 */
export function renderHaIconToCanvas(
	icon?: string,
	options: HaIconCanvasOptions = {},
): HTMLCanvasElement {
	return renderIconPathToCanvas(
		resolveHaIconPath(icon, options.fallbackIcon),
		options,
	);
}

/**
 * Render SVG path data into a high-resolution circular canvas.
 *
 * @param iconPath - MDI SVG path data.
 * @param options - Canvas and circle rendering options.
 * @returns Canvas containing the rendered icon.
 */
export function renderIconPathToCanvas(
	iconPath: string,
	options: IconCanvasOptions = {},
): HTMLCanvasElement {
	const canvasSize = options.canvasSize ?? HA_ICON_CANVAS_SIZE;
	const circleRadius = options.circleRadius ?? canvasSize * 0.328125;
	const strokeWidth = options.strokeWidth ?? canvasSize * 0.03125;
	const iconSize = circleRadius * 1.38;
	const center = canvasSize / 2;

	const canvas = document.createElement("canvas");
	canvas.width = canvasSize;
	canvas.height = canvasSize;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return canvas;
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	ctx.fillStyle = colorToCss(options.backgroundColor ?? 0x1e90ff);
	ctx.beginPath();
	ctx.arc(center, center, circleRadius, 0, Math.PI * 2);
	ctx.fill();

	if (strokeWidth > 0) {
		ctx.strokeStyle = options.strokeColor ?? "#ffffff";
		ctx.lineWidth = strokeWidth;
		ctx.stroke();
	}

	if (iconPath) {
		const path = new Path2D(iconPath);
		ctx.save();
		ctx.fillStyle = options.iconColor ?? "#ffffff";
		ctx.translate(center, center);
		ctx.scale(iconSize / ICON_VIEWBOX_SIZE, iconSize / ICON_VIEWBOX_SIZE);
		ctx.translate(-ICON_VIEWBOX_SIZE / 2, -ICON_VIEWBOX_SIZE / 2);
		ctx.fill(path);
		ctx.restore();
	}

	return canvas;
}

function colorToCss(color: IconCanvasColor): string {
	if (typeof color === "string") {
		return color;
	}

	if (color instanceof Color) {
		return `#${color.getHexString()}`;
	}

	return `#${color.toString(16).padStart(6, "0")}`;
}
