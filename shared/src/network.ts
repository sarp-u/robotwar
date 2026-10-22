export interface BattleInputData {
    moveX: number;
    moveY: number;
    aimAngle: number;
    firing: boolean;
}

export interface NetworkPlayerState {
    x: number;
    y: number;
    aimAngle: number;
    health: number;
    maxHealth: number;
    armor: number;
    energy: number;
    maxEnergy: number;
    active: boolean;
    score: number;
}

export interface NetworkProjectileState {
    ownerId: string;
    x: number;
    y: number;
    damage: number;
}

export interface BattleNetworkState {
    players: Map<string, NetworkPlayerState>;
    projectiles: Map<string, NetworkProjectileState>;
}
