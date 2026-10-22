import { schema, t, type SchemaType } from '@colyseus/schema';

export const BattlePlayer = schema({
    x: t.float32().default(0),
    y: t.float32().default(0),
    aimAngle: t.float32().default(0),
    health: t.float32().default(0),
    maxHealth: t.float32().default(0),
    armor: t.float32().default(0),
    energy: t.float32().default(0),
    maxEnergy: t.float32().default(0),
    active: t.boolean().default(true),
    score: t.uint16().default(0)
}, 'BattlePlayer');
export type BattlePlayer = SchemaType<typeof BattlePlayer>;

export const BattleProjectile = schema({
    ownerId: t.string(),
    x: t.float32().default(0),
    y: t.float32().default(0),
    damage: t.float32().default(0)
}, 'BattleProjectile');
export type BattleProjectile = SchemaType<typeof BattleProjectile>;

export const BattleState = schema({
    players: t.map(BattlePlayer),
    projectiles: t.map(BattleProjectile)
}, 'BattleState');
export type BattleState = SchemaType<typeof BattleState>;
