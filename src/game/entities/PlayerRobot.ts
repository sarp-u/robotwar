import { Math as PhaserMath, type Scene } from 'phaser';
import type { RobotStats } from '../data/robotParts';
import { consumeEnergy, regenerateEnergy } from '../logic/energy';
import { RobotEntity } from './RobotEntity';

export class PlayerRobot extends RobotEntity {
    private currentEnergy: number;
    private readonly energyBarBackground: Phaser.GameObjects.Rectangle;
    private readonly energyBarFill: Phaser.GameObjects.Rectangle;

    constructor(scene: Scene, x: number, y: number, stats: RobotStats) {
        super(scene, x, y, {
            texture: 'robot-body',
            turretColor: 0x9be7ff,
            turretOffsets: stats.weaponBarrelOffsets,
            bodyRadius: 22,
            depth: 10,
            stats
        });

        this.currentEnergy = stats.energyCapacity;
        this.energyBarBackground = scene.add.rectangle(x, y + 32, 44, 7, 0x0f172a, 0.9)
            .setStrokeStyle(1, 0xcbd5e1, 0.55)
            .setDepth(12);
        this.energyBarFill = scene.add.rectangle(x - 20, y + 32, 40, 4, 0x22d3ee)
            .setOrigin(0, 0.5)
            .setDepth(13);
        this.updateEnergyBar();
    }

    setMovement(x: number, y: number): void {
        const direction = new PhaserMath.Vector2(x, y);
        if (direction.lengthSq() > 0) direction.normalize().scale(this.stats.moveSpeed);

        const physicsBody = this.sprite.body as Phaser.Physics.Arcade.Body;
        physicsBody.setVelocity(direction.x, direction.y);
    }

    regenerateEnergy(deltaMs: number): void {
        if (this.currentEnergy >= this.stats.energyCapacity) return;

        this.currentEnergy = regenerateEnergy(
            this.currentEnergy,
            this.stats.energyCapacity,
            this.stats.energyRegen,
            deltaMs
        );
        this.updateEnergyBar();
    }

    tryConsumeEnergy(amount: number): boolean {
        const result = consumeEnergy(this.currentEnergy, amount);
        if (!result.consumed) return false;

        this.currentEnergy = result.remainingEnergy;
        this.updateEnergyBar();
        return true;
    }

    restoreEnergy(): void {
        this.currentEnergy = this.stats.energyCapacity;
        this.updateEnergyBar();
    }

    setEnergy(energy: number): void {
        this.currentEnergy = Math.max(0, Math.min(energy, this.stats.energyCapacity));
        this.updateEnergyBar();
    }

    override syncVisuals(): void {
        super.syncVisuals();
        this.energyBarBackground.setPosition(this.sprite.x, this.sprite.y + 32);
        this.energyBarFill.setPosition(this.sprite.x - 20, this.sprite.y + 32);
    }

    override setVisible(visible: boolean): void {
        super.setVisible(visible);
        this.energyBarBackground.setVisible(visible);
        this.energyBarFill.setVisible(visible);
    }

    override setAlpha(alpha: number): void {
        super.setAlpha(alpha);
        this.energyBarBackground.setAlpha(alpha);
        this.energyBarFill.setAlpha(alpha);
    }

    override destroy(): void {
        super.destroy();
        this.energyBarBackground.destroy();
        this.energyBarFill.destroy();
    }

    private updateEnergyBar(): void {
        const ratio = this.stats.energyCapacity > 0
            ? this.currentEnergy / this.stats.energyCapacity
            : 0;

        this.energyBarFill.setScale(ratio, 1);
        this.energyBarFill.setFillStyle(
            ratio > 0.5 ? 0x22d3ee : ratio > 0.25 ? 0xfacc15 : 0xfb7185
        );
    }
}
