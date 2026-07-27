import { useRef, useState } from 'react'
import { inputState } from './inputState'
import './touch-controls.css'

const STICK_RADIUS = 50

/** On-screen joystick (left thumb) + jump/dash buttons (right thumb) for mobile web. */
export function TouchControls() {
  const baseRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const activeTouch = useRef<number | null>(null)

  const updateFromPoint = (clientX: number, clientY: number) => {
    const base = baseRef.current
    if (!base) return
    const rect = base.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy)
    if (dist > STICK_RADIUS) {
      dx = (dx / dist) * STICK_RADIUS
      dy = (dy / dist) * STICK_RADIUS
    }
    setKnob({ x: dx, y: dy })
    inputState.moveX = Math.max(-1, Math.min(1, dx / STICK_RADIUS))
    inputState.moveY = Math.max(-1, Math.min(1, -dy / STICK_RADIUS))
  }

  const resetStick = () => {
    activeTouch.current = null
    setKnob({ x: 0, y: 0 })
    inputState.moveX = 0
    inputState.moveY = 0
  }

  const onPointerDown = (e: React.PointerEvent) => {
    activeTouch.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    updateFromPoint(e.clientX, e.clientY)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (activeTouch.current !== e.pointerId) return
    updateFromPoint(e.clientX, e.clientY)
  }
  const onPointerUp = (e: React.PointerEvent) => {
    if (activeTouch.current !== e.pointerId) return
    resetStick()
  }

  return (
    <div className="touch-controls">
      <div
        ref={baseRef}
        className="stick-base"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="stick-knob"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>
      <div className="action-buttons">
        <button
          className="action-btn dash-btn"
          onPointerDown={() => (inputState.dash = true)}
          onPointerUp={() => (inputState.dash = false)}
          onPointerCancel={() => (inputState.dash = false)}
        >
          DASH
        </button>
        <button
          className="action-btn jump-btn"
          onPointerDown={() => (inputState.jump = true)}
          onPointerUp={() => (inputState.jump = false)}
          onPointerCancel={() => (inputState.jump = false)}
        >
          JUMP
        </button>
      </div>
    </div>
  )
}
