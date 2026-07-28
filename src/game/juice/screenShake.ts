// Trauma-based screen shake: callers add trauma (0-1), it decays every
// frame, and the camera reads a random offset scaled by trauma^2 — squaring
// gives small bumps a barely-there wobble while big hits still punch, rather
// than a magnitude that scales linearly (and reads too twitchy at the low end).
let trauma = 0

export function addShake(amount: number) {
  trauma = Math.min(1, trauma + amount)
}

export function tickShake(delta: number): { x: number; y: number } {
  if (trauma <= 0) return { x: 0, y: 0 }
  const magnitude = trauma * trauma * 0.35
  trauma = Math.max(0, trauma - delta * 2.6)
  return {
    x: (Math.random() * 2 - 1) * magnitude,
    y: (Math.random() * 2 - 1) * magnitude * 0.6,
  }
}
