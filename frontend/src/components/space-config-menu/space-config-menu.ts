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

	private postProcessingNumber(
		label: string,
		attribute: string,
		step: number,
		min: number,
		max: number,
		tooltip?: string,
	): DynamicFormField {
		return {
			label: localManager.get(label),
			attribute: `general.rendering.postProcessing.${attribute}`,
			type: "number",
			tooltip: tooltip ? localManager.get(tooltip) : undefined,
			editable: true,
			enabled: true,
			step,
			min,
			max,
		};
	}

	private postProcessingEnabled(
		attribute: string,
		tooltip: string,
	): DynamicFormField {
		return {
			label: localManager.get("enabled"),
			attribute: `general.rendering.postProcessing.${attribute}.enabled`,
			type: "boolean",
			tooltip: localManager.get(tooltip),
			editable: true,
			enabled: true,
		};
	}

	private createPostProcessingFields(): DynamicFormField[] {
		return [
			{
				label: localManager.get("bokehDepth"),
				attribute: "post-processing-bokeh",
				type: "sub-form",
				enabled: true,
				collapsed: true,
				fields: [
					this.postProcessingEnabled("bokehDepth", "bokehDepthTooltip"),
					this.postProcessingNumber(
						"focusDistance",
						"bokehDepth.focus",
						0.1,
						0.1,
						10000,
						"focusDistanceTooltip",
					),
					this.postProcessingNumber(
						"aperture",
						"bokehDepth.aperture",
						0.0001,
						0,
						1,
						"apertureTooltip",
					),
					this.postProcessingNumber(
						"maximumBlur",
						"bokehDepth.maxBlur",
						0.001,
						0,
						1,
						"maximumBlurTooltip",
					),
				],
			},
			{
				label: localManager.get("bloom"),
				attribute: "post-processing-bloom",
				type: "sub-form",
				enabled: true,
				collapsed: true,
				fields: [
					this.postProcessingEnabled("bloom", "bloomTooltip"),
					this.postProcessingNumber(
						"strength",
						"bloom.strength",
						0.1,
						0,
						10,
					),
					this.postProcessingNumber(
						"radius",
						"bloom.radius",
						0.01,
						0,
						1,
					),
					this.postProcessingNumber(
						"threshold",
						"bloom.threshold",
						0.01,
						0,
						1,
					),
				],
			},
			{
				label: localManager.get("gtao"),
				attribute: "post-processing-gtao",
				type: "sub-form",
				enabled: true,
				collapsed: true,
				fields: [
					this.postProcessingEnabled("gtao", "gtaoTooltip"),
					this.postProcessingNumber("radius", "gtao.radius", 0.01, 0.01, 10),
					this.postProcessingNumber(
						"distanceExponent",
						"gtao.distanceExponent",
						0.1,
						0.1,
						10,
					),
					this.postProcessingNumber(
						"thickness",
						"gtao.thickness",
						0.1,
						0.01,
						10,
					),
					this.postProcessingNumber(
						"distanceFalloff",
						"gtao.distanceFallOff",
						0.1,
						0,
						10,
					),
					this.postProcessingNumber("scale", "gtao.scale", 0.1, 0.01, 10),
					this.postProcessingNumber("samples", "gtao.samples", 1, 2, 32),
					{
						label: localManager.get("screenSpaceRadius"),
						attribute:
							"general.rendering.postProcessing.gtao.screenSpaceRadius",
						type: "boolean",
						tooltip: localManager.get("screenSpaceRadiusTooltip"),
						editable: true,
						enabled: true,
					},
					this.postProcessingNumber(
						"blendIntensity",
						"gtao.blendIntensity",
						0.1,
						0,
						5,
					),
					{
						label: localManager.get("denoise"),
						attribute: "post-processing-gtao-denoise",
						type: "sub-form",
						enabled: true,
						collapsed: true,
						fields: [
							this.postProcessingNumber(
								"lumaPhi",
								"gtao.denoise.lumaPhi",
								0.1,
								0,
								20,
							),
							this.postProcessingNumber(
								"depthPhi",
								"gtao.denoise.depthPhi",
								0.1,
								0,
								20,
							),
							this.postProcessingNumber(
								"normalPhi",
								"gtao.denoise.normalPhi",
								0.1,
								0,
								20,
							),
							this.postProcessingNumber(
								"radius",
								"gtao.denoise.radius",
								0.1,
								0,
								32,
							),
							this.postProcessingNumber(
								"radiusExponent",
								"gtao.denoise.radiusExponent",
								0.1,
								1,
								4,
							),
							this.postProcessingNumber(
								"rings",
								"gtao.denoise.rings",
								1,
								1,
								4,
							),
							this.postProcessingNumber(
								"samples",
								"gtao.denoise.samples",
								1,
								4,
								32,
							),
						],
					},
				],
			},
			{
				label: localManager.get("ssao"),
				attribute: "post-processing-ssao",
				type: "sub-form",
				enabled: true,
				collapsed: true,
				fields: [
					this.postProcessingEnabled("ssao", "ssaoTooltip"),
					this.postProcessingNumber(
						"kernelRadius",
						"ssao.kernelRadius",
						0.1,
						0,
						64,
					),
					this.postProcessingNumber(
						"minimumDistance",
						"ssao.minDistance",
						0.001,
						0,
						1,
					),
					this.postProcessingNumber(
						"maximumDistance",
						"ssao.maxDistance",
						0.01,
						0,
						1,
					),
				],
			},
			{
				label: localManager.get("halftone"),
				attribute: "post-processing-halftone",
				type: "sub-form",
				enabled: true,
				collapsed: true,
				fields: [
					this.postProcessingEnabled("halftone", "halftoneTooltip"),
					{
						label: localManager.get("shape"),
						attribute: "general.rendering.postProcessing.halftone.shape",
						type: "select",
						editable: true,
						enabled: true,
						options: [
							{label: localManager.get("dot"), value: 1},
							{label: localManager.get("ellipse"), value: 2},
							{label: localManager.get("line"), value: 3},
							{label: localManager.get("square"), value: 4},
						],
					},
					this.postProcessingNumber("radius", "halftone.radius", 0.1, 1, 25),
					this.postProcessingNumber(
						"redRotation",
						"halftone.rotateR",
						0.01,
						0,
						Math.PI * 2,
						"rotationRadiansTooltip",
					),
					this.postProcessingNumber(
						"greenRotation",
						"halftone.rotateG",
						0.01,
						0,
						Math.PI * 2,
						"rotationRadiansTooltip",
					),
					this.postProcessingNumber(
						"blueRotation",
						"halftone.rotateB",
						0.01,
						0,
						Math.PI * 2,
						"rotationRadiansTooltip",
					),
					this.postProcessingNumber(
						"scatter",
						"halftone.scatter",
						0.01,
						0,
						1,
					),
					this.postProcessingNumber(
						"blending",
						"halftone.blending",
						0.01,
						0,
						1,
					),
					{
						label: localManager.get("blendingMode"),
						attribute:
							"general.rendering.postProcessing.halftone.blendingMode",
						type: "select",
						editable: true,
						enabled: true,
						options: [
							{label: localManager.get("linear"), value: 1},
							{label: localManager.get("multiply"), value: 2},
							{label: localManager.get("add"), value: 3},
							{label: localManager.get("lighter"), value: 4},
							{label: localManager.get("darker"), value: 5},
						],
					},
					{
						label: localManager.get("greyscale"),
						attribute: "general.rendering.postProcessing.halftone.greyscale",
						type: "boolean",
						editable: true,
						enabled: true,
					},
				],
			},
			{
				label: localManager.get("filmGrain"),
				attribute: "post-processing-film-grain",
				type: "sub-form",
				enabled: true,
				collapsed: true,
				fields: [
					this.postProcessingEnabled("filmGrain", "filmGrainTooltip"),
					this.postProcessingNumber(
						"intensity",
						"filmGrain.intensity",
						0.01,
						0,
						1,
					),
					{
						label: localManager.get("grayscale"),
						attribute: "general.rendering.postProcessing.filmGrain.grayscale",
						type: "boolean",
						editable: true,
						enabled: true,
					},
				],
			},
		];
	}

	private fields: DynamicFormField[] = [
		{
			label: localManager.get("appearance"),
			type: "sub-form",
			enabled: true,
			fields: [
				{
					label: localManager.get("skyEnabled"),
					attribute: "scene.sky.enabled",
					type: "boolean",
					tooltip: localManager.get("skyEnabledTooltip"),
					editable: true,
					enabled: true,
				},
				{
					label: localManager.get("backgroundType"),
					attribute: "scene.background.type",
					type: "select",
					tooltip: localManager.get("backgroundTypeTooltip"),
					editable: true,
					enabled: true,
					options: [
						{label: localManager.get("solidColor"), value: "solid"},
						{label: localManager.get("transparent"), value: "transparent"},
					],
				},
				{
					label: localManager.get("backgroundColor"),
					attribute: "scene.background.color",
					type: "color",
					tooltip: localManager.get("backgroundColorTooltip"),
					editable: true,
					enabled: true,
				},
			],
		},
		{
			label: localManager.get("rendering"),
			type: "sub-form",
			enabled: true,
			fields: [
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
					label: localManager.get("postProcessing"),
					type: "sub-form",
					enabled: true,
					fields: this.createPostProcessingFields(),
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
			if (
				event.detail.attribute ===
				"general.rendering.postProcessing.gtao.enabled"
			) {
				nextConfig.general.rendering.postProcessing.ssao.enabled = false;
			} else if (
				event.detail.attribute ===
				"general.rendering.postProcessing.ssao.enabled"
			) {
				nextConfig.general.rendering.postProcessing.gtao.enabled = false;
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
