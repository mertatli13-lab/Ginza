import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Racer } from '../Racer'
import { createPlayerTelemetry } from '../telemetry'
import { createRacerEffects } from '../race/effects'
import { useRaceStore } from '../race/raceStore'
import { getPeerState } from '../../net/networkClient'
import type { CharacterId } from '../characters/Character'
import type { InputState } from '../input/inputState'
import type { CourseData } from '../course/courseTypes'

interface NetworkRacerProps {
  racerId: string
  characterId: CharacterId
  spawnPosition: [number, number, number]
  accentColor: string
  course: CourseData
}

/**
 * The `NetworkInput` half of the swappable racer input interface (Section 8
 * of the design doc): drives the exact same Racer physics as every other
 * racer, fed by {moveX, moveY, jump, dash} relayed from a remote peer
 * instead of a keyboard or AIController — this client fully resimulates that
 * racer's physics locally from the shared input, the same way it already
 * does for bots. A periodic authoritative `state` snapshot from the owning
 * client both corrects drift (via Racer's getReconcileSnapshot) and mirrors
 * that racer's checkpoint/button/finish progress into this client's own
 * raceStore, so the local HUD's rank computation — which just reads every
 * registered racer — sees it without this client's own sensors ever
 * touching that racer (buttons/power-ups explicitly skip network peers; see
 * isNetworkPeer.ts).
 */
export function NetworkRacer({ racerId, characterId, spawnPosition, accentColor, course }: NetworkRacerProps) {
  const telemetry = useMemo(() => createPlayerTelemetry(), [])
  const effects = useMemo(() => createRacerEffects(), [])
  const inputSource = useMemo<InputState>(() => ({ moveX: 0, moveY: 0, jump: false, dash: false }), [])
  const lastAppliedStateAt = useRef(0)

  useFrame(() => {
    const peer = getPeerState(racerId)
    if (!peer) return

    inputSource.moveX = peer.input.moveX
    inputSource.moveY = peer.input.moveY
    inputSource.jump = peer.input.jump
    inputSource.dash = peer.input.dash

    const store = useRaceStore.getState()
    const current = store.racers[racerId]
    if (current) {
      if (peer.checkpointIndex > current.checkpointIndex) {
        store.reachCheckpoint(racerId, peer.checkpointIndex, current.respawnPosition)
      }
      if (peer.buttons > current.buttons) {
        for (let i = current.buttons; i < peer.buttons; i++) store.collectButton(racerId)
      }
      if (peer.finished && !current.finished) {
        store.reachFinish(racerId)
      }
    }
  })

  const getReconcileSnapshot = () => {
    const peer = getPeerState(racerId)
    if (!peer || !peer.position || peer.lastStateAt === lastAppliedStateAt.current) return null
    lastAppliedStateAt.current = peer.lastStateAt
    return { position: peer.position, facingAngle: peer.facingAngle }
  }

  return (
    <Racer
      racerId={racerId}
      telemetry={telemetry}
      inputSource={inputSource}
      effects={effects}
      spawnPosition={spawnPosition}
      characterId={characterId}
      course={course}
      accentColor={accentColor}
      getReconcileSnapshot={getReconcileSnapshot}
    />
  )
}
