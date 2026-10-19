import { Math as PhaserMath, type Scene } from 'phaser';
import type { RobotStats } from '../data/robotParts';
import { RobotEntity } from './RobotEntity';

export class PlayerRobot extends RobotEntity {
    constructor(scene: Scene, x: number, y: number, stats: RobotStats) {
        super(scene, x, y, {
            texture: 'robot-body',
            turretColor: 0x9be7ff,
            turretOffsets: stats.weaponBarrelOffsets,
            bodyRadius: 22,
            depth: 10,
            stats
        });
    }

    setMovement(x: number, y: number): void {
        const direction = new PhaserMath.Vector2(x, y);
        if (direction.lengthSq() > 0) direction.normalize().scale(this.stats.moveSpeed);

        const physicsBody = this.sprite.body as Phaser.Physics.Arcade.Body;
        physicsBody.setVelocity(direction.x, direction.y);
    }
}
