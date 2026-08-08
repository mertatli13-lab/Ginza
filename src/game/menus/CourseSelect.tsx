import { useFlowStore } from '../flow/flowStore'
import { useRaceStore } from '../race/raceStore'
import { COURSE_LIST } from '../course/courses/registry'
import type { CourseId } from '../course/courseTypes'

const BLURB_BY_COURSE: Record<CourseId, string> = {
  toyChest: 'A burst out of the toy chest, a marble-run climb, a rolling-dice board, and a bookshelf scramble to the ball pit.',
  magicalValley: "Ginza's home course: a pastel meadow, a cloud-hop, a rainbow ramp climb, a crystal cavern, and a run of flower-petal stones. Longer than Toy Chest Tumble.",
  tavsanya:
    "Strawberry's home course, through a hidden rabbit hole in the garden hedge: carrot fields, a bouncy market square, and a wide clover sprint to a glowing pond. The biggest course, and the easiest.",
}
const SWATCH_BY_COURSE: Record<CourseId, string> = {
  toyChest: '#e8b4d9',
  magicalValley: '#bfe3ff',
  tavsanya: '#f2c98a',
}
// A short narrative hook, shown only once Tavşanya is picked — the "good
// hook for a short intro line" the design doc calls for, kept to a card
// subtitle rather than a full cutscene system.
const TAVSANYA_HOOK =
  '"There\'s a hole in the hedge nobody knows about," Strawberry says. "Come on — I want to show you where I\'m from."'

/** Course-select screen: a card per available course, shown after character
 * select in local mode (online always races Toy Chest Tumble). */
export function CourseSelect() {
  const selected = useFlowStore((s) => s.selectedCourse)
  const selectCourse = useFlowStore((s) => s.selectCourse)
  const startRace = useFlowStore((s) => s.startRace)
  const goToCharacterSelect = useFlowStore((s) => s.goToCharacterSelect)

  const handleStart = () => {
    // Clears any leftover racer/checkpoint state from a previous race so the
    // next one starts clean, and bumps raceEpoch so Scene remounts fresh.
    useRaceStore.getState().restartRace()
    startRace()
  }

  return (
    <div className="menu-overlay">
      <div className="menu-card course-select-card">
        <h2 className="menu-heading">Choose your track</h2>
        <div className="course-options">
          {COURSE_LIST.map((course) => (
            <button
              key={course.id}
              type="button"
              className={`course-option${selected === course.id ? ' course-option-selected' : ''}`}
              onClick={() => selectCourse(course.id)}
            >
              <div className="course-swatch" style={{ background: SWATCH_BY_COURSE[course.id] }} />
              <div className="course-name">{course.name}</div>
              <div className="course-blurb">{BLURB_BY_COURSE[course.id]}</div>
            </button>
          ))}
        </div>
        {selected === 'tavsanya' && <p className="course-hook">{TAVSANYA_HOOK}</p>}
        <div className="character-select-actions">
          <button type="button" className="podium-btn podium-btn-primary" onClick={handleStart}>
            Race!
          </button>
          <button type="button" className="podium-btn" onClick={goToCharacterSelect}>
            Back
          </button>
        </div>
      </div>
    </div>
  )
}
