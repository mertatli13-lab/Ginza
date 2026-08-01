import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { DoubleSide } from 'three'

const RAINBOW_COLORS = ['#ff8a8a', '#ffbf6b', '#fff08a', '#9ee6a8', '#8ac9ff', '#c9a3ff']

// Distant decorative clouds, well outside the play area on both sides so
// they never overlap the track — pure atmosphere, no colliders.
const CLOUD_PUFFS: Array<{ position: [number, number, number]; scale: number }> = [
  { position: [-26, 18, -10], scale: 3.4 },
  { position: [24, 14, -35], scale: 2.6 },
  { position: [-20, 22, -70], scale: 4 },
  { position: [28, 16, -95], scale: 3 },
  { position: [-24, 20, -130], scale: 3.6 },
  { position: [20, 15, -160], scale: 2.8 },
]

/**
 * Purely decorative sky dressing for Magical Valley: a soft rainbow arc and
 * a scatter of drifting cloud puffs, all primitive geometry (concentric
 * partial toruses + basic spheres) matching the game's zero-external-asset
 * art direction — no textures, just flat toon-ish color. Rendered once,
 * fixed in world space behind/above the whole course.
 */
export function MagicalSky() {
  const cloudsRef = useRef<Group>(null)

  useFrame((state) => {
    if (!cloudsRef.current) return
    // A barely-there bob, just enough that the sky doesn't feel static.
    cloudsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.6
  })

  return (
    <group>
      <group position={[0, 8, -45]} rotation={[0, 0, 0]}>
        {RAINBOW_COLORS.map((color, i) => (
          <mesh key={color} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[34 - i * 1.1, 0.45, 8, 48, Math.PI]} />
            <meshBasicMaterial color={color} side={DoubleSide} transparent opacity={0.85} />
          </mesh>
        ))}
      </group>
      <group ref={cloudsRef}>
        {CLOUD_PUFFS.map((puff, i) => (
          <group key={i} position={puff.position} scale={puff.scale}>
            <mesh>
              <sphereGeometry args={[1, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
            </mesh>
            <mesh position={[0.9, -0.2, 0.2]}>
              <sphereGeometry args={[0.7, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
            <mesh position={[-0.8, -0.15, -0.3]}>
              <sphereGeometry args={[0.65, 12, 12]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  )
}
