import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, type Mesh } from 'three'

/** A glossy, faintly translucent skin sitting directly on top of a
 * floor/ramp platform, lightened from that platform's own `color` so it
 * reads as a distinct candy-coat gloss rather than blending into the base
 * mesh underneath it — the base (plain meshStandardMaterial, unchanged)
 * still reads as the jelly's "body". A slow, gentle non-uniform scale
 * wobble sells the "jelly" read at a glance; safe to animate freely since
 * this mesh has no collider — the platform underneath still owns physics,
 * completely unaffected by this layer's motion. */
export function JellySheen({ size, color }: { size: [number, number, number]; color: string }) {
  const meshRef = useRef<Mesh>(null)
  const tint = useMemo(() => {
    const c = new Color(color)
    // Push lightness up and saturation up a touch — a jelly's glossy top
    // face catches more light than its own base color, which is what
    // actually separates the two layers visually.
    const hsl = { h: 0, s: 0, l: 0 }
    c.getHSL(hsl)
    c.setHSL(hsl.h, Math.min(1, hsl.s * 1.3 + 0.1), Math.min(0.94, hsl.l * 1.4 + 0.14))
    return c
  }, [color])
  // Deterministic per-platform phase (from its own size) so many jelly
  // floors in view don't all wobble in unison.
  const phase = useMemo(() => (size[0] * 7 + size[2] * 13) % (Math.PI * 2), [size])
  const inset = 0.94
  const baseX = size[0] * inset
  const baseZ = size[2] * inset

  useFrame((state) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = state.clock.elapsedTime * 1.6 + phase
    // Gentle, small, and out of phase on x vs z so it reads as a soft jiggle
    // rather than a uniform breathing pulse.
    mesh.scale.set(1 + Math.sin(t) * 0.045, 1, 1 + Math.sin(t * 1.3 + 1.1) * 0.045)
  })

  return (
    <mesh ref={meshRef} position={[0, size[1] / 2 + 0.022, 0]} receiveShadow>
      <boxGeometry args={[baseX, 0.05, baseZ]} />
      <meshPhysicalMaterial
        color={tint}
        emissive={tint}
        emissiveIntensity={0.14}
        roughness={0.05}
        metalness={0}
        clearcoat={1}
        clearcoatRoughness={0.03}
        transmission={0.2}
        thickness={0.4}
        ior={1.35}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}
