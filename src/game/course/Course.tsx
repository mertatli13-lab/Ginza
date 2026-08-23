import type { CourseData } from './courseTypes'
import { Platform } from './Platform'
import { Checkpoint } from './Checkpoint'
import { RollingDie } from './obstacles/RollingDie'
import { RollingPencil } from './obstacles/RollingPencil'
import { MagicUnicorn } from './obstacles/MagicUnicorn'
import { TrollGuard } from './obstacles/TrollGuard'
import { TumblingCarrot } from './obstacles/TumblingCarrot'
import { SwayingBridge } from './obstacles/SwayingBridge'
import { MushroomBouncePad } from './obstacles/MushroomBouncePad'
import { DriftingPuff } from './obstacles/DriftingPuff'
import { BurrowNPC } from './BurrowNPC'
import { Button } from '../pickups/Button'
import { PowerUp } from '../pickups/PowerUp'

/** Renders whichever CourseData is currently active — geometry, obstacles,
 * and Phase 5's pickups: button currency scattered throughout, plus power-
 * up pickups at a few strategic points. */
export function Course({ course }: { course: CourseData }) {
  // Same underlying oscillation data/collider on every course (so
  // AIController's dodge logic and the tuned difficulty stay identical) —
  // only the rendered obstacle differs per course id: a toy-box die/pencil
  // on Toy Chest Tumble, a charging unicorn/troll guard on Magical Valley,
  // a tumbling carrot on Tavşanya (which has no pencil-shaped hazard).
  const magical = course.id === 'magicalValley'
  const tavsanya = course.id === 'tavsanya'

  return (
    <group>
      {course.platforms.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} floorSurface={course.floorSurface} />
      ))}
      {course.rails.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {course.decor.map(({ key, ...spec }) => (
        <Platform key={key} {...spec} />
      ))}
      {course.dice.map((spec) => {
        if (tavsanya) return <TumblingCarrot key={spec.key} spec={spec} />
        return magical ? <MagicUnicorn key={spec.key} spec={spec} /> : <RollingDie key={spec.key} spec={spec} />
      })}
      {course.pencils.map((spec) =>
        magical ? <TrollGuard key={spec.key} spec={spec} /> : <RollingPencil key={spec.key} spec={spec} />,
      )}
      {(course.bridges ?? []).map((spec) => (
        <SwayingBridge key={spec.key} spec={spec} />
      ))}
      {(course.bouncePads ?? []).map((spec) => (
        <MushroomBouncePad key={spec.key} spec={spec} />
      ))}
      {(course.puffs ?? []).map((spec) => (
        <DriftingPuff key={spec.key} spec={spec} />
      ))}
      {(course.npcs ?? []).map((position, i) => (
        <BurrowNPC key={i} position={position} variant={i} />
      ))}
      {course.buttons.map((spec) => (
        <Button key={spec.key} spec={spec} />
      ))}
      {course.powerUps.map((spec) => (
        <PowerUp key={spec.key} spec={spec} courseId={course.id} />
      ))}
      {course.checkpoints.map((spec) => (
        <Checkpoint key={spec.key} spec={spec} />
      ))}
      <Checkpoint
        spec={course.finish}
        isFinish
        finishBurstColor={course.background.finishBurstColor}
        finishBurstColor2={course.background.finishBurstColor2}
      />
    </group>
  )
}
