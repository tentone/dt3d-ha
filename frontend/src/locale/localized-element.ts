import { LitElement } from "lit";

import type { Locale } from "./locale.js";
import { englishLocale } from "./locale.js";

const requestEvent = "dt3d-request-locale";

export function provideLocale(host: HTMLElement, locale: Locale): void {
	host.addEventListener(requestEvent, (event) => {
		event.stopPropagation();
		const { detail } = event as CustomEvent<(locale: Locale) => void>;
		detail(locale);
	});
}

/** Uses the nearest card's locale, including inside nested shadow roots. */
export class LocalizedElement extends LitElement {
	protected locale = englishLocale;

	private readonly updateTranslations = () => this.requestUpdate();

	public override connectedCallback(): void {
		super.connectedCallback();
		this.locale = englishLocale;
		this.dispatchEvent(
			new CustomEvent(requestEvent, {
				bubbles: true,
				composed: true,
				detail: (locale: Locale) => {
					this.locale = locale;
				},
			}),
		);
		this.locale.addEventListener("change", this.updateTranslations);
		this.requestUpdate();
	}

	public override disconnectedCallback(): void {
		this.locale.removeEventListener("change", this.updateTranslations);
		super.disconnectedCallback();
	}
}
