import { useMemo } from 'react'

const COLORS = ['#ff6f91', '#7fe0ff', '#ffd54a', '#8ce08c', '#c084fc']
const PIECE_COUNT = 46

/** Lightweight CSS confetti burst — falling colored rectangles, no 3D particle
 * system needed for a one-off post-race flourish. */
export function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.4,
        color: COLORS[i % COLORS.length],
        rotate: Math.random() * 360,
        drift: (Math.random() - 0.5) * 120,
      })),
    [],
  )

  return (
    <div className="confetti">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
            // @ts-expect-error custom property consumed by the keyframes in App.css
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  )
}
