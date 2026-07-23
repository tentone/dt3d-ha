import * as mdiIcons from "@mdi/js";
import {Color} from "three";

export const DEFAULT_HA_ICON = mdiIcons.mdiHelpCircleOutline;
export const HA_ICON_CANVAS_SIZE = 256;

const ICON_VIEWBOX_SIZE = 24;

/**
 * Default icons for Home Assistant entities, keyed by entity domain.
 *
 * These are used only when an entity does not provide an `attributes.icon`
 * value (or when that value cannot be resolved).
 */
export const DEFAULT_ENTITY_ICONS: Readonly<Record<string, string>> = Object.freeze({
	air_quality: mdiIcons.mdiAirFilter,
	alarm_control_panel: mdiIcons.mdiAlarmPanel,
	assist_satellite: mdiIcons.mdiSatelliteUplink,
	automation: mdiIcons.mdiRobot,
	binary_sensor: mdiIcons.mdiCheckboxBlankCircleOutline,
	button: mdiIcons.mdiGestureTapButton,
	calendar: mdiIcons.mdiCalendar,
	camera: mdiIcons.mdiVideo,
	climate: mdiIcons.mdiThermostat,
	conversation: mdiIcons.mdiMessageText,
	counter: mdiIcons.mdiCounter,
	cover: mdiIcons.mdiWindowShutter,
	date: mdiIcons.mdiCalendar,
	datetime: mdiIcons.mdiCalendarClock,
	device_tracker: mdiIcons.mdiMapMarker,
	event: mdiIcons.mdiCalendarAlert,
	fan: mdiIcons.mdiFan,
	group: mdiIcons.mdiGoogleCirclesCommunities,
	humidifier: mdiIcons.mdiAirHumidifier,
	image: mdiIcons.mdiImage,
	image_processing: mdiIcons.mdiImageSearch,
	input_boolean: mdiIcons.mdiToggleSwitch,
	input_button: mdiIcons.mdiGestureTapButton,
	input_datetime: mdiIcons.mdiCalendarClock,
	input_number: mdiIcons.mdiNumeric,
	input_select: mdiIcons.mdiFormatListBulleted,
	input_text: mdiIcons.mdiFormTextbox,
	lawn_mower: mdiIcons.mdiRobotMower,
	light: mdiIcons.mdiLightbulb,
	lock: mdiIcons.mdiLock,
	media_player: mdiIcons.mdiCast,
	notify: mdiIcons.mdiBell,
	number: mdiIcons.mdiNumeric,
	person: mdiIcons.mdiAccount,
	plant: mdiIcons.mdiFlower,
	proximity: mdiIcons.mdiMapMarkerDistance,
	remote: mdiIcons.mdiRemote,
	scene: mdiIcons.mdiPalette,
	schedule: mdiIcons.mdiCalendarClock,
	script: mdiIcons.mdiScriptText,
	select: mdiIcons.mdiFormatListBulleted,
	sensor: mdiIcons.mdiGauge,
	siren: mdiIcons.mdiBullhorn,
	stt: mdiIcons.mdiMicrophoneMessage,
	sun: mdiIcons.mdiWhiteBalanceSunny,
	switch: mdiIcons.mdiToggleSwitch,
	tag: mdiIcons.mdiTag,
	text: mdiIcons.mdiFormTextbox,
	time: mdiIcons.mdiClockOutline,
	timer: mdiIcons.mdiTimerOutline,
	todo: mdiIcons.mdiFormatListChecks,
	tts: mdiIcons.mdiSpeakerMessage,
	update: mdiIcons.mdiPackageUp,
	vacuum: mdiIcons.mdiRobotVacuum,
	valve: mdiIcons.mdiValve,
	water_heater: mdiIcons.mdiWaterBoiler,
	weather: mdiIcons.mdiWeatherPartlyCloudy,
	zone: mdiIcons.mdiMapMarkerRadius,
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

	return (mdiIcons as Record<string, string>)[exportName] ?? fallbackIcon;
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

function colorToCss(color: IconCanvasColor): string {
	if (typeof color === "string") {
		return color;
	}

	if (color instanceof Color) {
		return `#${color.getHexString()}`;
	}

	return `#${color.toString(16).padStart(6, "0")}`;
}
