import { RigidBody, CuboidCollider, type IntersectionEnterPayload } from '@react-three/rapier'
import { useRaceStore } from '../race/raceStore'
import type { CheckpointSpec } from './courseTypes'
import { LOCAL_PLAYER_ID } from '../race/constants'
import { spawnBurst } from '../juice/particles'
import { playCheckpoint, playFinish } from '../audio/sfx'
import { useFlowStore } from '../flow/flowStore'

interface CheckpointProps {
  spec: CheckpointSpec
  isFinish?: boolean
  /** Finish-line burst color override — lets a course's own finish (e.g.
   * Tavşanya's firefly-and-petal Moonwell) read as distinct from the
   * default golden burst. Ignored for regular (non-finish) checkpoints. */
  finishBurstColor?: string
  /** A second, simultaneous burst color (e.g. petal-pink alongside
   * firefly-gold) for a two-tone finish. Ignored if unset. */
  finishBurstColor2?: string
}

/** Invisible sensor gate. Every racer (local player or AI bot) tags its
 * RigidBody with `userData.racerId`, so one gate serves all of them and each
 * racer's progress is tracked independently in the race store. */
export function Checkpoint({
  spec,
  isFinish = false,
  finishBurstColor = '#ffd54a',
  finishBurstColor2,
}: CheckpointProps) {
  const reachCheckpoint = useRaceStore((s) => s.reachCheckpoint)
  const reachFinish = useRaceStore((s) => s.reachFinish)

  const handleEnter = (payload: IntersectionEnterPayload) => {
    const racerId = payload.other.rigidBodyObject?.userData?.racerId as string | undefined
    if (!racerId) return
    // onIntersectionEnter can refire if a racer lingers/jitters at the sensor's
    // edge; only the *first* crossing should trigger sound/particles, so check
    // progress before mutating the store, not after.
    const racer = useRaceStore.getState().racers[racerId]
    if (isFinish) {
      const isNew = !racer?.finished
      reachFinish(racerId)
      if (isNew) {
        spawnBurst({ position: spec.position, color: finishBurstColor, count: finishBurstColor2 ? 18 : 30, speed: 5 })
        if (finishBurstColor2) {
          spawnBurst({ position: spec.position, color: finishBurstColor2, count: 18, speed: 5 })
        }
        if (racerId === LOCAL_PLAYER_ID) playFinish()
      }
    } else {
      const isNew = !racer || spec.index > racer.checkpointIndex
      reachCheckpoint(racerId, spec.index, spec.respawnAt)
      if (isNew) {
        spawnBurst({ position: spec.position, color: '#7fe0ff', count: 14 })
        if (racerId === LOCAL_PLAYER_ID) playCheckpoint(useFlowStore.getState().selectedCharacter)
      }
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
          color={isFinish ? finishBurstColor : '#7fe0ff'}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
    </RigidBody>
  )
}
