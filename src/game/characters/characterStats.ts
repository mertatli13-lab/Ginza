import type { CharacterId } from './Character'

/**
 * Per-character top-speed multiplier, applied on top of Racer's base
 * `RUN_SPEED`/`DASH_SPEED` — the same knob the AI personalities already use
 * (`ai/personalities.ts`'s `speedScale`), now exposed to character choice
 * too. Every value is >= 1 so no playable character is ever slower than the
 * game's baseline speed; Kusto (an actual bird) and Strawberry (a bouncy
 * bunny) lean faster, Ginza and Chiti sit at the neutral baseline. Shown on
 * CharacterSelect's cards so the tradeoff is visible before picking.
 */
export const SPEED_MULTIPLIER: Record<CharacterId, number> = {
  ginza: 1.0,
  strawberry: 1.04,
  chiti: 1.0,
  kusto: 1.08,
}
