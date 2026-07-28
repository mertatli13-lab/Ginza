import {
  PLATFORMS,
  RAILS,
  DECOR,
  CHECKPOINTS,
  FINISH,
  BOOKS,
  DICE,
  PENCILS,
  BUTTONS,
  POWERUPS,
} from './courseData'
import { Platform } from './Platform'
import { Checkpoint } from './Checkpoint'
import { TiltingBook } from './TiltingBook'
import { RollingDie } from './obstacles/RollingDie'
import { RollingPencil } from './obstacles/RollingPencil'
import { Button } from '../pickups/Button'
import { PowerUp } from '../pickups/PowerUp'

/** "Toy Chest Tumble" — course shape, obstacles, and Phase 5's pickups:
 * button currency scattered throughout, plus Yarn Ball / Confetti Pop /
 * Bell Chime power-ups at a few strategic points. Marble-chute funnels and
 * yarn-bridge beams stay for later. */
export function Course() {
  return (
    <group>
      {PLATFORMS.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {RAILS.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {DECOR.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {BOOKS.map((spec) => (
        <TiltingBook key={spec.key} spec={spec} />
      ))}
      {DICE.map((spec) => (
        <RollingDie key={spec.key} spec={spec} />
      ))}
      {PENCILS.map((spec) => (
        <RollingPencil key={spec.key} spec={spec} />
      ))}
      {BUTTONS.map((spec) => (
        <Button key={spec.key} spec={spec} />
      ))}
      {POWERUPS.map((spec) => (
        <PowerUp key={spec.key} spec={spec} />
      ))}
      {CHECKPOINTS.map((spec) => (
        <Checkpoint key={spec.key} spec={spec} />
      ))}
      <Checkpoint spec={FINISH} isFinish />
    </group>
  )
}
