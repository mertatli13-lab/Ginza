import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import { oscillationOffset, type BridgeSpec } from '../courseTypes'

const AXIS_Z = new Vector3(0, 0, 1)
const tmpQuat = new Quaternion()

/**
 * A vine rope-bridge that gently rocks side to side, continuously, on a
 * fixed clock regardless of contact — crossing it is a genuine (if gentle)
 * timing read rather than a static plank. Kinematic rotation about its own
 * center, same shared `oscillationOffset` sine as every other moving hazard
 * in the game — just applied as an angle instead of a translation.
 * Amplitude is kept small by the course data (a few degrees), matching
 * Tavşanya's "wide and forgiving" brief.
 */
export function SwayingBridge({ spec }: { spec: BridgeSpec }) {
  const bodyRef = useRef<RapierRigidBody>(null)

  useFrame((state) => {
    const body = bodyRef.current
    if (!body) return
    const angle = oscillationOffset(spec, state.clock.elapsedTime)
    tmpQuat.setFromAxisAngle(AXIS_Z, angle)
    body.setNextKinematicRotation(tmpQuat)
  })

  const half: [number, number, number] = [spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2]

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" position={spec.position} colliders={false}>
      <CuboidCollider args={half} friction={0.8} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={spec.size} />
        <meshStandardMaterial color={spec.color} />
      </mesh>
      {/* Rope rails along each edge, so it actually reads as a rope bridge
          rather than a plain plank. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * (spec.size[0] / 2 - 0.05), spec.size[1] / 2 + 0.15, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.04, 0.04, spec.size[2], 8]} />
          <meshStandardMaterial color="#8a6a3a" />
        </mesh>
      ))}
    </RigidBody>
  )
}
