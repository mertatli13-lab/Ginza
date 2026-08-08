import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import { oscillationOffset, type PencilSpec } from '../courseTypes'
import { Eye } from '../../characters/Eye'
import { getToonGradientMap } from '../../characters/toonGradient'

const AXIS_Y = new Vector3(0, 1, 0)
const tmpQuat = new Quaternion()

/**
 * A grumpy little troll shuffling back and forth across a flower-petal
 * stepping stone, on the same fixed sine-wave rhythm Course 1's rolling
 * pencils use (same `PencilSpec`/`oscillationOffset` data, same cylinder
 * collider) — a predictable hazard to time a jump around, just re-skinned
 * as a creature instead of a rolling log. Unlike the pencil (which spins
 * around its own long axis to read as "rolling"), the troll instead turns
 * to face whichever way it's currently shuffling — a barrel-roll would
 * read wrong for a humanoid.
 */
export function TrollGuard({ spec }: { spec: PencilSpec }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const gradientMap = getToonGradientMap()
  const scale = spec.radius / 0.18 // original "reed" tuning was authored around radius 0.18

  useFrame((state) => {
    const body = bodyRef.current
    if (!body) return
    const t = state.clock.elapsedTime
    const offset = oscillationOffset(spec, t)
    body.setNextKinematicTranslation({
      x: spec.center[0],
      y: spec.center[1],
      z: spec.center[2] + offset,
    })
    const facingPositiveZ = Math.cos((2 * Math.PI * t) / spec.period + spec.phase) >= 0
    tmpQuat.setFromAxisAngle(AXIS_Y, facingPositiveZ ? 0 : Math.PI)
    body.setNextKinematicRotation(tmpQuat)
  })

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" position={spec.center} colliders={false}>
      <CylinderCollider args={[spec.length / 2, spec.radius]} rotation={[0, 0, Math.PI / 2]} />
      <group scale={scale}>
        {/* Belly */}
        <mesh castShadow position={[0, -0.1, 0]} scale={[1, 0.9, 0.95]}>
          <sphereGeometry args={[0.42, 16, 12]} />
          <meshToonMaterial color={spec.color} gradientMap={gradientMap} />
        </mesh>
        {/* Stubby arms, held out low and wide */}
        {[-1, 1].map((side) => (
          <mesh key={side} castShadow position={[side * 0.4, -0.05, 0.08]} rotation={[0, 0, side * 0.5]}>
            <capsuleGeometry args={[0.11, 0.28, 4, 8]} />
            <meshToonMaterial color={spec.color} gradientMap={gradientMap} />
          </mesh>
        ))}
        {/* Stubby legs */}
        {[-1, 1].map((side) => (
          <mesh key={side} castShadow position={[side * 0.18, -0.5, 0.1]}>
            <capsuleGeometry args={[0.13, 0.16, 4, 8]} />
            <meshToonMaterial color={spec.color} gradientMap={gradientMap} />
          </mesh>
        ))}
        {/* Head */}
        <group position={[0, 0.38, 0.1]}>
          <mesh castShadow>
            <sphereGeometry args={[0.28, 16, 12]} />
            <meshToonMaterial color={spec.color} gradientMap={gradientMap} />
          </mesh>
          {/* Little horns */}
          {[-1, 1].map((side) => (
            <mesh key={side} castShadow position={[side * 0.14, 0.24, -0.05]} rotation={[0.3, 0, side * -0.3]}>
              <coneGeometry args={[0.05, 0.16, 8]} />
              <meshStandardMaterial color="#e8dcc0" />
            </mesh>
          ))}
          <Eye position={[-0.11, 0.02, 0.22]} size={0.85} />
          <Eye position={[0.11, 0.02, 0.22]} size={0.85} />
          {/* Big grumpy underbite grin */}
          <mesh position={[0, -0.14, 0.25]} scale={[1.1, 0.7, 0.5]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshBasicMaterial color="#1c140e" />
          </mesh>
          <mesh position={[0, -0.2, 0.29]}>
            <boxGeometry args={[0.03, 0.05, 0.02]} />
            <meshBasicMaterial color="#f2ece0" />
          </mesh>
        </group>
      </group>
    </RigidBody>
  )
}
