import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import type { PlayerTelemetry } from './telemetry'
import { tickShake } from './juice/screenShake'

const BASE_DISTANCE = 6.5
const MAX_EXTRA_DISTANCE = 3 // pulls back further at high speed, for a sense of velocity
const HEIGHT = 3.2
const LOOK_HEIGHT = 0.8
const POSITION_DAMP = 6
const LOOK_DAMP = 8
const SPEED_FOR_MAX_PULLBACK = 20
// How fast the camera's own orbit angle chases the character's facing —
// deliberately much slower than the character's own turn (Racer's
// TURN_SPEED). A quick tap/strafe spins the character's visual mesh right
// away, but the camera trails behind it instead of whipping around to
// match every brief direction change; it only actually catches up once the
// player commits to a heading for a bit. This is what "the camera should
// take the character as reference" needs in practice — a stable following
// camera, not one rigidly locked to the character's instantaneous facing.
const CAMERA_ANGLE_CHASE_RATE = 2.6

const desiredPos = new Vector3()
const lookTarget = new Vector3()
const currentLook = new Vector3()

interface CameraRigProps {
  telemetry: PlayerTelemetry
}

/** Third-person chase camera: stays behind the player's facing direction, pulls back at speed. */
export function CameraRig({ telemetry }: CameraRigProps) {
  const { camera } = useThree()
  const cameraAngle = useRef(telemetry.facingAngle)

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    const speedT = Math.min(1, telemetry.speed / SPEED_FOR_MAX_PULLBACK)
    const distance = BASE_DISTANCE + MAX_EXTRA_DISTANCE * speedT

    // Chase the character's facing on the shortest angular path, not the
    // raw difference — otherwise a facing that wraps past +-π sends the
    // camera the long way around instead of the short way.
    let angleDiff = telemetry.facingAngle - cameraAngle.current
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    cameraAngle.current += angleDiff * Math.min(1, CAMERA_ANGLE_CHASE_RATE * delta)

    const behindX = -Math.sin(cameraAngle.current) * distance
    const behindZ = -Math.cos(cameraAngle.current) * distance
    desiredPos.set(
      telemetry.position.x + behindX,
      telemetry.position.y + HEIGHT,
      telemetry.position.z + behindZ,
    )

    const posChase = 1 - Math.exp(-POSITION_DAMP * delta)
    camera.position.lerp(desiredPos, posChase)

    // Screen shake: a small random offset on top of the smoothed chase
    // position, so it reads as a jolt rather than dragging the look-at along.
    const shake = tickShake(delta)
    camera.position.x += shake.x
    camera.position.y += shake.y

    lookTarget.set(telemetry.position.x, telemetry.position.y + LOOK_HEIGHT, telemetry.position.z)
    const lookChase = 1 - Math.exp(-LOOK_DAMP * delta)
    currentLook.lerp(lookTarget, lookChase)
    camera.lookAt(currentLook)

    const fov = 62 + 6 * speedT
    if (camera instanceof PerspectiveCamera && camera.fov !== fov) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  })

  return null
}
