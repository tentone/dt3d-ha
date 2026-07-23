export type EntityAction = "open" | "toggle" | "nothing";

export type EntityActionOverride = EntityAction | "default";

export type EntityInteractionConfig = {
	click: EntityAction;
	doubleClick: EntityAction;
};

export const DEFAULT_ENTITY_INTERACTION_CONFIG: EntityInteractionConfig = {
	click: "nothing",
	doubleClick: "open",
};

export const normalizeEntityAction = (
	value: unknown,
	fallback: EntityAction,
): EntityAction => {
	switch (typeof value === "string" ? value.trim().toLowerCase() : "") {
		case "open":
		case "open_entity":
		case "more-info":
		case "more_info":
			return "open";
		case "toggle":
			return "toggle";
		case "none":
		case "nothing":
		case "no_action":
			return "nothing";
		default:
			return fallback;
	}
};

export const normalizeEntityActionOverride = (
	value: unknown,
): EntityActionOverride => {
	if (
		value === undefined ||
		value === null ||
		(typeof value === "string" &&
			["", "default", "inherit"].includes(value.trim().toLowerCase()))
	) {
		return "default";
	}

	return normalizeEntityAction(value, "nothing");
};

export const normalizeEntityInteractionConfig = (
	config: Record<string, any> = {},
): EntityInteractionConfig => {
	const actions = config.entity_actions ?? config.entityActions ?? {};

	return {
		click: normalizeEntityAction(
			config.entity_click_action ??
				config.entityClickAction ??
				config.click_action ??
				actions.click,
			DEFAULT_ENTITY_INTERACTION_CONFIG.click,
		),
		doubleClick: normalizeEntityAction(
			config.entity_double_click_action ??
				config.entityDoubleClickAction ??
				config.double_click_action ??
				actions.double_click ??
				actions.doubleClick,
			DEFAULT_ENTITY_INTERACTION_CONFIG.doubleClick,
		),
	};
};
