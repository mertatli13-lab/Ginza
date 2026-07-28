import { useRaceStore } from './race/raceStore'
import { LOCAL_PLAYER_ID } from './race/constants'
import { ordinal } from './format'
import { Confetti } from './Confetti'
import { useFlowStore } from './flow/flowStore'
import { leaveOnlineRace, requestStart } from '../net/networkClient'

/** Post-race screen: confetti, placement, buttons earned, and next actions.
 * "Race Again" restarts the race — online, that means broadcasting 'start'
 * so every connected client resets together instead of just this one.
 * "Character Select" returns to that screen (leaving the online session, if
 * any, and resetting race state so the next race starts clean). "Next
 * Course" stays disabled — a course picker only means something once a
 * second course exists, and this game still ships with just Toy Chest
 * Tumble. */
export function Podium() {
  const player = useRaceStore((s) => s.racers[LOCAL_PLAYER_ID])
  const restartRace = useRaceStore((s) => s.restartRace)
  const mode = useFlowStore((s) => s.mode)
  const returnToCharacterSelect = useFlowStore((s) => s.returnToCharacterSelect)

  if (!player?.finished) return null

  const handleRaceAgain = () => {
    if (mode === 'online') {
      requestStart()
    } else {
      restartRace()
    }
  }

  const handleCharacterSelect = () => {
    if (mode === 'online') leaveOnlineRace()
    restartRace()
    returnToCharacterSelect()
  }

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
          <button type="button" className="podium-btn podium-btn-primary" onClick={handleRaceAgain}>
            Race Again
          </button>
          <button type="button" className="podium-btn" disabled title="Coming soon">
            Next Course
          </button>
          <button type="button" className="podium-btn" onClick={handleCharacterSelect}>
            Character Select
          </button>
        </div>
      </div>
    </div>
  )
}
