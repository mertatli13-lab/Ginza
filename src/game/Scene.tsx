import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Racer } from './Racer'
import { CameraRig } from './CameraRig'
import { Course } from './course/Course'
import { createPlayerTelemetry } from './telemetry'
import { useKeyboardInput } from './input/useKeyboardInput'
import { inputState } from './input/inputState'
import { Bot } from './ai/Bot'
import { PERSONALITIES } from './ai/personalities'
import { RaceManager } from './race/RaceManager'
import { LOCAL_PLAYER_ID } from './race/constants'
import { START_POSITION } from './course/courseData'

const BOT_SPAWNS: Array<[number, number, number]> = [
  [-2.5, START_POSITION[1], 1.5],
  [2.5, START_POSITION[1], 1.5],
  [0, START_POSITION[1], 2.5],
]

export function Scene() {
  useKeyboardInput()
  const telemetry = useMemo(() => createPlayerTelemetry(), [])

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
      <Physics gravity={[0, -22, 0]}>
        <Course />
        <Racer
          racerId={LOCAL_PLAYER_ID}
          telemetry={telemetry}
          inputSource={inputState}
          spawnPosition={START_POSITION}
          color="#a680e0"
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
