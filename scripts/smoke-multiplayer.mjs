import { Client, Predict } from '@colyseus/sdk';

const wait = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));
const client = new Client(process.env.COLYSEUS_URL ?? 'http://localhost:2567');
const guestClient = new Client(process.env.COLYSEUS_URL ?? 'http://localhost:2567');
const room = await client.create('battle');
if (!room.state.players) {
    await new Promise((resolve) => room.onStateChange.once(resolve));
}

const input = room.input({ mode: 'reliable' });
const player = room.state.players.get(room.sessionId);

if (!player) throw new Error('Sunucu, katılan oyuncuyu BattleState içine eklemedi.');

const predictor = Predict.get(room, { mode: 'extrapolate', maxExtrapolate: 75 });
predictor.attachAll('players', { x: 'extrapolate', y: 'extrapolate' });
const localPrediction = predictor.reconciler(player, {
    input,
    fields: ['x', 'y'],
    smoothMs: 0,
    step: (context, state, command) => {
        const length = Math.hypot(command.moveX, command.moveY);
        state.x += (length > 0 ? command.moveX / length : 0) * 280 * context.dt;
        state.y += (length > 0 ? command.moveY / length : 0) * 280 * context.dt;
    }
});

// The host predictor is already active when the invited player joins.
const guestRoom = await guestClient.joinById(room.roomId);
if (!guestRoom.state.players) {
    await new Promise((resolve) => guestRoom.onStateChange.once(resolve));
}

const playersDeadline = Date.now() + 2000;
while (room.state.players.size !== 2 && Date.now() < playersDeadline) await wait(20);
if (room.state.players.size !== 2 || guestRoom.roomId !== room.roomId) {
    throw new Error('Davet edilen oyuncu aynı odaya katılmadı.');
}

const guestInput = guestRoom.input({ mode: 'reliable' });
const guestPlayer = guestRoom.state.players.get(guestRoom.sessionId);
const guestOnHost = room.state.players.get(guestRoom.sessionId);
if (!guestPlayer || !guestOnHost) throw new Error('Davet edilen oyuncu state içinde bulunamadı.');
const guestPredictor = Predict.get(guestRoom, { mode: 'extrapolate', maxExtrapolate: 75 });
guestPredictor.attachAll('players', { x: 'extrapolate', y: 'extrapolate' });
guestPredictor.reconciler(guestPlayer, {
    input: guestInput,
    fields: ['x', 'y'],
    smoothMs: 45,
    step: (context, state, command) => {
        const length = Math.hypot(command.moveX, command.moveY);
        state.x += (length > 0 ? command.moveX / length : 0) * 280 * context.dt;
        state.y += (length > 0 ? command.moveY / length : 0) * 280 * context.dt;
    }
});

const initialX = player.x;
const initialEnergy = player.energy;
let predictedImmediately = initialX;

for (let tick = 0; tick < 12; tick += 1) {
    input.data.moveX = 1;
    input.data.moveY = 0;
    input.data.aimAngle = 0;
    input.data.firing = true;
    input.send();
    if (tick === 0) predictedImmediately = localPrediction.state.x;
    await wait(input.stepMs ?? 34);
}

const guestInitialX = guestPlayer.x;
for (let tick = 0; tick < 8; tick += 1) {
    guestInput.data.moveX = -1;
    guestInput.data.moveY = 0;
    guestInput.data.aimAngle = Math.PI;
    guestInput.data.firing = true;
    guestInput.send();
    await wait(guestInput.stepMs ?? 34);
    const now = performance.now();
    predictor.tick(now);
    guestPredictor.tick(now);
}

await wait(150);
const finalTick = performance.now();
predictor.tick(finalTick);
guestPredictor.tick(finalTick);
const guestRenderedOnHost = predictor.value(guestOnHost, 'x');
const guestRenderedLocally = guestPredictor.value(guestPlayer, 'x');

const result = {
    sessionId: room.sessionId,
    initialX,
    predictedImmediately,
    finalX: player.x,
    initialEnergy,
    finalEnergy: player.energy,
    guestInitialX,
    guestFinalX: guestOnHost.x,
    guestRenderedOnHost,
    guestRenderedLocally,
    projectileCount: room.state.projectiles.size
};

await guestRoom.leave();
guestPredictor.dispose();
predictor.dispose();
await room.leave();

if (result.predictedImmediately <= result.initialX) {
    throw new Error(`Client prediction input'u anında uygulamadı: ${JSON.stringify(result)}`);
}

if (result.finalX <= result.initialX) {
    throw new Error(`Sunucu hareket input'unu uygulamadı: ${JSON.stringify(result)}`);
}

if (result.finalEnergy >= result.initialEnergy) {
    throw new Error(`Sunucu ateş enerjisini tüketmedi: ${JSON.stringify(result)}`);
}

if (result.guestFinalX >= result.guestInitialX) {
    throw new Error(`Geç katılan oyuncunun input'u uygulanmadı: ${JSON.stringify(result)}`);
}

if (Math.abs(result.guestRenderedOnHost - result.guestFinalX) > 30) {
    throw new Error(`Host, geç katılan oyuncuyu fazla geriden çiziyor: ${JSON.stringify(result)}`);
}

if (Math.abs(result.guestRenderedOnHost - result.guestRenderedLocally) > 30) {
    throw new Error(`İki istemcinin çizdiği konum fazla ayrıştı: ${JSON.stringify(result)}`);
}

if (result.projectileCount === 0) {
    throw new Error(`Sunucu mermi oluşturmadı: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify(result, null, 2));
