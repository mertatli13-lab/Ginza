import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Eye } from './Eye'
import { CheekPuffs } from './CheekPuffs'
import { getToonGradientMap } from './toonGradient'
import { createCharacterAnimState, tickCelebration } from './animState'
import type { PlayerTelemetry } from '../telemetry'

const FUR_COLOR = '#f7d34e'
const OVERALLS_COLOR = '#4caf50'
const WAISTBAND_COLOR = '#2e7d32'
const BUCKLE_COLOR = '#8a6a2a'
const EAR_INNER_COLOR = '#ffe8c2'

interface ChitiModelProps {
  racerId: string
  telemetry: PlayerTelemetry
  accentColor: string
}

/** Chiti — yellow plush rabbit in green dungaree overalls. Alert upright
 * ears that twitch independently (rather than Strawberry's floppy trailing
 * pair), overalls straps that bounce mid-jump, and a double foot-stomp
 * bounce for her checkpoint flourish — distinct from Ginza's rear-up and
 * Strawberry's ear-perk. */
export function ChitiModel({ racerId, telemetry, accentColor }: ChitiModelProps) {
  const rootRef = useRef<Group>(null)
  const earPivotL = useRef<Group>(null)
  const earPivotR = useRef<Group>(null)
  const tailRef = useRef<Group>(null)
  const strapLRef = useRef<Group>(null)
  const strapRRef = useRef<Group>(null)
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
      const runBob = grounded ? Math.sin(t * (9.5 + speed * 0.6)) * Math.min(speed / 12, 1) * 0.045 : 0
      const idleBob = speed < 0.5 ? Math.sin(t * 3) * 0.03 : 0
      // Double foot-stomp bounce: sin(2x) traces two humps over the
      // celebration window, scaled by the same decaying envelope so it's
      // punchy right after the trigger and fades out by the end.
      const stomp = Math.abs(Math.sin(celebrate * Math.PI * 2)) * celebrate * 0.3
      root.position.y = runBob + idleBob + stomp
    }

    // Alert ear twitch — small independent flicks, not a droop/perk.
    const speedT = Math.min(speed / 14, 1)
    if (earPivotL.current) {
      earPivotL.current.rotation.z = 0.08 + Math.sin(t * 6.5) * 0.06
      earPivotL.current.rotation.x = -0.05 + Math.sin(t * 4.2) * 0.04 - speedT * 0.15
    }
    if (earPivotR.current) {
      earPivotR.current.rotation.z = -0.08 - Math.sin(t * 6.5 + 1.3) * 0.06
      earPivotR.current.rotation.x = -0.05 + Math.sin(t * 4.2 + 0.7) * 0.04 - speedT * 0.15
    }

    // Overalls straps bounce while airborne — Chiti's jump flourish.
    const airBounce = grounded ? 0 : Math.sin(t * 14) * 0.08 + 0.05
    if (strapLRef.current) strapLRef.current.scale.y = 1 + airBounce
    if (strapRRef.current) strapRRef.current.scale.y = 1 + airBounce

    if (tailRef.current) {
      tailRef.current.scale.setScalar(1 + Math.sin(t * 5) * 0.04)
    }
  })

  return (
    <group ref={rootRef}>
      {/* Overalls "pants" — a wide rounded hip volume covering the upper legs */}
      <mesh castShadow position={[0, -0.58, 0]} scale={[1, 0.85, 1.05]}>
        <sphereGeometry args={[0.4, 18, 14]} />
        <meshToonMaterial color={OVERALLS_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Waistband — a ring around the top of the overalls, so they read as
          a garment from every angle, not only the front where the bib/straps
          visibly are. */}
      <mesh position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.37, 0.05, 8, 20]} />
        <meshToonMaterial color={WAISTBAND_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Back pocket — the one piece of overalls detail visible head-on from
          behind, which is the angle the chase camera shows for the local
          player almost all the time. */}
      <mesh position={[0, -0.5, -0.34]} scale={[0.85, 1, 0.3]}>
        <boxGeometry args={[0.22, 0.22, 0.2]} />
        <meshToonMaterial color={WAISTBAND_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Fur feet, peeking out below the overalls hem */}
      {[-0.17, 0.17].map((x, i) => (
        <mesh key={i} castShadow position={[x, -0.9, 0.2]} scale={[1, 0.7, 1.3]}>
          <sphereGeometry args={[0.13, 12, 8]} />
          <meshToonMaterial color={FUR_COLOR} gradientMap={gradientMap} />
        </mesh>
      ))}
      {/* Torso (fur, above the overalls bib) */}
      <mesh castShadow position={[0, -0.12, 0]} scale={[1, 1.05, 1]}>
        <sphereGeometry args={[0.33, 20, 16]} />
        <meshToonMaterial color={FUR_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Overalls bib */}
      <mesh castShadow position={[0, 0.02, 0.28]} scale={[0.85, 1, 0.4]}>
        <boxGeometry args={[0.4, 0.4, 0.2]} />
        <meshToonMaterial color={OVERALLS_COLOR} gradientMap={gradientMap} />
      </mesh>
      {/* Straps, up over the shoulders */}
      <group ref={strapLRef} position={[-0.16, 0.24, 0.2]} rotation={[0.15, 0, -0.08]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.045, 0.28, 4, 8]} />
          <meshToonMaterial color={OVERALLS_COLOR} gradientMap={gradientMap} />
        </mesh>
      </group>
      <group ref={strapRRef} position={[0.16, 0.24, 0.2]} rotation={[0.15, 0, 0.08]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.045, 0.28, 4, 8]} />
          <meshToonMaterial color={OVERALLS_COLOR} gradientMap={gradientMap} />
        </mesh>
      </group>
      {/* Buckle buttons where the straps meet the bib */}
      {[-0.16, 0.16].map((x, i) => (
        <mesh key={i} position={[x, 0.16, 0.34]}>
          <sphereGeometry args={[0.035, 8, 8]} />
          <meshStandardMaterial color={BUCKLE_COLOR} />
        </mesh>
      ))}
      {/* Cotton tail */}
      <group ref={tailRef} position={[0, -0.2, -0.34]}>
        <mesh castShadow>
          <sphereGeometry args={[0.12, 12, 12]} />
          <meshStandardMaterial color="#fffaf0" />
        </mesh>
      </group>
      {/* Head */}
      <group position={[0, 0.42, 0.08]}>
        <mesh castShadow>
          <sphereGeometry args={[0.33, 20, 16]} />
          <meshToonMaterial color={FUR_COLOR} gradientMap={gradientMap} />
        </mesh>
        <CheekPuffs color={EAR_INNER_COLOR} />
        {/* Muzzle */}
        <mesh castShadow position={[0, -0.08, 0.28]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshToonMaterial color={EAR_INNER_COLOR} gradientMap={gradientMap} />
        </mesh>
        <Eye position={[-0.14, 0.03, 0.24]} size={1.1} />
        <Eye position={[0.14, 0.03, 0.24]} size={1.1} />
        {/* Alert upright ears (not floppy like Strawberry's) */}
        <group ref={earPivotL} position={[-0.13, 0.28, -0.02]} rotation={[-0.05, 0, -0.12]}>
          <mesh castShadow position={[0, 0.2, 0]}>
            <capsuleGeometry args={[0.08, 0.34, 4, 10]} />
            <meshToonMaterial color={FUR_COLOR} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.2, 0.035]}>
            <capsuleGeometry args={[0.048, 0.27, 4, 10]} />
            <meshToonMaterial color={EAR_INNER_COLOR} gradientMap={gradientMap} />
          </mesh>
        </group>
        <group ref={earPivotR} position={[0.13, 0.28, -0.02]} rotation={[-0.05, 0, 0.12]}>
          <mesh castShadow position={[0, 0.2, 0]}>
            <capsuleGeometry args={[0.08, 0.34, 4, 10]} />
            <meshToonMaterial color={FUR_COLOR} gradientMap={gradientMap} />
          </mesh>
          <mesh position={[0, 0.2, 0.035]}>
            <capsuleGeometry args={[0.048, 0.27, 4, 10]} />
            <meshToonMaterial color={EAR_INNER_COLOR} gradientMap={gradientMap} />
          </mesh>
          {/* Accent bow, so same-character racers still read apart at a glance */}
          <mesh position={[0, -0.04, 0.08]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial color={accentColor} />
          </mesh>
        </group>
      </group>
    </group>
  )
}
