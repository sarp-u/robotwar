import { schema, t, type SchemaType } from '@colyseus/schema';

export const BattleInput = schema({
    moveX: t.float32().default(0),
    moveY: t.float32().default(0),
    aimAngle: t.float32().default(0),
    firing: t.boolean().default(false)
}, 'BattleInput');
export type BattleInput = SchemaType<typeof BattleInput>;
