import { openSocket, closeSocket, onServerMessage, sendToServer } from './socket'
import { useNetworkStore } from './networkStore'
import { useFlowStore } from '../game/flow/flowStore'
import { useRaceStore } from '../game/race/raceStore'
import type { CharacterId } from '../game/characters/Character'
import type { ServerMessage } from './protocol'

export interface NetworkPeerState {
  input: { moveX: number; moveY: number; jump: boolean; dash: boolean }
  position: [number, number, number] | null
  facingAngle: number
  checkpointIndex: number
  buttons: number
  finished: boolean
  finishOrder: number | null
  lastStateAt: number
}

// Plain module-level registry, not React state — NetworkRacer reads this
// every physics tick (the same imperative pattern as racerRegistry.ts /
// effectsRegistry.ts), so receiving a network message must never trigger a
// render on its own. The reactive `useNetworkStore` above is only for the
// lobby roster UI.
const peerStates = new Map<string, NetworkPeerState>()
let unsubscribe: (() => void) | null = null

function ensurePeerState(racerId: string): NetworkPeerState {
  let peerState = peerStates.get(racerId)
  if (!peerState) {
    peerState = {
      input: { moveX: 0, moveY: 0, jump: false, dash: false },
      position: null,
      facingAngle: 0,
      checkpointIndex: -1,
      buttons: 0,
      finished: false,
      finishOrder: null,
      lastStateAt: 0,
    }
    peerStates.set(racerId, peerState)
  }
  return peerState
}

export function getPeerState(racerId: string): NetworkPeerState | undefined {
  return peerStates.get(racerId)
}

function handleMessage(msg: ServerMessage) {
  const net = useNetworkStore.getState()
  switch (msg.type) {
    case 'welcome':
      net.setSelf(msg.racerId)
      net.setPeers(msg.peers.map((p) => ({ racerId: p.racerId, characterId: p.characterId as CharacterId })))
      for (const peer of msg.peers) ensurePeerState(peer.racerId)
      net.setStatus('connected')
      break
    case 'peer-joined':
      net.addPeer({ racerId: msg.racerId, characterId: msg.characterId as CharacterId })
      ensurePeerState(msg.racerId)
      break
    case 'peer-left':
      net.removePeer(msg.racerId)
      peerStates.delete(msg.racerId)
      break
    case 'peer-character':
      net.updatePeerCharacter(msg.racerId, msg.characterId as CharacterId)
      break
    case 'input': {
      const peerState = ensurePeerState(msg.racerId)
      peerState.input.moveX = msg.moveX
      peerState.input.moveY = msg.moveY
      peerState.input.jump = msg.jump
      peerState.input.dash = msg.dash
      break
    }
    case 'state': {
      const peerState = ensurePeerState(msg.racerId)
      peerState.position = msg.position
      peerState.facingAngle = msg.facingAngle
      peerState.checkpointIndex = msg.checkpointIndex
      peerState.buttons = msg.buttons
      peerState.finished = msg.finished
      peerState.finishOrder = msg.finishOrder
      peerState.lastStateAt = performance.now()
      break
    }
    case 'start':
      // No host/authority, so every connected client — including whoever
      // clicked Start, via this same broadcast echoed back to them — resets
      // its own raceStore and transitions to racing symmetrically. Nobody
      // special-cases "I'm the one who clicked."
      useRaceStore.getState().restartRace()
      useFlowStore.getState().startRace()
      break
  }
}

/** Connects (if needed) and announces this player to the relay server.
 * Called once from the "Race Online" button click — the connection then
 * persists across the lobby -> racing screen transition, since it's owned
 * by this module rather than any one screen's component lifecycle. */
export function joinOnlineRace(characterId: CharacterId) {
  useNetworkStore.getState().reset()
  useNetworkStore.getState().setStatus('connecting')
  peerStates.clear()

  const ws = openSocket()
  const trySend = () => sendToServer({ type: 'join', characterId })
  if (ws.readyState === WebSocket.OPEN) {
    trySend()
  } else {
    ws.addEventListener('open', trySend, { once: true })
  }
  ws.addEventListener('close', () => {
    // Only a failed/aborted connection attempt counts as an error here — a
    // deliberate disconnect (leaveOnlineRace) already reset status to 'idle'
    // by the time its own close event fires.
    if (useNetworkStore.getState().status === 'connecting') {
      useNetworkStore.getState().setStatus('error')
    }
  })

  unsubscribe?.()
  unsubscribe = onServerMessage(handleMessage)
}

export function leaveOnlineRace() {
  unsubscribe?.()
  unsubscribe = null
  closeSocket()
  peerStates.clear()
  useNetworkStore.getState().reset()
}

export function requestStart() {
  sendToServer({ type: 'start' })
}
