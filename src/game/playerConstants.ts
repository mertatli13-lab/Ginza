// Capsule collider dimensions, shared between Player (which owns the physics
// body) and course data (which needs to know how high above a platform's
// surface the capsule should rest when teleported to a checkpoint).
export const RADIUS = 0.5
export const HALF_HEIGHT = 0.45
export const REST_Y = HALF_HEIGHT + RADIUS
