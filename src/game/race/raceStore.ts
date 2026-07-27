import { create } from 'zustand'
import { START_POSITION } from '../course/courseData'

interface RaceState {
  checkpointIndex: number // -1 = none reached yet, 0..N-1 = last checkpoint reached
  respawnPosition: [number, number, number]
  finished: boolean
  reachCheckpoint: (index: number, position: [number, number, number]) => void
  reachFinish: () => void
  reset: () => void
}

/**
 * Single source of truth for Phase 2's course progress: which checkpoint was
 * last reached, where a fallen player respawns, and whether the run is done.
 * Checkpoint triggers (sensors) call `reachCheckpoint`; Player reads
 * `respawnPosition` imperatively every frame via getState() to avoid
 * subscribing the physics loop to React state.
 */
export const useRaceStore = create<RaceState>((set, get) => ({
  checkpointIndex: -1,
  respawnPosition: START_POSITION,
  finished: false,
  reachCheckpoint: (index, position) => {
    if (index <= get().checkpointIndex) return // never regress on a re-trigger
    set({ checkpointIndex: index, respawnPosition: position })
  },
  reachFinish: () => set({ finished: true }),
  reset: () => set({ checkpointIndex: -1, respawnPosition: START_POSITION, finished: false }),
}))
