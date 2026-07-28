import { GinzaModel } from './GinzaModel'
import { StrawberryModel } from './StrawberryModel'
import { BiscuitModel } from './BiscuitModel'
import type { PlayerTelemetry } from '../telemetry'

export type CharacterId = 'ginza' | 'strawberry' | 'biscuit'

interface CharacterProps {
  characterId: CharacterId
  racerId: string
  telemetry: PlayerTelemetry
  accentColor: string
}

const MODEL_BY_CHARACTER = {
  ginza: GinzaModel,
  strawberry: StrawberryModel,
  biscuit: BiscuitModel,
} as const

/** Picks the styled model for this racer's character. Every model takes the
 * same props and drives its own procedural idle/run/jump/checkpoint-hop
 * animation from the shared `telemetry` object and the race store — Racer
 * itself doesn't need to know which character it's moving. */
export function Character({ characterId, racerId, telemetry, accentColor }: CharacterProps) {
  const Model = MODEL_BY_CHARACTER[characterId]
  return <Model racerId={racerId} telemetry={telemetry} accentColor={accentColor} />
}
