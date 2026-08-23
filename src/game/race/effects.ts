// Per-racer power-up state. Plain mutable object (like telemetry), not React
// state — Racer reads it every physics frame, pickups write to it on
// contact, so it must never trigger a render.
export interface RacerEffects {
  speedBoostUntil: number // active while clock.elapsedTime < this (Yarn Ball / Carrot Dash)
  shieldUntil: number // active while clock.elapsedTime < this (Confetti Pop / Firefly Lantern)
  magnetUntil: number // active while clock.elapsedTime < this (Bell Chime / Clover Charm)
  floatUntil: number // active while clock.elapsedTime < this (Dandelion Wish — floaty glide-jump)
  slowUntil: number // active while clock.elapsedTime < this (touched a drifting dandelion puff)
}

export function createRacerEffects(): RacerEffects {
  return { speedBoostUntil: 0, shieldUntil: 0, magnetUntil: 0, floatUntil: 0, slowUntil: 0 }
}
