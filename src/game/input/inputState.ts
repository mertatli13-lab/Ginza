// Shared mutable input snapshot, written by keyboard/touch sources and read
// once per physics tick. A plain mutable object (not React state) so input
// never triggers re-renders — the game loop polls it directly in useFrame.
//
// This shape is the `LocalPlayerInput` half of the racer input interface
// described in the design doc (position/velocity/animationState/inputSource).
// AIController and, later, NetworkInput will produce the same
// { moveX, moveY, jump, dash } shape so Player logic doesn't care who's driving.
export interface InputState {
  moveX: number // -1 (left) .. 1 (right)
  moveY: number // -1 (back) .. 1 (forward)
  jump: boolean
  dash: boolean
}

export const inputState: InputState = {
  moveX: 0,
  moveY: 0,
  jump: false,
  dash: false,
}
