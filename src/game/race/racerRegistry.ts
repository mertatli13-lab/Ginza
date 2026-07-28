import type { PlayerTelemetry } from '../telemetry'

// Plain module-level registry, not React state — RaceManager polls this
// once per frame inside useFrame, so registering/unregistering here must
// never trigger a render.
const registry = new Map<string, PlayerTelemetry>()

export function registerRacerTelemetry(id: string, telemetry: PlayerTelemetry) {
  registry.set(id, telemetry)
}

export function unregisterRacerTelemetry(id: string) {
  registry.delete(id)
}

export function getRegisteredRacers(): ReadonlyMap<string, PlayerTelemetry> {
  return registry
}
