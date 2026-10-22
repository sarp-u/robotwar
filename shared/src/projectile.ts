export interface Vector2 {
    readonly x: number;
    readonly y: number;
}

export interface WorldBounds {
    readonly width: number;
    readonly height: number;
}

export interface RectangleBounds {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
}

export interface ProjectileState {
    readonly position: Vector2;
    readonly velocity: Vector2;
    readonly damage: number;
}

export interface CreateProjectileOptions {
    readonly origin: Vector2;
    readonly angle: number;
    readonly speed: number;
    readonly spawnOffset: number;
    readonly damage: number;
}

export function createProjectileState(options: CreateProjectileOptions): ProjectileState {
    const directionX = Math.cos(options.angle);
    const directionY = Math.sin(options.angle);

    return {
        position: {
            x: options.origin.x + directionX * options.spawnOffset,
            y: options.origin.y + directionY * options.spawnOffset
        },
        velocity: {
            x: directionX * options.speed,
            y: directionY * options.speed
        },
        damage: options.damage
    };
}

export function moveProjectile(state: ProjectileState, deltaMs: number): ProjectileState {
    const deltaSeconds = deltaMs / 1000;

    return {
        ...state,
        position: {
            x: state.position.x + state.velocity.x * deltaSeconds,
            y: state.position.y + state.velocity.y * deltaSeconds
        }
    };
}

export function isProjectileOutsideBounds(
    state: ProjectileState,
    bounds: WorldBounds
): boolean {
    return state.position.x < 0 ||
        state.position.x > bounds.width ||
        state.position.y < 0 ||
        state.position.y > bounds.height;
}

export function isPointInsideRectangle(point: Vector2, rectangle: RectangleBounds): boolean {
    const halfWidth = rectangle.width / 2;
    const halfHeight = rectangle.height / 2;

    return point.x >= rectangle.x - halfWidth &&
        point.x <= rectangle.x + halfWidth &&
        point.y >= rectangle.y - halfHeight &&
        point.y <= rectangle.y + halfHeight;
}
