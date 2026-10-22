import { Client, Predict, type InputHandle, type Reconciler, type Room } from '@colyseus/sdk';
import { ARENA_ONE } from '@robotwar/shared/mapDefinition';
import { moveEntityWithObstacles } from '@robotwar/shared/movement';
import type {
    BattleInputData,
    BattleNetworkState,
    NetworkPlayerState,
    NetworkProjectileState
} from '@robotwar/shared/network';
import { calculateRobotStats, DEFAULT_BUILD } from '@robotwar/shared/robotParts';
import { SIMULATION_CONFIG } from '@robotwar/shared/simulationConfig';

const DEFAULT_SERVER_URL = 'http://localhost:2567';

export class BattleNetworkClient {
    private readonly client = new Client(
        import.meta.env.VITE_COLYSEUS_URL ?? DEFAULT_SERVER_URL
    );
    private room?: Room<any, BattleNetworkState>;
    private input?: InputHandle<BattleInputData>;
    private predictor?: Predict;
    private localPrediction?: Reconciler<NetworkPlayerState, BattleInputData>;
    private disposed = false;

    get connected(): boolean {
        return this.room !== undefined;
    }

    get sessionId(): string | undefined {
        return this.room?.sessionId;
    }

    get roomId(): string | undefined {
        return this.room?.roomId;
    }

    get state(): BattleNetworkState | undefined {
        return this.room?.state;
    }

    async connect(roomId?: string): Promise<void> {
        const room = roomId
            ? await this.client.joinById<BattleNetworkState>(roomId)
            : await this.client.create<BattleNetworkState>('battle');

        if (this.disposed) {
            await room.leave();
            return;
        }

        this.room = room;
        this.input = room.input<BattleInputData>({ mode: 'reliable' });
        // The runtime schema is supplied by Colyseus reflection; the shared DTO intentionally has no schema internals.
        this.predictor = Predict.get(room as Room, { mode: 'extrapolate', maxExtrapolate: 75 });
        this.predictor.attachAll('players', {
            x: { mode: 'extrapolate', maxExtrapolate: 75, smoothMs: 0, snap: 300 },
            y: { mode: 'extrapolate', maxExtrapolate: 75, smoothMs: 0, snap: 300 },
            aimAngle: { mode: 'extrapolate', maxExtrapolate: 50, smoothMs: 0, angle: true }
        });
        this.predictor.attachAll('projectiles', {
            x: { mode: 'extrapolate', maxExtrapolate: 75, smoothMs: 0, snap: 200 },
            y: { mode: 'extrapolate', maxExtrapolate: 75, smoothMs: 0, snap: 200 }
        });
    }

    update(nowMs: number, inputData: BattleInputData): void {
        if (!this.input || !this.predictor) return;

        this.ensureLocalPrediction();
        const steps = this.predictor.tick(nowMs);

        for (let step = 0; step < steps; step += 1) {
            this.input.data.moveX = inputData.moveX;
            this.input.data.moveY = inputData.moveY;
            this.input.data.aimAngle = inputData.aimAngle;
            this.input.data.firing = inputData.firing;
            this.input.send();
        }
    }

    getPlayerRenderPosition(player: NetworkPlayerState): { x: number; y: number } {
        return {
            x: this.predictor?.value(player, 'x') ?? player.x,
            y: this.predictor?.value(player, 'y') ?? player.y
        };
    }

    getPlayerRenderAim(player: NetworkPlayerState): number {
        return this.predictor?.value(player, 'aimAngle') ?? player.aimAngle;
    }

    getProjectileRenderPosition(projectile: NetworkProjectileState): { x: number; y: number } {
        return {
            x: this.predictor?.value(projectile, 'x') ?? projectile.x,
            y: this.predictor?.value(projectile, 'y') ?? projectile.y
        };
    }

    async disconnect(): Promise<void> {
        this.disposed = true;
        const room = this.room;
        this.predictor?.dispose();
        this.room = undefined;
        this.input = undefined;
        this.predictor = undefined;
        this.localPrediction = undefined;
        if (room) await room.leave();
    }

    private ensureLocalPrediction(): void {
        if (this.localPrediction || !this.predictor || !this.input || !this.room) return;

        const player = this.room.state.players?.get(this.room.sessionId);
        if (!player) return;

        const stats = calculateRobotStats(DEFAULT_BUILD);
        this.localPrediction = this.predictor.reconciler(player, {
            input: this.input,
            fields: ['x', 'y', 'active'],
            smoothMs: 45,
            step: (context, state, command) => {
                if (!state.active) return;

                const position = moveEntityWithObstacles(
                    state,
                    { x: command.moveX, y: command.moveY },
                    stats.moveSpeed,
                    context.dt,
                    { width: ARENA_ONE.width, height: ARENA_ONE.height },
                    SIMULATION_CONFIG.playerRadius,
                    ARENA_ONE.walls
                );
                state.x = position.x;
                state.y = position.y;
            }
        });
    }
}
