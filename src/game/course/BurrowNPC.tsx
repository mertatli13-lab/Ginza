import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Eye } from '../characters/Eye'
import { getToonGradientMap } from '../characters/toonGradient'

const BODY_COLORS = ['#e8b3c4', '#c9a876', '#a8c9a0']

/**
 * A purely decorative rabbit-toy figure for the Great Burrow Market — "non-
 * interactive, pure atmosphere/juice" per the brief. No collider at all, so
 * it never affects racing; just a gentle idle bob so the market square
 * doesn't feel frozen. `variant` picks a body color so a cluster of them
 * doesn't read as one figure copy-pasted.
 */
export function BurrowNPC({ position, variant = 0 }: { position: [number, number, number]; variant?: number }) {
  const rootRef = useRef<Group>(null)
  const gradientMap = getToonGradientMap()
  const color = BODY_COLORS[variant % BODY_COLORS.length]
  const phase = variant * 1.7

  useFrame((state) => {
    if (!rootRef.current) return
    const t = state.clock.elapsedTime
    rootRef.current.position.y = position[1] + Math.sin(t * 1.4 + phase) * 0.04
    rootRef.current.rotation.y = Math.sin(t * 0.6 + phase) * 0.3
  })

  return (
    <group ref={rootRef} position={position}>
      <mesh castShadow position={[0, 0.32, 0]}>
        <sphereGeometry args={[0.3, 16, 12]} />
        <meshToonMaterial color={color} gradientMap={gradientMap} />
      </mesh>
      <mesh castShadow position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.2, 14, 12]} />
        <meshToonMaterial color={color} gradientMap={gradientMap} />
      </mesh>
      <Eye position={[-0.08, 0.72, 0.17]} size={0.6} />
      <Eye position={[0.08, 0.72, 0.17]} size={0.6} />
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} castShadow position={[x, 0.98, -0.02]} rotation={[0, 0, x * 2]}>
          <capsuleGeometry args={[0.045, 0.24, 4, 8]} />
          <meshToonMaterial color={color} gradientMap={gradientMap} />
        </mesh>
      ))}
    </group>
  )
}
