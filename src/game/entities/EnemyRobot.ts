import type { Scene } from 'phaser';
import { Math as PhaserMath } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { ENEMY_STATS } from '../data/robotParts';
import type { ProjectileSystem } from './ProjectileSystem';
import { RobotEntity } from './RobotEntity';

export interface EnemyHitResult {
    damaged: boolean;
    destroyed: boolean;
}

export class EnemyRobot extends RobotEntity {
    private health = ENEMY_STATS.maxHealth;
    private nextShotAt = 0;
    private invulnerableUntil = 0;
    private alive = true;

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
        if (!this.alive || !this.sprite.active || !this.sprite.body?.enable) return;

        this.syncVisuals();
        const angle = this.aimAt(targetX, targetY);
        const distance = PhaserMath.Distance.Between(this.sprite.x, this.sprite.y, targetX, targetY);

        if (
            distance < this.stats.detectionRange &&
            time >= this.nextShotAt &&
            time >= this.invulnerableUntil
        ) {
            this.nextShotAt = time + this.stats.weaponFireCooldownMs;
            this.projectileSystem.fireEnemyProjectile(
                this.sprite.x,
                this.sprite.y,
                angle,
                this.stats.projectileSpeed,
                this.stats.weaponDamage
            );
        }
    }

    takeDamage(rawDamage: number): EnemyHitResult {
        if (!this.alive || this.scene.time.now < this.invulnerableUntil) {
            return { damaged: false, destroyed: false };
        }

        this.health -= Math.max(1, rawDamage - this.stats.armor);

        if (this.health <= 0) {
            this.die();
            return { damaged: true, destroyed: true };
        }

        this.flashDamage();
        return { damaged: true, destroyed: false };
    }

    private die(): void {
        this.alive = false;
        this.stopVisualTweens();
        this.sprite.disableBody(true, true);
        this.setVisible(false);

        this.scene.time.delayedCall(GAME_CONFIG.enemyRespawnDelayMs, () => this.respawn());
    }

    private respawn(): void {
        this.health = this.stats.maxHealth;
        this.sprite.enableBody(false, this.spawnX, this.spawnY, true, true);
        this.setPosition(this.spawnX, this.spawnY);
        this.setVisible(true);
        this.alive = true;
        this.startSpawnProtection();
    }

    private startSpawnProtection(): void {
        this.invulnerableUntil = this.scene.time.now + GAME_CONFIG.spawnProtectionMs;
        this.nextShotAt = this.invulnerableUntil;
        this.blink(GAME_CONFIG.spawnProtectionMs);
    }
}
