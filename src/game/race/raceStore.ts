import { create } from 'zustand'

export interface RacerProgress {
  checkpointIndex: number // -1 = none reached yet, 0..N-1 = last checkpoint reached
  respawnPosition: [number, number, number]
  finished: boolean
  finishOrder: number | null // 1st, 2nd, ... set once, the moment reachFinish fires
}

interface RaceState {
  racers: Record<string, RacerProgress>
  finishCount: number
  registerRacer: (id: string, spawnPosition: [number, number, number]) => void
  reachCheckpoint: (id: string, index: number, position: [number, number, number]) => void
  reachFinish: (id: string) => void
}

/**
 * Per-racer course progress: which checkpoint each racer (local player or an
 * AI bot) last reached, where a fallen racer respawns, and finish order.
 * Checkpoint/finish sensors call the actions here; Racer reads its own slot
 * imperatively every frame via getState() to avoid subscribing the physics
 * loop to React state. Keyed by racerId so this one store covers every
 * racer instead of duplicating race logic per entity — the "single
 * deterministic race-manager module" the design doc asks for.
 */
export const useRaceStore = create<RaceState>((set, get) => ({
  racers: {},
  finishCount: 0,
  registerRacer: (id, spawnPosition) => {
    if (get().racers[id]) return
    set((state) => ({
      racers: {
        ...state.racers,
        [id]: { checkpointIndex: -1, respawnPosition: spawnPosition, finished: false, finishOrder: null },
      },
    }))
  },
  reachCheckpoint: (id, index, position) => {
    const racer = get().racers[id]
    if (!racer || index <= racer.checkpointIndex) return // never regress on a re-trigger
    set((state) => ({
      racers: { ...state.racers, [id]: { ...racer, checkpointIndex: index, respawnPosition: position } },
    }))
  },
  reachFinish: (id) => {
    const racer = get().racers[id]
    if (!racer || racer.finished) return
    const finishOrder = get().finishCount + 1
    set((state) => ({
      finishCount: finishOrder,
      racers: { ...state.racers, [id]: { ...racer, finished: true, finishOrder } },
    }))
  },
}))
