// Per-racer power-up state. Plain mutable object (like telemetry), not React
// state — Racer reads it every physics frame, pickups write to it on
// contact, so it must never trigger a render.
export interface RacerEffects {
  speedBoostUntil: number // active while clock.elapsedTime < this (Yarn Ball)
  shieldUntil: number // active while clock.elapsedTime < this (Confetti Pop)
  magnetUntil: number // active while clock.elapsedTime < this (Bell Chime)
}

export function createRacerEffects(): RacerEffects {
  return { speedBoostUntil: 0, shieldUntil: 0, magnetUntil: 0 }
}
