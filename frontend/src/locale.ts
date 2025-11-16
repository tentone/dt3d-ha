export class Locale {
    /**
     * Translations storage
     */
    public translations: { [key: string]: { [key: string]: string } } = {};

    /**
     * Locale selector
     */
    public current: string = null;

    /**
     * Set the current locale
     * 
     * @param locale - Locale code 
     */
    public set(locale: string) {
        if (!this.translations[locale]) {
            throw new Error(`Locale ${locale} not loaded`);
        }

        this.current = locale;
    }

    /**
     * Get the translation for a given key
     *
     * @param key - Translation key
     * @returns Translated string
     */
    public get(key: string): string {
        if (!this.current) {
            throw new Error("No locale set");
        }
        return this.translations[this.current][key] || key;
    }

    /**
     * 
     * @param locale - Locale code
     * @param file - File name to load translations from
     */
    public async loadTranslations(locale: string, file: string) {
        const response = await fetch(file);
        const data = await response.text();
        this.translations[locale] = JSON.parse(data);

        if (!this.current) {
            this.current = locale;
        }
    }
}