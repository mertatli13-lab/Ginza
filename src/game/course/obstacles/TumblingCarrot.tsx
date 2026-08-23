import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import { oscillationOffset, type DiceSpec } from '../courseTypes'

const AXIS_Z = new Vector3(0, 0, 1)
const tmpQuat = new Quaternion()
const LEAF_COLOR = '#5aa85a'

/**
 * A giant carrot tumbling back and forth across the terrace fields on the
 * same fixed sine-wave rhythm Course 1's rolling dice use (same
 * `DiceSpec`/collider/spin math as `RollingDie`) — predictable and
 * learnable, and per the brief a deliberately *soft* bump: Rapier's normal
 * collision response just nudges the player sideways, there's no separate
 * "hit" penalty, matching Tavşanya's forgiving, never-punishing pacing.
 */
export function TumblingCarrot({ spec }: { spec: DiceSpec }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const half = spec.size / 2

  useFrame((state) => {
    const body = bodyRef.current
    if (!body) return
    const offset = oscillationOffset(spec, state.clock.elapsedTime)
    body.setNextKinematicTranslation({
      x: spec.center[0] + offset,
      y: spec.center[1],
      z: spec.center[2],
    })
    tmpQuat.setFromAxisAngle(AXIS_Z, offset / half)
    body.setNextKinematicRotation(tmpQuat)
  })

  const bodyLen = spec.size * 1.3
  const bodyRad = spec.size * 0.42

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" position={spec.center} colliders={false}>
      <CuboidCollider args={[half, half, half]} />
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[bodyRad, bodyLen, 12]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>
      {/* Leafy top, clustered at one end so the tumble reads as a whole carrot */}
      {[-0.3, 0, 0.3].map((z, i) => (
        <mesh key={i} castShadow position={[bodyLen / 2, 0, z * bodyRad]} rotation={[0, 0, Math.PI / 2 + z * 0.6]}>
          <coneGeometry args={[bodyRad * 0.22, bodyRad * 1.3, 8]} />
          <meshStandardMaterial color={LEAF_COLOR} />
        </mesh>
      ))}
    </RigidBody>
  )
}
