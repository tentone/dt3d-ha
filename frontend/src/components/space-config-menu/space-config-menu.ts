import "../dynamic-form/dynamic-form.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import type {SpaceConfiguration} from "../../editor/general-config.js";
import {normalizeSpaceConfiguration} from "../../editor/general-config.js";
import {localManager} from "../../locale/locale.js";
import type {
	DynamicFormChangeDetail,
	DynamicFormField,
} from "../dynamic-form/dynamic-form.js";
import componentStyles from "./space-config-menu.css?inline";

@customElement("dt3d-space-config-menu")
export class DT3DSpaceConfigMenu extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public config: SpaceConfiguration = normalizeSpaceConfiguration();

	private fields: DynamicFormField[] = [
		{
			label: localManager.get("rendering"),
			type: "sub-form",
			enabled: true,
			fields: [
				{
					label: localManager.get("antialiasing"),
					attribute: "general.rendering.antialiasing",
					type: "boolean",
					tooltip: localManager.get("antialiasingTooltip"),
					editable: true,
					enabled: true,
				},
				{
					label: localManager.get("toneMapping"),
					attribute: "general.rendering.toneMapping",
					type: "select",
					tooltip: localManager.get("toneMappingTooltip"),
					editable: true,
					enabled: true,
					options: [
						{label: localManager.get("toneMappingNone"), value: "none"},
						{label: localManager.get("toneMappingLinear"), value: "linear"},
						{
							label: localManager.get("toneMappingReinhard"),
							value: "reinhard",
						},
						{label: localManager.get("toneMappingCineon"), value: "cineon"},
						{
							label: localManager.get("toneMappingAcesFilmic"),
							value: "aces_filmic",
						},
					],
				},
				{
					label: localManager.get("resolution"),
					attribute: "general.rendering.resolution",
					type: "select",
					tooltip: localManager.get("resolutionTooltip"),
					editable: true,
					enabled: true,
					options: [
						{label: "100%", value: 1},
						{label: "75%", value: 0.75},
						{label: "50%", value: 0.5},
					],
				},
				{
					label: localManager.get("shadowMap"),
					type: "sub-form",
					enabled: true,
					fields: [
						{
							label: localManager.get("enabled"),
							attribute: "general.rendering.shadowMap.enabled",
							type: "boolean",
							tooltip: localManager.get("shadowMapEnabledTooltip"),
							editable: true,
							enabled: true,
						},
						{
							label: localManager.get("shadowMapType"),
							attribute: "general.rendering.shadowMap.type",
							type: "select",
							tooltip: localManager.get("shadowMapTypeTooltip"),
							editable: true,
							enabled: true,
							options: [
								{label: localManager.get("shadowMapBasic"), value: "basic"},
								{label: localManager.get("shadowMapPcf"), value: "pcf"},
								{
									label: localManager.get("shadowMapPcfSoft"),
									value: "pcf_soft",
								},
								{label: localManager.get("shadowMapVsm"), value: "vsm"},
							],
						},
					],
				},
				{
					label: localManager.get("postProcessing"),
					type: "sub-form",
					enabled: true,
					fields: [
						{
							label: localManager.get("bokehDepth"),
							attribute: "general.rendering.postProcessing.bokehDepth",
							type: "boolean",
							tooltip: localManager.get("bokehDepthTooltip"),
							editable: true,
							enabled: true,
						},
						{
							label: localManager.get("bloom"),
							attribute: "general.rendering.postProcessing.bloom",
							type: "boolean",
							tooltip: localManager.get("bloomTooltip"),
							editable: true,
							enabled: true,
						},
						{
							label: localManager.get("gtao"),
							attribute: "general.rendering.postProcessing.gtao",
							type: "boolean",
							tooltip: localManager.get("gtaoTooltip"),
							editable: true,
							enabled: true,
						},
						{
							label: localManager.get("ssao"),
							attribute: "general.rendering.postProcessing.ssao",
							type: "boolean",
							tooltip: localManager.get("ssaoTooltip"),
							editable: true,
							enabled: true,
						},
						{
							label: localManager.get("halftone"),
							attribute: "general.rendering.postProcessing.halftone",
							type: "boolean",
							tooltip: localManager.get("halftoneTooltip"),
							editable: true,
							enabled: true,
						},
						{
							label: localManager.get("filmGrain"),
							attribute: "general.rendering.postProcessing.filmGrain",
							type: "boolean",
							tooltip: localManager.get("filmGrainTooltip"),
							editable: true,
							enabled: true,
						},
					],
				},
			],
		},
		{
			label: localManager.get("developmentMode"),
			type: "sub-form",
			enabled: true,
			fields: [
				{
					label: localManager.get("enabled"),
					attribute: "general.developmentMode.enabled",
					type: "boolean",
					tooltip: localManager.get("developmentModeTooltip"),
					editable: true,
					enabled: true,
				},
			],
		},
		{
			label: localManager.get("daylightConditions"),
			type: "sub-form",
			enabled: true,
			fields: [
				{
					label: localManager.get("ambientColor"),
					attribute: "scene.daylight.ambientColor",
					type: "color",
					tooltip: localManager.get("ambientColorTooltip"),
					editable: true,
					enabled: true,
				},
				{
					label: localManager.get("ambientIntensity"),
					attribute: "scene.daylight.ambientIntensity",
					type: "number",
					tooltip: localManager.get("ambientIntensityTooltip"),
					editable: true,
					enabled: true,
				},
				{
					label: localManager.get("sunlightColor"),
					attribute: "scene.daylight.sunlightColor",
					type: "color",
					tooltip: localManager.get("sunlightColorTooltip"),
					editable: true,
					enabled: true,
				},
				{
					label: localManager.get("sunlightIntensity"),
					attribute: "scene.daylight.sunlightIntensity",
					type: "number",
					tooltip: localManager.get("sunlightIntensityTooltip"),
					editable: true,
					enabled: true,
				},
				{
					label: localManager.get("sunElevation"),
					attribute: "scene.daylight.sunElevation",
					type: "number",
					tooltip: localManager.get("sunElevationTooltip"),
					editable: true,
					enabled: true,
				},
				{
					label: localManager.get("sunAzimuth"),
					attribute: "scene.daylight.sunAzimuth",
					type: "number",
					tooltip: localManager.get("sunAzimuthTooltip"),
					editable: true,
					enabled: true,
				},
			],
		},
	];

	private close() {
		this.dispatchEvent(
			new CustomEvent("modal-close", {
				bubbles: true,
				composed: true,
			}),
		);
	}

	private setNestedAttribute(
		target: Record<string, any>,
		attribute: string,
		value: unknown,
	) {
		const keys = attribute.split(".");
		let current = target;

		for (let index = 0; index < keys.length - 1; index += 1) {
			const key = keys[index];
			current[key] = {
				...(current[key] ?? {}),
			};
			current = current[key];
		}

		current[keys[keys.length - 1]] = value;
	}

	private handleFieldChange(event: CustomEvent<DynamicFormChangeDetail>) {
		const nextConfig = normalizeSpaceConfiguration(this.config);
		this.setNestedAttribute(
			nextConfig,
			event.detail.attribute,
			event.detail.value,
		);

		if (event.detail.value === true) {
			if (event.detail.attribute === "general.rendering.postProcessing.gtao") {
				nextConfig.general.rendering.postProcessing.ssao = false;
			} else if (
				event.detail.attribute === "general.rendering.postProcessing.ssao"
			) {
				nextConfig.general.rendering.postProcessing.gtao = false;
			}
		}

		this.config = normalizeSpaceConfiguration(nextConfig);

		this.dispatchEvent(
			new CustomEvent("space-config-updated", {
				detail: {config: this.config},
				bubbles: true,
				composed: true,
			}),
		);
	}

	public render() {
		return html`
			<div class="overlay" @click=${this.close}>
				<div class="dialog" @click=${(event: Event) => event.stopPropagation()}>
					<header>
						<div>
							<h3>${localManager.get("spaceConfiguration")}</h3>
							<p>${localManager.get("generalConfigurationDescription")}</p>
						</div>
						<button
							class="close-button"
							@click=${this.close}
							aria-label=${localManager.get("cancel")}
						>
							<ha-icon icon="mdi:close"></ha-icon>
						</button>
					</header>
					<dt3d-dynamic-form
						.fields=${this.fields}
						.data=${this.config}
						@field-change=${(event: CustomEvent<DynamicFormChangeDetail>) =>
							this.handleFieldChange(event)}
					></dt3d-dynamic-form>
				</div>
			</div>
		`;
	}
}
