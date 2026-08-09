import {html, LitElement, nothing, unsafeCSS} from "lit";
import {customElement, property} from "lit/decorators.js";
import type {Object3D} from "three";

import type {
	ColorEntityRule,
	EntityRule,
	EntityRuleAction,
	EntityRuleTransformProperty,
	HideEntityRule,
	TransformEntityRule,
} from "../../editor/entity-rules.js";
import {
	getEntityRules,
	getRuleBaselineColor,
	getRuleBaselineTransform,
	getRuleBaselineVisibility,
	normalizeEntityRules,
} from "../../editor/entity-rules.js";
import {localManager} from "../../locale/locale.js";
import type {DynamicFormEntityOption} from "../dynamic-form/dynamic-form.js";
import componentStyles from "./entity-rules.css?inline";

export type EntityRulesChangeDetail = {
	rules: EntityRule[];
};

let entityRulesInstanceId = 0;

@customElement("dt3d-entity-rules")
export class DT3DEntityRules extends LitElement {
	static styles = unsafeCSS(componentStyles);

	@property({attribute: false})
	public object: Object3D | null = null;

	@property({attribute: false})
	public entityOptions: DynamicFormEntityOption[] = [];

	@property({type: Boolean})
	public disabled = false;

	private readonly entityListId = `dt3d-rule-entities-${++entityRulesInstanceId}`;

	private get rules(): EntityRule[] {
		return this.object ? getEntityRules(this.object) : [];
	}

	private emitRules(rules: EntityRule[]): void {
		this.dispatchEvent(
			new CustomEvent<EntityRulesChangeDetail>("entity-rules-change", {
				detail: {rules: normalizeEntityRules(rules)},
				bubbles: true,
				composed: true,
			}),
		);
		// The selected Object3D keeps the same identity when its userData changes,
		// so Lit will not schedule this child automatically after the parent applies
		// the event. Refresh locally to reveal action-specific fields immediately.
		this.requestUpdate();
	}

	private updateRule(id: string, patch: Partial<EntityRule>): void {
		const rules = this.rules.map((rule) =>
			rule.id === id ? ({...rule, ...patch} as EntityRule) : rule,
		);
		this.emitRules(rules);
	}

	private replaceRule(id: string, rule: EntityRule): void {
		this.emitRules(this.rules.map((item) => (item.id === id ? rule : item)));
	}

	private createRule(
		action: EntityRuleAction,
		id: string = `rule-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
	): EntityRule {
		const object = this.object!;
		const common = {
			id,
			entityId: "",
			enabled: true,
		};
		if (action === "color") {
			return {
				...common,
				action,
				state: "on",
				from: getRuleBaselineColor(object),
				to: "#ff0000",
			};
		}
		if (action === "hide") {
			return {
				...common,
				action,
				state: "on",
				hidden: true,
				fromVisible: getRuleBaselineVisibility(object),
			};
		}

		const baseline = getRuleBaselineTransform(object, "position");
		return {
			...common,
			action: "transform",
			mode: "state",
			property: "position",
			state: "on",
			valueMin: 0,
			valueMax: 100,
			from: baseline,
			to: {...baseline},
		};
	}

	private changeAction(rule: EntityRule, action: EntityRuleAction): void {
		const replacement = this.createRule(action, rule.id);
		replacement.entityId = rule.entityId;
		replacement.enabled = rule.enabled;
		if ("state" in replacement && "state" in rule)
			replacement.state = rule.state;
		this.replaceRule(rule.id, replacement);
	}

	private changeTransformProperty(
		rule: TransformEntityRule,
		property: EntityRuleTransformProperty,
	): void {
		const baseline = getRuleBaselineTransform(this.object!, property);
		this.updateRule(rule.id, {
			property,
			from: baseline,
			to: {...baseline},
		} as Partial<EntityRule>);
	}

	private updateVector(
		rule: TransformEntityRule,
		axis: "x" | "y" | "z",
		value: string,
	): void {
		const parsed = Number(value);
		if (!Number.isFinite(parsed)) return;
		const nativeValue =
			rule.property === "rotation" ? (parsed * Math.PI) / 180 : parsed;
		this.updateRule(rule.id, {
			to: {...rule.to, [axis]: nativeValue},
		} as Partial<EntityRule>);
	}

	private renderTransform(rule: TransformEntityRule) {
		return html`
			<label>
				${localManager.get("ruleTransformProperty")}
				<select
					.value=${rule.property}
					?disabled=${this.disabled}
					@change=${(event: Event) =>
						this.changeTransformProperty(
							rule,
							(event.target as HTMLSelectElement)
								.value as EntityRuleTransformProperty,
						)}
				>
					<option value="position">${localManager.get("position")}</option>
					<option value="rotation">${localManager.get("rotation")}</option>
					<option value="scale">${localManager.get("scale")}</option>
				</select>
			</label>
			<label>
				${localManager.get("ruleTransformMode")}
				<select
					.value=${rule.mode}
					?disabled=${this.disabled}
					@change=${(event: Event) =>
						this.updateRule(rule.id, {
							mode: (event.target as HTMLSelectElement).value,
						} as Partial<EntityRule>)}
				>
					<option value="state">
						${localManager.get("ruleSpecificState")}
					</option>
					<option value="interpolate">
						${localManager.get("ruleInterpolateValue")}
					</option>
				</select>
			</label>
			${rule.mode === "state"
				? this.renderState(rule)
				: html`
						<div class="range-row">
							<label>
								${localManager.get("ruleValueMin")}
								<input
									type="number"
									.value=${String(rule.valueMin)}
									?disabled=${this.disabled}
									@change=${(event: Event) =>
										this.updateRule(rule.id, {
											valueMin: Number(
												(event.target as HTMLInputElement).value,
											),
										} as Partial<EntityRule>)}
								/>
							</label>
							<label>
								${localManager.get("ruleValueMax")}
								<input
									type="number"
									.value=${String(rule.valueMax)}
									?disabled=${this.disabled}
									@change=${(event: Event) =>
										this.updateRule(rule.id, {
											valueMax: Number(
												(event.target as HTMLInputElement).value,
											),
										} as Partial<EntityRule>)}
								/>
							</label>
						</div>
					`}
			<label>${localManager.get("ruleTargetTransform")}</label>
			<div class="vector-row">
				${(["x", "y", "z"] as const).map(
					(axis) => html`
						<label>
							${axis.toUpperCase()}
							<input
								type="number"
								step="any"
								.value=${String(
									rule.property === "rotation"
										? (rule.to[axis] * 180) / Math.PI
										: rule.to[axis],
								)}
								?disabled=${this.disabled}
								@change=${(event: Event) =>
									this.updateVector(
										rule,
										axis,
										(event.target as HTMLInputElement).value,
									)}
							/>
						</label>
					`,
				)}
			</div>
			<p class="hint">${localManager.get("ruleTransformBaselineHint")}</p>
		`;
	}

	private renderState(
		rule: ColorEntityRule | HideEntityRule | TransformEntityRule,
	) {
		return html`
			<label>
				${localManager.get("ruleEntityState")}
				<input
					.value=${rule.state}
					?disabled=${this.disabled}
					placeholder="on"
					@change=${(event: Event) =>
						this.updateRule(rule.id, {
							state: (event.target as HTMLInputElement).value,
						} as Partial<EntityRule>)}
				/>
			</label>
		`;
	}

	private renderRule(rule: EntityRule, index: number) {
		return html`
			<div class="rule">
				<div class="rule-header">
					<strong>${localManager.get("rule")} ${index + 1}</strong>
					<label class="enabled">
						<input
							type="checkbox"
							.checked=${rule.enabled}
							?disabled=${this.disabled}
							@change=${(event: Event) =>
								this.updateRule(rule.id, {
									enabled: (event.target as HTMLInputElement).checked,
								} as Partial<EntityRule>)}
						/>
						${localManager.get("enabled")}
					</label>
					<button
						class="remove"
						type="button"
						?disabled=${this.disabled}
						@click=${() =>
							this.emitRules(this.rules.filter((item) => item.id !== rule.id))}
					>
						${localManager.get("removeRule")}
					</button>
				</div>
				<label>
					${localManager.get("entity")}
					<input
						list=${this.entityListId}
						.value=${rule.entityId}
						?disabled=${this.disabled}
						placeholder="sensor.example"
						@change=${(event: Event) =>
							this.updateRule(rule.id, {
								entityId: (event.target as HTMLInputElement).value.trim(),
							} as Partial<EntityRule>)}
					/>
				</label>
				<label>
					${localManager.get("ruleAction")}
					<select
						.value=${rule.action}
						?disabled=${this.disabled}
						@change=${(event: Event) =>
							this.changeAction(
								rule,
								(event.target as HTMLSelectElement).value as EntityRuleAction,
							)}
					>
						<option value="transform">
							${localManager.get("ruleTransformAction")}
						</option>
						<option value="color">
							${localManager.get("ruleColorChange")}
						</option>
						<option value="hide">${localManager.get("ruleHide")}</option>
					</select>
				</label>
				${rule.action === "transform"
					? this.renderTransform(rule)
					: rule.action === "color"
						? html`${this.renderState(rule)}
								<label
									>${localManager.get("ruleTargetColor")}
									<input
										type="color"
										.value=${rule.to}
										?disabled=${this.disabled}
										@change=${(event: Event) =>
											this.updateRule(rule.id, {
												to: (event.target as HTMLInputElement).value,
											} as Partial<EntityRule>)}
									/>
								</label>`
						: html`${this.renderState(rule)}
								<p class="hint">${localManager.get("ruleHideHint")}</p>`}
			</div>
		`;
	}

	public render() {
		if (!this.object) return nothing;
		const rules = this.rules;
		return html`
			<datalist id=${this.entityListId}>
				${this.entityOptions.map(
					(option) =>
						html`<option value=${option.entityId}>${option.name}</option>`,
				)}
			</datalist>
			<div class="rules">
				${rules.length === 0
					? html`<p class="empty">${localManager.get("noEntityRules")}</p>`
					: nothing}
				${rules.map((rule, index) => this.renderRule(rule, index))}
				<button
					class="add"
					type="button"
					?disabled=${this.disabled}
					@click=${() =>
						this.emitRules([...rules, this.createRule("transform")])}
				>
					${localManager.get("addRule")}
				</button>
			</div>
		`;
	}
}
