import { Canvas } from '@react-three/fiber'
import { useFlowStore } from '../flow/flowStore'
import { useRaceStore } from '../race/raceStore'
import type { CharacterId } from '../characters/Character'
import { CharacterPreview } from './CharacterPreview'

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
]

/** Character-select screen: a rotating 3D idle preview per racer (Section 9
 * of the design doc). Course select stays out of scope — this game ships
 * with exactly one course, and a card picker only means something once a
 * second course exists. */
export function CharacterSelect() {
  const selected = useFlowStore((s) => s.selectedCharacter)
  const selectCharacter = useFlowStore((s) => s.selectCharacter)
  const startRace = useFlowStore((s) => s.startRace)

  const handleStart = () => {
    // Clears any leftover racer/checkpoint state from a previous race so the
    // next one starts clean, and bumps raceEpoch so Scene remounts fresh.
    useRaceStore.getState().restartRace()
    startRace()
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
              <div className="character-blurb">{opt.blurb}</div>
            </button>
          ))}
        </div>
        <button type="button" className="podium-btn podium-btn-primary" onClick={handleStart}>
          Race!
        </button>
      </div>
    </div>
  )
}
