import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { COURSE_PATH, DICE, PENCILS, oscillationOffset } from '../course/courseData'
import { useRaceStore } from '../race/raceStore'
import type { PlayerTelemetry } from '../telemetry'
import type { InputState } from '../input/inputState'
import type { Personality } from './personalities'

const DICE_AVOID_Z_RANGE = 3.5
const DICE_AVOID_X_RANGE = 2.2
const PENCIL_AVOID_Z_RANGE = 0.8
const PENCIL_AVOID_X_RANGE = 1.6
const DASH_COOLDOWN_AFTER_USE = 1.2
// Any single-frame move bigger than this can only be a fall-respawn
// teleport — real physics can't cover this much ground in one tick even at
// max dash speed under a clamped delta.
const TELEPORT_DISTANCE = 6

function nearestWaypointIndex(pos: Vector3): number {
  let bestIndex = 0
  let bestDist = Infinity
  for (let i = 0; i < COURSE_PATH.length; i++) {
    const [x, y, z] = COURSE_PATH[i].position
    const d = (x - pos.x) ** 2 + (y - pos.y) ** 2 + (z - pos.z) ** 2
    if (d < bestDist) {
      bestDist = d
      bestIndex = i
    }
  }
  return bestIndex
}

interface AIControllerProps {
  racerId: string
  telemetry: PlayerTelemetry
  inputSource: InputState // this component is the one writing to it each frame
  personality: Personality
}

/**
 * The `AIController` half of the swappable input-source interface: produces
 * the exact same {moveX, moveY, jump, dash} shape LocalPlayerInput does, by
 * following a fixed waypoint list (COURSE_PATH) with per-personality
 * steering noise, obstacle avoidance, and dash usage. Racer doesn't know or
 * care that this isn't a human — same movement code either way.
 */
export function AIController({ racerId, telemetry, inputSource, personality }: AIControllerProps) {
  const waypointIndex = useRef(0)
  const dashCooldown = useRef(Math.random() * 1.5) // stagger initial dash timing across bots
  const wobbleSeed = useRef(Math.random() * 1000)
  const prevPos = useRef<Vector3 | null>(null)

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    const progress = useRaceStore.getState().racers[racerId]

    const pos = telemetry.position

    // A fall/respawn teleport can drop the bot's position anywhere from a
    // few waypoints behind its current target — resync to whatever
    // waypoint is actually nearest, or it keeps chasing wherever it was
    // heading before the fall, now an impossible distance away, and can
    // never land anywhere again.
    if (prevPos.current && prevPos.current.distanceToSquared(pos) > TELEPORT_DISTANCE ** 2) {
      waypointIndex.current = nearestWaypointIndex(pos)
    }
    prevPos.current ??= new Vector3()
    prevPos.current.copy(pos)

    if (progress?.finished || waypointIndex.current >= COURSE_PATH.length) {
      inputSource.moveX = 0
      inputSource.moveY = 0
      inputSource.jump = false
      inputSource.dash = false
      return
    }

    let target = COURSE_PATH[waypointIndex.current]
    let dx = target.position[0] - pos.x
    let dz = target.position[2] - pos.z
    let dist = Math.hypot(dx, dz)
    // "Reached" requires grounded *and* roughly the target's height, not
    // just nearby XZ — grounded alone doesn't mean grounded on the target
    // platform. A bot resting on the board, or teetering on a lower book's
    // edge, can be coincidentally close in XZ to a target one or two books
    // further along (books zigzag across a narrow x range, so they're not
    // far apart in XZ even though they're a jump and a half-story of height
    // apart). Without the height check that falsely counts as "reached" and
    // advances the target index without ever actually landing there —
    // repeatedly, cascading several waypoints ahead of where the bot
    // physically is, at which point every further target is unreachably far
    // and it never lands anywhere again.
    const yDist = Math.abs(target.position[1] - pos.y)
    if (
      dist < personality.waypointReachDistance &&
      yDist < 1.2 &&
      telemetry.grounded &&
      waypointIndex.current < COURSE_PATH.length - 1
    ) {
      waypointIndex.current += 1
      target = COURSE_PATH[waypointIndex.current]
      dx = target.position[0] - pos.x
      dz = target.position[2] - pos.z
      dist = Math.hypot(dx, dz)
    }

    let dirX = dist > 0.001 ? dx / dist : 0
    let dirZ = dist > 0.001 ? dz / dist : 1

    // Obstacle avoidance: nudge sideways, away from a die/pencil that's
    // currently close in the axis it doesn't move along. Skipped while
    // pursuing a jump-flagged waypoint — a lateral nudge is exactly the
    // wrong instinct mid-gap-jump, where landing needs a committed, precise
    // aim rather than a dodge. Dice/pencil dodging matters on the open
    // board and book surfaces, not during the leap itself.
    if (personality.obstacleAvoidance > 0 && !target.jump) {
      const t = state.clock.elapsedTime
      let avoidX = 0
      for (const die of DICE) {
        const dzHazard = die.center[2] - pos.z
        if (Math.abs(dzHazard) > DICE_AVOID_Z_RANGE) continue
        const dxHazard = die.center[0] + oscillationOffset(die, t) - pos.x
        if (Math.abs(dxHazard) < DICE_AVOID_X_RANGE) {
          avoidX -= Math.sign(dxHazard || 1) * (DICE_AVOID_X_RANGE - Math.abs(dxHazard))
        }
      }
      for (const pencil of PENCILS) {
        const dzHazard = pencil.center[2] + oscillationOffset(pencil, t) - pos.z
        const dxHazard = pencil.center[0] - pos.x
        if (Math.abs(dzHazard) < PENCIL_AVOID_Z_RANGE && Math.abs(dxHazard) < PENCIL_AVOID_X_RANGE) {
          avoidX -= Math.sign(-dxHazard || 1) * PENCIL_AVOID_X_RANGE
        }
      }
      dirX += avoidX * personality.obstacleAvoidance
    }

    if (personality.steeringNoise > 0) {
      dirX += Math.sin(state.clock.elapsedTime * 2.3 + wobbleSeed.current) * personality.steeringNoise
    }

    const mag = Math.hypot(dirX, dirZ) || 1
    dirX /= mag
    dirZ /= mag

    // Convert the world-space aim direction back to Racer's {moveX, moveY} convention.
    inputSource.moveX = dirX
    inputSource.moveY = -dirZ
    // Jump as soon as grounded while pursuing a jump-flagged waypoint — not
    // gated on distance-to-target, since that target is the landing spot
    // *across* the gap. Waiting to get within a small radius of it means
    // waiting until already standing on it, which is impossible: the bot
    // walks off the near edge into the gap first, every time. Jumping
    // immediately (right at the point it starts pursuing that waypoint,
    // typically the edge it just arrived at) uses the full run-up plus the
    // jump arc, which comfortably covers this course's gaps.
    inputSource.jump = target.jump === true && telemetry.grounded

    dashCooldown.current -= delta
    if (dashCooldown.current <= 0 && telemetry.grounded && Math.random() < personality.dashChance * delta) {
      inputSource.dash = true
      dashCooldown.current = DASH_COOLDOWN_AFTER_USE
    } else {
      inputSource.dash = false
    }
  })

  return null
}
