import type { RacerEffects } from './effects'

// Mirrors racerRegistry.ts — plain module-level map, not React state, so
// pickups can do a proximity check (magnet range) against every racer's
// current power-up state once per frame without subscribing to anything.
const registry = new Map<string, RacerEffects>()

export function registerRacerEffects(id: string, effects: RacerEffects) {
  registry.set(id, effects)
}

export function unregisterRacerEffects(id: string) {
  registry.delete(id)
}

export function getRegisteredEffects(): ReadonlyMap<string, RacerEffects> {
  return registry
}
