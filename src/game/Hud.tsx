import { useGameStore } from './store'
import { useRaceStore } from './race/raceStore'
import { CHECKPOINTS } from './course/courseData'

/** Minimal debug HUD — the real race HUD (position, progress bar, buttons) arrives in Phase 5/9. */
export function Hud() {
  const speed = useGameStore((s) => s.speed)
  const grounded = useGameStore((s) => s.grounded)
  const checkpointIndex = useRaceStore((s) => s.checkpointIndex)
  const finished = useRaceStore((s) => s.finished)

  return (
    <div className="hud">
      <div className="hud-panel">
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
