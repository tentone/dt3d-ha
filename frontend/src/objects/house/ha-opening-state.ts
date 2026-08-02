/** Minimal Home Assistant state shape used by opening bindings. */
export type HaEntityState = {
	state?: unknown;
	attributes?: Record<string, unknown>;
};

/**
 * Convert a Home Assistant entity to an openness percentage. Numeric states are interpreted as 0-100. Cover entities commonly expose their analog value as `current_position`, so that is accepted too.
 */
export function getHaOpeningPercentage(
	entity: HaEntityState | null | undefined,
): number | null {
	if (!entity) return null;

	const state =
		typeof entity.state === "string" ? entity.state.trim() : entity.state;
	const numericState = typeof state === "number" ? state : Number(state);
	if (state !== "" && Number.isFinite(numericState)) {
		return Math.min(100, Math.max(0, numericState));
	}

	const currentPosition = Number(entity.attributes?.current_position);
	if (Number.isFinite(currentPosition)) {
		return Math.min(100, Math.max(0, currentPosition));
	}

	if (typeof state !== "string") return null;
	switch (state.toLowerCase()) {
		case "on":
		case "open":
		case "true":
			return 100;
		case "off":
		case "closed":
		case "false":
			return 0;
		default:
			return null;
	}
}

export function normalizeOpeningEntityId(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}
