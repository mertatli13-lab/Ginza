import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Group } from 'three'
import type { InputState } from './input/inputState'
import type { PlayerTelemetry } from './telemetry'
import { useGameStore } from './store'
import { useRaceStore } from './race/raceStore'
import { registerRacerTelemetry, unregisterRacerTelemetry } from './race/racerRegistry'
import { registerRacerEffects, unregisterRacerEffects } from './race/effectsRegistry'
import type { RacerEffects } from './race/effects'
import { BOOST_MULTIPLIER } from './pickups/PowerUp'
import { FALL_MARGIN, FINISH } from './course/courseData'
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
const TURN_SPEED = 14 // facing-angle chase rate, radians/sec-ish via damp
const RECONCILE_DRIFT_SQ = 2.5 * 2.5 // network racers only: snap if drift exceeds this

interface RacerProps {
  racerId: string
  telemetry: PlayerTelemetry
  inputSource: InputState
  effects: RacerEffects
  spawnPosition: [number, number, number]
  characterId: CharacterId
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

    // --- Read input, world-space (camera auto-follows behind the player) ---
    const rawX = inputSource.moveX
    const rawY = inputSource.moveY
    const inputMag = Math.min(1, Math.hypot(rawX, rawY))
    // W / stick-up drives -Z (into the scene); D / stick-right drives +X.
    const moveX = inputMag > 0 ? rawX / (Math.hypot(rawX, rawY) || 1) : 0
    const moveZ = inputMag > 0 ? -rawY / (Math.hypot(rawX, rawY) || 1) : 0

    // --- Jump: buffered + coyote so a slightly-early or slightly-late press still lands ---
    if (inputSource.jump) {
      jumpBufferTimer.current = JUMP_BUFFER
    } else {
      jumpBufferTimer.current = Math.max(0, jumpBufferTimer.current - delta)
    }
    let velY = linvel.y
    if (jumpBufferTimer.current > 0 && coyoteTimer.current > 0 && jumpCooldownTimer.current <= 0) {
      velY = JUMP_VELOCITY
      jumpBufferTimer.current = 0
      coyoteTimer.current = 0
      jumpCooldownTimer.current = JUMP_COOLDOWN
      jumpStretchTimer.current = 0.2
      if (isLocalPlayer) playJump(characterId)
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
      // Dash in the direction we're currently moving, else current facing.
      if (inputMag > 0.01) {
        dashDirX.current = moveX
        dashDirZ.current = moveZ
      } else {
        dashDirX.current = Math.sin(telemetry.facingAngle)
        dashDirZ.current = Math.cos(telemetry.facingAngle)
      }
    }
    dashTimer.current = Math.max(0, dashTimer.current - delta)
    const isDashing = dashTimer.current > 0

    // --- Horizontal velocity: chase a target speed, snappier on the ground ---
    const boostMul = boosted ? BOOST_MULTIPLIER : 1
    let targetVX: number
    let targetVZ: number
    if (isDashing) {
      targetVX = dashDirX.current * DASH_SPEED * speedMultiplier * boostMul
      targetVZ = dashDirZ.current * DASH_SPEED * speedMultiplier * boostMul
    } else {
      targetVX = moveX * RUN_SPEED * speedMultiplier * boostMul
      targetVZ = moveZ * RUN_SPEED * speedMultiplier * boostMul
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

    // --- Facing: rotate the visual mesh toward movement direction, not physics body ---
    if (inputMag > 0.05 || isDashing) {
      const dirX = isDashing ? dashDirX.current : moveX
      const dirZ = isDashing ? dashDirZ.current : moveZ
      const targetAngle = Math.atan2(dirX, dirZ)
      let diff = targetAngle - telemetry.facingAngle
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)) // shortest-path wrap
      telemetry.facingAngle += diff * Math.min(1, TURN_SPEED * delta)
    }
    visual.rotation.y = telemetry.facingAngle

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
      // Course runs along -Z from Z=0 to FINISH's (also negative) Z, so this
      // ratio is already a clean 0-1 fraction with no separate course-length
      // constant to maintain.
      const progress = Math.min(1, Math.max(0, translation.z / FINISH.position[2]))
      setProgress(progress)
    }

    // Fell off the course (a gap jumped short, ran off a ramp's edge, etc.) —
    // respawn at the last checkpoint reached, never a hard game-over.
    const respawn = useRaceStore.getState().racers[racerId]?.respawnPosition
    if (respawn && translation.y < respawn[1] - FALL_MARGIN) {
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
