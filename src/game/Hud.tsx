import { useGameStore } from './store'
import { useRaceStore } from './race/raceStore'
import { CHECKPOINTS } from './course/courseData'
import { LOCAL_PLAYER_ID } from './race/constants'
import { ordinal } from './format'

/** Minimal debug HUD — the real race HUD (progress bar) arrives in Phase 9. */
export function Hud() {
  const speed = useGameStore((s) => s.speed)
  const grounded = useGameStore((s) => s.grounded)
  const playerRank = useGameStore((s) => s.playerRank)
  const racerCount = useGameStore((s) => s.racerCount)
  const player = useRaceStore((s) => s.racers[LOCAL_PLAYER_ID])
  const checkpointIndex = player?.checkpointIndex ?? -1
  const finished = player?.finished ?? false
  const buttons = player?.buttons ?? 0

  return (
    <div className="hud">
      <div className="hud-panel">
        {playerRank > 0 && (
          <span className="hud-rank">
            {ordinal(playerRank)} / {racerCount}
          </span>
        )}
        <span className="hud-buttons">buttons {buttons}</span>
        <span>speed {speed.toFixed(1)}</span>
        <span>{grounded ? 'grounded' : 'airborne'}</span>
        <span>
          checkpoint {checkpointIndex + 1}/{CHECKPOINTS.length}
        </span>
        {finished && <span className="hud-finished">FINISHED!</span>}
      </div>
      <div className="hud-hint">WASD / arrows to move · Space to jump · Shift to dash</div>
    </div>
  )
}
