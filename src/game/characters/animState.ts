import { useRaceStore } from '../race/raceStore'

export const CELEBRATE_DURATION = 0.6

export interface CharacterAnimState {
  lastCheckpointIndex: number
  celebrateTimer: number
}

export function createCharacterAnimState(): CharacterAnimState {
  return { lastCheckpointIndex: -1, celebrateTimer: 0 }
}

/**
 * Ginza's signature move is "a joyful rear-up hop after winning a
 * checkpoint" — plural, so every checkpoint (finish included, since it's
 * just the last one) retriggers it, not only the finish line. Advances the
 * shared celebration clock and returns how far into it the character
 * currently is: 0 (none/settled) to 1 (just triggered).
 */
export function tickCelebration(state: CharacterAnimState, racerId: string, delta: number): number {
  const progress = useRaceStore.getState().racers[racerId]
  const idx = progress?.checkpointIndex ?? -1
  if (idx > state.lastCheckpointIndex) {
    state.lastCheckpointIndex = idx
    state.celebrateTimer = CELEBRATE_DURATION
  } else {
    state.celebrateTimer = Math.max(0, state.celebrateTimer - delta)
  }
  return state.celebrateTimer / CELEBRATE_DURATION
}
