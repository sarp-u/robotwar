import { Scene, GameObjects } from 'phaser';
import { i18n } from '../i18n/I18n';
import type { SupportedLanguage } from '../i18n/types';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    logo: GameObjects.Image;
    title: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x07111f);
        this.background = this.add.image(512, 384, 'background').setAlpha(0.12);

        this.logo = this.add.image(512, 255, 'logo').setScale(0.55).setAlpha(0.75);

        this.title = this.add.text(512, 410, i18n.t('menuTitle'), {
            fontFamily: 'Arial Black', fontSize: 52, color: '#67e8f9',
            stroke: '#07111f', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(512, 490, i18n.t('menuSubtitle'), {
            fontFamily: 'Arial', fontSize: 20, color: '#94a3b8',
            letterSpacing: 5
        }).setOrigin(0.5);

        const startText = this.add.text(512, 570, i18n.t('menuStart'), {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            backgroundColor: '#0e7490', padding: { x: 28, y: 14 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        this.tweens.add({ targets: startText, alpha: 0.55, duration: 900, yoyo: true, repeat: -1 });

        startText.once('pointerdown', () => {
            this.scene.start('Game');
        });

        this.createLanguageSelector();
    }

    private createLanguageSelector(): void
    {
        this.add.text(512, 650, i18n.t('menuLanguage'), {
            fontFamily: 'Arial', fontSize: 15, color: '#94a3b8', letterSpacing: 3
        }).setOrigin(0.5);

        const languages: Array<{ code: SupportedLanguage; label: string }> = [
            { code: 'tr', label: 'TR' },
            { code: 'en', label: 'EN' },
            { code: 'de', label: 'DE' }
        ];

        languages.forEach(({ code, label }, index) => {
            const active = i18n.getLanguage() === code;
            const button = this.add.text(446 + index * 66, 700, label, {
                fontFamily: 'Arial Black', fontSize: 17,
                color: active ? '#07111f' : '#cbd5e1',
                backgroundColor: active ? '#67e8f9' : '#1e293b',
                padding: { x: 12, y: 8 }
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            button.on('pointerdown', () => {
                i18n.setLanguage(code);
                this.scene.restart();
            });
        });
    }
}
