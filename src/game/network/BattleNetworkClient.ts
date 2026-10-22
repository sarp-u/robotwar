import { Client, type InputHandle, type Room } from '@colyseus/sdk';
import type { BattleInputData, BattleNetworkState } from '@robotwar/shared/network';
import { SIMULATION_CONFIG } from '@robotwar/shared/simulationConfig';

const DEFAULT_SERVER_URL = 'http://localhost:2567';

export class BattleNetworkClient {
    private readonly client = new Client(
        import.meta.env.VITE_COLYSEUS_URL ?? DEFAULT_SERVER_URL
    );
    private room?: Room<BattleNetworkState>;
    private input?: InputHandle<BattleInputData>;
    private inputAccumulatorMs = 0;
    private disposed = false;

    get connected(): boolean {
        return this.room !== undefined;
    }

    get sessionId(): string | undefined {
        return this.room?.sessionId;
    }

    get state(): BattleNetworkState | undefined {
        return this.room?.state;
    }

    async connect(): Promise<void> {
        const room = await this.client.joinOrCreate<BattleNetworkState>('battle');

        if (this.disposed) {
            await room.leave();
            return;
        }

        this.room = room;
        this.input = room.input<BattleInputData>({ mode: 'reliable' });
    }

    update(deltaMs: number, inputData: BattleInputData): void {
        if (!this.input) return;

        const stepMs = this.input.stepMs ?? (1000 / SIMULATION_CONFIG.tickRate);
        this.inputAccumulatorMs = Math.min(this.inputAccumulatorMs + deltaMs, stepMs * 3);

        while (this.inputAccumulatorMs >= stepMs) {
            this.input.data.moveX = inputData.moveX;
            this.input.data.moveY = inputData.moveY;
            this.input.data.aimAngle = inputData.aimAngle;
            this.input.data.firing = inputData.firing;
            this.input.send();
            this.inputAccumulatorMs -= stepMs;
        }
    }

    async disconnect(): Promise<void> {
        this.disposed = true;
        const room = this.room;
        this.room = undefined;
        this.input = undefined;
        if (room) await room.leave();
    }
}
