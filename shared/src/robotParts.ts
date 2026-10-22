export interface BasePart {
    id: string;
    nameKey: string;
    weight: number;
}

export interface ChassisPart extends BasePart {
    maxHealth: number;
    armor: number;
    energyCapacity: number;
    energyRegen: number;
    speedModifier: number;
}

export interface LegsPart extends BasePart {
    moveSpeed: number;
    healthBonus: number;
    armorBonus: number;
    energyCapacity: number;
    energyRegen: number;
}

export interface HeadPart extends BasePart {
    healthBonus: number;
    armorBonus: number;
    energyCapacity: number;
    energyRegen: number;
    detectionRange: number;
}

export interface WeaponPart extends BasePart {
    damage: number;
    energyCost: number;
    fireRate: number;
    barrelOffsets: readonly number[];
}

export const CHASSIS = {
    scoutChassis: {
        id: 'scoutChassis',
        nameKey: 'partScoutChassis',
        weight: 20,
        maxHealth: 70,
        armor: 2,
        energyCapacity: 60,
        energyRegen: 6,
        speedModifier: 20
    }
} satisfies Record<string, ChassisPart>;

export const LEGS = {
    walkerLegs: {
        id: 'walkerLegs',
        nameKey: 'partWalkerLegs',
        weight: 12,
        moveSpeed: 260,
        healthBonus: 20,
        armorBonus: 1,
        energyCapacity: 20,
        energyRegen: 5
    }
} satisfies Record<string, LegsPart>;

export const HEADS = {
    radarHead: {
        id: 'radarHead',
        nameKey: 'partRadarHead',
        weight: 5,
        healthBonus: 10,
        armorBonus: 0,
        energyCapacity: 20,
        energyRegen: 4,
        detectionRange: 700
    }
} satisfies Record<string, HeadPart>;

export const WEAPONS = {
    pulseGun: {
        id: 'pulseGun',
        nameKey: 'partPulseGun',
        weight: 8,
        damage: 25,
        energyCost: 4,
        fireRate: 15,
        barrelOffsets: [-13, 13]
    }
} satisfies Record<string, WeaponPart>;

export const PARTS_BY_SLOT = {
    chassis: CHASSIS,
    legs: LEGS,
    head: HEADS,
    weapon: WEAPONS
} as const;

export type ChassisId = keyof typeof CHASSIS;
export type LegsId = keyof typeof LEGS;
export type HeadId = keyof typeof HEADS;
export type WeaponId = keyof typeof WEAPONS;

export interface RobotBuild {
    chassisId: ChassisId;
    legsId: LegsId;
    headId: HeadId;
    weaponId: WeaponId;
}

export interface RobotStats {
    maxHealth: number;
    moveSpeed: number;
    armor: number;
    energyCapacity: number;
    energyRegen: number;
    totalWeight: number;
    detectionRange: number;
    weaponDamage: number;
    weaponEnergyCost: number;
    weaponFireRate: number;
    weaponBarrelOffsets: readonly number[];
}

export const DEFAULT_BUILD: RobotBuild = {
    chassisId: 'scoutChassis',
    legsId: 'walkerLegs',
    headId: 'radarHead',
    weaponId: 'pulseGun'
};

export const ENEMY_STATS: RobotStats = {
    maxHealth: 75,
    moveSpeed: 0,
    armor: 0,
    energyCapacity: 100,
    energyRegen: 15,
    totalWeight: 0,
    detectionRange: 620,
    weaponDamage: 14,
    weaponEnergyCost: 0,
    weaponFireRate: 7,
    weaponBarrelOffsets: [0]
};

export function calculateRobotStats(build: RobotBuild): RobotStats {
    const chassis = CHASSIS[build.chassisId];
    const legs = LEGS[build.legsId];
    const head = HEADS[build.headId];
    const weapon = WEAPONS[build.weaponId];

    return {
        maxHealth: chassis.maxHealth + legs.healthBonus + head.healthBonus,
        moveSpeed: legs.moveSpeed + chassis.speedModifier,
        armor: chassis.armor + legs.armorBonus + head.armorBonus,
        energyCapacity: chassis.energyCapacity + legs.energyCapacity + head.energyCapacity,
        energyRegen: chassis.energyRegen + legs.energyRegen + head.energyRegen,
        totalWeight: chassis.weight + legs.weight + head.weight + weapon.weight,
        detectionRange: head.detectionRange,
        weaponDamage: weapon.damage,
        weaponEnergyCost: weapon.energyCost,
        weaponFireRate: weapon.fireRate,
        weaponBarrelOffsets: weapon.barrelOffsets
    };
}

export function fireRateToIntervalMs(fireRate: number): number {
    return fireRate > 0 ? 1000 / fireRate : Number.POSITIVE_INFINITY;
}
