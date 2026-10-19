import { Scene } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { calculateRobotStats, DEFAULT_BUILD } from '../data/robotParts';
import { EnemyRobot } from '../entities/EnemyRobot';
import { PlayerRobot } from '../entities/PlayerRobot';
import { ProjectileSystem } from '../entities/ProjectileSystem';
import { PlayerInput } from '../input/PlayerInput';
import { Hud } from '../ui/Hud';
import { Arena } from '../world/Arena';
import { i18n } from '../i18n/I18n';

const PLAYER_SPAWN = { x: 260, y: 260 } as const;
const ENEMY_SPAWNS: ReadonlyArray<readonly [number, number]> = [
    [800, 250],
    [800, 950],
    [430, 600],
    [1170, 600]
];

export class Game extends Scene {
    private arena!: Arena;
    private player!: PlayerRobot;
    private inputController!: PlayerInput;
    private projectileSystem!: ProjectileSystem;
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
        this.player = new PlayerRobot(this, PLAYER_SPAWN.x, PLAYER_SPAWN.y, playerStats);
        this.inputController = new PlayerInput(this);
        this.projectileSystem = new ProjectileSystem(this);
        this.hud = new Hud(this, playerStats);
        this.createEnemies();
        this.configureCollisions();
        this.configureCamera();

        this.hud.update(this.health, playerStats.maxHealth, this.score);
        this.startPlayerSpawnProtection();
    }

    update(time: number): void {
        if (!this.playerActive) {
            this.player.setMovement(0, 0);
            this.projectileSystem.update();
            return;
        }

        const input = this.inputController.read();
        this.player.setMovement(input.movementX, input.movementY);
        const aimAngle = this.player.aimAt(input.aimX, input.aimY);
        this.player.syncVisuals();

        if (input.firing && time >= this.nextShotAt) {
            this.nextShotAt = time + this.player.stats.weaponFireCooldownMs;

            for (const origin of this.player.getWeaponOrigins()) {
                this.projectileSystem.firePlayerProjectile(
                    origin.x,
                    origin.y,
                    aimAngle,
                    this.player.stats.projectileSpeed,
                    this.player.stats.weaponDamage
                );
            }
        }

        for (const enemy of this.enemies) {
            enemy.update(time, this.player.sprite.x, this.player.sprite.y);
        }

        this.projectileSystem.update();
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

        for (const [x, y] of ENEMY_SPAWNS) {
            const enemy = new EnemyRobot(this, this.projectileSystem, this.enemyGroup, x, y);
            this.enemies.push(enemy);
            this.enemiesBySprite.set(enemy.sprite, enemy);
        }
    }

    private configureCollisions(): void {
        this.physics.add.collider(this.player.sprite, this.arena.walls);
        this.physics.add.collider(this.projectileSystem.playerProjectiles, this.arena.walls, (projectile) => projectile.destroy());
        this.physics.add.collider(this.projectileSystem.enemyProjectiles, this.arena.walls, (projectile) => projectile.destroy());

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
        const damage = projectile.getData('damage') as number;
        projectile.destroy();

        if (!enemy) return;

        const result = enemy.takeDamage(damage);
        if (result.destroyed) this.score += 1;
        this.hud.update(this.health, this.player.stats.maxHealth, this.score);
    }

    private hitPlayer(projectile: Phaser.Physics.Arcade.Image): void {
        const rawDamage = projectile.getData('damage') as number;
        projectile.destroy();

        if (!this.playerActive || this.time.now < this.playerInvulnerableUntil) return;

        this.health -= Math.max(1, rawDamage - this.player.stats.armor);
        this.player.flashDamage();
        this.cameras.main.shake(90, 0.004);
        this.hud.update(this.health, this.player.stats.maxHealth, this.score);

        if (this.health <= 0) this.respawnPlayer();
    }

    private respawnPlayer(): void {
        this.playerActive = false;
        this.player.sprite.disableBody(true, true);
        this.player.setVisible(false);
        this.hud.showMessage(i18n.t('gameRobotDestroyed'));

        this.time.delayedCall(GAME_CONFIG.respawnDelayMs, () => {
            this.health = this.player.stats.maxHealth;
            this.player.sprite.enableBody(false, PLAYER_SPAWN.x, PLAYER_SPAWN.y, true, true);
            this.player.setPosition(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
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
