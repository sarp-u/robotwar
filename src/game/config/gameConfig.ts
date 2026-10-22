import { SIMULATION_CONFIG } from '@robotwar/shared/simulationConfig';
import { ARENA_ONE } from '../data/maps/mapDefinition';

export const GAME_CONFIG = {
    worldWidth: ARENA_ONE.width,
    worldHeight: ARENA_ONE.height,
    projectileSpeed: SIMULATION_CONFIG.projectileSpeed,
    projectileSpawnOffset: SIMULATION_CONFIG.projectileSpawnOffset,
    projectilePoolSize: 128,
    respawnDelayMs: SIMULATION_CONFIG.respawnDelayMs,
    enemyRespawnDelayMs: 2500,
    spawnProtectionMs: SIMULATION_CONFIG.spawnProtectionMs
} as const;
