import type {Object3D} from "three";

import {
	findMaterialObject,
	getMaterials,
	getPrimaryMaterial,
} from "./material-handler.js";

export const ENTITY_RULES_DATA_KEY = "entityRules";

export type EntityRuleAction = "transform" | "color" | "hide";
export type EntityRuleTransformProperty = "position" | "rotation" | "scale";
export type EntityRuleTransformMode = "state" | "interpolate";

export type EntityRuleVector = {
	x: number;
	y: number;
	z: number;
};

type EntityRuleCommon = {
	id: string;
	entityId: string;
	enabled: boolean;
};

export type TransformEntityRule = EntityRuleCommon & {
	action: "transform";
	mode: EntityRuleTransformMode;
	property: EntityRuleTransformProperty;
	state: string;
	valueMin: number;
	valueMax: number;
	from: EntityRuleVector;
	to: EntityRuleVector;
};

export type ColorEntityRule = EntityRuleCommon & {
	action: "color";
	state: string;
	from: string;
	to: string;
};

export type HideEntityRule = EntityRuleCommon & {
	action: "hide";
	state: string;
	hidden: boolean;
	fromVisible: boolean;
};

export type EntityRule = TransformEntityRule | ColorEntityRule | HideEntityRule;

const numberOr = (value: unknown, fallback: number): number => {
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const vectorOr = (
	value: unknown,
	fallback: EntityRuleVector,
): EntityRuleVector => {
	const source =
		value && typeof value === "object"
			? (value as Partial<EntityRuleVector>)
			: {};
	return {
		x: numberOr(source.x, fallback.x),
		y: numberOr(source.y, fallback.y),
		z: numberOr(source.z, fallback.z),
	};
};

const colorOr = (value: unknown, fallback: string): string => {
	const color = String(value ?? "");
	return /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : fallback;
};

const ruleId = (value: unknown, index: number): string => {
	const id = typeof value === "string" ? value.trim() : "";
	return id || `rule-${index}-${Math.random().toString(36).slice(2, 9)}`;
};

/** Normalize persisted rules so malformed or older data cannot break rendering. */
export function normalizeEntityRules(value: unknown): EntityRule[] {
	if (!Array.isArray(value)) return [];

	const rules: EntityRule[] = [];
	value.forEach((item, index) => {
		if (!item || typeof item !== "object") return;
		const source = item as Record<string, unknown>;
		const common = {
			id: ruleId(source.id, index),
			entityId: typeof source.entityId === "string" ? source.entityId : "",
			enabled: source.enabled !== false,
		};

		if (source.action === "transform") {
			const property: EntityRuleTransformProperty =
				source.property === "rotation" || source.property === "scale"
					? source.property
					: "position";
			const defaultVector =
				property === "scale" ? {x: 1, y: 1, z: 1} : {x: 0, y: 0, z: 0};
			rules.push({
				...common,
				action: "transform",
				mode: source.mode === "interpolate" ? "interpolate" : "state",
				property,
				state: String(source.state ?? "on"),
				valueMin: numberOr(source.valueMin, 0),
				valueMax: numberOr(source.valueMax, 100),
				from: vectorOr(source.from, defaultVector),
				to: vectorOr(source.to, defaultVector),
			});
		} else if (source.action === "color") {
			rules.push({
				...common,
				action: "color",
				state: String(source.state ?? "on"),
				from: colorOr(source.from, "#ffffff"),
				to: colorOr(source.to, "#ff0000"),
			});
		} else if (source.action === "hide") {
			rules.push({
				...common,
				action: "hide",
				state: String(source.state ?? "on"),
				hidden: source.hidden !== false,
				fromVisible: source.fromVisible !== false,
			});
		}
	});

	return rules;
}

export function getEntityRules(object: Object3D): EntityRule[] {
	return normalizeEntityRules(object.userData[ENTITY_RULES_DATA_KEY]);
}

function stateMatches(actual: unknown, expected: string): boolean {
	return (
		String(actual ?? "")
			.trim()
			.toLowerCase() === expected.trim().toLowerCase()
	);
}

function setTransform(
	object: Object3D,
	property: EntityRuleTransformProperty,
	value: EntityRuleVector,
): boolean {
	const target = object[property];
	const changed =
		Math.abs(target.x - value.x) > 1e-8 ||
		Math.abs(target.y - value.y) > 1e-8 ||
		Math.abs(target.z - value.z) > 1e-8;
	if (changed) target.set(value.x, value.y, value.z);
	return changed;
}

function setColor(object: Object3D, value: string): boolean {
	const materialObject = findMaterialObject(object);
	if (!materialObject) return false;

	let changed = false;
	for (const material of getMaterials(materialObject)) {
		if (!("color" in material) || !(material as any).color?.set) continue;
		const color = (material as any).color;
		if (`#${color.getHexString()}`.toLowerCase() === value.toLowerCase())
			continue;
		color.set(value);
		material.needsUpdate = true;
		changed = true;
	}
	return changed;
}

/** Restore all properties managed by the supplied rules to their saved baselines. */
export function restoreEntityRuleEffects(
	object: Object3D,
	rules: EntityRule[] = getEntityRules(object),
): boolean {
	let changed = false;
	const restoredTransforms = new Set<EntityRuleTransformProperty>();
	let colorRestored = false;
	let visibilityRestored = false;

	for (const rule of rules) {
		if (rule.action === "transform" && !restoredTransforms.has(rule.property)) {
			changed = setTransform(object, rule.property, rule.from) || changed;
			restoredTransforms.add(rule.property);
		} else if (rule.action === "color" && !colorRestored) {
			changed = setColor(object, rule.from) || changed;
			colorRestored = true;
		} else if (rule.action === "hide" && !visibilityRestored) {
			changed = object.visible !== rule.fromVisible || changed;
			object.visible = rule.fromVisible;
			visibilityRestored = true;
		}
	}

	if (changed) object.updateMatrix();
	return changed;
}

/** Replace rules without leaving effects from removed rules on the object. */
export function setEntityRules(object: Object3D, rules: EntityRule[]): void {
	restoreEntityRuleEffects(object);
	object.userData[ENTITY_RULES_DATA_KEY] = normalizeEntityRules(rules);
}

/** Apply the current Home Assistant states. Later active rules win on conflicts. */
export function applyEntityRules(
	object: Object3D,
	states: Record<string, any>,
): boolean {
	const rules = getEntityRules(object);
	const transforms = new Map<
		EntityRuleTransformProperty,
		EntityRuleVector
	>();
	let color: string | null = null;
	let visible: boolean | null = null;

	for (const rule of rules) {
		if (rule.action === "transform" && !transforms.has(rule.property)) {
			transforms.set(rule.property, rule.from);
		} else if (rule.action === "color" && color === null) {
			color = rule.from;
		} else if (rule.action === "hide" && visible === null) {
			visible = rule.fromVisible;
		}
	}

	for (const rule of rules) {
		if (!rule.enabled || !rule.entityId) continue;
		const entityState = states[rule.entityId]?.state;

		if (rule.action === "transform") {
			let target: EntityRuleVector | null = null;
			if (rule.mode === "state") {
				if (stateMatches(entityState, rule.state)) target = rule.to;
			} else {
				const numericState = Number(entityState);
				const range = rule.valueMax - rule.valueMin;
				if (Number.isFinite(numericState) && Math.abs(range) > 1e-12) {
					const amount = Math.max(
						0,
						Math.min(1, (numericState - rule.valueMin) / range),
					);
					target = {
						x: rule.from.x + (rule.to.x - rule.from.x) * amount,
						y: rule.from.y + (rule.to.y - rule.from.y) * amount,
						z: rule.from.z + (rule.to.z - rule.from.z) * amount,
					};
				}
			}
			if (target) transforms.set(rule.property, target);
		} else if (rule.action === "color") {
			if (stateMatches(entityState, rule.state)) {
				color = rule.to;
			}
		} else if (stateMatches(entityState, rule.state)) {
			visible = !rule.hidden;
		}
	}

	let changed = false;
	for (const [property, value] of transforms) {
		changed = setTransform(object, property, value) || changed;
	}
	if (color !== null) changed = setColor(object, color) || changed;
	if (visible !== null) {
		changed = object.visible !== visible || changed;
		object.visible = visible;
	}

	if (changed) object.updateMatrix();
	return changed;
}

/** Read the first configured baseline for persistence and new rule creation. */
export function getRuleBaselineTransform(
	object: Object3D,
	property: EntityRuleTransformProperty,
): EntityRuleVector {
	const existing = getEntityRules(object).find(
		(rule): rule is TransformEntityRule =>
			rule.action === "transform" && rule.property === property,
	);
	if (existing) return {...existing.from};
	const value = object[property];
	return {x: value.x, y: value.y, z: value.z};
}

export function getRuleBaselineColor(object: Object3D): string {
	const existing = getEntityRules(object).find(
		(rule): rule is ColorEntityRule => rule.action === "color",
	);
	if (existing) return existing.from;
	const material = getPrimaryMaterial(findMaterialObject(object));
	if (
		material &&
		"color" in material &&
		(material as any).color?.getHexString
	) {
		return `#${(material as any).color.getHexString()}`.toLowerCase();
	}
	return "#ffffff";
}

export function getRuleBaselineVisibility(object: Object3D): boolean {
	const existing = getEntityRules(object).find(
		(rule): rule is HideEntityRule => rule.action === "hide",
	);
	return existing?.fromVisible ?? object.visible;
}
