import { create } from 'zustand'
import { setMuted } from './audioEngine'

interface AudioUIState {
  muted: boolean
  toggleMute: () => void
}

/** Thin reactive projection of audioEngine's mute flag, purely for the mute
 * button's label — the engine itself is the source of truth for playback. */
export const useAudioStore = create<AudioUIState>((set, get) => ({
  muted: false,
  toggleMute: () => {
    const next = !get().muted
    setMuted(next)
    set({ muted: next })
  },
}))
