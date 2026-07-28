import { useRaceStore } from './race/raceStore'
import { LOCAL_PLAYER_ID } from './race/constants'
import { ordinal } from './format'
import { Confetti } from './Confetti'

/** Post-race screen: confetti, placement, buttons earned, and next actions.
 * "Race Again" actually restarts the race; the course and character-select
 * flows this doc's HUD spec also calls for don't exist yet (one course, one
 * character), so those two stay visibly present but disabled rather than
 * silently doing nothing. */
export function Podium() {
  const player = useRaceStore((s) => s.racers[LOCAL_PLAYER_ID])
  const restartRace = useRaceStore((s) => s.restartRace)

  if (!player?.finished) return null

  return (
    <div className="podium-overlay">
      <Confetti />
      <div className="podium-card">
        <div className="podium-place">{ordinal(player.finishOrder ?? 1)}</div>
        <div className="podium-subtitle">Race complete!</div>
        <div className="podium-buttons-earned">
          {player.buttons} {player.buttons === 1 ? 'button' : 'buttons'} earned
        </div>
        <div className="podium-actions">
          <button type="button" className="podium-btn podium-btn-primary" onClick={restartRace}>
            Race Again
          </button>
          <button type="button" className="podium-btn" disabled title="Coming soon">
            Next Course
          </button>
          <button type="button" className="podium-btn" disabled title="Coming soon">
            Character Select
          </button>
        </div>
      </div>
    </div>
  )
}
