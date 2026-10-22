import type { Scene } from 'phaser';
import { Math as PhaserMath } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { ENEMY_STATS, fireRateToIntervalMs } from '../data/robotParts';
import type { DamageResult } from '../logic/combat';
import { RobotState } from '../models/RobotState';
import type { ProjectileSystem } from './ProjectileSystem';
import { RobotEntity } from './RobotEntity';

export type EnemyHitResult = DamageResult;

export class EnemyRobot extends RobotEntity {
    readonly state = new RobotState({
        maxHealth: ENEMY_STATS.maxHealth,
        armor: ENEMY_STATS.armor
    });
    private nextShotAt = 0;
    private invulnerableUntil = 0;

    constructor(
        scene: Scene,
        private readonly projectileSystem: ProjectileSystem,
        group: Phaser.Physics.Arcade.Group,
        private readonly spawnX: number,
        private readonly spawnY: number
    ) {
        super(scene, spawnX, spawnY, {
            texture: 'enemy-body',
            turretColor: 0xfca5a5,
            turretOffsets: ENEMY_STATS.weaponBarrelOffsets,
            bodyRadius: 20,
            depth: 7,
            stats: ENEMY_STATS
        });

        group.add(this.sprite);
        this.startSpawnProtection();
    }

    update(time: number, targetX: number, targetY: number): void {
        if (!this.state.isAlive || !this.sprite.active || !this.sprite.body?.enable) return;

        this.syncVisuals();
        const angle = this.aimAt(targetX, targetY);
        const distance = PhaserMath.Distance.Between(this.sprite.x, this.sprite.y, targetX, targetY);

        if (
            distance < this.stats.detectionRange &&
            time >= this.nextShotAt &&
            time >= this.invulnerableUntil
        ) {
            this.nextShotAt = time + fireRateToIntervalMs(this.stats.weaponFireRate);
            this.projectileSystem.fireEnemyProjectile(
                this.sprite.x,
                this.sprite.y,
                angle,
                this.stats.weaponDamage
            );
        }
    }

    takeDamage(rawDamage: number): EnemyHitResult {
        if (!this.state.isAlive || this.scene.time.now < this.invulnerableUntil) {
            return {
                damaged: false,
                destroyed: false,
                damageTaken: 0,
                remainingHealth: this.state.currentHealth
            };
        }

        const result = this.state.takeDamage(rawDamage);

        if (result.destroyed) {
            this.die();
            return result;
        }

        if (result.damaged) this.flashDamage();
        return result;
    }

    private die(): void {
        this.stopVisualTweens();
        this.sprite.disableBody(true, true);
        this.setVisible(false);

        this.scene.time.delayedCall(GAME_CONFIG.enemyRespawnDelayMs, () => this.respawn());
    }

    private respawn(): void {
        this.state.reset();
        this.sprite.enableBody(false, this.spawnX, this.spawnY, true, true);
        this.setPosition(this.spawnX, this.spawnY);
        this.setVisible(true);
        this.startSpawnProtection();
    }

    private startSpawnProtection(): void {
        this.invulnerableUntil = this.scene.time.now + GAME_CONFIG.spawnProtectionMs;
        this.nextShotAt = this.invulnerableUntil;
        this.blink(GAME_CONFIG.spawnProtectionMs);
    }
}
