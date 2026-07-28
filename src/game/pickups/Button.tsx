import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import type { Group } from 'three'
import { useRaceStore } from '../race/raceStore'
import { getRegisteredEffects } from '../race/effectsRegistry'
import { getRegisteredRacers } from '../race/racerRegistry'
import type { ButtonSpec } from '../course/courseData'
import { LOCAL_PLAYER_ID } from '../race/constants'
import { spawnBurst } from '../juice/particles'
import { playButtonCollect } from '../audio/sfx'

const RADIUS = 0.32
const MAGNET_RADIUS = 4

/** The in-world currency (Section 7 of the design doc calls it "buttons",
 * matching the plush-toy theme). A chunky little disc that spins slowly for
 * readability at speed, disappears once collected by any racer, and can
 * also be swept in early by a nearby racer's active Bell Chime magnet. */
export function Button({ spec }: { spec: ButtonSpec }) {
  const [collected, setCollected] = useState(false)
  const collectedRef = useRef(false)
  const visualRef = useRef<Group>(null)

  const collect = (racerId: string) => {
    if (collectedRef.current) return
    collectedRef.current = true
    setCollected(true)
    useRaceStore.getState().collectButton(racerId)
    spawnBurst({ position: spec.position, color: '#ffd54a', count: 10 })
    if (racerId === LOCAL_PLAYER_ID) playButtonCollect()
  }

  const handleEnter = (payload: IntersectionEnterPayload) => {
    const racerId = payload.other.rigidBodyObject?.userData?.racerId as string | undefined
    if (racerId) collect(racerId)
  }

  useFrame((state) => {
    if (visualRef.current) {
      visualRef.current.rotation.y = state.clock.elapsedTime * 1.6
      visualRef.current.position.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.08
    }
    if (collectedRef.current) return
    for (const [racerId, effects] of getRegisteredEffects()) {
      if (effects.magnetUntil <= state.clock.elapsedTime) continue
      const telemetry = getRegisteredRacers().get(racerId)
      if (!telemetry) continue
      const dx = telemetry.position.x - spec.position[0]
      const dz = telemetry.position.z - spec.position[2]
      if (dx * dx + dz * dz < MAGNET_RADIUS * MAGNET_RADIUS) {
        collect(racerId)
        break
      }
    }
  })

  if (collected) return null

  return (
    <RigidBody type="fixed" position={spec.position} colliders={false} sensor>
      <CuboidCollider args={[RADIUS, RADIUS, RADIUS]} sensor onIntersectionEnter={handleEnter} />
      <group ref={visualRef}>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[RADIUS, RADIUS, 0.12, 20]} />
          <meshStandardMaterial color="#ffd54a" emissive="#a8790a" emissiveIntensity={0.3} />
        </mesh>
        {/* Two pip "holes", so it reads as a button and not just a coin. */}
        {[-0.12, 0.12].map((x) => (
          <mesh key={x} position={[x, 0.07, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.04, 10]} />
            <meshBasicMaterial color="#7a5a10" />
          </mesh>
        ))}
      </group>
    </RigidBody>
  )
}
