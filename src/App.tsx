import { Scene } from './game/Scene'
import { Hud } from './game/Hud'
import { TouchControls } from './game/input/TouchControls'
import { Podium } from './game/Podium'
import { useFlowStore } from './game/flow/flowStore'
import { TitleScreen } from './game/menus/TitleScreen'
import { CharacterSelect } from './game/menus/CharacterSelect'
import { OnlineLobby } from './game/menus/OnlineLobby'
import { MuteButton } from './game/audio/MuteButton'
import './App.css'

function App() {
  const screen = useFlowStore((s) => s.screen)

  return (
    <div className="app-root">
      <MuteButton />
      {screen === 'title' && <TitleScreen />}
      {screen === 'characterSelect' && <CharacterSelect />}
      {screen === 'onlineLobby' && <OnlineLobby />}
      {screen === 'racing' && (
        <>
          <Scene />
          <Hud />
          <TouchControls />
          <Podium />
        </>
      )}
    </div>
  )
}

export default App
