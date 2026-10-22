import type { RectangleBounds, Vector2, WorldBounds } from './projectile.js';

export function moveEntity(
    position: Vector2,
    movement: Vector2,
    speed: number,
    deltaSeconds: number,
    bounds: WorldBounds,
    radius: number
): Vector2 {
    const length = Math.hypot(movement.x, movement.y);
    const normalizedX = length > 0 ? movement.x / length : 0;
    const normalizedY = length > 0 ? movement.y / length : 0;

    return {
        x: Math.min(
            bounds.width - radius,
            Math.max(radius, position.x + normalizedX * speed * deltaSeconds)
        ),
        y: Math.min(
            bounds.height - radius,
            Math.max(radius, position.y + normalizedY * speed * deltaSeconds)
        )
    };
}

export function circleOverlapsRectangle(
    center: Vector2,
    radius: number,
    rectangle: RectangleBounds
): boolean {
    const halfWidth = rectangle.width / 2;
    const halfHeight = rectangle.height / 2;
    const closestX = Math.max(
        rectangle.x - halfWidth,
        Math.min(center.x, rectangle.x + halfWidth)
    );
    const closestY = Math.max(
        rectangle.y - halfHeight,
        Math.min(center.y, rectangle.y + halfHeight)
    );

    return Math.hypot(center.x - closestX, center.y - closestY) < radius;
}

export function moveEntityWithObstacles(
    position: Vector2,
    movement: Vector2,
    speed: number,
    deltaSeconds: number,
    bounds: WorldBounds,
    radius: number,
    obstacles: readonly RectangleBounds[]
): Vector2 {
    const desired = moveEntity(position, movement, speed, deltaSeconds, bounds, radius);
    let result = position;

    const horizontal = { x: desired.x, y: result.y };
    if (!obstacles.some((wall) => circleOverlapsRectangle(horizontal, radius, wall))) {
        result = horizontal;
    }

    const vertical = { x: result.x, y: desired.y };
    if (!obstacles.some((wall) => circleOverlapsRectangle(vertical, radius, wall))) {
        result = vertical;
    }

    return result;
}
