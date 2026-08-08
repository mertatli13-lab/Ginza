export interface PlatformSpec {
  key: string
  position: [number, number, number]
  size: [number, number, number] // width (x), thickness (y), length (z)
  rotation?: [number, number, number]
  color: string
  /** false for paper-thin visual overlays (board/finish tiles) that sit on another collider. */
  collide?: boolean
}

export interface CheckpointSpec {
  key: string
  index: number
  position: [number, number, number] // sensor trigger center
  respawnAt: [number, number, number] // where the player lands, capsule-center height
  size: [number, number, number]
}

export interface BookSpec {
  key: string
  index: number
  position: [number, number, number] // rest position, before any weight-shift tilt
  size: [number, number, number]
  baseTilt: number // signed cosmetic lean; weight-shift tips further in this same direction
  color: string
}

export interface DiceSpec {
  key: string
  center: [number, number, number] // z and y fixed; oscillates in x around center[0]
  amplitude: number
  period: number
  phase: number
  size: number
  color: string
}

export interface PencilSpec {
  key: string
  center: [number, number, number] // x and y fixed; oscillates in z around center[2]
  amplitude: number
  period: number
  phase: number
  length: number
  radius: number
  color: string
}

export interface PathWaypoint {
  position: [number, number, number] // capsule-center height, matching respawnAt convention
  /** True if reaching this waypoint requires clearing a gap — AIController's cue to jump on approach. */
  jump?: boolean
}

export interface ButtonSpec {
  key: string
  position: [number, number, number]
}

export type PowerUpType = 'boost' | 'shield' | 'magnet' | 'float'

export interface PowerUpSpec {
  key: string
  type: PowerUpType
  position: [number, number, number]
}

/** A walkable platform that sways continuously (rope/vine bridge) — unlike
 * TiltingBook, motion isn't contact-triggered, just a steady time-based
 * rock back and forth via the shared `oscillationOffset` formula, applied
 * as a rotation angle instead of a translation. */
export interface BridgeSpec {
  key: string
  position: [number, number, number]
  size: [number, number, number]
  color: string
  amplitude: number // sway angle, radians
  period: number
  phase: number
}

/** A landing pad that launches whoever touches it upward — see
 * race/bounceRegistry.ts for how the impulse actually reaches Racer. */
export interface BouncePadSpec {
  key: string
  position: [number, number, number]
  radius: number
  color: string
  bounceVelocity: number
}

export type CourseId = 'toyChest' | 'magicalValley' | 'tavsanya'

export interface CourseBackground {
  /** Sky/void color behind everything, and the fog's own color (usually the same). */
  sky: string
  fogNear: number
  fogFar: number
  ambientIntensity: number
  ambientColor?: string
  directionalColor?: string
  /** Overrides the finish line's particle-burst color; defaults to '#ffd54a' when unset. */
  finishBurstColor?: string
  /** A second, simultaneous burst color — e.g. Tavşanya's firefly-gold plus
   * petal-pink two-tone finish, instead of one flat color. Optional. */
  finishBurstColor2?: string
}

export interface CourseData {
  id: CourseId
  name: string
  startPosition: [number, number, number]
  platforms: readonly PlatformSpec[]
  rails: readonly PlatformSpec[]
  decor: readonly PlatformSpec[]
  checkpoints: readonly CheckpointSpec[]
  books: readonly BookSpec[]
  dice: readonly DiceSpec[]
  pencils: readonly PencilSpec[]
  /** Swaying rope/vine bridges — optional, empty on courses that don't use them. */
  bridges?: readonly BridgeSpec[]
  /** Bounce pads (mushroom caps) — optional, empty on courses that don't use them. */
  bouncePads?: readonly BouncePadSpec[]
  /** Drifting touch-and-slow hazards (dandelion puffs) — reuses DiceSpec's
   * oscillating-position shape since the motion is identical; optional,
   * empty on courses that don't use them. */
  puffs?: readonly DiceSpec[]
  /** Purely decorative static figures (market-square rabbit NPCs) — optional. */
  npcs?: readonly [number, number, number][]
  path: readonly PathWaypoint[]
  buttons: readonly ButtonSpec[]
  powerUps: readonly PowerUpSpec[]
  finish: CheckpointSpec
  fallMargin: number
  background: CourseBackground
}

// Shared sine-wave offset formula — used by the obstacle components to
// actually move themselves *and* by AIController to reason about where a
// die/pencil currently is. One formula, so a bot's mental model of a hazard
// can never drift from where it's actually rendered.
export function oscillationOffset(spec: { amplitude: number; period: number; phase: number }, t: number) {
  return spec.amplitude * Math.sin((2 * Math.PI * t) / spec.period + spec.phase)
}
