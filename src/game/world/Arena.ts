import type { Scene } from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig';
import { ARENA_ONE } from '../data/maps/mapDefinition';

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

        for (const definition of ARENA_ONE.walls) {
            const wall = walls.create(
                definition.x,
                definition.y,
                'wall'
            ) as Phaser.Physics.Arcade.Image;
            wall.setDisplaySize(definition.width, definition.height)
                .setTint(0x334155)
                .refreshBody();
        }

        return walls;
    }
}
