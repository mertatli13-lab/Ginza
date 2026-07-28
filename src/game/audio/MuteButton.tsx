import { useAudioStore } from './audioStore'

export function MuteButton() {
  const muted = useAudioStore((s) => s.muted)
  const toggleMute = useAudioStore((s) => s.toggleMute)

  return (
    <button type="button" className="mute-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
      {muted ? 'Sound: Off' : 'Sound: On'}
    </button>
  )
}
