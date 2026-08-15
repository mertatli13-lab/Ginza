import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { oscillationOffset } from '../course/courseTypes'
import type { CourseData } from '../course/courseTypes'
import { useRaceStore } from '../race/raceStore'
import type { PlayerTelemetry } from '../telemetry'
import type { InputState } from '../input/inputState'
import type { Personality } from './personalities'

const DICE_AVOID_Z_RANGE = 3.5
const DICE_AVOID_X_RANGE = 2.2
const PENCIL_AVOID_Z_RANGE = 0.8
const PENCIL_AVOID_X_RANGE = 1.6
const DASH_COOLDOWN_AFTER_USE = 1.2
// Proportional-steering gain: how hard the bot turns per radian of heading
// error. Saturates at full steer input (Racer's actual turn-rate cap) past
// roughly 1/STEER_GAIN radians off — ~24° at this value — and eases off as
// the heading lines up, so bots turn smoothly onto a target instead of
// snapping or oscillating around it.
const STEER_GAIN = 2.4
// Heading error (radians) a bot must be within before it's allowed to jump a
// gap. Launching while still sharply off-heading sends the jump's horizontal
// velocity toward whatever direction the bot happened to be facing, not the
// landing spot across the gap — under instant-aim AI that never mattered
// (facing was always exactly on-target), but under heading-based steering a
// bot fresh off a sharp turn can still be mid-realignment when it reaches a
// jump waypoint, launches sideways, and sails past or short of the landing
// platform into the gap.
const JUMP_ALIGN_THRESHOLD = 0.5
// Distance inside which the raw waypoint-direction vector stops meaning
// anything. atan2 of a near-zero (dx, dz) amplifies tiny position noise —
// and steeringNoise's wobble, which keeps being added even this close in —
// into a huge apparent heading error, right as the bot is trying to land
// precisely on a small jump platform. That reads as "swerve hard, right
// now" and walks it straight off the landing spot it was already on top
// of. Below this distance, hold the current heading instead of chasing it.
const NEAR_TARGET_HOLD_DIST = 2.0
// Floor on how tight a jump landing's "reached" radius can be, regardless
// of the bot's own (personality-tuned) waypointReachDistance. Reckless's
// speedScale (1.05, the fastest archetype) paired with its own tightest
// reach tolerance (1.1) meant it routinely flew past a small jump
// platform's landing point too fast to ever register as grounded within
// that radius — it would sail clean over the "reached" check and off the
// platform's far edge into the next gap, never advancing the waypoint and
// therefore never able to land anywhere. Landing zones need more slack
// than a walking stop does.
const JUMP_REACH_FLOOR = 1.9
// Any single-frame move bigger than this can only be a fall-respawn
// teleport — real physics can't cover this much ground in one tick even at
// max dash speed under a clamped delta.
const TELEPORT_DISTANCE = 6

function nearestWaypointIndex(path: CourseData['path'], pos: Vector3): number {
  let bestIndex = 0
  let bestDist = Infinity
  for (let i = 0; i < path.length; i++) {
    const [x, y, z] = path[i].position
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
  course: CourseData
}

/**
 * The `AIController` half of the swappable input-source interface: produces
 * the exact same {moveX, moveY, jump, dash} shape LocalPlayerInput does —
 * moveX a relative steering command, moveY throttle along the bot's own
 * current heading, matching Racer's relative/heading-based movement model
 * exactly — by following a fixed waypoint list (`course.path`) with
 * per-personality steering noise, obstacle avoidance, and dash usage.
 * Racer doesn't know or care that this isn't a human — same movement code
 * either way.
 */
export function AIController({ racerId, telemetry, inputSource, personality, course }: AIControllerProps) {
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
      waypointIndex.current = nearestWaypointIndex(course.path, pos)
    }
    prevPos.current ??= new Vector3()
    prevPos.current.copy(pos)

    if (progress?.finished || waypointIndex.current >= course.path.length) {
      inputSource.moveX = 0
      inputSource.moveY = 0
      inputSource.jump = false
      inputSource.dash = false
      return
    }

    let target = course.path[waypointIndex.current]
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
    const reachDist = target.jump ? Math.max(personality.waypointReachDistance, JUMP_REACH_FLOOR) : personality.waypointReachDistance
    if (
      dist < reachDist &&
      yDist < 1.2 &&
      telemetry.grounded &&
      waypointIndex.current < course.path.length - 1
    ) {
      waypointIndex.current += 1
      target = course.path[waypointIndex.current]
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
      for (const die of course.dice) {
        const dzHazard = die.center[2] - pos.z
        if (Math.abs(dzHazard) > DICE_AVOID_Z_RANGE) continue
        const dxHazard = die.center[0] + oscillationOffset(die, t) - pos.x
        if (Math.abs(dxHazard) < DICE_AVOID_X_RANGE) {
          avoidX -= Math.sign(dxHazard || 1) * (DICE_AVOID_X_RANGE - Math.abs(dxHazard))
        }
      }
      for (const pencil of course.pencils) {
        const dzHazard = pencil.center[2] + oscillationOffset(pencil, t) - pos.z
        const dxHazard = pencil.center[0] - pos.x
        if (Math.abs(dzHazard) < PENCIL_AVOID_Z_RANGE && Math.abs(dxHazard) < PENCIL_AVOID_X_RANGE) {
          avoidX -= Math.sign(-dxHazard || 1) * PENCIL_AVOID_X_RANGE
        }
      }
      dirX += avoidX * personality.obstacleAvoidance
    }

    // Skipped while pursuing a jump-flagged waypoint, same reasoning as
    // obstacle avoidance above: "loose control" wobble reads as charming
    // drift on open ground, but corrupting the aim heading right as a bot
    // commits to a gap jump is exactly the "wrong instinct" that section's
    // comment already calls out for lateral nudges — wildcard's noise
    // (0.28, the highest of any archetype) was enough on its own to derail
    // a long jump chain like Magical Valley's cloud hop, even after dash
    // and reach-distance were already fixed for the same chain.
    if (personality.steeringNoise > 0 && !target.jump) {
      dirX += Math.sin(state.clock.elapsedTime * 2.3 + wobbleSeed.current) * personality.steeringNoise
    }

    const mag = Math.hypot(dirX, dirZ) || 1
    dirX /= mag
    dirZ /= mag

    if (dist < NEAR_TARGET_HOLD_DIST) {
      dirX = Math.sin(telemetry.facingAngle)
      dirZ = Math.cos(telemetry.facingAngle)
    }

    // Racer's input is relative steering now, not a world-space direction:
    // moveX turns the bot's own heading, moveY is throttle along whatever
    // that heading currently is. Convert the aim vector above (world-space,
    // built from waypoint direction + avoidance + noise) into "how hard to
    // turn" by comparing the angle it represents to the bot's current
    // facingAngle — same forward-vector convention Racer uses,
    // forward = (sin(angle), cos(angle)) — via a simple proportional
    // controller: full steer input while well off-target, easing to zero
    // as the heading actually lines up.
    const desiredAngle = Math.atan2(dirX, dirZ)
    let angleDiff = desiredAngle - telemetry.facingAngle
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    inputSource.moveX = Math.max(-1, Math.min(1, -angleDiff * STEER_GAIN))
    // Ease off the throttle while sharply off-heading instead of always
    // charging forward at full speed — a bot mid-turn that's still barreling
    // ahead at RUN_SPEED tends to clip a ramp's guard rail before it
    // finishes re-aiming, then bounces off it, over-corrects, and clips the
    // other rail, snowballing into an oscillation that never actually
    // converges on the target. Full throttle once roughly aligned (~40°),
    // never fully stopped (some forward creep always continues turning is
    // still useful progress), floor of 0.35.
    inputSource.moveY = Math.max(0.35, 1 - Math.abs(angleDiff) / 1.8)
    // Also ease throttle down by raw distance once close to the target,
    // heading-alignment aside. A bot that's dead-on-heading (angleDiff≈0)
    // still got full throttle the whole way in under the easing above, so
    // it hit small jump platforms — Magical Valley's cloud-hop chain is
    // ~3 units deep — at full run speed and sailed clean over the far
    // edge into the next gap instead of landing, even when its aim was
    // perfect. Scaling down as `dist` shrinks below the same
    // near-target-noise threshold used above makes it settle onto a
    // platform instead of blasting through it. Reach-distance advances the
    // waypoint (and dist snaps back up for the next target) well before
    // this could ever stall a bot to a stop.
    if (dist < NEAR_TARGET_HOLD_DIST) {
      inputSource.moveY *= Math.max(0.2, dist / NEAR_TARGET_HOLD_DIST)
    }

    // Jump as soon as grounded while pursuing a jump-flagged waypoint — not
    // gated on distance-to-target, since that target is the landing spot
    // *across* the gap. Waiting to get within a small radius of it means
    // waiting until already standing on it, which is impossible: the bot
    // walks off the near edge into the gap first, every time. Jumping
    // immediately (right at the point it starts pursuing that waypoint,
    // typically the edge it just arrived at) uses the full run-up plus the
    // jump arc, which comfortably covers this course's gaps.
    inputSource.jump = target.jump === true && telemetry.grounded && Math.abs(angleDiff) < JUMP_ALIGN_THRESHOLD

    // Skipped while pursuing a jump-flagged waypoint for the same reason
    // obstacle avoidance is: dash bypasses moveY's throttle entirely
    // (Racer.tsx drives straight to DASH_SPEED, ignoring how close the
    // target is), so a dash rolled right as the bot is grounded and about
    // to leap sends it blasting through a small landing platform at speed
    // instead of settling onto it — reckless's high dashChance made this
    // the dominant cause of Magical Valley's cloud-hop chain never landing.
    dashCooldown.current -= delta
    if (
      dashCooldown.current <= 0 &&
      telemetry.grounded &&
      !target.jump &&
      Math.random() < personality.dashChance * delta
    ) {
      inputSource.dash = true
      dashCooldown.current = DASH_COOLDOWN_AFTER_USE
    } else {
      inputSource.dash = false
    }
  })

  return null
}
