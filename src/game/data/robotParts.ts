import { CHASSIS } from './parts/chassis';
import { HEADS } from './parts/heads';
import { LEGS } from './parts/legs';
import { WEAPONS } from './parts/weapons';

export { CHASSIS, HEADS, LEGS, WEAPONS };
export type { BasePart, ChassisPart, HeadPart, LegsPart, WeaponPart } from './parts/types';

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
    energy: number;
    totalWeight: number;
    detectionRange: number;
    weaponDamage: number;
    weaponFireCooldownMs: number;
    projectileSpeed: number;
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
    energy: 0,
    totalWeight: 0,
    detectionRange: 620,
    weaponDamage: 14,
    weaponFireCooldownMs: 500,
    projectileSpeed: 390,
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
        energy: chassis.energyCapacity + head.energyBonus - legs.energyCost - weapon.energyCost,
        totalWeight: chassis.weight + legs.weight + head.weight + weapon.weight,
        detectionRange: head.detectionRange,
        weaponDamage: weapon.damage,
        weaponFireCooldownMs: weapon.fireCooldownMs,
        projectileSpeed: weapon.projectileSpeed,
        weaponBarrelOffsets: weapon.barrelOffsets
    };
}
