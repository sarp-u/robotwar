import { applyDamage } from '@robotwar/shared/combat';
import { consumeEnergy, regenerateEnergy } from '@robotwar/shared/energy';
import { ARENA_ONE } from '@robotwar/shared/mapDefinition';
import { moveEntityWithObstacles } from '@robotwar/shared/movement';
import {
    createProjectileState,
    isPointInsideRectangle,
    isProjectileOutsideBounds,
    moveProjectile,
    type ProjectileState
} from '@robotwar/shared/projectile';
import {
    calculateRobotStats,
    DEFAULT_BUILD,
    fireRateToIntervalMs
} from '@robotwar/shared/robotParts';
import { SIMULATION_CONFIG } from '@robotwar/shared/simulationConfig';
import { type Client, Room } from 'colyseus';
import { BattleInput } from './schema/BattleInput.js';
import {
    BattlePlayer,
    BattleProjectile,
    BattleState,
    type BattlePlayer as BattlePlayerState
} from './schema/BattleState.js';

interface PlayerRuntime {
    nextShotAt: number;
    invulnerableUntil: number;
    respawnAt: number;
    spawnIndex: number;
}

interface ServerProjectile {
    ownerId: string;
    state: ProjectileState;
}

export class BattleRoom extends Room<{ state: BattleState; input: BattleInput }> {
    // Capacity follows the map so the room and its spawn data cannot drift apart.
    maxClients = ARENA_ONE.spawnPoints.players.length;
    state = new BattleState();

    inputs = this.defineInput(BattleInput, {
        bufferMaxSize: 64,
        sanitize: {
            moveX: [-1, 1],
            moveY: [-1, 1],
            aimAngle: [-Math.PI, Math.PI]
        }
    });

    private readonly stats = calculateRobotStats(DEFAULT_BUILD);
    private readonly playerRuntimes = new Map<string, PlayerRuntime>();
    private readonly projectiles = new Map<string, ServerProjectile>();
    private simulationTimeMs = 0;
    private nextProjectileId = 1;

    onCreate(): void {
        this.setFixedTimestep((context) => this.step(context.dtMs), SIMULATION_CONFIG.tickRate);
    }

    onJoin(client: Client): void {
        const spawnIndex = this.state.players.size % ARENA_ONE.spawnPoints.players.length;
        const spawn = ARENA_ONE.spawnPoints.players[spawnIndex] ?? ARENA_ONE.spawnPoints.player;
        const player = new BattlePlayer();

        player.x = spawn.x;
        player.y = spawn.y;
        player.health = this.stats.maxHealth;
        player.maxHealth = this.stats.maxHealth;
        player.armor = this.stats.armor;
        player.energy = this.stats.energyCapacity;
        player.maxEnergy = this.stats.energyCapacity;

        this.state.players.set(client.sessionId, player);
        this.playerRuntimes.set(client.sessionId, {
            nextShotAt: this.simulationTimeMs,
            invulnerableUntil: this.simulationTimeMs + SIMULATION_CONFIG.spawnProtectionMs,
            respawnAt: 0,
            spawnIndex
        });
    }

    onLeave(client: Client): void {
        this.state.players.delete(client.sessionId);
        this.playerRuntimes.delete(client.sessionId);

        for (const [projectileId, projectile] of this.projectiles) {
            if (projectile.ownerId === client.sessionId) this.removeProjectile(projectileId);
        }
    }

    private step(deltaMs: number): void {
        this.simulationTimeMs += deltaMs;
        this.updatePlayers(deltaMs);
        this.updateProjectiles(deltaMs);
    }

    private updatePlayers(deltaMs: number): void {
        for (const [sessionId, player] of this.state.players) {
            const runtime = this.playerRuntimes.get(sessionId);
            if (!runtime) continue;

            if (!player.active) {
                if (this.simulationTimeMs >= runtime.respawnAt) {
                    this.respawnPlayer(player, runtime);
                }
                continue;
            }

            player.energy = regenerateEnergy(
                player.energy,
                player.maxEnergy,
                this.stats.energyRegen,
                deltaMs
            );

            const input = this.inputs.get(sessionId).next();
            if (!input) continue;

            const position = moveEntityWithObstacles(
                { x: player.x, y: player.y },
                { x: input.moveX, y: input.moveY },
                this.stats.moveSpeed,
                deltaMs / 1000,
                { width: ARENA_ONE.width, height: ARENA_ONE.height },
                SIMULATION_CONFIG.playerRadius,
                ARENA_ONE.walls
            );
            player.x = position.x;
            player.y = position.y;
            player.aimAngle = input.aimAngle;

            if (input.firing) this.tryFire(sessionId, player, runtime);
        }
    }

    private tryFire(
        sessionId: string,
        player: BattlePlayerState,
        runtime: PlayerRuntime
    ): void {
        if (this.simulationTimeMs < runtime.nextShotAt) return;

        const energyResult = consumeEnergy(player.energy, this.stats.weaponEnergyCost);
        if (!energyResult.consumed) return;

        player.energy = energyResult.remainingEnergy;
        runtime.nextShotAt = this.simulationTimeMs + fireRateToIntervalMs(this.stats.weaponFireRate);

        for (const barrelOffset of this.stats.weaponBarrelOffsets) {
            const perpendicularAngle = player.aimAngle + Math.PI / 2;
            const origin = {
                x: player.x + Math.cos(perpendicularAngle) * barrelOffset,
                y: player.y + Math.sin(perpendicularAngle) * barrelOffset
            };
            this.spawnProjectile(sessionId, origin.x, origin.y, player.aimAngle);
        }
    }

    private spawnProjectile(ownerId: string, x: number, y: number, angle: number): void {
        const id = String(this.nextProjectileId++);
        const projectileState = createProjectileState({
            origin: { x, y },
            angle,
            speed: SIMULATION_CONFIG.projectileSpeed,
            spawnOffset: SIMULATION_CONFIG.projectileSpawnOffset,
            damage: this.stats.weaponDamage
        });
        const networkProjectile = new BattleProjectile();
        networkProjectile.ownerId = ownerId;
        networkProjectile.x = projectileState.position.x;
        networkProjectile.y = projectileState.position.y;
        networkProjectile.damage = projectileState.damage;

        this.projectiles.set(id, { ownerId, state: projectileState });
        this.state.projectiles.set(id, networkProjectile);
    }

    private updateProjectiles(deltaMs: number): void {
        for (const [projectileId, projectile] of this.projectiles) {
            const nextState = moveProjectile(projectile.state, deltaMs);
            projectile.state = nextState;

            const networkProjectile = this.state.projectiles.get(projectileId);
            if (!networkProjectile) {
                this.projectiles.delete(projectileId);
                continue;
            }

            networkProjectile.x = nextState.position.x;
            networkProjectile.y = nextState.position.y;

            const hitWall = ARENA_ONE.walls.some((wall) => (
                isPointInsideRectangle(nextState.position, wall)
            ));
            if (hitWall || isProjectileOutsideBounds(nextState, ARENA_ONE)) {
                this.removeProjectile(projectileId);
                continue;
            }

            const targetEntry = this.findProjectileTarget(projectile);
            if (!targetEntry) continue;

            const [targetId, target] = targetEntry;
            this.applyProjectileHit(projectile.ownerId, targetId, target, nextState.damage);
            this.removeProjectile(projectileId);
        }
    }

    private findProjectileTarget(
        projectile: ServerProjectile
    ): [string, BattlePlayerState] | undefined {
        const collisionDistance = SIMULATION_CONFIG.playerRadius + SIMULATION_CONFIG.projectileRadius;

        for (const [sessionId, player] of this.state.players) {
            if (sessionId === projectile.ownerId || !player.active) continue;

            const distance = Math.hypot(
                player.x - projectile.state.position.x,
                player.y - projectile.state.position.y
            );
            if (distance <= collisionDistance) return [sessionId, player];
        }

        return undefined;
    }

    private applyProjectileHit(
        ownerId: string,
        targetId: string,
        target: BattlePlayerState,
        rawDamage: number
    ): void {
        const runtime = this.playerRuntimes.get(targetId);
        if (!runtime || this.simulationTimeMs < runtime.invulnerableUntil) return;

        const result = applyDamage(target.health, rawDamage, target.armor);
        target.health = result.remainingHealth;
        if (!result.destroyed) return;

        target.active = false;
        runtime.respawnAt = this.simulationTimeMs + SIMULATION_CONFIG.respawnDelayMs;

        const owner = this.state.players.get(ownerId);
        if (owner) owner.score += 1;
    }

    private respawnPlayer(player: BattlePlayerState, runtime: PlayerRuntime): void {
        const spawn = ARENA_ONE.spawnPoints.players[runtime.spawnIndex] ?? ARENA_ONE.spawnPoints.player;
        player.x = spawn.x;
        player.y = spawn.y;
        player.health = player.maxHealth;
        player.energy = player.maxEnergy;
        player.active = true;
        runtime.nextShotAt = this.simulationTimeMs;
        runtime.invulnerableUntil = this.simulationTimeMs + SIMULATION_CONFIG.spawnProtectionMs;
    }

    private removeProjectile(projectileId: string): void {
        this.projectiles.delete(projectileId);
        this.state.projectiles.delete(projectileId);
    }
}
