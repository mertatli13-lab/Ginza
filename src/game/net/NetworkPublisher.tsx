import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { inputState } from '../input/inputState'
import { getRegisteredRacers } from '../race/racerRegistry'
import { useRaceStore } from '../race/raceStore'
import { LOCAL_PLAYER_ID } from '../race/constants'
import { sendToServer } from '../../net/socket'

const INPUT_SEND_INTERVAL = 1 / 20
const STATE_SEND_INTERVAL = 1 / 10

/** Publishes the local player's own input + authoritative state to every
 * other connected client — the "send" half of NetworkRacer's "receive"
 * half. Mounted only while racing in online mode (see Scene.tsx). Input
 * only sends on change (not every tick) to keep the socket quiet; state is
 * a lower-rate periodic snapshot since it's just drift correction + a race
 * progress mirror, not what drives anyone's simulation frame to frame. */
export function NetworkPublisher() {
  const inputTimer = useRef(0)
  const stateTimer = useRef(0)
  const lastSentInput = useRef({ moveX: NaN, moveY: NaN, jump: false, dash: false })

  useFrame((_state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20)
    inputTimer.current += delta
    stateTimer.current += delta

    if (inputTimer.current >= INPUT_SEND_INTERVAL) {
      inputTimer.current = 0
      const { moveX, moveY, jump, dash } = inputState
      const last = lastSentInput.current
      if (moveX !== last.moveX || moveY !== last.moveY || jump !== last.jump || dash !== last.dash) {
        sendToServer({ type: 'input', moveX, moveY, jump, dash })
        lastSentInput.current = { moveX, moveY, jump, dash }
      }
    }

    if (stateTimer.current >= STATE_SEND_INTERVAL) {
      stateTimer.current = 0
      const telemetry = getRegisteredRacers().get(LOCAL_PLAYER_ID)
      const progress = useRaceStore.getState().racers[LOCAL_PLAYER_ID]
      if (!telemetry || !progress) return
      sendToServer({
        type: 'state',
        position: [telemetry.position.x, telemetry.position.y, telemetry.position.z],
        facingAngle: telemetry.facingAngle,
        checkpointIndex: progress.checkpointIndex,
        buttons: progress.buttons,
        finished: progress.finished,
        finishOrder: progress.finishOrder,
      })
    }
  })

  return null
}
