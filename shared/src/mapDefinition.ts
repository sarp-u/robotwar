export interface SpawnPoint {
    readonly x: number;
    readonly y: number;
}

export interface WallDefinition {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface MapDefinition {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    readonly spawnPoints: {
        readonly player: SpawnPoint;
        readonly players: readonly SpawnPoint[];
        readonly enemies: readonly SpawnPoint[];
    };
    readonly walls: readonly WallDefinition[];
}

export const ARENA_ONE: MapDefinition = {
    id: 'arena-one',
    width: 1600,
    height: 1200,
    spawnPoints: {
        player: { x: 260, y: 260 },
        players: [
            { x: 260, y: 260 },
            { x: 1340, y: 940 },
            { x: 260, y: 940 },
            { x: 1340, y: 260 },
            { x: 800, y: 180 },
            { x: 800, y: 1020 },
            { x: 180, y: 600 },
            { x: 1420, y: 600 }
        ],
        enemies: [
            { x: 800, y: 250 },
            { x: 800, y: 950 },
            { x: 430, y: 600 },
            { x: 1170, y: 600 }
        ]
    },
    walls: [
        { x: 800, y: 24, width: 1600, height: 48 },
        { x: 800, y: 1176, width: 1600, height: 48 },
        { x: 24, y: 600, width: 48, height: 1200 },
        { x: 1576, y: 600, width: 48, height: 1200 },
        { x: 800, y: 600, width: 220, height: 220 },
        { x: 470, y: 360, width: 300, height: 52 },
        { x: 1130, y: 360, width: 300, height: 52 },
        { x: 470, y: 840, width: 300, height: 52 },
        { x: 1130, y: 840, width: 300, height: 52 },
        { x: 330, y: 600, width: 52, height: 240 },
        { x: 1270, y: 600, width: 52, height: 240 }
    ]
};
