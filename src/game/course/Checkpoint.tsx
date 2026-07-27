import { RigidBody, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { useRaceStore } from '../race/raceStore'
import type { CheckpointSpec } from './courseData'

interface CheckpointProps {
  spec: CheckpointSpec
  isFinish?: boolean
}

/**
 * Invisible sensor gate. Only the player exists in Phase 2, so any
 * intersection is trusted; once AI rivals (Phase 4) share this course they'll
 * need their own per-racer progress, tracked by `other.rigidBodyObject`'s tag
 * instead of a single global store.
 */
export function Checkpoint({ spec, isFinish = false }: CheckpointProps) {
  const reachCheckpoint = useRaceStore((s) => s.reachCheckpoint)
  const reachFinish = useRaceStore((s) => s.reachFinish)

  const handleEnter = (payload: IntersectionEnterPayload) => {
    if (!payload.other.rigidBodyObject?.userData?.isPlayer) return
    if (isFinish) {
      reachFinish()
    } else {
      reachCheckpoint(spec.index, spec.respawnAt)
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
