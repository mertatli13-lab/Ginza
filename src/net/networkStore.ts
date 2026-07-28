import { create } from 'zustand'
import type { CharacterId } from '../game/characters/Character'

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

export interface NetworkPeer {
  racerId: string
  characterId: CharacterId
}

interface NetworkState {
  status: ConnectionStatus
  selfRacerId: string | null
  peers: NetworkPeer[]
  setStatus: (status: ConnectionStatus) => void
  setSelf: (racerId: string) => void
  setPeers: (peers: NetworkPeer[]) => void
  addPeer: (peer: NetworkPeer) => void
  removePeer: (racerId: string) => void
  updatePeerCharacter: (racerId: string, characterId: CharacterId) => void
  reset: () => void
}

/** Reactive projection of the online-lobby/roster state, for UI (OnlineLobby,
 * the "who's connected" list). Live per-frame peer input/position data lives
 * in networkClient.ts's imperative registry instead — that gets read every
 * physics tick and must never go through React state. */
export const useNetworkStore = create<NetworkState>((set) => ({
  status: 'idle',
  selfRacerId: null,
  peers: [],
  setStatus: (status) => set({ status }),
  setSelf: (racerId) => set({ selfRacerId: racerId }),
  setPeers: (peers) => set({ peers }),
  addPeer: (peer) => set((s) => (s.peers.some((p) => p.racerId === peer.racerId) ? s : { peers: [...s.peers, peer] })),
  removePeer: (racerId) => set((s) => ({ peers: s.peers.filter((p) => p.racerId !== racerId) })),
  updatePeerCharacter: (racerId, characterId) =>
    set((s) => ({ peers: s.peers.map((p) => (p.racerId === racerId ? { ...p, characterId } : p)) })),
  reset: () => set({ status: 'idle', selfRacerId: null, peers: [] }),
}))
