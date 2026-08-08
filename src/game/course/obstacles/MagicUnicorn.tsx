import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type RapierRigidBody } from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import { oscillationOffset, type DiceSpec } from '../courseTypes'
import { Eye } from '../../characters/Eye'
import { getToonGradientMap } from '../../characters/toonGradient'

const AXIS_Y = new Vector3(0, 1, 0)
const tmpQuat = new Quaternion()
const MANE_COLORS = ['#ff8fa8', '#8fd9ff', '#ffe28f']

/**
 * A little unicorn that charges back and forth across the crystal cavern on
 * the same fixed sine-wave rhythm Course 1's rolling dice use (same
 * `DiceSpec`/`oscillationOffset` data, same cuboid collider) — a
 * predictable, learnable hazard to weave around, just re-skinned as an
 * actual magical creature instead of a toy-box cube. Kinematic, so Rapier
 * naturally shoves the player capsule out of the way on contact, exactly
 * like the dice.
 */
export function MagicUnicorn({ spec }: { spec: DiceSpec }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const half = spec.size / 2
  const gradientMap = getToonGradientMap()

  useFrame((state) => {
    const body = bodyRef.current
    if (!body) return
    const t = state.clock.elapsedTime
    const offset = oscillationOffset(spec, t)
    body.setNextKinematicTranslation({
      x: spec.center[0] + offset,
      y: spec.center[1],
      z: spec.center[2],
    })
    // Face whichever way it's currently charging, derived from the same
    // sine wave's own derivative (cosine) — no separate velocity tracking.
    const facingRight = Math.cos((2 * Math.PI * t) / spec.period + spec.phase) >= 0
    tmpQuat.setFromAxisAngle(AXIS_Y, facingRight ? Math.PI / 2 : -Math.PI / 2)
    body.setNextKinematicRotation(tmpQuat)
  })

  const bodyLen = spec.size * 0.95
  const bodyRad = spec.size * 0.4

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" position={spec.center} colliders={false}>
      <CuboidCollider args={[half, half, half]} />
      {/* Body, laid along local Z so it reads as a running creature once
          rotated to face its charge direction. */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[bodyRad, bodyLen, 4, 10]} />
        <meshToonMaterial color={spec.color} gradientMap={gradientMap} />
      </mesh>
      {/* Stubby legs */}
      {[-1, 1].map((side) =>
        [-1, 1].map((end) => (
          <mesh key={`${side}-${end}`} castShadow position={[side * bodyRad * 0.6, -bodyRad * 0.9, end * bodyLen * 0.32]}>
            <capsuleGeometry args={[bodyRad * 0.22, bodyRad * 0.7, 4, 6]} />
            <meshToonMaterial color={spec.color} gradientMap={gradientMap} />
          </mesh>
        )),
      )}
      {/* Head + horn + face, at the +Z end (the "front" once rotated to face travel) */}
      <group position={[0, bodyRad * 0.55, bodyLen * 0.52]}>
        <mesh castShadow>
          <sphereGeometry args={[bodyRad * 0.68, 14, 12]} />
          <meshToonMaterial color={spec.color} gradientMap={gradientMap} />
        </mesh>
        <mesh castShadow position={[0, bodyRad * 0.5, 0]} rotation={[-0.2, 0, 0]}>
          <coneGeometry args={[bodyRad * 0.14, bodyRad * 0.55, 10]} />
          <meshStandardMaterial color="#f2d34a" emissive="#a8790a" emissiveIntensity={0.25} />
        </mesh>
        <Eye position={[-bodyRad * 0.32, bodyRad * 0.08, bodyRad * 0.55]} size={0.75} />
        <Eye position={[bodyRad * 0.32, bodyRad * 0.08, bodyRad * 0.55]} size={0.75} />
        {/* Mane, a little rainbow fan along the back of the neck */}
        {MANE_COLORS.map((color, i) => (
          <mesh key={color} castShadow position={[0, bodyRad * 0.55, -bodyRad * (0.1 + i * 0.35)]}>
            <capsuleGeometry args={[bodyRad * 0.1, bodyRad * 0.4, 4, 6]} />
            <meshStandardMaterial color={color} />
          </mesh>
        ))}
      </group>
      {/* Tail */}
      <mesh castShadow position={[0, -bodyRad * 0.1, -bodyLen * 0.55]} rotation={[0.6, 0, 0]}>
        <coneGeometry args={[bodyRad * 0.22, bodyRad * 0.9, 8]} />
        <meshStandardMaterial color={MANE_COLORS[1]} />
      </mesh>
    </RigidBody>
  )
}
