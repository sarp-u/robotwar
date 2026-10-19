import type { LegsPart } from './types';

export const LEGS = {
    walkerLegs: {
        id: 'walkerLegs',
        nameKey: 'partWalkerLegs',
        weight: 12,
        moveSpeed: 260,
        healthBonus: 20,
        armorBonus: 1,
        energyCost: 0
    }
} satisfies Record<string, LegsPart>;
