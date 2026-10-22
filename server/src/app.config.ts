import { defineRoom, defineServer } from 'colyseus';
import { BattleRoom } from './rooms/BattleRoom.js';

export const server = defineServer({
    rooms: {
        battle: defineRoom(BattleRoom)
    }
});

export default server;
