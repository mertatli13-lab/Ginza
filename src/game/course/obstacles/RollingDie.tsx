import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import { oscillationOffset, type DiceSpec } from '../courseData'

const AXIS_Z = new Vector3(0, 0, 1)
const tmpQuat = new Quaternion()

// Face-center pip offsets (as a fraction of half-size) — just enough marking
// for the "rolling" motion to actually read, not a real die's pip pattern.
const PIP_OFFSETS: Array<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
]

/**
 * A giant die rolling back and forth across the board-game stretch on a
 * fixed sine wave — a predictable, learnable rhythm to weave around rather
 * than a surprise. Kinematic, so Rapier naturally shoves the (dynamic)
 * player capsule out of the way on contact; no bespoke hit-detection needed.
 */
export function RollingDie({ spec }: { spec: DiceSpec }) {
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

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" position={spec.center} colliders={false}>
      <CuboidCollider args={[half, half, half]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[spec.size, spec.size, spec.size]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>
      {PIP_OFFSETS.map((offset, i) => (
        <mesh
          key={i}
          position={[offset[0] * half * 1.02, offset[1] * half * 1.02, offset[2] * half * 1.02]}
        >
          <sphereGeometry args={[half * 0.16, 8, 8]} />
          <meshBasicMaterial color="#241033" />
        </mesh>
      ))}
    </RigidBody>
  )
}
