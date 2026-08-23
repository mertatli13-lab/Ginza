import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CylinderCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import type { Group } from 'three'
import { requestBounce } from '../../race/bounceRegistry'
import type { BouncePadSpec } from '../courseTypes'
import { spawnBurst } from '../../juice/particles'

/**
 * A bouncy mushroom cap: landing on it launches the racer straight up,
 * Racer's own vertical velocity for the frame overridden via
 * `bounceRegistry` (the pad has no direct access to another entity's
 * Rapier body, so it drops a request there instead — the same
 * write-to-a-registry pattern power-ups already use for effects). A sensor,
 * not a solid collider, so it never blocks or bumps — it only ever helps.
 */
export function MushroomBouncePad({ spec }: { spec: BouncePadSpec }) {
  const [squash, setSquash] = useState(0)
  const capRef = useRef<Group>(null)

  const handleEnter = (payload: IntersectionEnterPayload) => {
    const racerId = payload.other.rigidBodyObject?.userData?.racerId as string | undefined
    if (!racerId) return
    requestBounce(racerId, spec.bounceVelocity)
    setSquash(1)
    spawnBurst({ position: spec.position, color: spec.color, count: 10, speed: 2.5 })
  }

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    if (squash > 0) setSquash((s) => Math.max(0, s - delta / 0.25))
    if (capRef.current) {
      const t = squash
      capRef.current.scale.set(1 + t * 0.25, 1 - t * 0.35, 1 + t * 0.25)
    }
  })

  return (
    <RigidBody type="fixed" position={spec.position} colliders={false} sensor>
      <CylinderCollider args={[0.35, spec.radius]} sensor onIntersectionEnter={handleEnter} />
      {/* Stem */}
      <mesh castShadow position={[0, -0.15, 0]}>
        <cylinderGeometry args={[spec.radius * 0.35, spec.radius * 0.45, 0.4, 12]} />
        <meshStandardMaterial color="#fdf3e0" />
      </mesh>
      {/* Cap, squashes on contact for a satisfying bounce */}
      <group ref={capRef} position={[0, 0.12, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[spec.radius, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={spec.color} />
        </mesh>
        {[0.4, -0.4, 0].map((x, i) => (
          <mesh key={i} position={[x * spec.radius, spec.radius * 0.35, (i - 1) * spec.radius * 0.3]}>
            <sphereGeometry args={[spec.radius * 0.14, 8, 8]} />
            <meshBasicMaterial color="#fff6ea" />
          </mesh>
        ))}
      </group>
    </RigidBody>
  )
}
