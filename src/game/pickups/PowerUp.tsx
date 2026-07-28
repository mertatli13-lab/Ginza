import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { DoubleSide, type Group } from 'three'
import { getRegisteredEffects } from '../race/effectsRegistry'
import type { PowerUpSpec } from '../course/courseData'
import { LOCAL_PLAYER_ID } from '../race/constants'
import { spawnBurst } from '../juice/particles'
import { playPowerUp } from '../audio/sfx'

const RADIUS = 0.45
export const BOOST_DURATION = 3
export const BOOST_MULTIPLIER = 1.5
export const SHIELD_DURATION = 5
export const MAGNET_DURATION = 5

const CONFETTI_COLORS = ['#ff6f91', '#7fe0ff', '#ffd54a', '#8ce08c']
const DURATION_BY_TYPE = { boost: BOOST_DURATION, shield: SHIELD_DURATION, magnet: MAGNET_DURATION }
const EFFECT_FIELD_BY_TYPE = {
  boost: 'speedBoostUntil',
  shield: 'shieldUntil',
  magnet: 'magnetUntil',
} as const
const BURST_COLOR_BY_TYPE = { boost: '#e0682e', shield: '#e85a9e', magnet: '#e8c33a' } as const

/** One of the three Section-7 pickups: Yarn Ball (speed boost), Confetti Pop
 * (shield), Bell Chime (magnet). Distinct chunky silhouette per type so
 * they read at speed; collecting sets a timestamp on the racer's own
 * RacerEffects, which Racer/Button read every frame. */
export function PowerUp({ spec }: { spec: PowerUpSpec }) {
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
    if (!racerId) return
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

  return (
    <RigidBody type="fixed" position={spec.position} colliders={false} sensor>
      <CuboidCollider args={[RADIUS, RADIUS, RADIUS]} sensor onIntersectionEnter={handleEnter} />
      <group ref={visualRef}>
        {spec.type === 'boost' && <YarnBall />}
        {spec.type === 'shield' && <ConfettiPop />}
        {spec.type === 'magnet' && <BellChime />}
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
