import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { Physics } from '@react-three/rapier'
import { Player } from './Player'
import { CameraRig } from './CameraRig'
import { Ground } from './Ground'
import { createPlayerTelemetry } from './telemetry'
import { useKeyboardInput } from './input/useKeyboardInput'

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
        <Ground />
        <Player telemetry={telemetry} />
      </Physics>
      <CameraRig telemetry={telemetry} />
    </Canvas>
  )
}
