import { Scene } from './game/Scene'
import { Hud } from './game/Hud'
import { TouchControls } from './game/input/TouchControls'
import './App.css'

function App() {
  return (
    <div className="app-root">
      <Scene />
      <Hud />
      <TouchControls />
    </div>
  )
}

export default App
