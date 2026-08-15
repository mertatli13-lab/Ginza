import { Vector3 } from 'three'

/**
 * Per-frame snapshot the Player writes and the CameraRig reads.
 * Plain mutable object (like inputState) — avoids feeding React's
 * render loop from a 60fps physics update.
 */
export interface PlayerTelemetry {
  position: Vector3
  facingAngle: number
  speed: number
  grounded: boolean
}

export function createPlayerTelemetry(): PlayerTelemetry {
  return {
    position: new Vector3(0, 1, 0),
    // Forward vector convention (see Racer.tsx) is (sin(angle), cos(angle)),
    // so Math.PI here means "facing -Z" — every course runs forward along
    // -Z from spawn, so this is the spawn-facing racers actually need, not
    // the more "neutral-looking" 0.
    facingAngle: Math.PI,
    speed: 0,
    grounded: true,
  }
}
