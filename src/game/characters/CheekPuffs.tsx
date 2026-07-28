import { getToonGradientMap } from './toonGradient'

interface CheekPuffsProps {
  color: string
  spread?: number
}

/** Small chubby cheek bumps flanking the muzzle — a cheap, reusable "sculpted
 * face" detail every character's head can drop in, instead of a single plain
 * head sphere with nothing to break up its silhouette. */
export function CheekPuffs({ color, spread = 1 }: CheekPuffsProps) {
  const gradientMap = getToonGradientMap()
  return (
    <>
      <mesh position={[-0.2 * spread, -0.06, 0.19]}>
        <sphereGeometry args={[0.09 * spread, 12, 10]} />
        <meshToonMaterial color={color} gradientMap={gradientMap} />
      </mesh>
      <mesh position={[0.2 * spread, -0.06, 0.19]}>
        <sphereGeometry args={[0.09 * spread, 12, 10]} />
        <meshToonMaterial color={color} gradientMap={gradientMap} />
      </mesh>
    </>
  )
}
