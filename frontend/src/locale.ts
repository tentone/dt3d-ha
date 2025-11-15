export class Locale {
    public translations: { [key: string]: { [key: string]: string } } = {};



    public async loadTranslations(locale: string, file: string) {
        const response = await fetch(file);
        const data = await response.text();
        this.translations[locale] = JSON.parse(data);
    }
}