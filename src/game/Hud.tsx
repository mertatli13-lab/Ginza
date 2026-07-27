import { useGameStore } from './store'

/** Minimal Phase 1 debug HUD — real race HUD (position, progress bar, buttons) arrives in Phase 4/5. */
export function Hud() {
  const speed = useGameStore((s) => s.speed)
  const grounded = useGameStore((s) => s.grounded)

  return (
    <div className="hud">
      <div className="hud-panel">
        <span>speed {speed.toFixed(1)}</span>
        <span>{grounded ? 'grounded' : 'airborne'}</span>
      </div>
      <div className="hud-hint">WASD / arrows to move · Space to jump · Shift to dash</div>
    </div>
  )
}
