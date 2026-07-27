import { PLATFORMS, RAILS, DECOR, CHECKPOINTS, FINISH, BOOKS, DICE, PENCILS } from './courseData'
import { Platform } from './Platform'
import { Checkpoint } from './Checkpoint'
import { TiltingBook } from './TiltingBook'
import { RollingDie } from './obstacles/RollingDie'
import { RollingPencil } from './obstacles/RollingPencil'

/** "Toy Chest Tumble" — course shape plus Phase 3's obstacles: rolling dice on
 * the board stretch, rolling pencils and weight-shift tilting books on the
 * bookshelf climb. Marble-chute funnels and yarn-bridge beams stay for later. */
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
      {CHECKPOINTS.map((spec) => (
        <Checkpoint key={spec.key} spec={spec} />
      ))}
      <Checkpoint spec={FINISH} isFinish />
    </group>
  )
}
