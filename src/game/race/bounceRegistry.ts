// A one-shot vertical-velocity request per racer, for MushroomBouncePad:
// the pad's own collision handler can't reach into another entity's Rapier
// RigidBody directly, so it drops a pending impulse here instead — Racer
// reads and clears its own slot once per frame, the same "write to a plain
// registry, the owning entity applies it" pattern effectsRegistry already
// uses for power-ups.
const pending = new Map<string, number>()

export function requestBounce(racerId: string, velocityY: number) {
  pending.set(racerId, velocityY)
}

/** Reads and clears this racer's pending bounce, if any — call once per
 * frame from Racer so the same touch never fires twice. */
export function consumeBounce(racerId: string): number | undefined {
  const value = pending.get(racerId)
  if (value !== undefined) pending.delete(racerId)
  return value
}
