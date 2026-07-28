import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { getRegisteredRacers } from './racerRegistry'
import { useRaceStore } from './raceStore'
import { useGameStore } from '../store'

interface RaceManagerProps {
  localPlayerId: string
}

/**
 * The course runs a single straight lane along -Z with no branches or
 * loops, so "further along -Z" is a reliable progress metric without
 * needing to project each racer onto a path polyline — that would be the
 * right move for a course with forks, but would be overkill here.
 *
 * Finished racers always outrank unfinished ones, ordered by who finished
 * first; unfinished racers are ordered by raw progress. Recomputed every
 * frame from the racer registry, but only pushed into the (React-visible)
 * game store when the local player's rank actually changes, so this
 * doesn't force a HUD re-render every tick.
 */
export function RaceManager({ localPlayerId }: RaceManagerProps) {
  const lastRank = useRef(0)
  const lastCount = useRef(0)

  useFrame(() => {
    const racers = getRegisteredRacers()
    const progressState = useRaceStore.getState().racers

    const ranked = Array.from(racers.entries())
      .map(([id, telemetry]) => {
        const progress = progressState[id]
        return {
          id,
          finished: progress?.finished ?? false,
          finishOrder: progress?.finishOrder ?? Infinity,
          distance: -telemetry.position.z,
        }
      })
      .sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1
        if (a.finished) return a.finishOrder - b.finishOrder
        return b.distance - a.distance
      })

    const index = ranked.findIndex((r) => r.id === localPlayerId)
    const rank = index === -1 ? 0 : index + 1
    if (rank !== lastRank.current || ranked.length !== lastCount.current) {
      lastRank.current = rank
      lastCount.current = ranked.length
      useGameStore.getState().setPlayerRank(rank, ranked.length)
    }
  })

  return null
}
