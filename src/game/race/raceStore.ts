import { create } from 'zustand'

export interface RacerProgress {
  checkpointIndex: number // -1 = none reached yet, 0..N-1 = last checkpoint reached
  respawnPosition: [number, number, number]
  finished: boolean
  finishOrder: number | null // 1st, 2nd, ... set once, the moment reachFinish fires
  buttons: number
}

interface RaceState {
  racers: Record<string, RacerProgress>
  finishCount: number
  raceEpoch: number // bump to remount the whole race (course pickups, racers, AI state)
  registerRacer: (id: string, spawnPosition: [number, number, number]) => void
  reachCheckpoint: (id: string, index: number, position: [number, number, number]) => void
  reachFinish: (id: string) => void
  collectButton: (id: string) => void
  restartRace: () => void
}

/**
 * Per-racer course progress: which checkpoint each racer (local player or an
 * AI bot) last reached, where a fallen racer respawns, finish order, and
 * buttons collected. Checkpoint/finish/pickup sensors call the actions here;
 * Racer reads its own slot imperatively every frame via getState() to avoid
 * subscribing the physics loop to React state. Keyed by racerId so this one
 * store covers every racer instead of duplicating race logic per entity —
 * the "single deterministic race-manager module" the design doc asks for.
 */
export const useRaceStore = create<RaceState>((set, get) => ({
  racers: {},
  finishCount: 0,
  raceEpoch: 0,
  registerRacer: (id, spawnPosition) => {
    if (get().racers[id]) return
    set((state) => ({
      racers: {
        ...state.racers,
        [id]: {
          checkpointIndex: -1,
          respawnPosition: spawnPosition,
          finished: false,
          finishOrder: null,
          buttons: 0,
        },
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
  collectButton: (id) => {
    const racer = get().racers[id]
    if (!racer) return
    set((state) => ({
      racers: { ...state.racers, [id]: { ...racer, buttons: racer.buttons + 1 } },
    }))
  },
  // Clears race progress and bumps raceEpoch; Scene keys the entire
  // course+racers subtree on raceEpoch, so incrementing it remounts
  // everything fresh (pickups reappear, physics bodies reset to spawn, AI
  // waypoint indices reset to 0) without any component needing its own
  // bespoke reset method.
  restartRace: () => set({ racers: {}, finishCount: 0, raceEpoch: get().raceEpoch + 1 }),
}))
