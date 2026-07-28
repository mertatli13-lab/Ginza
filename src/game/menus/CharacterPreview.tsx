import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { Character, type CharacterId } from '../characters/Character'
import { createPlayerTelemetry } from '../telemetry'

interface CharacterPreviewProps {
  characterId: CharacterId
  accentColor: string
}

/** Rotating idle preview for the character-select card. Reuses the exact
 * same styled model + procedural idle animation as in-race (driven off a
 * standalone telemetry object never registered with raceStore, so its
 * checkpoint-celebration hook just stays idle) — no separate preview asset. */
export function CharacterPreview({ characterId, accentColor }: CharacterPreviewProps) {
  const groupRef = useRef<Group>(null)
  const telemetry = useMemo(() => createPlayerTelemetry(), [])

  useFrame((_state, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.8
  })

  return (
    <group ref={groupRef} position={[0, -0.85, 0]}>
      <Character
        characterId={characterId}
        racerId={`preview-${characterId}`}
        telemetry={telemetry}
        accentColor={accentColor}
      />
    </group>
  )
}
