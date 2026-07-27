import { create } from 'zustand'

interface GameState {
  speed: number
  grounded: boolean
  setMovementDebug: (speed: number, grounded: boolean) => void
}

/**
 * Movement telemetry for the debug HUD only. Real race state (checkpoints,
 * positions, timers) arrives in Phase 4's race-manager module — this store
 * intentionally stays tiny for Phase 1.
 */
export const useGameStore = create<GameState>((set) => ({
  speed: 0,
  grounded: true,
  setMovementDebug: (speed, grounded) => set({ speed, grounded }),
}))
