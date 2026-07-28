import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Eye } from './Eye'
import { getToonGradientMap } from './toonGradient'
import { createCharacterAnimState, tickCelebration } from './animState'
import type { PlayerTelemetry } from '../telemetry'

const BODY_COLOR = '#a680e0'
const MANE_COLOR = '#7a4fc4'
const SNOUT_COLOR = '#d8c3f0'

// Tousled mane/tail: several small capsules at different phase offsets so
// they wiggle independently rather than swinging as one rigid fan.
const MANE_OFFSETS: Array<[number, number, number]> = [
  [-0.1, 0.62, 0.05],
  [0, 0.68, -0.05],
  [0.1, 0.62, -0.12],
]
const TAIL_OFFSETS: Array<[number, number, number]> = [
  [-0.06, -0.15, -0.52],
  [0.04, -0.1, -0.56],
  [-0.02, -0.22, -0.48],
]

interface GinzaModelProps {
  racerId: string
  telemetry: PlayerTelemetry
  accentColor: string
}

/** Ginza — purple plush pony. Big eyes, tousled mane and tail, permanent
 * grin, a joyful rear-up hop each time she reaches a checkpoint. */
export function GinzaModel({ racerId, telemetry, accentColor }: GinzaModelProps) {
  const rootRef = useRef<Group>(null)
  const maneRefs = useRef<Array<Group | null>>([])
  const tailRefs = useRef<Array<Group | null>>([])
  const animState = useRef(createCharacterAnimState())
  const gradientMap = getToonGradientMap()

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    const t = state.clock.elapsedTime
    const speed = telemetry.speed
    const celebrate = tickCelebration(animState.current, racerId, delta)

    const root = rootRef.current
    if (root) {
      const runBob = telemetry.grounded ? Math.sin(t * (8 + speed * 0.6)) * Math.min(speed / 12, 1) * 0.035 : 0
      const idleBob = speed < 0.5 ? Math.sin(t * 2.6) * 0.035 : 0
      // Rear-up hop: eases up then back down over the celebration window.
      const hop = Math.sin(celebrate * Math.PI) * 0.32
      root.position.y = runBob + idleBob + hop
      root.rotation.x = -Math.sin(celebrate * Math.PI) * 0.5
    }

    const speedT = Math.min(speed / 14, 1)
    const airStreak = telemetry.grounded ? 0 : 0.3
    for (let i = 0; i < maneRefs.current.length; i++) {
      const piece = maneRefs.current[i]
      if (!piece) continue
      const wiggle = Math.sin(t * (5 + i) + i * 2) * (0.15 + speedT * 0.35)
      piece.rotation.z = wiggle
      piece.rotation.x = -airStreak - speedT * 0.15
    }
    for (let i = 0; i < tailRefs.current.length; i++) {
      const piece = tailRefs.current[i]
      if (!piece) continue
      const wiggle = Math.sin(t * (4 + i) + i * 1.5 + 1) * (0.2 + speedT * 0.4)
      piece.rotation.x = wiggle * 0.6 - airStreak - speedT * 0.2
      piece.rotation.z = wiggle * 0.4
    }
  })

  return (
    <group ref={rootRef}>
      {/* Body */}
      <mesh castShadow position={[0, -0.32, 0]} scale={[1, 0.82, 1.1]}>
        <sphereGeometry args={[0.5, 20, 16]} />
        <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Stub legs */}
      {[
        [-0.28, -0.85, 0.28],
        [0.28, -0.85, 0.28],
        [-0.28, -0.85, -0.28],
        [0.28, -0.85, -0.28],
      ].map((p, i) => (
        <mesh key={i} castShadow position={p as [number, number, number]}>
          <capsuleGeometry args={[0.13, 0.18, 4, 8]} />
          <meshToonMaterial color={MANE_COLOR} gradientMap={gradientMap} />
        </mesh>
      ))}
      {/* Head */}
      <group position={[0, 0.45, 0.12]}>
        <mesh castShadow>
          <sphereGeometry args={[0.36, 20, 16]} />
          <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
        </mesh>
        {/* Snout */}
        <mesh castShadow position={[0, -0.06, 0.3]}>
          <sphereGeometry args={[0.17, 16, 14]} />
          <meshToonMaterial color={SNOUT_COLOR} gradientMap={gradientMap} />
        </mesh>
        {/* Permanent joyful grin */}
        <mesh position={[0, -0.12, 0.44]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.08, 0.016, 8, 12, Math.PI]} />
          <meshBasicMaterial color="#3a2050" />
        </mesh>
        <Eye position={[-0.14, 0.04, 0.28]} />
        <Eye position={[0.14, 0.04, 0.28]} />
        {/* Ears */}
        <mesh castShadow position={[-0.17, 0.32, -0.02]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.1, 0.22, 10]} />
          <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
        </mesh>
        <mesh castShadow position={[0.17, 0.32, -0.02]} rotation={[0, 0, 0.3]}>
          <coneGeometry args={[0.1, 0.22, 10]} />
          <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
        </mesh>
        {/* Accent bow, so same-character racers still read apart at a glance */}
        <mesh position={[0.22, 0.28, 0.08]}>
          <sphereGeometry args={[0.045, 8, 8]} />
          <meshStandardMaterial color={accentColor} />
        </mesh>
      </group>
      {/* Tousled mane */}
      {MANE_OFFSETS.map((p, i) => (
        <group key={i} position={p} ref={(el) => (maneRefs.current[i] = el)}>
          <mesh castShadow>
            <capsuleGeometry args={[0.06, 0.16, 4, 8]} />
            <meshToonMaterial color={MANE_COLOR} gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}
      {/* Tail */}
      {TAIL_OFFSETS.map((p, i) => (
        <group key={i} position={p} ref={(el) => (tailRefs.current[i] = el)}>
          <mesh castShadow>
            <capsuleGeometry args={[0.07, 0.2, 4, 8]} />
            <meshToonMaterial color={MANE_COLOR} gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
