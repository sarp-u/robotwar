import type { WeaponPart } from './types';

export const WEAPONS = {
    pulseGun: {
        id: 'pulseGun',
        nameKey: 'partPulseGun',
        weight: 8,
        damage: 25,
        energyCost: 10,
        fireCooldownMs: 180,
        projectileSpeed: 760,
        barrelOffsets: [-13, 13]
    }
} satisfies Record<string, WeaponPart>;
