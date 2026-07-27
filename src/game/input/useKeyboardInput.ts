import { useEffect } from 'react'
import { inputState } from './inputState'

const FORWARD_KEYS = new Set(['KeyW', 'ArrowUp'])
const BACK_KEYS = new Set(['KeyS', 'ArrowDown'])
const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft'])
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight'])
const JUMP_KEYS = new Set(['Space'])
const DASH_KEYS = new Set(['ShiftLeft', 'ShiftRight'])

/** Tracks WASD/arrow/space/shift and writes axes straight into inputState. */
export function useKeyboardInput() {
  useEffect(() => {
    const pressed = new Set<string>()

    const recompute = () => {
      let x = 0
      let y = 0
      for (const code of pressed) {
        if (FORWARD_KEYS.has(code)) y += 1
        if (BACK_KEYS.has(code)) y -= 1
        if (LEFT_KEYS.has(code)) x -= 1
        if (RIGHT_KEYS.has(code)) x += 1
      }
      inputState.moveX = Math.max(-1, Math.min(1, x))
      inputState.moveY = Math.max(-1, Math.min(1, y))
    }

    const onKeyDown = (e: KeyboardEvent) => {
      pressed.add(e.code)
      if (JUMP_KEYS.has(e.code)) inputState.jump = true
      if (DASH_KEYS.has(e.code)) inputState.dash = true
      recompute()
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.delete(e.code)
      if (JUMP_KEYS.has(e.code)) inputState.jump = false
      if (DASH_KEYS.has(e.code)) inputState.dash = false
      recompute()
    }
    const onBlur = () => {
      pressed.clear()
      inputState.moveX = 0
      inputState.moveY = 0
      inputState.jump = false
      inputState.dash = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
