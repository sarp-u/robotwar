import type { Scene } from 'phaser';
import type { RobotStats } from '../data/robotParts';
import { i18n } from '../i18n/I18n';

export class Hud {
    private readonly healthText: Phaser.GameObjects.Text;
    private readonly scoreText: Phaser.GameObjects.Text;
    private readonly statusText: Phaser.GameObjects.Text;

    constructor(scene: Scene, stats: RobotStats) {
        const style: Phaser.Types.GameObjects.Text.TextStyle = { fontFamily: 'Arial, sans-serif', fontSize: '20px', color: '#e2e8f0', stroke: '#07111f', strokeThickness: 5 };
        this.healthText = scene.add.text(24, 20, '', style).setScrollFactor(0).setDepth(100);
        this.scoreText = scene.add.text(24, 50, '', style).setScrollFactor(0).setDepth(100);
        this.statusText = scene.add.text(512, 24, '', { ...style, fontSize: '17px', align: 'center' }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(100);
        this.showRobotStatus(stats);
    }

    update(health: number, maxHealth: number, score: number): void {
        this.healthText.setText(i18n.t('hudHealth', { current: Math.max(0, Math.ceil(health)), max: maxHealth }));
        this.scoreText.setText(i18n.t('hudScore', { score }));
    }

    showMessage(message: string): void { this.statusText.setText(message); }

    showRobotStatus(stats: RobotStats): void {
        this.statusText.setText(i18n.t('hudRobotStatus', { speed: stats.moveSpeed, armor: stats.armor }));
    }
}
