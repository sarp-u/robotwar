export interface DamageResult {
    damaged: boolean;
    destroyed: boolean;
    damageTaken: number;
    remainingHealth: number;
}

export function calculateDamageAfterArmor(rawDamage: number, armor: number): number {
    return Math.max(1, rawDamage - armor);
}

export function applyDamage(
    currentHealth: number,
    rawDamage: number,
    armor: number
): DamageResult {
    if (currentHealth <= 0) {
        return {
            damaged: false,
            destroyed: false,
            damageTaken: 0,
            remainingHealth: 0
        };
    }

    const damageTaken = calculateDamageAfterArmor(rawDamage, armor);
    const remainingHealth = Math.max(0, currentHealth - damageTaken);

    return {
        damaged: true,
        destroyed: remainingHealth === 0,
        damageTaken,
        remainingHealth
    };
}
