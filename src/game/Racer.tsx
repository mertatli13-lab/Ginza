import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Group, Quaternion, Vector3 } from 'three'
import type { InputState } from './input/inputState'
import type { PlayerTelemetry } from './telemetry'
import { useGameStore } from './store'
import { useRaceStore } from './race/raceStore'
import { registerRacerTelemetry, unregisterRacerTelemetry } from './race/racerRegistry'
import { registerRacerEffects, unregisterRacerEffects } from './race/effectsRegistry'
import type { RacerEffects } from './race/effects'
import { BOOST_MULTIPLIER, FLOAT_GRAVITY_SCALE, FLOAT_JUMP_MULTIPLIER } from './pickups/PowerUp'
import { PUFF_SLOW_FACTOR } from './course/obstacles/DriftingPuff'
import { consumeBounce } from './race/bounceRegistry'
import type { CourseData } from './course/courseTypes'
import { RADIUS, HALF_HEIGHT } from './playerConstants'
import { Character, type CharacterId } from './characters/Character'
import { addShake } from './juice/screenShake'
import { playJump, playLand, playDash } from './audio/sfx'

// Ground-check ray: slightly longer than the capsule's radius so a still-grounded
// capsule (resting exactly on a surface) reliably reports a hit each frame.
const GROUND_RAY_LENGTH = HALF_HEIGHT + RADIUS + 0.15
const GROUND_RAY_TOLERANCE = HALF_HEIGHT + RADIUS + 0.12

const RUN_SPEED = 9
const DASH_SPEED = 22
const GROUND_ACCEL = 45 // how fast horizontal velocity chases its target, grounded
const AIR_ACCEL = 18 // reduced authority while airborne, but never zero (arcade air control)
const JUMP_VELOCITY = 9.2
const COYOTE_TIME = 0.12 // grace window to jump just after leaving a ledge
const JUMP_BUFFER = 0.12 // queues a jump pressed just before landing
const JUMP_COOLDOWN = 0.25
const DASH_DURATION = 0.18
const DASH_COOLDOWN = 0.65
// Real, physical turn rate — not cosmetic. Left/right input steers the
// character's own heading (telemetry.facingAngle) at this bounded rate
// (radians/sec at full input); forward/back drives velocity along whatever
// that heading currently is. This is what makes turning relative/additive
// (holding left keeps turning further left) instead of each press
// re-targeting a fixed world direction.
const TURN_RATE = 4.2
// Separate from TURN_RATE: how tightly the *visual mesh* quaternion tracks
// the (already turn-rate-limited, already non-jumpy) heading. Deliberately
// much faster than TURN_RATE — this isn't steering the character, it's
// just rounding off any residual single-frame discreteness in the mesh's
// own rotation so it never visibly pops.
const VISUAL_TURN_DAMP = 20
const RECONCILE_DRIFT_SQ = 2.5 * 2.5 // network racers only: snap if drift exceeds this

const AXIS_Y = new Vector3(0, 1, 0)
const targetVisualQuat = new Quaternion()

interface RacerProps {
  racerId: string
  telemetry: PlayerTelemetry
  inputSource: InputState
  effects: RacerEffects
  spawnPosition: [number, number, number]
  characterId: CharacterId
  /** Which course's finish line / fall-respawn margin applies to this racer. */
  course: CourseData
  /** Ribbon/bow tint — so two racers sharing the same character still read apart at a glance. */
  accentColor: string
  /** Only the local player's movement feeds the debug HUD's speed/grounded readout. */
  isLocalPlayer?: boolean
  /** Personality tuning knob (bots only) — input direction is always a unit vector
   * regardless of magnitude, so this is the only way a racer's top speed differs. */
  speedMultiplier?: number
  /** NetworkRacer only: called every frame; when it returns a fresh snapshot
   * whose position has drifted from this racer's own locally-resimulated
   * physics by more than a small threshold, the body snaps to it. No-op for
   * the local player and bots, which never pass this prop. */
  getReconcileSnapshot?: () => { position: readonly [number, number, number]; facingAngle: number } | null
}

/**
 * Shared movement/physics body for every racer — local player, AI bot, or
 * network peer. Identical either way; the only thing that varies is
 * `inputSource`, which is the keyboard/touch `inputState` singleton, an
 * AIController's own computed snapshot, or (NetworkRacer) input relayed from
 * a remote peer over the network — the swappable `LocalPlayerInput` /
 * `AIController` / `NetworkInput` interface the design doc calls for, all
 * producing the same {moveX, moveY, jump, dash} shape. `getReconcileSnapshot`
 * is the one addition NetworkRacer alone uses, to correct drift against the
 * owning client's own authoritative position.
 */
export function Racer({
  racerId,
  telemetry,
  inputSource,
  effects,
  spawnPosition,
  characterId,
  course,
  accentColor,
  isLocalPlayer,
  speedMultiplier = 1,
  getReconcileSnapshot,
}: RacerProps) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const visualRef = useRef<Group>(null)
  const shieldRef = useRef<Group>(null)
  const { world, rapier } = useRapier()
  useState(() => useRaceStore.getState().registerRacer(racerId, spawnPosition))

  useEffect(() => {
    registerRacerTelemetry(racerId, telemetry)
    return () => unregisterRacerTelemetry(racerId)
  }, [racerId, telemetry])

  useEffect(() => {
    registerRacerEffects(racerId, effects)
    return () => unregisterRacerEffects(racerId)
  }, [racerId, effects])

  const coyoteTimer = useRef(0)
  const jumpBufferTimer = useRef(0)
  const jumpCooldownTimer = useRef(0)
  const dashTimer = useRef(0)
  const dashCooldownTimer = useRef(0)
  const dashDirX = useRef(0)
  const dashDirZ = useRef(-1)
  const wasGrounded = useRef(true)
  const squashTimer = useRef(0)
  const jumpStretchTimer = useRef(0)
  // Highest y reached since last leaving the ground — landing shake scales
  // with how far this particular fall actually was, not a flat per-landing jolt.
  const airborneApexY = useRef(0)
  const wasFloating = useRef(false)

  const setProgress = useGameStore((s) => s.setProgress)

  useFrame((state, rawDelta) => {
    const body = bodyRef.current
    const visual = visualRef.current
    if (!body || !visual) return

    // Network drift correction — no-op for the local player and bots, which
    // never pass getReconcileSnapshot. Runs before reading translation below
    // so the rest of this frame sees the corrected position, not the stale one.
    if (getReconcileSnapshot) {
      const snapshot = getReconcileSnapshot()
      if (snapshot) {
        const t = body.translation()
        const dx = snapshot.position[0] - t.x
        const dy = snapshot.position[1] - t.y
        const dz = snapshot.position[2] - t.z
        if (dx * dx + dy * dy + dz * dz > RECONCILE_DRIFT_SQ) {
          body.setTranslation({ x: snapshot.position[0], y: snapshot.position[1], z: snapshot.position[2] }, true)
          telemetry.facingAngle = snapshot.facingAngle
        }
      }
    }

    // Clamp delta so a stalled tab/tool doesn't fling the character on resume.
    const delta = Math.min(rawDelta, 1 / 30)
    const now = state.clock.elapsedTime
    const boosted = effects.speedBoostUntil > now
    const shielded = effects.shieldUntil > now
    const floating = effects.floatUntil > now
    const slowed = effects.slowUntil > now
    // Dandelion Wish: lighter gravity while it's active, so jumps arc
    // higher and hang longer instead of just moving faster. Rapier's own
    // per-body gravityScale, not a hand-rolled fall-speed clamp — only
    // written on an actual state change (a WASM call every single frame for
    // every racer measurably disturbed physics timing on the heavier
    // courses, enough to throw off tightly-tuned jump gaps).
    if (floating !== wasFloating.current) {
      body.setGravityScale(floating ? FLOAT_GRAVITY_SCALE : 1, true)
      wasFloating.current = floating
    }

    const translation = body.translation()
    const linvel = body.linvel()

    // Downward raycast, not a fixed rest height — the course has ramps, tilted
    // book platforms, and several different floor heights, so "close to y=X"
    // no longer means anything on its own.
    const ray = new rapier.Ray(translation, { x: 0, y: -1, z: 0 })
    const hit = world.castRay(ray, GROUND_RAY_LENGTH, true, undefined, undefined, undefined, body)
    const grounded = hit !== null && hit.timeOfImpact <= GROUND_RAY_TOLERANCE && linvel.y <= 0.05
    coyoteTimer.current = grounded ? COYOTE_TIME : Math.max(0, coyoteTimer.current - delta)
    jumpCooldownTimer.current = Math.max(0, jumpCooldownTimer.current - delta)
    dashCooldownTimer.current = Math.max(0, dashCooldownTimer.current - delta)

    // Landing impact -> squash (+ sound/shake for the local player, scaled
    // by how far this particular fall was). Liftoff -> stretch.
    if (!grounded) {
      airborneApexY.current = Math.max(airborneApexY.current, translation.y)
    }
    if (grounded && !wasGrounded.current) {
      squashTimer.current = 0.14
      if (isLocalPlayer) {
        playLand(characterId)
        const fallDistance = airborneApexY.current - translation.y
        if (fallDistance > 1.4) addShake(Math.min(0.5, fallDistance * 0.12))
      }
    }
    if (grounded) airborneApexY.current = translation.y
    wasGrounded.current = grounded

    // --- Steering: relative, not world-locked. Left/right is a turn command
    // that rotates the character's own persistent heading at a bounded rate
    // (TURN_RATE) from wherever it's currently facing — holding left keeps
    // turning further left, it never re-targets a fixed world direction.
    // Forward/back then drives velocity along *that* heading (derived fresh
    // every frame — never a hardcoded world axis), so movement automatically
    // stays correct through any sequence of turns. ---
    const steer = inputSource.moveX
    const throttle = inputSource.moveY
    telemetry.facingAngle -= steer * TURN_RATE * delta
    // Keep the stored angle bounded rather than growing without limit over a
    // long race — sin/cos don't care, but this keeps it readable/debuggable.
    telemetry.facingAngle = Math.atan2(Math.sin(telemetry.facingAngle), Math.cos(telemetry.facingAngle))
    const forwardX = Math.sin(telemetry.facingAngle)
    const forwardZ = Math.cos(telemetry.facingAngle)

    // --- Jump: buffered + coyote so a slightly-early or slightly-late press still lands ---
    if (inputSource.jump) {
      jumpBufferTimer.current = JUMP_BUFFER
    } else {
      jumpBufferTimer.current = Math.max(0, jumpBufferTimer.current - delta)
    }
    let velY = linvel.y
    if (jumpBufferTimer.current > 0 && coyoteTimer.current > 0 && jumpCooldownTimer.current <= 0) {
      velY = floating ? JUMP_VELOCITY * FLOAT_JUMP_MULTIPLIER : JUMP_VELOCITY
      jumpBufferTimer.current = 0
      coyoteTimer.current = 0
      jumpCooldownTimer.current = JUMP_COOLDOWN
      jumpStretchTimer.current = 0.2
      if (isLocalPlayer) playJump(characterId)
    }

    // Mushroom bounce pad: a pending impulse from bounceRegistry always wins
    // over whatever the jump logic above just computed — landing on one
    // launches you regardless of jump input.
    const bounceVelocity = consumeBounce(racerId)
    if (bounceVelocity !== undefined) {
      velY = bounceVelocity
      jumpStretchTimer.current = 0.25
      coyoteTimer.current = 0
    }

    // --- Dash: short high-speed burst with a brief cooldown ---
    if (
      inputSource.dash &&
      dashCooldownTimer.current <= 0 &&
      dashTimer.current <= 0
    ) {
      dashTimer.current = DASH_DURATION
      dashCooldownTimer.current = DASH_COOLDOWN
      if (isLocalPlayer) {
        playDash(characterId)
        addShake(0.15)
      }
      // Always along current heading — there's no separate "moving
      // direction" from facing anymore, movement only ever happens along
      // the way the character is currently pointed.
      dashDirX.current = forwardX
      dashDirZ.current = forwardZ
    }
    dashTimer.current = Math.max(0, dashTimer.current - delta)
    const isDashing = dashTimer.current > 0

    // --- Horizontal velocity: chase a target speed, snappier on the ground ---
    // A dandelion puff's slow and a Yarn Ball's boost are mutually exclusive
    // in practice (nothing stops both timers being active at once, but
    // multiplying them together keeps that combination sane either way).
    const boostMul = (boosted ? BOOST_MULTIPLIER : 1) * (slowed ? PUFF_SLOW_FACTOR : 1)
    let targetVX: number
    let targetVZ: number
    if (isDashing) {
      targetVX = dashDirX.current * DASH_SPEED * speedMultiplier * boostMul
      targetVZ = dashDirZ.current * DASH_SPEED * speedMultiplier * boostMul
    } else {
      targetVX = forwardX * throttle * RUN_SPEED * speedMultiplier * boostMul
      targetVZ = forwardZ * throttle * RUN_SPEED * speedMultiplier * boostMul
    }
    const accel = isDashing ? GROUND_ACCEL * 2 : grounded ? GROUND_ACCEL : AIR_ACCEL
    // Shielded: snap straight to the target instead of easing toward it, so
    // any knockback a kinematic obstacle's collision resolution just
    // imparted gets overwritten the instant this frame runs, rather than
    // blended in and felt as a bump.
    const chase = shielded ? 1 : 1 - Math.exp(-accel * delta)
    const velX = linvel.x + (targetVX - linvel.x) * chase
    const velZ = linvel.z + (targetVZ - linvel.z) * chase

    body.setLinvel({ x: velX, y: velY, z: velZ }, true)

    // --- Facing: the visual mesh's own quaternion smoothly tracks the
    // heading (which is itself already turn-rate-limited and never jumps —
    // this is just a touch of extra roundedness on the mesh's rotation, not
    // where the "no snapping" behavior actually comes from). ---
    targetVisualQuat.setFromAxisAngle(AXIS_Y, telemetry.facingAngle)
    visual.quaternion.slerp(targetVisualQuat, Math.min(1, VISUAL_TURN_DAMP * delta))

    // --- Juice: squash on landing, stretch on jump liftoff ---
    squashTimer.current = Math.max(0, squashTimer.current - delta)
    jumpStretchTimer.current = Math.max(0, jumpStretchTimer.current - delta)
    let scaleY = 1
    let scaleXZ = 1
    if (squashTimer.current > 0) {
      const t = squashTimer.current / 0.14
      scaleY = 1 - 0.28 * t
      scaleXZ = 1 + 0.16 * t
    } else if (jumpStretchTimer.current > 0) {
      const t = jumpStretchTimer.current / 0.2
      scaleY = 1 + 0.22 * t
      scaleXZ = 1 - 0.1 * t
    }
    visual.scale.set(scaleXZ, scaleY, scaleXZ)

    // --- Power-up visuals: shield aura visibility + spin ---
    if (shieldRef.current) {
      shieldRef.current.visible = shielded
      shieldRef.current.rotation.y = now * 2.4
    }

    // --- Publish telemetry for the camera rig + HUD ---
    telemetry.position.set(translation.x, translation.y, translation.z)
    const speed = Math.hypot(velX, velZ)
    telemetry.speed = speed
    telemetry.grounded = grounded
    if (isLocalPlayer) {
      // Course runs along -Z from Z=0 to the finish's (also negative) Z, so
      // this ratio is already a clean 0-1 fraction with no separate
      // course-length constant to maintain.
      const progress = Math.min(1, Math.max(0, translation.z / course.finish.position[2]))
      setProgress(progress)
    }

    // Fell off the course (a gap jumped short, ran off a ramp's edge, etc.) —
    // respawn at the last checkpoint reached, never a hard game-over.
    const respawn = useRaceStore.getState().racers[racerId]?.respawnPosition
    if (respawn && translation.y < respawn[1] - course.fallMargin) {
      body.setTranslation({ x: respawn[0], y: respawn[1], z: respawn[2] }, true)
      body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
  })

  return (
    <RigidBody
      ref={bodyRef}
      position={spawnPosition}
      userData={{ racerId }}
      colliders={false}
      lockRotations
      friction={0.2}
      linearDamping={0.5}
    >
      <CapsuleCollider args={[HALF_HEIGHT, RADIUS]} />
      <group ref={visualRef}>
        <Character characterId={characterId} racerId={racerId} telemetry={telemetry} accentColor={accentColor} />
        {/* Confetti Pop shield aura — hidden by default, toggled visible in useFrame. */}
        <group ref={shieldRef} visible={false}>
          <mesh>
            <sphereGeometry args={[RADIUS + 0.4, 16, 16]} />
            <meshBasicMaterial color="#ff9fd0" transparent opacity={0.28} depthWrite={false} />
          </mesh>
        </group>
      </group>
    </RigidBody>
  )
}
