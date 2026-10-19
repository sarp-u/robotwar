import type { Scene } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

export class ProjectileSystem {
    readonly playerProjectiles: Phaser.Physics.Arcade.Group;
    readonly enemyProjectiles: Phaser.Physics.Arcade.Group;

    constructor(private readonly scene: Scene) {
        this.playerProjectiles = scene.physics.add.group();
        this.enemyProjectiles = scene.physics.add.group();
    }

    firePlayerProjectile(x: number, y: number, angle: number, speed: number, damage: number): void {
        this.spawn(this.playerProjectiles, x, y, angle, speed, 0x67e8f9, damage);
    }

    fireEnemyProjectile(x: number, y: number, angle: number, speed: number, damage: number): void {
        this.spawn(this.enemyProjectiles, x, y, angle, speed, 0xfb7185, damage);
    }

    update(): void {
        for (const group of [this.playerProjectiles, this.enemyProjectiles]) {
            for (const child of group.getChildren()) {
                const projectile = child as Phaser.Physics.Arcade.Image;
                const outsideArena = projectile.x < 0 || projectile.x > GAME_CONFIG.worldWidth || projectile.y < 0 || projectile.y > GAME_CONFIG.worldHeight;
                if (outsideArena) projectile.destroy();
            }
        }
    }

    private spawn(group: Phaser.Physics.Arcade.Group, x: number, y: number, angle: number, speed: number, tint: number, damage: number): void {
        // Spawn inside the shooter's collision radius. If the shooter is touching a
        // wall, the projectile can no longer be created inside / beyond that wall.
        const projectile = this.scene.physics.add.image(
            x + Math.cos(angle) * GAME_CONFIG.projectileSpawnOffset,
            y + Math.sin(angle) * GAME_CONFIG.projectileSpawnOffset,
            'projectile'
        );
        projectile.setTint(tint).setDepth(8).setData('damage', damage);
        group.add(projectile);
        const physicsBody = projectile.body as Phaser.Physics.Arcade.Body;
        physicsBody.setCircle(5);
        physicsBody.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
}
