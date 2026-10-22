import { Client } from '@colyseus/sdk';

const wait = (durationMs) => new Promise((resolve) => setTimeout(resolve, durationMs));
const client = new Client(process.env.COLYSEUS_URL ?? 'http://localhost:2567');
const room = await client.joinOrCreate('battle');
if (!room.state.players) {
    await new Promise((resolve) => room.onStateChange.once(resolve));
}
const input = room.input({ mode: 'reliable' });
const player = room.state.players.get(room.sessionId);

if (!player) throw new Error('Sunucu, katılan oyuncuyu BattleState içine eklemedi.');

const initialX = player.x;
const initialEnergy = player.energy;

for (let tick = 0; tick < 12; tick += 1) {
    input.data.moveX = 1;
    input.data.moveY = 0;
    input.data.aimAngle = 0;
    input.data.firing = true;
    input.send();
    await wait(input.stepMs ?? 34);
}

await wait(150);

const result = {
    sessionId: room.sessionId,
    initialX,
    finalX: player.x,
    initialEnergy,
    finalEnergy: player.energy,
    projectileCount: room.state.projectiles.size
};

await room.leave();

if (result.finalX <= result.initialX) {
    throw new Error(`Sunucu hareket input'unu uygulamadı: ${JSON.stringify(result)}`);
}

if (result.finalEnergy >= result.initialEnergy) {
    throw new Error(`Sunucu ateş enerjisini tüketmedi: ${JSON.stringify(result)}`);
}

if (result.projectileCount === 0) {
    throw new Error(`Sunucu mermi oluşturmadı: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify(result, null, 2));
