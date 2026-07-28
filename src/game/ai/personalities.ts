import type { CharacterId } from '../characters/Character'

export interface Personality {
  id: string
  name: string
  characterId: CharacterId
  /** Ribbon/bow tint — bots sharing a character with the player still read apart at a glance. */
  color: string
  /** Input direction is always a unit vector regardless of magnitude in this
   * codebase, so this real multiplier on target velocity is what actually
   * varies a bot's pace — see Racer's `speedMultiplier` prop. */
  speedScale: number
  /** Radians of slow drifting wobble added to the steering heading — "loose control", not jitter. */
  steeringNoise: number
  /** Dashes per second, offered as a probability while grounded and clear to dash. */
  dashChance: number
  /** 0 = ignores dice/pencils entirely, 1 = actively steers clear of them. */
  obstacleAvoidance: number
  waypointReachDistance: number
}

// The three archetypes the design doc calls for: one reckless/aggressive bot
// that eats obstacle hits, one cautious/steady bot that plays it safe, one
// fast-but-erratic bot with loose steering — so races feel alive instead of
// three identical rubber-banding clones.
export const PERSONALITIES: readonly Personality[] = [
  {
    id: 'bot-reckless',
    name: 'Reckless',
    characterId: 'strawberry',
    color: '#e0685a',
    speedScale: 1.05,
    steeringNoise: 0.04,
    dashChance: 0.4,
    obstacleAvoidance: 0,
    waypointReachDistance: 1.1,
  },
  {
    id: 'bot-steady',
    name: 'Steady',
    characterId: 'ginza',
    color: '#5aa7d6',
    speedScale: 0.9,
    steeringNoise: 0.02,
    dashChance: 0.06,
    obstacleAvoidance: 1,
    waypointReachDistance: 1.4,
  },
  {
    id: 'bot-wildcard',
    name: 'Wildcard',
    characterId: 'chiti',
    color: '#c084fc',
    speedScale: 1.0,
    steeringNoise: 0.28,
    dashChance: 0.22,
    obstacleAvoidance: 0.2,
    waypointReachDistance: 1.35,
  },
]
