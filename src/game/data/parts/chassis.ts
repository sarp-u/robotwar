import type { ChassisPart } from './types';

export const CHASSIS = {
    scoutChassis: {
        id: 'scoutChassis',
        nameKey: 'partScoutChassis',
        weight: 20,
        maxHealth: 70,
        armor: 2,
        energyCapacity: 45,
        speedModifier: 20
    }
} satisfies Record<string, ChassisPart>;
