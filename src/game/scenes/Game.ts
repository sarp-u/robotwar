import { Scene } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { ARENA_ONE } from '../data/maps/mapDefinition';
import { calculateRobotStats, DEFAULT_BUILD, fireRateToIntervalMs } from '../data/robotParts';
import { EnemyRobot } from '../entities/EnemyRobot';
import { PlayerRobot } from '../entities/PlayerRobot';
import { ProjectileSystem } from '../entities/ProjectileSystem';
import { PlayerInput } from '../input/PlayerInput';
import { applyDamage } from '../logic/combat';
import { BattleNetworkClient } from '../network/BattleNetworkClient';
import { Hud } from '../ui/Hud';
import { Arena } from '../world/Arena';
import { i18n } from '../i18n/I18n';

export class Game extends Scene {
    private arena!: Arena;
    private player!: PlayerRobot;
    private inputController!: PlayerInput;
    private projectileSystem!: ProjectileSystem;
    private networkClient?: BattleNetworkClient;
    private enemyGroup!: Phaser.Physics.Arcade.Group;
    private readonly enemies: EnemyRobot[] = [];
    private readonly enemiesBySprite = new Map<Phaser.Physics.Arcade.Image, EnemyRobot>();
    private hud!: Hud;
    private health = 0;
    private score = 0;
    private nextShotAt = 0;
    private playerActive = true;
    private playerInvulnerableUntil = 0;

    constructor() {
        super('Game');
    }

    create(): void {
        this.createTextures();
        this.arena = new Arena(this);

        const playerStats = calculateRobotStats(DEFAULT_BUILD);
        this.health = playerStats.maxHealth;
        const playerSpawn = ARENA_ONE.spawnPoints.player;
        this.player = new PlayerRobot(this, playerSpawn.x, playerSpawn.y, playerStats);
        this.inputController = new PlayerInput(this);
        this.projectileSystem = new ProjectileSystem(this);
        this.hud = new Hud(this, playerStats);
        this.createEnemies();
        this.configureCollisions();
        this.configureCamera();

        this.hud.update(this.health, playerStats.maxHealth, this.score);
        this.startPlayerSpawnProtection();

        if (import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true') {
            this.networkClient = new BattleNetworkClient();
            void this.networkClient.connect().catch((error: unknown) => {
                console.warn('Colyseus sunucusuna bağlanılamadı; yerel mod devam ediyor.', error);
            });
            this.events.once('shutdown', () => {
                void this.networkClient?.disconnect();
            });
        }
    }

    update(time: number, delta: number): void {
        if (!this.playerActive) {
            this.player.setMovement(0, 0);
            this.projectileSystem.update(delta);
            return;
        }

        this.player.regenerateEnergy(delta);
        const input = this.inputController.read();
        this.player.setMovement(input.movementX, input.movementY);
        const aimAngle = this.player.aimAt(input.aimX, input.aimY);
        this.player.syncVisuals();

        this.networkClient?.update(delta, {
            moveX: input.movementX,
            moveY: input.movementY,
            aimAngle,
            firing: input.firing
        });

        if (
            input.firing &&
            time >= this.nextShotAt &&
            this.player.tryConsumeEnergy(this.player.stats.weaponEnergyCost)
        ) {
            this.nextShotAt = time + fireRateToIntervalMs(this.player.stats.weaponFireRate);

            for (const origin of this.player.getWeaponOrigins()) {
                this.projectileSystem.firePlayerProjectile(
                    origin.x,
                    origin.y,
                    aimAngle,
                    this.player.stats.weaponDamage
                );
            }
        }

        for (const enemy of this.enemies) {
            enemy.update(time, this.player.sprite.x, this.player.sprite.y);
        }

        this.projectileSystem.update(delta);
    }

    private createTextures(): void {
        const graphics = this.make.graphics({ x: 0, y: 0 });

        graphics.fillStyle(0x38bdf8).fillCircle(24, 24, 22);
        graphics.lineStyle(3, 0xe0f2fe).strokeCircle(24, 24, 20);
        graphics.generateTexture('robot-body', 48, 48);
        graphics.clear();

        graphics.fillStyle(0xfb923c).fillCircle(22, 22, 20);
        graphics.lineStyle(3, 0xffedd5).strokeCircle(22, 22, 18);
        graphics.generateTexture('enemy-body', 44, 44);
        graphics.clear();

        graphics.fillStyle(0xffffff).fillCircle(5, 5, 5);
        graphics.generateTexture('projectile', 10, 10);
        graphics.clear();

        graphics.fillStyle(0xffffff).fillRect(0, 0, 4, 4);
        graphics.generateTexture('wall', 4, 4);
        graphics.destroy();
    }

    private createEnemies(): void {
        this.enemyGroup = this.physics.add.group();

        for (const spawnPoint of ARENA_ONE.spawnPoints.enemies) {
            const enemy = new EnemyRobot(
                this,
                this.projectileSystem,
                this.enemyGroup,
                spawnPoint.x,
                spawnPoint.y
            );
            this.enemies.push(enemy);
            this.enemiesBySprite.set(enemy.sprite, enemy);
        }
    }

    private configureCollisions(): void {
        this.physics.add.collider(this.player.sprite, this.arena.walls);
        this.physics.add.collider(this.projectileSystem.playerProjectiles, this.arena.walls, (projectile) => {
            this.projectileSystem.release(projectile as Phaser.Physics.Arcade.Image);
        });
        this.physics.add.collider(this.projectileSystem.enemyProjectiles, this.arena.walls, (projectile) => {
            this.projectileSystem.release(projectile as Phaser.Physics.Arcade.Image);
        });

        this.physics.add.overlap(this.projectileSystem.playerProjectiles, this.enemyGroup, (projectile, enemySprite) => {
            this.hitEnemy(
                projectile as Phaser.Physics.Arcade.Image,
                enemySprite as Phaser.Physics.Arcade.Image
            );
        });

        // Phaser group-vs-sprite callbacks return the sprite first and group child second.
        this.physics.add.overlap(this.projectileSystem.enemyProjectiles, this.player.sprite, (_player, projectile) => {
            this.hitPlayer(projectile as Phaser.Physics.Arcade.Image);
        });
    }

    private configureCamera(): void {
        this.cameras.main.setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);
        this.cameras.main.startFollow(this.player.sprite, true, 0.09, 0.09);
    }

    private hitEnemy(projectile: Phaser.Physics.Arcade.Image, enemySprite: Phaser.Physics.Arcade.Image): void {
        const enemy = this.enemiesBySprite.get(enemySprite);
        const projectileState = this.projectileSystem.getState(projectile);
        this.projectileSystem.release(projectile);

        if (!enemy || !projectileState) return;

        const result = enemy.takeDamage(projectileState.damage);
        if (result.destroyed) this.score += 1;
        this.hud.update(this.health, this.player.stats.maxHealth, this.score);
    }

    private hitPlayer(projectile: Phaser.Physics.Arcade.Image): void {
        const projectileState = this.projectileSystem.getState(projectile);
        this.projectileSystem.release(projectile);

        if (
            !projectileState ||
            !this.playerActive ||
            this.time.now < this.playerInvulnerableUntil
        ) return;

        const result = applyDamage(
            this.health,
            projectileState.damage,
            this.player.stats.armor
        );
        this.health = result.remainingHealth;
        this.player.flashDamage();
        this.cameras.main.shake(90, 0.004);
        this.hud.update(this.health, this.player.stats.maxHealth, this.score);

        if (result.destroyed) this.respawnPlayer();
    }

    private respawnPlayer(): void {
        this.playerActive = false;
        this.player.sprite.disableBody(true, true);
        this.player.setVisible(false);
        this.hud.showMessage(i18n.t('gameRobotDestroyed'));

        this.time.delayedCall(GAME_CONFIG.respawnDelayMs, () => {
            const playerSpawn = ARENA_ONE.spawnPoints.player;
            this.health = this.player.stats.maxHealth;
            this.player.sprite.enableBody(false, playerSpawn.x, playerSpawn.y, true, true);
            this.player.setPosition(playerSpawn.x, playerSpawn.y);
            this.player.restoreEnergy();
            this.player.setVisible(true);
            this.playerActive = true;
            this.startPlayerSpawnProtection();
            this.hud.showRobotStatus(this.player.stats);
            this.hud.update(this.health, this.player.stats.maxHealth, this.score);
        });
    }

    private startPlayerSpawnProtection(): void {
        this.playerInvulnerableUntil = this.time.now + GAME_CONFIG.spawnProtectionMs;
        this.player.blink(GAME_CONFIG.spawnProtectionMs);
    }
}
