import { Input, type Scene } from 'phaser';

export interface InputSnapshot {
    movementX: number;
    movementY: number;
    aimX: number;
    aimY: number;
    firing: boolean;
}

export class PlayerInput {
    private readonly keys: Record<'up' | 'down' | 'left' | 'right', Input.Keyboard.Key>;

    constructor(private readonly scene: Scene) {
        const keyboard = scene.input.keyboard;
        if (!keyboard) throw new Error('Keyboard input is not available.');

        this.keys = {
            up: keyboard.addKey(Input.Keyboard.KeyCodes.W),
            down: keyboard.addKey(Input.Keyboard.KeyCodes.S),
            left: keyboard.addKey(Input.Keyboard.KeyCodes.A),
            right: keyboard.addKey(Input.Keyboard.KeyCodes.D)
        };
    }

    read(): InputSnapshot {
        const pointer = this.scene.input.activePointer;
        return {
            movementX: Number(this.keys.right.isDown) - Number(this.keys.left.isDown),
            movementY: Number(this.keys.down.isDown) - Number(this.keys.up.isDown),
            aimX: pointer.worldX,
            aimY: pointer.worldY,
            firing: pointer.isDown
        };
    }
}
