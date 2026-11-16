import de from "./de.json";
import en from "./en.json";
import es from "./es.json";
import fr from "./fr.json";
import pt from "./pt.json";
import zh from "./zh.json";

export const languageNames = {
	en: "English",
	pt: "Português",
	es: "Español",
	fr: "Français",
	de: "Deutsch",
	zh: "简体中文",
};

export type Language = keyof typeof languageNames;

const translations: Record<Language, Record<string, string>> = {
	de,
	en,
	es,
	fr,
	pt,
	zh,
};

function supportedLanguage(value: unknown): Language | undefined {
	if (typeof value !== "string") return;
	const code = value.trim().toLowerCase().split(/[-_]/, 1)[0];
	if (code === "ch") return "zh";
	return Object.hasOwn(translations, code) ? (code as Language) : undefined;
}

export function normalizeLanguage(value: unknown): Language | "auto" {
	return supportedLanguage(value) ?? "auto";
}

export function resolveLanguage(
	preference: unknown,
	hass?: { language?: string; locale?: { language?: string } },
): Language {
	const browser = globalThis.navigator;
	for (const value of [
		preference,
		hass?.language,
		hass?.locale?.language,
		...(browser?.languages ?? []),
		browser?.language,
	]) {
		const language = supportedLanguage(value);
		if (language) return language;
	}
	return "en";
}

export class Locale extends EventTarget {
	private language: Language = "en";

	public set(language: Language): boolean {
		if (language === this.language) return false;
		this.language = language;
		this.dispatchEvent(new Event("change"));
		return true;
	}

	public get(key: string): string {
		const dictionary = translations[this.language];
		if (Object.hasOwn(dictionary, key) && dictionary[key])
			return dictionary[key];
		return Object.hasOwn(translations.en, key) ? translations.en[key] : key;
	}
}

export const englishLocale = new Locale();
