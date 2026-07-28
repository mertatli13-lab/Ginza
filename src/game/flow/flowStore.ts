import { create } from 'zustand'
import type { CharacterId } from '../characters/Character'

export type Screen = 'title' | 'characterSelect' | 'onlineLobby' | 'racing'
export type RaceMode = 'local' | 'online'

interface FlowState {
  screen: Screen
  mode: RaceMode
  selectedCharacter: CharacterId
  selectCharacter: (id: CharacterId) => void
  goToCharacterSelect: () => void
  goToOnlineLobby: () => void
  startRace: () => void
  returnToCharacterSelect: () => void
}

/** Screen state machine: title -> character select -> (racing | online
 * lobby -> racing), with the podium's "Character Select" action looping
 * back. Kept separate from raceStore (which owns in-race progress) and from
 * networkStore (which owns connection/roster state) — callers that
 * transition screens also reset those at the callsite, so this store stays
 * a pure UI flow concern. */
export const useFlowStore = create<FlowState>((set) => ({
  screen: 'title',
  mode: 'local',
  selectedCharacter: 'ginza',
  selectCharacter: (id) => set({ selectedCharacter: id }),
  goToCharacterSelect: () => set({ screen: 'characterSelect', mode: 'local' }),
  goToOnlineLobby: () => set({ screen: 'onlineLobby', mode: 'online' }),
  startRace: () => set({ screen: 'racing' }),
  returnToCharacterSelect: () => set({ screen: 'characterSelect', mode: 'local' }),
}))
