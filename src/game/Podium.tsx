import { useRaceStore } from './race/raceStore'
import { LOCAL_PLAYER_ID } from './race/constants'
import { ordinal } from './format'
import { Confetti } from './Confetti'
import { useFlowStore } from './flow/flowStore'
import { COURSE_LIST } from './course/courses/registry'
import { leaveOnlineRace, requestStart } from '../net/networkClient'

/** Post-race screen: confetti, placement, buttons earned, and next actions.
 * "Race Again" restarts the race — online, that means broadcasting 'start'
 * so every connected client resets together instead of just this one.
 * "Character Select" returns to that screen (leaving the online session, if
 * any, and resetting race state so the next race starts clean). "Next
 * Course" switches to the other local course and restarts straight into it —
 * online always stays on Toy Chest Tumble, so it's hidden there. */
export function Podium() {
  const player = useRaceStore((s) => s.racers[LOCAL_PLAYER_ID])
  const restartRace = useRaceStore((s) => s.restartRace)
  const mode = useFlowStore((s) => s.mode)
  const selectedCourse = useFlowStore((s) => s.selectedCourse)
  const selectCourse = useFlowStore((s) => s.selectCourse)
  const returnToCharacterSelect = useFlowStore((s) => s.returnToCharacterSelect)

  if (!player?.finished) return null

  const handleRaceAgain = () => {
    if (mode === 'online') {
      requestStart()
    } else {
      restartRace()
    }
  }

  const handleNextCourse = () => {
    const currentIndex = COURSE_LIST.findIndex((c) => c.id === selectedCourse)
    const next = COURSE_LIST[(currentIndex + 1) % COURSE_LIST.length]
    selectCourse(next.id)
    restartRace()
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
          {mode === 'local' && (
            <button type="button" className="podium-btn" onClick={handleNextCourse}>
              Next Course
            </button>
          )}
          <button type="button" className="podium-btn" onClick={handleCharacterSelect}>
            Character Select
          </button>
        </div>
      </div>
    </div>
  )
}
