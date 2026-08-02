import {
	mdiAccount,
	mdiAirFilter,
	mdiAirHumidifier,
	mdiAlarmPanel,
	mdiBell,
	mdiBullhorn,
	mdiCalendar,
	mdiCalendarAlert,
	mdiCalendarClock,
	mdiCast,
	mdiCheckboxBlankCircleOutline,
	mdiClockOutline,
	mdiCounter,
	mdiFan,
	mdiFlower,
	mdiFormatListBulleted,
	mdiFormatListChecks,
	mdiFormTextbox,
	mdiGauge,
	mdiGestureTapButton,
	mdiGoogleCirclesCommunities,
	mdiHelpCircleOutline,
	mdiImage,
	mdiImageSearch,
	mdiLightbulb,
	mdiLock,
	mdiMapMarker,
	mdiMapMarkerDistance,
	mdiMapMarkerRadius,
	mdiMessageText,
	mdiMicrophoneMessage,
	mdiNumeric,
	mdiPackageUp,
	mdiPalette,
	mdiRemote,
	mdiRobot,
	mdiRobotMower,
	mdiRobotVacuum,
	mdiSatelliteUplink,
	mdiScriptText,
	mdiSpeakerMessage,
	mdiTag,
	mdiThermostat,
	mdiTimerOutline,
	mdiToggleSwitch,
	mdiValve,
	mdiVideo,
	mdiWaterBoiler,
	mdiWeatherPartlyCloudy,
	mdiWhiteBalanceSunny,
	mdiWindowShutter,
} from "@mdi/js";
import {strFromU8, unzlibSync} from "fflate";
import {Color} from "three";
import compressedMdiIconCatalog from "virtual:mdi-icon-catalog";

import {decodeBase64} from "./base64.js";

export const DEFAULT_HA_ICON = mdiHelpCircleOutline;
export const HA_ICON_CANVAS_SIZE = 256;

const ICON_VIEWBOX_SIZE = 24;
let mdiIconCatalog: Record<string, string> | undefined;

/**
 * Default icons for Home Assistant entities, keyed by entity domain.
 *
 * These are used only when an entity does not provide an `attributes.icon` value (or when that value cannot be resolved).
 */
export const DEFAULT_ENTITY_ICONS: Readonly<Record<string, string>> = Object.freeze({
	air_quality: mdiAirFilter,
	alarm_control_panel: mdiAlarmPanel,
	assist_satellite: mdiSatelliteUplink,
	automation: mdiRobot,
	binary_sensor: mdiCheckboxBlankCircleOutline,
	button: mdiGestureTapButton,
	calendar: mdiCalendar,
	camera: mdiVideo,
	climate: mdiThermostat,
	conversation: mdiMessageText,
	counter: mdiCounter,
	cover: mdiWindowShutter,
	date: mdiCalendar,
	datetime: mdiCalendarClock,
	device_tracker: mdiMapMarker,
	event: mdiCalendarAlert,
	fan: mdiFan,
	group: mdiGoogleCirclesCommunities,
	humidifier: mdiAirHumidifier,
	image: mdiImage,
	image_processing: mdiImageSearch,
	input_boolean: mdiToggleSwitch,
	input_button: mdiGestureTapButton,
	input_datetime: mdiCalendarClock,
	input_number: mdiNumeric,
	input_select: mdiFormatListBulleted,
	input_text: mdiFormTextbox,
	lawn_mower: mdiRobotMower,
	light: mdiLightbulb,
	lock: mdiLock,
	media_player: mdiCast,
	notify: mdiBell,
	number: mdiNumeric,
	person: mdiAccount,
	plant: mdiFlower,
	proximity: mdiMapMarkerDistance,
	remote: mdiRemote,
	scene: mdiPalette,
	schedule: mdiCalendarClock,
	script: mdiScriptText,
	select: mdiFormatListBulleted,
	sensor: mdiGauge,
	siren: mdiBullhorn,
	stt: mdiMicrophoneMessage,
	sun: mdiWhiteBalanceSunny,
	switch: mdiToggleSwitch,
	tag: mdiTag,
	text: mdiFormTextbox,
	time: mdiClockOutline,
	timer: mdiTimerOutline,
	todo: mdiFormatListChecks,
	tts: mdiSpeakerMessage,
	update: mdiPackageUp,
	vacuum: mdiRobotVacuum,
	valve: mdiValve,
	water_heater: mdiWaterBoiler,
	weather: mdiWeatherPartlyCloudy,
	zone: mdiMapMarkerRadius,
});

export type IconCanvasColor = Color | number | string;

export type IconCanvasOptions = {
	backgroundColor?: IconCanvasColor;
	canvasSize?: number;
	circleRadius?: number;
	iconColor?: string;
	label?: string;
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

	mdiIconCatalog ??= JSON.parse(
		strFromU8(unzlibSync(decodeBase64(compressedMdiIconCatalog))),
	) as Record<string, string>;
	return mdiIconCatalog[exportName] ?? fallbackIcon;
}

/**
 * Get the default icon for an entity ID or domain.
 *
 * @param entityIdOrDomain - Entity ID such as "climate.living_room", or a domain.
 * @returns SVG path data for the domain's default icon.
 */
export function getDefaultEntityIconPath(entityIdOrDomain?: string): string {
	if (typeof entityIdOrDomain !== "string") {
		return DEFAULT_HA_ICON;
	}

	const domain = entityIdOrDomain.split(".", 1)[0].trim().toLowerCase();
	return DEFAULT_ENTITY_ICONS[domain] ?? DEFAULT_HA_ICON;
}

/**
 * Resolve an entity's assigned icon, falling back to its domain default.
 *
 * @param entityId - Home Assistant entity ID.
 * @param icon - Icon assigned through the entity's `attributes.icon` value.
 * @returns SVG path data for the assigned or default icon.
 */
export function resolveEntityIconPath(entityId: string, icon?: string): string {
	return resolveHaIconPath(icon, getDefaultEntityIconPath(entityId));
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
	const label = options.label?.trim() ?? "";
	const hasLabel = label.length > 0;
	const iconSize = circleRadius * (hasLabel ? 0.9 : 1.38);
	const center = canvasSize / 2;
	const iconCenterY = hasLabel ? center - circleRadius * 0.27 : center;

	const canvas = document.createElement("canvas");
	canvas.width = canvasSize;
	canvas.height = canvasSize;

	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return canvas;
	}

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	const backgroundColor = options.backgroundColor ?? 0x1e90ff;
	ctx.fillStyle =
		typeof backgroundColor === "string"
			? backgroundColor
			: backgroundColor instanceof Color
				? `#${backgroundColor.getHexString()}`
				: `#${backgroundColor.toString(16).padStart(6, "0")}`;
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
		ctx.translate(center, iconCenterY);
		ctx.scale(iconSize / ICON_VIEWBOX_SIZE, iconSize / ICON_VIEWBOX_SIZE);
		ctx.translate(-ICON_VIEWBOX_SIZE / 2, -ICON_VIEWBOX_SIZE / 2);
		ctx.fill(path);
		ctx.restore();
	}

	if (hasLabel) {
		const maxWidth = circleRadius * 1.55;
		let fontSize = circleRadius * 0.34;

		ctx.save();
		ctx.fillStyle = options.iconColor ?? "#ffffff";
		ctx.font = `600 ${fontSize}px sans-serif`;
		while (ctx.measureText(label).width > maxWidth && fontSize > 14) {
			fontSize -= 1;
			ctx.font = `600 ${fontSize}px sans-serif`;
		}
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText(label, center, center + circleRadius * 0.5, maxWidth);
		ctx.restore();
	}

	return canvas;
}
