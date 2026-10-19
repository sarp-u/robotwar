import type { Scene } from 'phaser';
import { Math as PhaserMath } from 'phaser';
import type { RobotStats } from '../data/robotParts';

export interface RobotEntityOptions {
    texture: string;
    turretColor: number;
    turretOffsets?: readonly number[];
    bodyRadius: number;
    depth: number;
    stats: RobotStats;
}

export class RobotEntity {
    readonly sprite: Phaser.Physics.Arcade.Image;
    readonly stats: RobotStats;
    protected readonly turrets: Phaser.GameObjects.Rectangle[];
    private readonly turretOffsets: readonly number[];
    private aimAngle = 0;

    constructor(
        protected readonly scene: Scene,
        x: number,
        y: number,
        options: RobotEntityOptions
    ) {
        this.stats = options.stats;
        this.sprite = scene.physics.add.image(x, y, options.texture);
        this.sprite.setCircle(options.bodyRadius).setCollideWorldBounds(true).setDepth(options.depth);
        this.turretOffsets = options.turretOffsets ?? [0];
        this.turrets = this.turretOffsets.map(() => (
            scene.add.rectangle(x, y, 36, 7, options.turretColor)
                .setOrigin(0.18, 0.5)
                .setDepth(options.depth + 1)
        ));
    }

    aimAt(x: number, y: number): number {
        const angle = PhaserMath.Angle.Between(this.sprite.x, this.sprite.y, x, y);
        this.aimAngle = angle;
        this.sprite.setRotation(angle + Math.PI / 2);
        for (const turret of this.turrets) turret.setRotation(angle);
        this.syncVisuals();
        return angle;
    }

    syncVisuals(): void {
        const perpendicularAngle = this.aimAngle + Math.PI / 2;

        this.turrets.forEach((turret, index) => {
            const offset = this.turretOffsets[index];
            turret.setPosition(
                this.sprite.x + Math.cos(perpendicularAngle) * offset,
                this.sprite.y + Math.sin(perpendicularAngle) * offset
            );
        });
    }

    getWeaponOrigins(): Phaser.Math.Vector2[] {
        return this.turrets.map((turret) => new PhaserMath.Vector2(turret.x, turret.y));
    }

    setPosition(x: number, y: number): void {
        this.sprite.setPosition(x, y);
        this.syncVisuals();
    }

    setVisible(visible: boolean): void {
        this.sprite.setVisible(visible);
        for (const turret of this.turrets) turret.setVisible(visible);
    }

    setAlpha(alpha: number): void {
        this.sprite.setAlpha(alpha);
        for (const turret of this.turrets) turret.setAlpha(alpha);
    }

    blink(durationMs: number): void {
        this.stopVisualTweens();
        this.setAlpha(0.45);

        const pulseDuration = durationMs / 16;
        this.scene.tweens.addCounter({
            from: 0.45,
            to: 0.85,
            duration: pulseDuration,
            yoyo: true,
            repeat: 7,
            onUpdate: (tween) => this.setAlpha(tween.getValue() ?? 1),
            onComplete: () => this.setAlpha(1)
        });
    }

    flashDamage(): void {
        this.scene.tweens.add({
            targets: [this.sprite, ...this.turrets],
            alpha: 0.35,
            duration: 60,
            yoyo: true
        });
    }

    protected stopVisualTweens(): void {
        this.scene.tweens.killTweensOf(this.sprite);
        for (const turret of this.turrets) this.scene.tweens.killTweensOf(turret);
    }
}
