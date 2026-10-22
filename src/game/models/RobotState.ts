import { applyDamage, type DamageResult } from '../logic/combat';

export interface RobotStateOptions {
    maxHealth: number;
    armor: number;
}

/**
 * Phaser'dan bağımsız, bir robotun savaş sırasında değişen can durumunu tutar.
 * Bu sınıf ileride hem istemci hem de sunucu tarafındaki oyun mantığında
 * kullanılabilir.
 */
export class RobotState {
    readonly maxHealth: number;
    readonly armor: number;
    private health: number;

    constructor(options: RobotStateOptions) {
        this.maxHealth = Math.max(1, options.maxHealth);
        this.armor = Math.max(0, options.armor);
        this.health = this.maxHealth;
    }

    get currentHealth(): number {
        return this.health;
    }

    get isAlive(): boolean {
        return this.health > 0;
    }

    takeDamage(rawDamage: number): DamageResult {
        const result = applyDamage(this.health, rawDamage, this.armor);
        this.health = result.remainingHealth;
        return result;
    }

    reset(): void {
        this.health = this.maxHealth;
    }
}
