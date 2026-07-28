import { create } from 'zustand'

interface GameState {
  progress: number // 0-1 fraction of the course the local player has covered
  playerRank: number // 1-based position among all racers, 0 = not yet computed
  racerCount: number
  setProgress: (progress: number) => void
  setPlayerRank: (rank: number, racerCount: number) => void
}

/** Local-player race telemetry the HUD renders — course progress + live rank. */
export const useGameStore = create<GameState>((set) => ({
  progress: 0,
  playerRank: 0,
  racerCount: 0,
  setProgress: (progress) => set({ progress }),
  setPlayerRank: (rank, racerCount) => set({ playerRank: rank, racerCount }),
}))
