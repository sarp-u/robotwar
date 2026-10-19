import type { HeadPart } from './types';

export const HEADS = {
    radarHead: {
        id: 'radarHead',
        nameKey: 'partRadarHead',
        weight: 5,
        healthBonus: 10,
        armorBonus: 0,
        energyBonus: 15,
        detectionRange: 700
    }
} satisfies Record<string, HeadPart>;
