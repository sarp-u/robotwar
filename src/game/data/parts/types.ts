import type { TranslationKey } from '../../i18n/types';

export interface BasePart {
    id: string;
    nameKey: TranslationKey;
    weight: number;
}

export interface ChassisPart extends BasePart {
    maxHealth: number;
    armor: number;
    energyCapacity: number;
    speedModifier: number;
}

export interface LegsPart extends BasePart {
    moveSpeed: number;
    healthBonus: number;
    armorBonus: number;
    energyCost: number;
}

export interface HeadPart extends BasePart {
    healthBonus: number;
    armorBonus: number;
    energyBonus: number;
    detectionRange: number;
}

export interface WeaponPart extends BasePart {
    damage: number;
    energyCost: number;
    fireCooldownMs: number;
    projectileSpeed: number;
    barrelOffsets: readonly number[];
}
