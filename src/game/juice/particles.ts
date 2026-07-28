import { Color } from 'three'

export const POOL_SIZE = 240

export interface Particle {
  active: boolean
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  maxLife: number
  color: Color
}

// A fixed-size recycled pool, not a growing array — Particles.tsx reads it
// every frame, so spawning a burst must never allocate or grow unbounded
// even if several bursts overlap (button + power-up + checkpoint at once).
const pool: Particle[] = Array.from({ length: POOL_SIZE }, () => ({
  active: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 0,
  maxLife: 1,
  color: new Color(),
}))
let cursor = 0

export function getPool(): readonly Particle[] {
  return pool
}

interface BurstOptions {
  position: readonly [number, number, number]
  color: string
  count?: number
  speed?: number
  life?: number
}

/** Spawns a small celebratory burst (button/power-up pickups, checkpoints,
 * the finish line) at a world position — cheap "juice" the design doc calls
 * for, oldest-particle-first recycling out of the fixed pool above. */
export function spawnBurst({ position, color, count = 14, speed = 3.2, life = 0.5 }: BurstOptions) {
  const c = new Color(color)
  for (let i = 0; i < count; i++) {
    const p = pool[cursor]
    cursor = (cursor + 1) % POOL_SIZE
    p.active = true
    p.x = position[0]
    p.y = position[1]
    p.z = position[2]
    const theta = Math.random() * Math.PI * 2
    const s = speed * (0.5 + Math.random() * 0.8)
    p.vx = Math.cos(theta) * s
    p.vy = (0.6 + Math.random() * 0.8) * speed
    p.vz = Math.sin(theta) * s
    p.life = life * (0.75 + Math.random() * 0.5)
    p.maxLife = p.life
    p.color.copy(c)
  }
}
