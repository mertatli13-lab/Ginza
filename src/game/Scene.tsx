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
import { PERSONALITIES, TAVSANYA_PERSONALITIES } from './ai/personalities'
import { RaceManager } from './race/RaceManager'
import { LOCAL_PLAYER_ID } from './race/constants'
import { useRaceStore } from './race/raceStore'
import { useActiveCourse } from './course/useActiveCourse'
import { useFlowStore } from './flow/flowStore'
import { Particles } from './juice/Particles'
import { useNetworkStore } from '../net/networkStore'
import { NetworkRacer } from './net/NetworkRacer'
import { NetworkPublisher } from './net/NetworkPublisher'
import { MagicalSky } from './course/MagicalSky'
import { SPEED_MULTIPLIER } from './characters/characterStats'

const PEER_ACCENTS = ['#7fe0ff', '#8ce08c', '#ff9fd0', '#e0c94a']

export function Scene() {
  useKeyboardInput()
  const raceEpoch = useRaceStore((s) => s.raceEpoch)
  const selectedCharacter = useFlowStore((s) => s.selectedCharacter)
  const mode = useFlowStore((s) => s.mode)
  const peers = useNetworkStore((s) => s.peers)
  const selfRacerId = useNetworkStore((s) => s.selfRacerId)
  const course = useActiveCourse()
  // Recreated per restart, alongside the physics world below, so a fresh
  // race starts with a fresh telemetry/effects object rather than one still
  // carrying a stale facing angle or an about-to-expire power-up timer from
  // the previous run. raceEpoch is intentionally the only trigger for this
  // recompute — the factories themselves take no arguments.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const telemetry = useMemo(() => createPlayerTelemetry(), [raceEpoch])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const effects = useMemo(() => createRacerEffects(), [raceEpoch])

  // Bots spawn a little behind and beside the local player's start; online
  // spawns share (almost) the same Z so nobody starts with a progress head
  // start. Both derive from the active course's own startPosition, so they
  // land in the right place on either course.
  const botSpawns = useMemo<Array<[number, number, number]>>(() => {
    const [, y] = course.startPosition
    return [
      [-2.5, y, 1.5],
      [2.5, y, 1.5],
      [0, y, 2.5],
    ]
  }, [course])
  const onlineSpawns = useMemo<Array<[number, number, number]>>(() => {
    const [, y] = course.startPosition
    return [
      [0, y, 0],
      [-2.2, y, 0.4],
      [2.2, y, 0.4],
      [0, y, -0.4],
    ]
  }, [course])

  // Sorting every connected racerId (self + peers) the same way on every
  // client gives everyone the same spawn-slot assignment for the same
  // racer, with no server-side authority needed to hand out "you're grid
  // slot 2" — just a canonical order everyone can independently agree on.
  const onlineOrder = useMemo(
    () => (mode === 'online' && selfRacerId ? [selfRacerId, ...peers.map((p) => p.racerId)].sort() : []),
    [mode, selfRacerId, peers],
  )
  const localSpawnPosition =
    mode === 'online' && selfRacerId
      ? onlineSpawns[onlineOrder.indexOf(selfRacerId) % onlineSpawns.length]
      : course.startPosition

  const bg = course.background
  const personalities = course.id === 'tavsanya' ? TAVSANYA_PERSONALITIES : PERSONALITIES

  return (
    <Canvas shadows camera={{ position: [0, 4, 8], fov: 62, near: 0.1, far: 300 }}>
      <color attach="background" args={[bg.sky]} />
      <fog attach="fog" args={[bg.sky, bg.fogNear, bg.fogFar]} />
      <ambientLight intensity={bg.ambientIntensity} color={bg.ambientColor} />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.6}
        color={bg.directionalColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {course.id === 'magicalValley' && <MagicalSky />}
      {/* Keying the whole physics world on raceEpoch is "Race Again": every
          body, collider, pickup, and AI waypoint index remounts fresh at
          its spawn instead of needing a bespoke reset method scattered
          across a dozen components. */}
      {/* Lighter than the original -22: paired with Racer.tsx's own JUMP_VELOCITY
          bump, this gives every jump noticeably more hang time to react and
          land rather than a single ballistic commitment — a deliberately
          softer, more forgiving arc than a "realistic" fall would be. */}
      <Physics key={raceEpoch} gravity={[0, -19, 0]}>
        <Course course={course} />
        <Racer
          racerId={LOCAL_PLAYER_ID}
          telemetry={telemetry}
          inputSource={inputState}
          effects={effects}
          spawnPosition={localSpawnPosition}
          characterId={selectedCharacter}
          course={course}
          accentColor="#ffd54a"
          speedMultiplier={SPEED_MULTIPLIER[selectedCharacter]}
          isLocalPlayer
        />
        {mode === 'local' &&
          personalities.map((personality, i) => (
            <Bot key={personality.id} personality={personality} spawnPosition={botSpawns[i]} course={course} />
          ))}
        {mode === 'online' &&
          peers.map((peer) => {
            const slot = onlineOrder.indexOf(peer.racerId)
            return (
              <NetworkRacer
                key={peer.racerId}
                racerId={peer.racerId}
                characterId={peer.characterId}
                spawnPosition={onlineSpawns[slot % onlineSpawns.length]}
                accentColor={PEER_ACCENTS[slot % PEER_ACCENTS.length]}
                speedMultiplier={SPEED_MULTIPLIER[peer.characterId]}
                course={course}
              />
            )
          })}
      </Physics>
      {mode === 'online' && <NetworkPublisher />}
      <Particles />
      <CameraRig telemetry={telemetry} />
      <RaceManager localPlayerId={LOCAL_PLAYER_ID} />
    </Canvas>
  )
}
