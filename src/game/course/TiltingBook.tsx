import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  RigidBody,
  CuboidCollider,
  type RapierRigidBody,
  type CollisionEnterPayload,
  type CollisionExitPayload,
} from '@react-three/rapier'
import { Quaternion, Vector3 } from 'three'
import type { BookSpec } from './courseData'

const AXIS_Z = new Vector3(0, 0, 1)
const tmpQuat = new Quaternion()

const WEIGHT_SHIFT_DELAY = 0.4 // grace period standing on it before it starts to tip
const TIP_DURATION = 0.6 // time to reach max extra tilt once it starts
const RECOVERY_DURATION = 0.5 // time to settle back once the player leaves
const EXTRA_TILT = 0.35 // radians of additional tilt, on top of the book's resting lean

/**
 * A bookshelf stepping platform with a "weight-shift" mechanic: stand on it
 * too long and it tips further in the direction it was already leaning,
 * sliding you off unless you jump to the next one in time. Kinematic, driven
 * purely by a contact timer — no bespoke hit-detection beyond knowing
 * whether the player is currently touching it.
 */
export function TiltingBook({ spec }: { spec: BookSpec }) {
  const bodyRef = useRef<RapierRigidBody>(null)
  const onBook = useRef(false)
  const contactTimer = useRef(0)
  const progress = useRef(0) // 0 = resting tilt, 1 = fully tipped

  const handleEnter = (payload: CollisionEnterPayload) => {
    if (payload.other.rigidBodyObject?.userData?.isPlayer) onBook.current = true
  }
  const handleExit = (payload: CollisionExitPayload) => {
    if (payload.other.rigidBodyObject?.userData?.isPlayer) onBook.current = false
  }

  useFrame((_state, rawDelta) => {
    const body = bodyRef.current
    if (!body) return
    const delta = Math.min(rawDelta, 1 / 30)

    if (onBook.current) {
      contactTimer.current += delta
      if (contactTimer.current > WEIGHT_SHIFT_DELAY) {
        progress.current = Math.min(1, progress.current + delta / TIP_DURATION)
      }
    } else {
      contactTimer.current = 0
      progress.current = Math.max(0, progress.current - delta / RECOVERY_DURATION)
    }

    const angle = spec.baseTilt + Math.sign(spec.baseTilt) * EXTRA_TILT * progress.current
    tmpQuat.setFromAxisAngle(AXIS_Z, angle)
    body.setNextKinematicRotation(tmpQuat)
  })

  const half: [number, number, number] = [spec.size[0] / 2, spec.size[1] / 2, spec.size[2] / 2]

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      position={spec.position}
      rotation={[0, 0, spec.baseTilt]}
      colliders={false}
    >
      <CuboidCollider
        args={half}
        friction={0.7}
        onCollisionEnter={handleEnter}
        onCollisionExit={handleExit}
      />
      <mesh castShadow receiveShadow>
        <boxGeometry args={spec.size} />
        <meshStandardMaterial color={spec.color} />
      </mesh>
    </RigidBody>
  )
}
