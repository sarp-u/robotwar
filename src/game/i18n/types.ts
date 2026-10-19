export type SupportedLanguage = 'tr' | 'en' | 'de';

export interface Translations {
    menuTitle: string;
    menuSubtitle: string;
    menuStart: string;
    menuLanguage: string;
    hudHealth: string;
    hudScore: string;
    hudRobotStatus: string;
    gameRobotDestroyed: string;
    partScoutChassis: string;
    partWalkerLegs: string;
    partRadarHead: string;
    partPulseGun: string;
}

export type TranslationKey = keyof Translations;
export type TranslationParams = Record<string, string | number>;
