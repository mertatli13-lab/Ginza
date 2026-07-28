import { GinzaModel } from './GinzaModel'
import { StrawberryModel } from './StrawberryModel'
import type { PlayerTelemetry } from '../telemetry'

export type CharacterId = 'ginza' | 'strawberry'

interface CharacterProps {
  characterId: CharacterId
  racerId: string
  telemetry: PlayerTelemetry
  accentColor: string
}

/** Picks the styled model for this racer's character. Both models take the
 * same props and drive their own procedural idle/run/jump/checkpoint-hop
 * animation from the shared `telemetry` object and the race store — Racer
 * itself doesn't need to know which character it's moving. */
export function Character({ characterId, racerId, telemetry, accentColor }: CharacterProps) {
  return characterId === 'ginza' ? (
    <GinzaModel racerId={racerId} telemetry={telemetry} accentColor={accentColor} />
  ) : (
    <StrawberryModel racerId={racerId} telemetry={telemetry} accentColor={accentColor} />
  )
}
