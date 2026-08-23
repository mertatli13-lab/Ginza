import { useMemo } from 'react'
import { Racer } from '../Racer'
import { AIController } from './AIController'
import { createPlayerTelemetry } from '../telemetry'
import { createRacerEffects } from '../race/effects'
import type { InputState } from '../input/inputState'
import type { Personality } from './personalities'
import type { CourseData } from '../course/courseTypes'

interface BotProps {
  personality: Personality
  spawnPosition: [number, number, number]
  course: CourseData
}

/** One AI racer: its own telemetry + input snapshot, steered by AIController,
 * moved by the same Racer physics the local player uses. */
export function Bot({ personality, spawnPosition, course }: BotProps) {
  const telemetry = useMemo(() => createPlayerTelemetry(), [])
  const inputSource = useMemo<InputState>(() => ({ moveX: 0, moveY: 0, jump: false, dash: false }), [])
  const effects = useMemo(() => createRacerEffects(), [])

  return (
    <>
      <AIController
        racerId={personality.id}
        telemetry={telemetry}
        inputSource={inputSource}
        personality={personality}
        course={course}
      />
      <Racer
        racerId={personality.id}
        telemetry={telemetry}
        inputSource={inputSource}
        effects={effects}
        spawnPosition={spawnPosition}
        characterId={personality.characterId}
        course={course}
        accentColor={personality.color}
        speedMultiplier={personality.speedScale}
      />
    </>
  )
}
