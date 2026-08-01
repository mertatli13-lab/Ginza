import { create } from 'zustand'
import type { CharacterId } from '../characters/Character'
import type { CourseId } from '../course/courseTypes'

export type Screen = 'title' | 'characterSelect' | 'courseSelect' | 'onlineLobby' | 'racing'
export type RaceMode = 'local' | 'online'

interface FlowState {
  screen: Screen
  mode: RaceMode
  selectedCharacter: CharacterId
  selectedCourse: CourseId
  selectCharacter: (id: CharacterId) => void
  selectCourse: (id: CourseId) => void
  goToCharacterSelect: () => void
  goToCourseSelect: () => void
  goToOnlineLobby: () => void
  startRace: () => void
  returnToCharacterSelect: () => void
}

/** Screen state machine: title -> character select -> (racing | online
 * lobby -> racing), with the podium's "Character Select" action looping
 * back. Kept separate from raceStore (which owns in-race progress) and from
 * networkStore (which owns connection/roster state) — callers that
 * transition screens also reset those at the callsite, so this store stays
 * a pure UI flow concern.
 *
 * selectedCourse only applies to local mode — online races always run Toy
 * Chest Tumble (Course.tsx consumers resolve the actually-active course via
 * useActiveCourse, which ignores selectedCourse when mode is 'online') so a
 * second course doesn't need to be threaded through the network sync layer. */
export const useFlowStore = create<FlowState>((set) => ({
  screen: 'title',
  mode: 'local',
  selectedCharacter: 'ginza',
  selectedCourse: 'toyChest',
  selectCharacter: (id) => set({ selectedCharacter: id }),
  selectCourse: (id) => set({ selectedCourse: id }),
  goToCharacterSelect: () => set({ screen: 'characterSelect', mode: 'local' }),
  goToCourseSelect: () => set({ screen: 'courseSelect', mode: 'local' }),
  goToOnlineLobby: () => set({ screen: 'onlineLobby', mode: 'online' }),
  startRace: () => set({ screen: 'racing' }),
  returnToCharacterSelect: () => set({ screen: 'characterSelect', mode: 'local' }),
}))
