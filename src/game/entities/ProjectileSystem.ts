import type { Scene } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import {
    createProjectileState,
    isProjectileOutsideBounds,
    moveProjectile,
    type ProjectileState
} from '../logic/projectile';

export class ProjectileSystem {
    readonly playerProjectiles: Phaser.Physics.Arcade.Group;
    readonly enemyProjectiles: Phaser.Physics.Arcade.Group;
    private readonly states = new Map<Phaser.Physics.Arcade.Image, ProjectileState>();

    constructor(private readonly scene: Scene) {
        this.playerProjectiles = this.createPool();
        this.enemyProjectiles = this.createPool();
    }

    firePlayerProjectile(x: number, y: number, angle: number, damage: number): void {
        this.spawn(this.playerProjectiles, x, y, angle, 0x67e8f9, damage);
    }

    fireEnemyProjectile(x: number, y: number, angle: number, damage: number): void {
        this.spawn(this.enemyProjectiles, x, y, angle, 0xfb7185, damage);
    }

    update(deltaMs: number): void {
        for (const group of [this.playerProjectiles, this.enemyProjectiles]) {
            for (const child of group.getChildren()) {
                const projectile = child as Phaser.Physics.Arcade.Image;
                if (!projectile.active) continue;

                const currentState = this.states.get(projectile);
                if (!currentState) {
                    this.release(projectile);
                    continue;
                }

                const nextState = moveProjectile(currentState, deltaMs);
                this.states.set(projectile, nextState);
                projectile.setPosition(nextState.position.x, nextState.position.y);

                if (isProjectileOutsideBounds(nextState, {
                    width: GAME_CONFIG.worldWidth,
                    height: GAME_CONFIG.worldHeight
                })) {
                    this.release(projectile);
                }
            }
        }
    }

    getState(projectile: Phaser.Physics.Arcade.Image): ProjectileState | undefined {
        return this.states.get(projectile);
    }

    release(projectile: Phaser.Physics.Arcade.Image): void {
        if (!projectile.active) return;

        const physicsBody = projectile.body as Phaser.Physics.Arcade.Body;
        physicsBody.setVelocity(0, 0);
        this.states.delete(projectile);
        projectile.disableBody(true, true);
    }

    private spawn(group: Phaser.Physics.Arcade.Group, x: number, y: number, angle: number, tint: number, damage: number): void {
        const state = createProjectileState({
            origin: { x, y },
            angle,
            speed: GAME_CONFIG.projectileSpeed,
            spawnOffset: GAME_CONFIG.projectileSpawnOffset,
            damage
        });
        const projectile = group.get(
            state.position.x,
            state.position.y,
            'projectile'
        ) as Phaser.Physics.Arcade.Image | null;

        // The pool has a hard limit. Dropping a shot is safer than allocating
        // unbounded objects and causing frame-time spikes.
        if (!projectile) return;

        projectile.enableBody(true, state.position.x, state.position.y, true, true);
        projectile.setTint(tint).setDepth(8);
        const physicsBody = projectile.body as Phaser.Physics.Arcade.Body;
        physicsBody.setCircle(5);
        physicsBody.setDirectControl(true);
        physicsBody.setVelocity(0, 0);
        this.states.set(projectile, state);
    }

    private createPool(): Phaser.Physics.Arcade.Group {
        const group = this.scene.physics.add.group({
            maxSize: GAME_CONFIG.projectilePoolSize,
            allowGravity: false
        });

        const projectiles = group.createMultiple({
            key: 'projectile',
            quantity: GAME_CONFIG.projectilePoolSize,
            active: false,
            visible: false
        }) as Phaser.Physics.Arcade.Image[];

        for (const projectile of projectiles) {
            projectile.setDepth(8);
            projectile.disableBody(true, true);
        }

        return group;
    }
}
