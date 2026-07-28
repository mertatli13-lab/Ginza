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

const desiredPos = new Vector3()
const lookTarget = new Vector3()
const currentLook = new Vector3()

interface CameraRigProps {
  telemetry: PlayerTelemetry
}

/** Third-person chase camera: stays behind the player's facing direction, pulls back at speed. */
export function CameraRig({ telemetry }: CameraRigProps) {
  const { camera } = useThree()

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 30)
    const speedT = Math.min(1, telemetry.speed / SPEED_FOR_MAX_PULLBACK)
    const distance = BASE_DISTANCE + MAX_EXTRA_DISTANCE * speedT

    const behindX = -Math.sin(telemetry.facingAngle) * distance
    const behindZ = -Math.cos(telemetry.facingAngle) * distance
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
