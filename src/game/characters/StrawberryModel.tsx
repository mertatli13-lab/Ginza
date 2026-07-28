import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Eye } from './Eye'
import { getToonGradientMap } from './toonGradient'
import { createCharacterAnimState, tickCelebration } from './animState'
import type { PlayerTelemetry } from '../telemetry'

const BODY_COLOR = '#e896c0'
const EAR_INNER_COLOR = '#f7c9de'
const DRESS_COLOR = '#f2789a'
const FLOWER_COLORS = ['#ffd54a', '#7fe0ff', '#ffffff']

const FLOWER_SPOTS: Array<[number, number, number]> = [
  [0.18, -0.55, 0.22],
  [-0.2, -0.62, 0.1],
  [0.05, -0.68, -0.22],
  [-0.15, -0.52, -0.2],
]

interface StrawberryModelProps {
  racerId: string
  telemetry: PlayerTelemetry
  accentColor: string
}

/** Strawberry — pink plush bunny. Long floppy ears that trail behind her in
 * motion and flap like wings mid-jump, a floral-print dress, wide sparkly
 * eyes, sweet but competitive. */
export function StrawberryModel({ racerId, telemetry, accentColor }: StrawberryModelProps) {
  const rootRef = useRef<Group>(null)
  const earPivotL = useRef<Group>(null)
  const earPivotR = useRef<Group>(null)
  const tailRef = useRef<Group>(null)
  const animState = useRef(createCharacterAnimState())
  const gradientMap = getToonGradientMap()

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    const t = state.clock.elapsedTime
    const speed = telemetry.speed
    const grounded = telemetry.grounded
    const celebrate = tickCelebration(animState.current, racerId, delta)

    const root = rootRef.current
    if (root) {
      const runBob = grounded ? Math.sin(t * (9 + speed * 0.6)) * Math.min(speed / 12, 1) * 0.04 : 0
      const idleBob = speed < 0.5 ? Math.sin(t * 2.8) * 0.03 : 0
      // Happy hop + ear-perk celebration, distinct from Ginza's rear-up.
      const hop = Math.sin(celebrate * Math.PI) * 0.22
      root.position.y = runBob + idleBob + hop
    }

    // Resting droop angle trails further back the faster she's moving —
    // "great for readable speed/turning animation", per the design doc.
    const speedT = Math.min(speed / 14, 1)
    const restDroop = 1.9 + speedT * 0.7
    // Mid-jump: ears flap like wings — an oscillating beat while airborne.
    const flap = grounded ? 0 : Math.sin(t * 16) * 0.55 + 0.3
    // Checkpoint celebration: ears pop upright instead of drooping.
    const perk = celebrate * 2.1

    const targetAngle = flap !== 0 ? restDroop - flap - 1.4 : restDroop - perk
    if (earPivotL.current) earPivotL.current.rotation.x = targetAngle
    if (earPivotR.current) earPivotR.current.rotation.x = targetAngle
    // A little side-to-side sway so both ears don't move as one rigid slab.
    if (earPivotL.current) earPivotL.current.rotation.z = 0.12 + Math.sin(t * 3) * 0.05
    if (earPivotR.current) earPivotR.current.rotation.z = -0.12 - Math.sin(t * 3 + 1) * 0.05

    if (tailRef.current) {
      tailRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.04)
    }
  })

  return (
    <group ref={rootRef}>
      {/* Dress (also the lower body — no separate legs, matching a bunny sitting in a skirt) */}
      <mesh castShadow position={[0, -0.55, 0]}>
        <coneGeometry args={[0.42, 0.62, 18]} />
        <meshToonMaterial color={DRESS_COLOR} gradientMap={gradientMap} />
      </mesh>
      {FLOWER_SPOTS.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshBasicMaterial color={FLOWER_COLORS[i % FLOWER_COLORS.length]} />
        </mesh>
      ))}
      {/* Torso */}
      <mesh castShadow position={[0, -0.1, 0]} scale={[1, 1.05, 1]}>
        <sphereGeometry args={[0.34, 20, 16]} />
        <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Cotton tail */}
      <group ref={tailRef} position={[0, -0.15, -0.36]}>
        <mesh castShadow>
          <sphereGeometry args={[0.11, 12, 12]} />
          <meshStandardMaterial color="#fdf3f7" />
        </mesh>
      </group>
      {/* Head */}
      <group position={[0, 0.42, 0.08]}>
        <mesh castShadow>
          <sphereGeometry args={[0.33, 20, 16]} />
          <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
        </mesh>
        {/* Small nose/muzzle */}
        <mesh castShadow position={[0, -0.08, 0.28]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshToonMaterial color={EAR_INNER_COLOR} gradientMap={gradientMap} />
        </mesh>
        <Eye position={[-0.14, 0.03, 0.24]} size={1.15} />
        <Eye position={[0.14, 0.03, 0.24]} size={1.15} />
        {/* Long floppy ears, pivoted from the top of the head */}
        <group ref={earPivotL} position={[-0.14, 0.24, -0.04]}>
          <mesh castShadow position={[0, 0.24, 0]}>
            <capsuleGeometry args={[0.09, 0.42, 4, 10]} />
            <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.24, 0.045]}>
            <capsuleGeometry args={[0.055, 0.34, 4, 10]} />
            <meshToonMaterial color={EAR_INNER_COLOR} gradientMap={gradientMap} />
          </mesh>
        </group>
        <group ref={earPivotR} position={[0.14, 0.24, -0.04]}>
          <mesh castShadow position={[0, 0.24, 0]}>
            <capsuleGeometry args={[0.09, 0.42, 4, 10]} />
            <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.24, 0.045]}>
            <capsuleGeometry args={[0.055, 0.34, 4, 10]} />
            <meshToonMaterial color={EAR_INNER_COLOR} gradientMap={gradientMap} />
          </mesh>
          {/* Accent bow, so same-character racers still read apart at a glance */}
          <mesh position={[0, -0.05, 0.1]}>
            <sphereGeometry args={[0.045, 8, 8]} />
            <meshStandardMaterial color={accentColor} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
