import { RigidBody, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { useRaceStore } from '../race/raceStore'
import type { CheckpointSpec } from './courseData'

interface CheckpointProps {
  spec: CheckpointSpec
  isFinish?: boolean
}

/** Invisible sensor gate. Every racer (local player or AI bot) tags its
 * RigidBody with `userData.racerId`, so one gate serves all of them and each
 * racer's progress is tracked independently in the race store. */
export function Checkpoint({ spec, isFinish = false }: CheckpointProps) {
  const reachCheckpoint = useRaceStore((s) => s.reachCheckpoint)
  const reachFinish = useRaceStore((s) => s.reachFinish)

  const handleEnter = (payload: IntersectionEnterPayload) => {
    const racerId = payload.other.rigidBodyObject?.userData?.racerId as string | undefined
    if (!racerId) return
    if (isFinish) {
      reachFinish(racerId)
    } else {
      reachCheckpoint(racerId, spec.index, spec.respawnAt)
    }
  }

  const halfExtents: [number, number, number] = [
    spec.size[0] / 2,
    spec.size[1] / 2,
    spec.size[2] / 2,
  ]

  return (
    <RigidBody type="fixed" position={spec.position} colliders={false} sensor>
      <CuboidCollider args={halfExtents} sensor onIntersectionEnter={handleEnter} />
      <mesh>
        <boxGeometry args={spec.size} />
        <meshBasicMaterial
          color={isFinish ? '#ffd54a' : '#7fe0ff'}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
    </RigidBody>
  )
}
