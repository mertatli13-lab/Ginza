import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Racer } from './Racer'
import { CameraRig } from './CameraRig'
import { Course } from './course/Course'
import { createPlayerTelemetry } from './telemetry'
import { createRacerEffects } from './race/effects'
import { useKeyboardInput } from './input/useKeyboardInput'
import { inputState } from './input/inputState'
import { Bot } from './ai/Bot'
import { PERSONALITIES } from './ai/personalities'
import { RaceManager } from './race/RaceManager'
import { LOCAL_PLAYER_ID } from './race/constants'
import { useRaceStore } from './race/raceStore'
import { START_POSITION } from './course/courseData'

const BOT_SPAWNS: Array<[number, number, number]> = [
  [-2.5, START_POSITION[1], 1.5],
  [2.5, START_POSITION[1], 1.5],
  [0, START_POSITION[1], 2.5],
]

export function Scene() {
  useKeyboardInput()
  const raceEpoch = useRaceStore((s) => s.raceEpoch)
  // Recreated per restart, alongside the physics world below, so a fresh
  // race starts with a fresh telemetry/effects object rather than one still
  // carrying a stale facing angle or an about-to-expire power-up timer from
  // the previous run. raceEpoch is intentionally the only trigger for this
  // recompute — the factories themselves take no arguments.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const telemetry = useMemo(() => createPlayerTelemetry(), [raceEpoch])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effects = useMemo(() => createRacerEffects(), [raceEpoch])

  return (
    <Canvas shadows camera={{ position: [0, 4, 8], fov: 62, near: 0.1, far: 300 }}>
      <color attach="background" args={['#151726']} />
      <fog attach="fog" args={['#151726', 40, 140]} />
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {/* Keying the whole physics world on raceEpoch is "Race Again": every
          body, collider, pickup, and AI waypoint index remounts fresh at
          its spawn instead of needing a bespoke reset method scattered
          across a dozen components. */}
      <Physics key={raceEpoch} gravity={[0, -22, 0]}>
        <Course />
        <Racer
          racerId={LOCAL_PLAYER_ID}
          telemetry={telemetry}
          inputSource={inputState}
          effects={effects}
          spawnPosition={START_POSITION}
          characterId="ginza"
          accentColor="#ffd54a"
          isLocalPlayer
        />
        {PERSONALITIES.map((personality, i) => (
          <Bot key={personality.id} personality={personality} spawnPosition={BOT_SPAWNS[i]} />
        ))}
      </Physics>
      <CameraRig telemetry={telemetry} />
      <RaceManager localPlayerId={LOCAL_PLAYER_ID} />
    </Canvas>
  )
}
