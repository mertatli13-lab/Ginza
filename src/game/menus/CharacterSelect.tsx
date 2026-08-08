import { Canvas } from '@react-three/fiber'
import { useFlowStore } from '../flow/flowStore'
import type { CharacterId } from '../characters/Character'
import { SPEED_MULTIPLIER } from '../characters/characterStats'
import { CharacterPreview } from './CharacterPreview'
import { joinOnlineRace } from '../../net/networkClient'

/** Derived from the same SPEED_MULTIPLIER table Racer actually uses, so this
 * label can never drift out of sync with real in-race speed. */
function speedLabel(id: CharacterId): string {
  const m = SPEED_MULTIPLIER[id]
  if (m >= 1.08) return 'Fastest'
  if (m > 1.0) return 'Quick'
  return 'Standard'
}

const OPTIONS: ReadonlyArray<{ id: CharacterId; name: string; blurb: string; accent: string }> = [
  {
    id: 'ginza',
    name: 'Ginza',
    blurb: 'Purple plush pony. A joyful rear-up hop every time she reaches a checkpoint.',
    accent: '#ffd54a',
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    blurb: 'Pink plush bunny. Long ears that flap like wings mid-jump.',
    accent: '#7fe0ff',
  },
  {
    id: 'chiti',
    name: 'Chiti',
    blurb: 'Yellow plush rabbit in green dungaree overalls. Alert twitchy ears and a double foot-stomp bounce.',
    accent: '#ff6f91',
  },
  {
    id: 'kusto',
    name: 'Kusto',
    blurb: 'White plush gull in a little red hat. Wings flap wide mid-jump and a triumphant squawk at every checkpoint.',
    accent: '#8ce08c',
  },
]

/** Character-select screen: a rotating 3D idle preview per racer (Section 9
 * of the design doc). "Race!" moves on to course select rather than
 * starting immediately — online mode skips that step and always races Toy
 * Chest Tumble (see flowStore's comment on selectedCourse). */
export function CharacterSelect() {
  const selected = useFlowStore((s) => s.selectedCharacter)
  const selectCharacter = useFlowStore((s) => s.selectCharacter)
  const goToCourseSelect = useFlowStore((s) => s.goToCourseSelect)
  const goToOnlineLobby = useFlowStore((s) => s.goToOnlineLobby)

  const handleRaceOnline = () => {
    // Connects (or reconnects) before navigating away — the connection is
    // owned by networkClient.ts, not this screen, so it survives the
    // lobby -> racing transition.
    joinOnlineRace(selected)
    goToOnlineLobby()
  }

  return (
    <div className="menu-overlay">
      <div className="menu-card character-select-card">
        <h2 className="menu-heading">Choose your racer</h2>
        <div className="character-options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`character-option${selected === opt.id ? ' character-option-selected' : ''}`}
              onClick={() => selectCharacter(opt.id)}
            >
              <div className="character-preview-canvas">
                <Canvas camera={{ position: [0, 0.5, 2.6], fov: 40 }}>
                  <ambientLight intensity={0.7} />
                  <directionalLight position={[3, 4, 3]} intensity={1.3} />
                  <CharacterPreview characterId={opt.id} accentColor={opt.accent} />
                </Canvas>
              </div>
              <div className="character-name">{opt.name}</div>
              <div className={`character-speed-badge character-speed-${speedLabel(opt.id).toLowerCase()}`}>
                Speed: {speedLabel(opt.id)}
              </div>
              <div className="character-blurb">{opt.blurb}</div>
            </button>
          ))}
        </div>
        <div className="character-select-actions">
          <button type="button" className="podium-btn podium-btn-primary" onClick={goToCourseSelect}>
            Next: Choose Track
          </button>
          <button type="button" className="podium-btn" onClick={handleRaceOnline}>
            Race Online
          </button>
        </div>
      </div>
    </div>
  )
}
