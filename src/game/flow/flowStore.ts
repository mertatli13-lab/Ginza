import { create } from 'zustand'
import type { CharacterId } from '../characters/Character'

export type Screen = 'title' | 'characterSelect' | 'racing'

interface FlowState {
  screen: Screen
  selectedCharacter: CharacterId
  selectCharacter: (id: CharacterId) => void
  goToCharacterSelect: () => void
  startRace: () => void
  returnToCharacterSelect: () => void
}

/** Screen state machine: title -> character select -> racing, with the
 * podium's "Character Select" action looping back. Kept separate from
 * raceStore (which owns in-race progress) — callers that transition screens
 * also reset race progress at the callsite, so this store stays a pure UI
 * flow concern. */
export const useFlowStore = create<FlowState>((set) => ({
  screen: 'title',
  selectedCharacter: 'ginza',
  selectCharacter: (id) => set({ selectedCharacter: id }),
  goToCharacterSelect: () => set({ screen: 'characterSelect' }),
  startRace: () => set({ screen: 'racing' }),
  returnToCharacterSelect: () => set({ screen: 'characterSelect' }),
}))
