export interface EnergyConsumptionResult {
    consumed: boolean;
    remainingEnergy: number;
}

export function consumeEnergy(
    currentEnergy: number,
    energyCost: number
): EnergyConsumptionResult {
    if (currentEnergy < energyCost) {
        return {
            consumed: false,
            remainingEnergy: currentEnergy
        };
    }

    return {
        consumed: true,
        remainingEnergy: currentEnergy - energyCost
    };
}

export function regenerateEnergy(
    currentEnergy: number,
    maximumEnergy: number,
    regenerationPerSecond: number,
    deltaMs: number
): number {
    const regeneratedAmount = regenerationPerSecond * (deltaMs / 1000);
    return Math.min(maximumEnergy, currentEnergy + regeneratedAmount);
}
