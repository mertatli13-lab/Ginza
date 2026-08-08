import type { CourseData } from './courseTypes'
import { Platform } from './Platform'
import { Checkpoint } from './Checkpoint'
import { TiltingBook } from './TiltingBook'
import { RollingDie } from './obstacles/RollingDie'
import { RollingPencil } from './obstacles/RollingPencil'
import { MagicUnicorn } from './obstacles/MagicUnicorn'
import { TrollGuard } from './obstacles/TrollGuard'
import { Button } from '../pickups/Button'
import { PowerUp } from '../pickups/PowerUp'

/** Renders whichever CourseData is currently active — geometry, obstacles,
 * and Phase 5's pickups: button currency scattered throughout, plus Yarn
 * Ball / Confetti Pop / Bell Chime power-ups at a few strategic points. */
export function Course({ course }: { course: CourseData }) {
  // Same underlying oscillation data/collider either course (so
  // AIController's dodge logic and the tuned difficulty stay identical) —
  // only the rendered obstacle differs, a toy-box die/pencil on Toy Chest
  // Tumble, a charging unicorn/troll guard on Magical Valley.
  const magical = course.id === 'magicalValley'

  return (
    <group>
      {course.platforms.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {course.rails.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {course.decor.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {course.books.map((spec) => (
        <TiltingBook key={spec.key} spec={spec} />
      ))}
      {course.dice.map((spec) =>
        magical ? <MagicUnicorn key={spec.key} spec={spec} /> : <RollingDie key={spec.key} spec={spec} />,
      )}
      {course.pencils.map((spec) =>
        magical ? <TrollGuard key={spec.key} spec={spec} /> : <RollingPencil key={spec.key} spec={spec} />,
      )}
      {course.buttons.map((spec) => (
        <Button key={spec.key} spec={spec} />
      ))}
      {course.powerUps.map((spec) => (
        <PowerUp key={spec.key} spec={spec} />
      ))}
      {course.checkpoints.map((spec) => (
        <Checkpoint key={spec.key} spec={spec} />
      ))}
      <Checkpoint spec={course.finish} isFinish />
    </group>
  )
}
