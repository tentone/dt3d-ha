import "../dynamic-form/dynamic-form.js";

import {html, LitElement, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";

import type {SpaceSceneConfig} from "../../editor/scene.js";
import {normalizeSpaceSceneConfig} from "../../editor/scene.js";
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
	public config: SpaceSceneConfig = normalizeSpaceSceneConfig();

	private fields: DynamicFormField[] = [
		{
			label: localManager.get("ambientColor"),
			attribute: "daylight.ambientColor",
			type: "color",
			tooltip: localManager.get("ambientColorTooltip"),
			editable: true,
			enabled: true,
		},
		{
			label: localManager.get("ambientIntensity"),
			attribute: "daylight.ambientIntensity",
			type: "number",
			tooltip: localManager.get("ambientIntensityTooltip"),
			editable: true,
			enabled: true,
		},
		{
			label: localManager.get("sunlightColor"),
			attribute: "daylight.sunlightColor",
			type: "color",
			tooltip: localManager.get("sunlightColorTooltip"),
			editable: true,
			enabled: true,
		},
		{
			label: localManager.get("sunlightIntensity"),
			attribute: "daylight.sunlightIntensity",
			type: "number",
			tooltip: localManager.get("sunlightIntensityTooltip"),
			editable: true,
			enabled: true,
		},
		{
			label: localManager.get("sunElevation"),
			attribute: "daylight.sunElevation",
			type: "number",
			tooltip: localManager.get("sunElevationTooltip"),
			editable: true,
			enabled: true,
		},
		{
			label: localManager.get("sunAzimuth"),
			attribute: "daylight.sunAzimuth",
			type: "number",
			tooltip: localManager.get("sunAzimuthTooltip"),
			editable: true,
			enabled: true,
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
		const nextConfig = normalizeSpaceSceneConfig(this.config);
		this.setNestedAttribute(nextConfig, event.detail.attribute, event.detail.value);
		this.config = normalizeSpaceSceneConfig(nextConfig);

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
							<p>${localManager.get("daylightConditions")}</p>
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
