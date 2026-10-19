import { de } from './locales/de';
import { en } from './locales/en';
import { tr } from './locales/tr';
import type { SupportedLanguage, TranslationKey, TranslationParams, Translations } from './types';

const STORAGE_KEY = 'robot-war-language';
const translations: Record<SupportedLanguage, Translations> = { tr, en, de };

class I18n {
    private language: SupportedLanguage = this.loadLanguage();

    getLanguage(): SupportedLanguage {
        return this.language;
    }

    setLanguage(language: SupportedLanguage): void {
        this.language = language;
        localStorage.setItem(STORAGE_KEY, language);
    }

    t(key: TranslationKey, params: TranslationParams = {}): string {
        let value = translations[this.language][key];

        for (const [name, replacement] of Object.entries(params)) {
            value = value.split(`{{${name}}}`).join(String(replacement));
        }

        return value;
    }

    private loadLanguage(): SupportedLanguage {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored === 'tr' || stored === 'en' || stored === 'de') return stored;

        const browserLanguage = navigator.language.slice(0, 2);
        if (browserLanguage === 'en' || browserLanguage === 'de') return browserLanguage;
        return 'tr';
    }
}

export const i18n = new I18n();
