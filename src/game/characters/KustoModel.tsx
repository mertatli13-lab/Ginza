import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Eye } from './Eye'
import { getToonGradientMap } from './toonGradient'
import { createCharacterAnimState, tickCelebration } from './animState'
import type { PlayerTelemetry } from '../telemetry'

const BODY_COLOR = '#f7f6f0'
const WING_COLOR = '#9aa5ad'
const WINGTIP_COLOR = '#33383d'
const BEAK_COLOR = '#f2a93c'
const BEAK_DOT_COLOR = '#d1453a'
const LEG_COLOR = '#e8834a'
const HAT_COLOR = '#d1453a'
const HAT_BAND_COLOR = '#8a2622'
const HAT_PATCH_COLOR = '#f2ece0'

interface KustoModelProps {
  racerId: string
  telemetry: PlayerTelemetry
  accentColor: string
}

/** Kusto — a white plush seagull in a little red hat. Bipedal with thin
 * webbed-foot legs (unlike the mammals' four), a head-bob while running,
 * wings that flap wide mid-jump (a literal version of "ears flap like
 * wings"), and a triumphant double wing-flap + head-tilt-back squawk for
 * her checkpoint flourish. The hat sits on top of the head specifically so
 * it reads from every angle — a lesson from Chiti's overalls, which were
 * only clearly visible from the front. */
export function KustoModel({ racerId, telemetry, accentColor }: KustoModelProps) {
  const rootRef = useRef<Group>(null)
  const headRef = useRef<Group>(null)
  const wingLRef = useRef<Group>(null)
  const wingRRef = useRef<Group>(null)
  const tailRef = useRef<Group>(null)
  const animState = useRef(createCharacterAnimState())
  const gradientMap = getToonGradientMap()

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    const t = state.clock.elapsedTime
    const speed = telemetry.speed
    const grounded = telemetry.grounded
    const celebrate = tickCelebration(animState.current, racerId, delta)
    const speedT = Math.min(speed / 14, 1)

    const root = rootRef.current
    if (root) {
      const runBob = grounded ? Math.sin(t * (10 + speed * 0.6)) * Math.min(speed / 12, 1) * 0.04 : 0
      const idleBob = speed < 0.5 ? Math.sin(t * 2.4) * 0.03 : 0
      // A quick single pop on celebration — distinct from Ginza's rear-up,
      // Strawberry's ear-perk, and Chiti's double-stomp.
      const hop = Math.sin(celebrate * Math.PI) * 0.26
      root.position.y = runBob + idleBob + hop
    }

    // Head-bob — gulls bob their heads with each stride; a gentle idle nod
    // when standing still, and tilts back on the celebration squawk.
    if (headRef.current) {
      const bobRate = grounded ? 10 + speed * 0.7 : 0
      const bobAmount = grounded ? 0.12 + speedT * 0.18 : 0
      const idleNod = speed < 0.5 ? Math.sin(t * 1.6) * 0.05 : 0
      headRef.current.rotation.x = Math.sin(t * bobRate) * bobAmount + idleNod - celebrate * 0.9
    }

    // Wings: folded at rest, flap wide mid-air, and a fast double-beat on
    // the checkpoint celebration (same decaying-envelope trick as Chiti's stomp).
    const airFlap = grounded ? 0 : Math.sin(t * 18) * 0.5 + 0.55
    const celebrateFlap = Math.abs(Math.sin(celebrate * Math.PI * 2)) * celebrate
    const flap = Math.max(airFlap, celebrateFlap * 0.9)
    if (wingLRef.current) wingLRef.current.rotation.z = 0.15 + flap
    if (wingRRef.current) wingRRef.current.rotation.z = -0.15 - flap

    if (tailRef.current) {
      tailRef.current.rotation.x = -0.3 + Math.sin(t * 4) * 0.05
    }
  })

  return (
    <group ref={rootRef}>
      {/* Body */}
      <mesh castShadow position={[0, -0.28, 0]} scale={[0.95, 0.85, 1.05]}>
        <sphereGeometry args={[0.4, 20, 16]} />
        <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Grey mantle — the classic gull back/wing-covert patch */}
      <mesh castShadow position={[0, -0.1, -0.12]} scale={[0.82, 0.55, 0.75]}>
        <sphereGeometry args={[0.4, 16, 12]} />
        <meshToonMaterial color={WING_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Folded wings, pivoted at the shoulder so they can flap open */}
      <group ref={wingLRef} position={[-0.32, -0.05, -0.05]}>
        <mesh castShadow position={[-0.14, -0.1, 0]} rotation={[0, 0, 0.5]}>
          <capsuleGeometry args={[0.09, 0.32, 4, 8]} />
          <meshToonMaterial color={WING_COLOR} gradientMap={gradientMap} />
        </mesh>
        <mesh castShadow position={[-0.28, -0.28, 0]} rotation={[0, 0, 0.5]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshToonMaterial color={WINGTIP_COLOR} gradientMap={gradientMap} />
        </mesh>
      </group>
      <group ref={wingRRef} position={[0.32, -0.05, -0.05]}>
        <mesh castShadow position={[0.14, -0.1, 0]} rotation={[0, 0, -0.5]}>
          <capsuleGeometry args={[0.09, 0.32, 4, 8]} />
          <meshToonMaterial color={WING_COLOR} gradientMap={gradientMap} />
        </mesh>
        <mesh castShadow position={[0.28, -0.28, 0]} rotation={[0, 0, -0.5]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshToonMaterial color={WINGTIP_COLOR} gradientMap={gradientMap} />
        </mesh>
      </group>
      {/* Tail — a small fan at the back, visible from behind (the angle the
          chase camera shows most) so the silhouette reads as a bird there too. */}
      <group ref={tailRef} position={[0, -0.28, -0.4]} rotation={[-0.3, 0, 0]}>
        {[-0.09, 0, 0.09].map((x, i) => (
          <mesh key={i} castShadow position={[x, 0, -0.08]} rotation={[0, 0, x * 1.2]}>
            <coneGeometry args={[0.06, 0.24, 8]} />
            <meshToonMaterial color={i === 1 ? WING_COLOR : WINGTIP_COLOR} gradientMap={gradientMap} />
          </mesh>
        ))}
      </group>
      {/* Legs — thin and bipedal (not four, unlike the mammals), with a
          flattened webbed foot instead of a round paw. */}
      {[-0.13, 0.13].map((x, i) => (
        <group key={i} position={[x, -0.62, 0.06]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.045, 0.22, 4, 8]} />
            <meshToonMaterial color={LEG_COLOR} gradientMap={gradientMap} />
          </mesh>
          <mesh castShadow position={[0, -0.16, 0.05]} scale={[1, 0.3, 1.6]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            <meshToonMaterial color={LEG_COLOR} gradientMap={gradientMap} />
          </mesh>
        </group>
      ))}
      {/* Head + neck */}
      <group ref={headRef} position={[0, 0.28, 0.1]}>
        <mesh castShadow position={[0, -0.16, -0.02]}>
          <capsuleGeometry args={[0.14, 0.1, 4, 10]} />
          <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
        </mesh>
        <mesh castShadow position={[0, 0.1, 0.04]}>
          <sphereGeometry args={[0.24, 18, 14]} />
          <meshToonMaterial color={BODY_COLOR} gradientMap={gradientMap} />
        </mesh>
        <Eye position={[-0.1, 0.12, 0.19]} size={0.85} />
        <Eye position={[0.1, 0.12, 0.19]} size={0.85} />
        {/* Beak, with the small red spot real gulls have near the tip */}
        <mesh castShadow position={[0, 0.06, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.06, 0.18, 10]} />
          <meshToonMaterial color={BEAK_COLOR} gradientMap={gradientMap} />
        </mesh>
        <mesh position={[0, 0.03, 0.36]}>
          <sphereGeometry args={[0.018, 6, 6]} />
          <meshBasicMaterial color={BEAK_DOT_COLOR} />
        </mesh>
        {/* Red flat cap, perched on top — a rounded dome with a brim and a
            small front patch, matching the real plush's cap (not a pointed
            party hat). */}
        <group position={[0, 0.3, -0.02]}>
          <mesh castShadow position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.15, 0.16, 0.03, 20]} />
            <meshToonMaterial color={HAT_BAND_COLOR} gradientMap={gradientMap} />
          </mesh>
          <mesh castShadow position={[0, 0.06, 0]} scale={[1, 0.7, 1]}>
            <sphereGeometry args={[0.14, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshToonMaterial color={HAT_COLOR} gradientMap={gradientMap} />
          </mesh>
          {/* Front patch */}
          <mesh position={[0, 0.005, 0.145]} rotation={[0.2, 0, 0]}>
            <boxGeometry args={[0.09, 0.05, 0.01]} />
            <meshBasicMaterial color={HAT_PATCH_COLOR} />
          </mesh>
          {/* Accent pompom, so same-character racers still read apart at a glance */}
          <mesh position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={accentColor} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
