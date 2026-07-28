import { useNetworkStore } from './networkStore'

/**
 * True while racerId belongs to a connected network peer (not the local
 * player or a bot). Buttons/power-ups check this to skip their normal
 * locally-triggered collision for remote racers: since every client fully
 * resimulates every racer's physics locally from relayed input, a peer's
 * local body *would* also touch these sensors in this client's world — but
 * buttons/power-ups are cumulative counters, and that racer's authoritative
 * count is already mirrored in from their own `state` broadcasts (see
 * NetworkRacer.tsx). Double-counting both ways isn't worth the sync
 * complexity a real fix would need (the server relaying exactly which
 * pickup was collected so every client hides that same one) — out of scope
 * for what this phase asks for, so pickups simply aren't networked yet.
 */
export function isNetworkPeerId(racerId: string): boolean {
  return useNetworkStore.getState().peers.some((p) => p.racerId === racerId)
}
