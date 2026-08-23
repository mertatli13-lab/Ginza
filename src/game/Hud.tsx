import { useMemo } from 'react'
import { useGameStore } from './store'
import { useRaceStore } from './race/raceStore'
import { useActiveCourse } from './course/useActiveCourse'
import { LOCAL_PLAYER_ID } from './race/constants'
import { ordinal } from './format'

/** The real in-race HUD (Section 9 of the design doc): live position, a mini
 * progress bar to the finish line with a tick per checkpoint, and the
 * button counter — replacing the raw speed/grounded/checkpoint-index debug
 * readout every earlier phase's testing leaned on instead. */
export function Hud() {
  const playerRank = useGameStore((s) => s.playerRank)
  const racerCount = useGameStore((s) => s.racerCount)
  const progress = useGameStore((s) => s.progress)
  const player = useRaceStore((s) => s.racers[LOCAL_PLAYER_ID])
  const finished = player?.finished ?? false
  const buttons = player?.buttons ?? 0
  const course = useActiveCourse()

  // Each checkpoint's own fraction along the course, in the same 0-1 space as
  // the live progress bar fill — recomputed only when the active course
  // changes (checkpoints/finish are static per-course data, never change at
  // runtime) so every tick mark on the bar lines up with where that
  // checkpoint actually sits.
  const checkpointMarkers = useMemo(
    () => course.checkpoints.map((cp) => Math.min(1, Math.max(0, cp.position[2] / course.finish.position[2]))),
    [course],
  )

  return (
    <div className="hud">
      <div className="hud-top">
        {playerRank > 0 && (
          <span className="hud-rank">
            {ordinal(playerRank)} / {racerCount}
          </span>
        )}
        <span className="hud-buttons">
          <span className="hud-button-icon" />
          {buttons}
        </span>
      </div>
      <div className="hud-progress-track">
        <div className="hud-progress-fill" style={{ width: `${progress * 100}%` }} />
        {checkpointMarkers.map((fraction, i) => (
          <div key={i} className="hud-progress-tick" style={{ left: `${fraction * 100}%` }} />
        ))}
      </div>
      {finished && <div className="hud-finished">FINISHED!</div>}
      <div className="hud-hint">WASD / arrows to move · Space to jump · Shift to dash</div>
    </div>
  )
}
