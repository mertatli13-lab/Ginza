import { create } from 'zustand'

interface GameState {
  speed: number
  grounded: boolean
  playerRank: number // 1-based position among all racers, 0 = not yet computed
  racerCount: number
  setMovementDebug: (speed: number, grounded: boolean) => void
  setPlayerRank: (rank: number, racerCount: number) => void
}

/** Movement + race-position telemetry for the debug HUD. */
export const useGameStore = create<GameState>((set) => ({
  speed: 0,
  grounded: true,
  playerRank: 0,
  racerCount: 0,
  setMovementDebug: (speed, grounded) => set({ speed, grounded }),
  setPlayerRank: (rank, racerCount) => set({ playerRank: rank, racerCount }),
}))
