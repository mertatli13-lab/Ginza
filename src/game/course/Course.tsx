import { PLATFORMS, RAILS, DECOR, CHECKPOINTS, FINISH } from './courseData'
import { Platform } from './Platform'
import { Checkpoint } from './Checkpoint'

/** "Toy Chest Tumble" — Phase 2 greybox. Obstacles (dice, pencils, tilting
 * books) arrive in Phase 3; this is course shape, checkpoints, and finish only. */
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
      {CHECKPOINTS.map((spec) => (
        <Checkpoint key={spec.key} spec={spec} />
      ))}
      <Checkpoint spec={FINISH} isFinish />
    </group>
  )
}
