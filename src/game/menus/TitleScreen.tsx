import { useFlowStore } from '../flow/flowStore'
import { unlockAudio } from '../audio/audioEngine'
import { startMusic } from '../audio/music'

/** Entry screen. Its Play button is also the one guaranteed user gesture we
 * get before the race starts, so it doubles as the audio unlock point —
 * browsers refuse to run an AudioContext until a click/tap happens. */
export function TitleScreen() {
  const goToCharacterSelect = useFlowStore((s) => s.goToCharacterSelect)

  const handlePlay = () => {
    unlockAudio()
    startMusic()
    goToCharacterSelect()
  }

  return (
    <div className="menu-overlay">
      <div className="menu-card title-card">
        <h1 className="title-heading">
          Ginza &amp; Strawberry&apos;s
          <br />
          Plushopolis Grand Prix
        </h1>
        <p className="title-subtitle">Plush toys come alive at night to race through a toy-scaled house.</p>
        <button type="button" className="podium-btn podium-btn-primary title-play-btn" onClick={handlePlay}>
          Play
        </button>
      </div>
    </div>
  )
}
