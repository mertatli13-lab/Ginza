import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type RapierRigidBody } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import { oscillationOffset, type PencilSpec } from '../courseTypes'

const AXIS_X = new Vector3(1, 0, 0)
const tmpQuat = new Quaternion()

/**
 * A rolling-log hazard laid across a bookshelf platform: a cylinder lying on
 * its side (long axis along world X, spanning the platform), oscillating
 * back and forth along Z on a fixed sine wave and spinning about its own
 * long axis as it goes — true rolling motion, not just a sliding block.
 * Kinematic, same as the dice: Rapier's collision response does the bumping.
 *
 * The rigid body's own driven rotation is *only* the roll (about world X);
 * "lying on its side" is a static local rotation on the collider/mesh below,
 * not baked into the driven rotation — composing both there would apply the
 * lie-down twice (once from the body, once from the child transform).
 */
export function RollingPencil({ spec }: { spec: PencilSpec }) {
  const bodyRef = useRef<RapierRigidBody>(null)

  useFrame((state) => {
    const body = bodyRef.current
    if (!body) return
    const offset = oscillationOffset(spec, state.clock.elapsedTime)
    body.setNextKinematicTranslation({
      x: spec.center[0],
      y: spec.center[1],
      z: spec.center[2] + offset,
    })
    tmpQuat.setFromAxisAngle(AXIS_X, offset / spec.radius)
    body.setNextKinematicRotation(tmpQuat)
  })

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" position={spec.center} colliders={false}>
      <CylinderCollider args={[spec.length / 2, spec.radius]} rotation={[0, 0, Math.PI / 2]} />
      <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[spec.radius, spec.radius, spec.length, 16]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>
      {/* Graphite tip, purely cosmetic, so it actually reads as a pencil. */}
      <mesh position={[spec.length / 2 + spec.radius * 0.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[spec.radius, spec.radius * 1.4, 16]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
    </RigidBody>
  )
}
