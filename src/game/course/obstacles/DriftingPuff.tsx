import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
  type IntersectionEnterPayload,
} from '@react-three/rapier'
import type { Group } from 'three'
import { oscillationOffset, type DiceSpec } from '../courseTypes'
import { getRegisteredEffects } from '../../race/effectsRegistry'
import { spawnBurst } from '../../juice/particles'
import { isNetworkPeerId } from '../../../net/isNetworkPeer'

export const PUFF_SLOW_DURATION = 0.9 // brief and comedic, never punishing
export const PUFF_SLOW_FACTOR = 0.55 // target speed multiplier while slowed

/**
 * A drifting dandelion puff — a pure sensor (never physically blocks or
 * bumps, unlike the tumbling carrots), on the same oscillating-position
 * motion as the game's other sine-wave hazards. Touching it sets a brief
 * `slowUntil` on the racer's own effects (Racer reads it every frame),
 * matching the brief's "comedic, not punishing" tuning — under a second,
 * and it doesn't retrigger while still overlapping (onIntersectionEnter
 * only fires again after a full exit+re-entry).
 */
export function DriftingPuff({ spec }: { spec: DiceSpec }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const visualRef = useRef<Group>(null)
  const clockRef = useRef(0)

  const handleEnter = (payload: IntersectionEnterPayload) => {
    const racerId = payload.other.rigidBodyObject?.userData?.racerId as string | undefined
    if (!racerId || isNetworkPeerId(racerId)) return
    const effects = getRegisteredEffects().get(racerId)
    if (!effects) return
    effects.slowUntil = clockRef.current + PUFF_SLOW_DURATION
    spawnBurst({ position: spec.center, color: '#fdf6e3', count: 8, speed: 1.5 })
  }

  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime
    const offset = oscillationOffset(spec, state.clock.elapsedTime)
    if (bodyRef.current) {
      bodyRef.current.setNextKinematicTranslation({
        x: spec.center[0] + offset,
        y: spec.center[1],
        z: spec.center[2],
      })
    }
    if (visualRef.current) {
      visualRef.current.rotation.y = state.clock.elapsedTime * 0.8
      visualRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.15
    }
  })

  const r = spec.size / 2

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" position={spec.center} colliders={false} sensor>
      <CuboidCollider args={[r, r, r]} sensor onIntersectionEnter={handleEnter} />
      <group ref={visualRef}>
        <mesh>
          <sphereGeometry args={[r * 0.35, 8, 8]} />
          <meshStandardMaterial color="#e8c98a" />
        </mesh>
        {/* Fluffy seed-head strands, radiating outward */}
        {Array.from({ length: 14 }).map((_, i) => {
          const theta = (i / 14) * Math.PI * 2
          const phi = (i % 3) * 0.5 + 0.4
          const dir: [number, number, number] = [
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta),
          ]
          return (
            <mesh key={i} position={[dir[0] * r * 0.75, dir[1] * r * 0.75, dir[2] * r * 0.75]}>
              <sphereGeometry args={[r * 0.22, 6, 6]} />
              <meshBasicMaterial color="#fdf6e3" transparent opacity={0.85} />
            </mesh>
          )
        })}
      </group>
    </RigidBody>
  )
}
