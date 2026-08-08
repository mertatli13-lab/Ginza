import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { DoubleSide, type Group } from 'three'
import { getRegisteredEffects } from '../race/effectsRegistry'
import type { CourseId, PowerUpSpec } from '../course/courseTypes'
import { LOCAL_PLAYER_ID } from '../race/constants'
import { spawnBurst } from '../juice/particles'
import { playPowerUp } from '../audio/sfx'
import { isNetworkPeerId } from '../../net/isNetworkPeer'

const RADIUS = 0.45
export const BOOST_DURATION = 3
export const BOOST_MULTIPLIER = 1.5
export const SHIELD_DURATION = 5
export const MAGNET_DURATION = 5
export const FLOAT_DURATION = 4
// A Dandelion Wish jump floats up higher and falls slower, not faster —
// both knobs read by Racer.tsx while effects.floatUntil is active.
export const FLOAT_GRAVITY_SCALE = 0.45
export const FLOAT_JUMP_MULTIPLIER = 1.2

const CONFETTI_COLORS = ['#ff6f91', '#7fe0ff', '#ffd54a', '#8ce08c']
const DURATION_BY_TYPE = { boost: BOOST_DURATION, shield: SHIELD_DURATION, magnet: MAGNET_DURATION, float: FLOAT_DURATION }
const EFFECT_FIELD_BY_TYPE = {
  boost: 'speedBoostUntil',
  shield: 'shieldUntil',
  magnet: 'magnetUntil',
  float: 'floatUntil',
} as const
const BURST_COLOR_BY_TYPE = { boost: '#e0682e', shield: '#e85a9e', magnet: '#e8c33a', float: '#fdf6e3' } as const

/** The four pickups: Yarn Ball (speed boost), Confetti Pop (shield), Bell
 * Chime (magnet), and Dandelion Wish (a floaty glide-jump). Distinct chunky
 * silhouette per type so they read at speed; collecting sets a timestamp on
 * the racer's own RacerEffects, which Racer/Button read every frame.
 * `courseId` swaps in Tavşanya's themed reskins (Carrot Dash, Clover Charm,
 * Firefly Lantern) for boost/magnet/shield — same mechanics, different art;
 * Dandelion Wish has one shared look regardless of course. */
export function PowerUp({ spec, courseId }: { spec: PowerUpSpec; courseId?: CourseId }) {
  const [collected, setCollected] = useState(false)
  const collectedRef = useRef(false)
  const visualRef = useRef<Group>(null)
  // Collision callbacks fire outside useFrame, so the live clock isn't
  // directly available there — this tracks the latest reading each frame,
  // at most one frame stale by the time a pickup fires, which is nothing
  // against a multi-second power-up duration.
  const clockRef = useRef(0)

  const handleEnter = (payload: IntersectionEnterPayload) => {
    if (collectedRef.current) return
    const racerId = payload.other.rigidBodyObject?.userData?.racerId as string | undefined
    if (!racerId || isNetworkPeerId(racerId)) return
    const effects = getRegisteredEffects().get(racerId)
    if (!effects) return
    collectedRef.current = true
    setCollected(true)
    effects[EFFECT_FIELD_BY_TYPE[spec.type]] = clockRef.current + DURATION_BY_TYPE[spec.type]
    spawnBurst({ position: spec.position, color: BURST_COLOR_BY_TYPE[spec.type], count: 16, speed: 4 })
    if (racerId === LOCAL_PLAYER_ID) playPowerUp()
  }

  useFrame((state) => {
    clockRef.current = state.clock.elapsedTime
    if (visualRef.current) {
      visualRef.current.rotation.y = state.clock.elapsedTime * 1.2
      visualRef.current.position.y = Math.sin(state.clock.elapsedTime * 2.5) * 0.1
    }
  })

  if (collected) return null

  const themed = courseId === 'tavsanya'

  return (
    <RigidBody type="fixed" position={spec.position} colliders={false} sensor>
      <CuboidCollider args={[RADIUS, RADIUS, RADIUS]} sensor onIntersectionEnter={handleEnter} />
      <group ref={visualRef}>
        {spec.type === 'boost' && (themed ? <CarrotDash /> : <YarnBall />)}
        {spec.type === 'shield' && (themed ? <FireflyLantern /> : <ConfettiPop />)}
        {spec.type === 'magnet' && (themed ? <CloverCharm /> : <BellChime />)}
        {spec.type === 'float' && <DandelionWish />}
      </group>
    </RigidBody>
  )
}

function YarnBall() {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS, 16, 16]} />
        <meshStandardMaterial color="#e0682e" />
      </mesh>
      {[0, Math.PI / 3, (Math.PI * 2) / 3].map((rot, i) => (
        <mesh key={i} rotation={[Math.PI / 2.3, 0, rot]}>
          <torusGeometry args={[RADIUS * 0.95, 0.035, 8, 24]} />
          <meshStandardMaterial color="#f2a15c" />
        </mesh>
      ))}
    </group>
  )
}

function ConfettiPop() {
  return (
    <group>
      <mesh castShadow>
        <coneGeometry args={[RADIUS * 0.7, RADIUS * 1.6, 12]} />
        <meshStandardMaterial color="#e85a9e" />
      </mesh>
      {CONFETTI_COLORS.map((color, i) => {
        const angle = (i / CONFETTI_COLORS.length) * Math.PI * 2
        return (
          <mesh
            key={color}
            position={[Math.cos(angle) * RADIUS * 0.9, RADIUS * 0.9, Math.sin(angle) * RADIUS * 0.9]}
            rotation={[angle, angle * 1.3, 0]}
          >
            <boxGeometry args={[0.12, 0.12, 0.03]} />
            <meshBasicMaterial color={color} />
          </mesh>
        )
      })}
    </group>
  )
}

function BellChime() {
  return (
    <group>
      <mesh castShadow position={[0, 0.1, 0]}>
        <coneGeometry args={[RADIUS * 0.8, RADIUS, 16, 1, true]} />
        <meshStandardMaterial color="#e8c33a" side={DoubleSide} />
      </mesh>
      <mesh castShadow position={[0, -0.35, 0]}>
        <sphereGeometry args={[RADIUS * 0.28, 12, 12]} />
        <meshStandardMaterial color="#8a6e1a" />
      </mesh>
    </group>
  )
}

/** Carrot Dash — Tavşanya's reskin of the Yarn Ball speed boost. */
function CarrotDash() {
  return (
    <group rotation={[0, 0, Math.PI]}>
      <mesh castShadow>
        <coneGeometry args={[RADIUS * 0.55, RADIUS * 1.7, 12]} />
        <meshStandardMaterial color="#e8822e" />
      </mesh>
      {[-0.15, 0, 0.15].map((x, i) => (
        <mesh key={i} castShadow position={[x, -RADIUS * 0.95, 0]} rotation={[0, 0, x * 2]}>
          <coneGeometry args={[RADIUS * 0.12, RADIUS * 0.5, 8]} />
          <meshStandardMaterial color="#5aa85a" />
        </mesh>
      ))}
    </group>
  )
}

/** Clover Charm — Tavşanya's reskin of the Bell Chime magnet. */
function CloverCharm() {
  const leaf = (rot: number) => (
    <mesh key={rot} rotation={[Math.PI / 2, 0, rot]} position={[Math.cos(rot) * 0.12, 0, Math.sin(rot) * 0.12]}>
      <sphereGeometry args={[RADIUS * 0.42, 12, 10]} />
      <meshStandardMaterial color="#5fb85f" />
    </mesh>
  )
  return (
    <group scale={[1, 0.6, 1]}>
      {[0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map(leaf)}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[RADIUS * 0.16, 8, 8]} />
        <meshStandardMaterial color="#3a8a3a" />
      </mesh>
    </group>
  )
}

/** Firefly Lantern — Tavşanya's reskin of the Confetti Pop shield. */
function FireflyLantern() {
  return (
    <group>
      <mesh castShadow>
        <sphereGeometry args={[RADIUS * 0.85, 14, 12]} />
        <meshStandardMaterial color="#e8dcc0" transparent opacity={0.55} />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS * 0.35, 10, 10]} />
        <meshBasicMaterial color="#ffe98a" />
      </mesh>
      <mesh position={[0, RADIUS * 0.9, 0]}>
        <cylinderGeometry args={[RADIUS * 0.08, RADIUS * 0.08, RADIUS * 0.3, 8]} />
        <meshStandardMaterial color="#8a6e1a" />
      </mesh>
    </group>
  )
}

/** Dandelion Wish — floaty glide-jump. Shared visual regardless of course. */
function DandelionWish() {
  return (
    <group>
      <mesh>
        <sphereGeometry args={[RADIUS * 0.32, 10, 10]} />
        <meshStandardMaterial color="#e8dcc0" />
      </mesh>
      {Array.from({ length: 16 }).map((_, i) => {
        const theta = (i / 16) * Math.PI * 2
        const phi = 0.5 + (i % 4) * 0.25
        const dir: [number, number, number] = [
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        ]
        return (
          <mesh key={i} position={[dir[0] * RADIUS * 0.7, dir[1] * RADIUS * 0.7, dir[2] * RADIUS * 0.7]}>
            <sphereGeometry args={[RADIUS * 0.16, 6, 6]} />
            <meshBasicMaterial color="#fdf6e3" transparent opacity={0.9} />
          </mesh>
        )
      })}
    </group>
  )
}
