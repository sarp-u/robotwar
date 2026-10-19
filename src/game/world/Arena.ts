import type { Scene } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';

const WALLS: ReadonlyArray<readonly [number, number, number, number]> = [
    [800, 24, 1600, 48],
    [800, 1176, 1600, 48],
    [24, 600, 48, 1200],
    [1576, 600, 48, 1200],
    [800, 600, 220, 220],
    [470, 360, 300, 52],
    [1130, 360, 300, 52],
    [470, 840, 300, 52],
    [1130, 840, 300, 52],
    [330, 600, 52, 240],
    [1270, 600, 52, 240]
];

export class Arena {
    readonly walls: Phaser.Physics.Arcade.StaticGroup;

    constructor(private readonly scene: Scene) {
        this.createFloor();
        this.walls = this.createWalls();
        this.scene.physics.world.setBounds(0, 0, GAME_CONFIG.worldWidth, GAME_CONFIG.worldHeight);
    }

    private createFloor(): void {
        this.scene.add.rectangle(
            GAME_CONFIG.worldWidth / 2,
            GAME_CONFIG.worldHeight / 2,
            GAME_CONFIG.worldWidth,
            GAME_CONFIG.worldHeight,
            0x0b172a
        );

        this.scene.add.grid(
            GAME_CONFIG.worldWidth / 2,
            GAME_CONFIG.worldHeight / 2,
            GAME_CONFIG.worldWidth,
            GAME_CONFIG.worldHeight,
            64,
            64,
            0x0b172a,
            1,
            0x17304d,
            0.35
        );
    }

    private createWalls(): Phaser.Physics.Arcade.StaticGroup {
        const walls = this.scene.physics.add.staticGroup();

        for (const [x, y, width, height] of WALLS) {
            const wall = walls.create(x, y, 'wall') as Phaser.Physics.Arcade.Image;
            wall.setDisplaySize(width, height).setTint(0x334155).refreshBody();
        }

        return walls;
    }
}
