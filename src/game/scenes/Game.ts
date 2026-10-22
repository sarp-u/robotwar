import { Scene } from 'phaser';
import type { NetworkPlayerState } from '@robotwar/shared/network';
import { GAME_CONFIG } from '../config/gameConfig';
import { ARENA_ONE } from '../data/maps/mapDefinition';
import { calculateRobotStats, DEFAULT_BUILD, fireRateToIntervalMs } from '../data/robotParts';
import { PlayerRobot } from '../entities/PlayerRobot';
import { ProjectileSystem } from '../entities/ProjectileSystem';
import { RobotEntity } from '../entities/RobotEntity';
import { i18n } from '../i18n/I18n';
import { PlayerInput } from '../input/PlayerInput';
import { BattleNetworkClient } from '../network/BattleNetworkClient';
import { Hud } from '../ui/Hud';
import { Arena } from '../world/Arena';

interface NetworkProjectileView {
    image: Phaser.GameObjects.Image;
    correction: { x: number; y: number };
}

export class Game extends Scene {
    private arena!: Arena;
    private player!: PlayerRobot;
    private inputController!: PlayerInput;
    private projectileSystem!: ProjectileSystem;
    private networkClient?: BattleNetworkClient;
    private hud!: Hud;
    private health = 0;
    private score = 0;
    private nextShotAt = 0;
    private readonly multiplayerEnabled = import.meta.env.VITE_MULTIPLAYER_ENABLED === 'true';
    private readonly remotePlayers = new Map<string, RobotEntity>();
    private readonly networkProjectiles = new Map<string, NetworkProjectileView>();
    private collisionsConfigured = false;

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
        if (!this.multiplayerEnabled) this.configureCollisions();
        this.configureCamera();

        this.hud.update(this.health, playerStats.maxHealth, this.score);

        if (this.multiplayerEnabled) {
            this.connectMultiplayer();
            this.events.once('shutdown', () => {
                void this.networkClient?.disconnect();
            });
        }
    }

    update(time: number, delta: number): void {
        const input = this.inputController.read();
        const aimAngle = this.player.aimAt(input.aimX, input.aimY);

        if (this.networkClient) {
            this.player.setMovement(0, 0);
            this.networkClient.update(time, {
                moveX: input.movementX,
                moveY: input.movementY,
                aimAngle,
                firing: input.firing
            });
            this.syncNetworkState();
            return;
        }

        this.player.regenerateEnergy(delta);
        this.player.setMovement(input.movementX, input.movementY);
        this.player.syncVisuals();

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

    private configureCollisions(): void {
        if (this.collisionsConfigured) return;
        this.collisionsConfigured = true;
        this.physics.add.collider(this.player.sprite, this.arena.walls);
        this.physics.add.collider(this.projectileSystem.playerProjectiles, this.arena.walls, (projectile) => {
            this.projectileSystem.release(projectile as Phaser.Physics.Arcade.Image);
        });
    }

    private configureCamera(): void {
        this.cameras.main.setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);
        this.cameras.main.startFollow(this.player.sprite, true, 1, 1);
    }

    private connectMultiplayer(): void {
        const client = new BattleNetworkClient();
        this.networkClient = client;
        const requestedRoomId = new URLSearchParams(window.location.search).get('roomId')?.trim();

        void client.connect(requestedRoomId || undefined).then(() => {
            if (this.networkClient !== client || !client.roomId) return;

            const inviteUrl = new URL(window.location.href);
            inviteUrl.searchParams.set('roomId', client.roomId);
            window.history.replaceState({}, '', inviteUrl);
            this.createInviteButton(inviteUrl.toString());
        }).catch((error: unknown) => {
            if (this.networkClient !== client) return;
            console.warn('Colyseus sunucusuna bağlanılamadı; yerel mod devam ediyor.', error);
            this.networkClient = undefined;
            this.configureCollisions();
            this.hud.showMessage(i18n.t('multiplayerConnectionFailed'));
        });
    }

    private createInviteButton(inviteUrl: string): void {
        const button = this.add.text(this.scale.width - 24, 20, i18n.t('inviteCopy'), {
            fontFamily: 'Arial Black',
            fontSize: '15px',
            color: '#ffffff',
            backgroundColor: '#0e7490',
            padding: { x: 14, y: 9 }
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });

        button.on('pointerdown', () => {
            if (!navigator.clipboard) {
                button.setText(i18n.t('inviteCopyFailed'));
                return;
            }

            void navigator.clipboard.writeText(inviteUrl)
                .then(() => button.setText(i18n.t('inviteCopied')))
                .catch(() => button.setText(i18n.t('inviteCopyFailed')));
        });
    }

    private syncNetworkState(): void {
        const state = this.networkClient?.state;
        const ownSessionId = this.networkClient?.sessionId;
        if (!state?.players || !state.projectiles || !ownSessionId) return;

        const presentPlayers = new Set<string>();
        for (const [sessionId, playerState] of state.players) {
            presentPlayers.add(sessionId);
            if (sessionId === ownSessionId) {
                this.syncOwnPlayer(playerState);
            } else {
                this.syncRemotePlayer(sessionId, playerState);
            }
        }

        for (const [sessionId, robot] of this.remotePlayers) {
            if (presentPlayers.has(sessionId)) continue;
            robot.destroy();
            this.remotePlayers.delete(sessionId);
        }

        const presentProjectiles = new Set<string>();
        for (const [projectileId, projectileState] of state.projectiles) {
            presentProjectiles.add(projectileId);
            const renderPosition = this.networkClient?.getProjectileRenderPosition(projectileState)
                ?? projectileState;
            let view = this.networkProjectiles.get(projectileId);
            if (!view) {
                const owner = state.players.get(projectileState.ownerId);
                const ownerRenderPosition = owner
                    ? this.networkClient?.getPlayerRenderPosition(owner) ?? owner
                    : undefined;
                const correction = {
                    x: owner && ownerRenderPosition ? ownerRenderPosition.x - owner.x : 0,
                    y: owner && ownerRenderPosition ? ownerRenderPosition.y - owner.y : 0
                };
                const image = this.add.image(
                    renderPosition.x + correction.x,
                    renderPosition.y + correction.y,
                    'projectile'
                )
                    .setTint(projectileState.ownerId === ownSessionId ? 0x67e8f9 : 0xfb7185)
                    .setDepth(8);
                view = { image, correction };
                this.networkProjectiles.set(projectileId, view);
                this.tweens.add({
                    targets: correction,
                    x: 0,
                    y: 0,
                    duration: 120,
                    ease: 'Quad.Out'
                });
            }
            view.image.setPosition(
                renderPosition.x + view.correction.x,
                renderPosition.y + view.correction.y
            );
        }

        for (const [projectileId, view] of this.networkProjectiles) {
            if (presentProjectiles.has(projectileId)) continue;
            this.tweens.killTweensOf(view.correction);
            view.image.destroy();
            this.networkProjectiles.delete(projectileId);
        }

        this.hud.showMessage(i18n.t('hudPlayers', {
            current: state.players.size,
            max: ARENA_ONE.spawnPoints.players.length
        }));
    }

    private syncOwnPlayer(state: NetworkPlayerState): void {
        const renderPosition = this.networkClient?.getPlayerRenderPosition(state) ?? state;
        this.player.setPosition(renderPosition.x, renderPosition.y);
        this.player.setVisible(state.active);
        this.player.setEnergy(state.energy);
        this.health = state.health;
        this.score = state.score;
        this.hud.update(state.health, state.maxHealth, state.score);
    }

    private syncRemotePlayer(sessionId: string, state: NetworkPlayerState): void {
        let robot = this.remotePlayers.get(sessionId);
        if (!robot) {
            robot = new RobotEntity(this, state.x, state.y, {
                texture: 'enemy-body',
                turretColor: 0xffc08a,
                turretOffsets: this.player.stats.weaponBarrelOffsets,
                bodyRadius: 20,
                depth: 10,
                stats: this.player.stats
            });
            this.remotePlayers.set(sessionId, robot);
        }

        const renderPosition = this.networkClient?.getPlayerRenderPosition(state) ?? state;
        const renderAim = this.networkClient?.getPlayerRenderAim(state) ?? state.aimAngle;
        robot.setPosition(renderPosition.x, renderPosition.y);
        robot.setAimAngle(renderAim);
        robot.setVisible(state.active);
    }

}
