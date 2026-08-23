import { REST_Y } from '../../playerConstants'
import type {
  PlatformSpec,
  CheckpointSpec,
  DiceSpec,
  PencilSpec,
  BridgeSpec,
  BouncePadSpec,
  PathWaypoint,
  ButtonSpec,
  PowerUpSpec,
  CourseData,
} from '../courseTypes'

const TRACK_WIDTH = 12 // wider than either other course — "wide paths, forgiving timing"
const BUTTON_HEIGHT = 0.9

/**
 * "Tavşanya" (Rabbitopolis) — Strawberry's ancestral home, reached through a
 * rabbit hole hidden in the garden hedge. Deliberately the biggest, most
 * explorable, and *easiest* course in the game (a home-turf breather): wider
 * paths, smaller/more forgiving gaps than Toy Chest Tumble or Magical
 * Valley, and hazards that only ever soft-bump or briefly slow — never a
 * hard fail beyond the standard fall-and-respawn every course already has.
 *
 * Five sections: a momentum-only slide entrance (Warren Slide), a weave-
 * through-carrot-stalks field with tumbling-carrot soft-bump hazards
 * (Carrot Terrace Fields), a vertical beat built around a new bounce-pad
 * mechanic plus a swaying vine bridge and market/NPC atmosphere (The Great
 * Burrow Market), a wide sprint straightaway with one optional bonus bush
 * detour (Clover Meadow Sprint), and a distinct two-tone finish burst at a
 * glowing pond (The Moonwell Finish).
 */
function buildTavsanyaCourse(): CourseData {
  const platforms: PlatformSpec[] = []
  const rails: PlatformSpec[] = []
  const checkpoints: CheckpointSpec[] = []
  const decor: PlatformSpec[] = []
  const buttons: ButtonSpec[] = []
  const powerUps: PowerUpSpec[] = []
  const path: PathWaypoint[] = []
  const npcs: [number, number, number][] = []
  let buttonSeq = 0

  function scatterButtons(
    count: number,
    yFn: (t: number) => number,
    zFrom: number,
    zTo: number,
    x: number,
    inset = 0,
  ) {
    for (let i = 0; i < count; i++) {
      const raw = count === 1 ? 0.5 : i / (count - 1)
      const t = inset + raw * (1 - 2 * inset)
      const z = zFrom + (zTo - zFrom) * t
      buttons.push({ key: `tv-button-${buttonSeq++}`, position: [x, yFn(t) + BUTTON_HEIGHT, z] })
    }
  }

  function flatPlatform(
    key: string,
    topY: number,
    zFrom: number,
    zTo: number,
    width: number,
    color: string,
    thickness = 1,
  ) {
    const length = Math.abs(zFrom - zTo)
    const centerZ = (zFrom + zTo) / 2
    platforms.push({
      key,
      position: [0, topY - thickness / 2, centerZ],
      size: [width, thickness, length],
      color,
    })
  }

  function buildRamp(opts: {
    key: string
    startY: number
    startZ: number
    rise: number
    slopeLength: number
    width: number
    color: string
    railColor: string
  }) {
    const { key, startY, startZ, rise, slopeLength: L, width, color, railColor } = opts
    const thickness = 1
    const theta = Math.asin(rise / L)
    const cosT = Math.cos(theta)
    const sinT = Math.sin(theta)
    const horizontalRun = L * cosT

    const centerY = startY + rise / 2 - (thickness / 2) * cosT
    const centerZ = startZ - (thickness / 2) * sinT - (L / 2) * cosT

    platforms.push({
      key,
      position: [0, centerY, centerZ],
      size: [width, thickness, L],
      rotation: [theta, 0, 0],
      color,
    })

    const railOffset = thickness / 2 + 0.6
    const railCenterY = centerY + railOffset * cosT
    const railCenterZ = centerZ + railOffset * sinT
    const railX = width / 2 + 0.2
    for (const side of [-1, 1] as const) {
      rails.push({
        key: `${key}-rail-${side}`,
        position: [side * railX, railCenterY, railCenterZ],
        size: [0.4, 1.2, L],
        rotation: [theta, 0, 0],
        color: railColor,
      })
    }

    return { endY: startY + rise, endZ: startZ - horizontalRun }
  }

  // --- Section 1: The Warren Slide (entrance) --------------------------------
  // A wide, hazard-free descending chute from the rabbit hole down into the
  // valley — "pure momentum/fun", the course's one "wow" opening beat.
  const START_Z_FRONT = 4
  const START_Z_BACK = -8
  flatPlatform('tv-entry-floor', 0, START_Z_FRONT, START_Z_BACK, TRACK_WIDTH, '#8a6a4a')
  checkpoints.push({
    key: 'tv-checkpoint-entry',
    index: 0,
    position: [0, 0.5, 0],
    respawnAt: [0, REST_Y, 0],
    size: [TRACK_WIDTH, 6, 0.5],
  })
  // No waypoint at START_Z_FRONT here — see toyChest.ts's comment on the
  // same pattern: it's slightly +Z of spawn (behind the course's actual -Z
  // direction), which forces the AI's persistent heading into an immediate
  // ~180° turn-in-place before it can make any progress at all. The first
  // real waypoint is the bottom of the slide, well-aligned with spawn facing.
  const slide = buildRamp({
    key: 'tv-warren-slide',
    startY: 0,
    startZ: START_Z_BACK,
    rise: -6,
    slopeLength: 16,
    width: TRACK_WIDTH,
    color: '#c9a876',
    railColor: '#7a5a3a',
  })
  path.push({ position: [0, slide.endY + REST_Y, slide.endZ] })
  scatterButtons(5, (t) => -6 * t, START_Z_BACK, slide.endZ, 0)

  const WARREN_END_Y = slide.endY
  const WARREN_END_Z = slide.endZ

  // --- Section 2: Carrot Terrace Fields ---------------------------------------
  const FIELD_LENGTH = 40
  const FIELD_END_Z = WARREN_END_Z - FIELD_LENGTH
  flatPlatform('tv-field-floor', WARREN_END_Y, WARREN_END_Z, FIELD_END_Z, TRACK_WIDTH, '#9ecb6a')

  // Static carrot-stalk stands, off-center so they read as "weave between"
  // scenery without ever blocking the straight-line path a bot relies on.
  const stalkXOffsets = [-4.5, -3.2, 4.5, 3.2, -4.8, 4.8]
  for (let i = 0; i < stalkXOffsets.length; i++) {
    const z = WARREN_END_Z - 6 - i * 6
    decor.push({
      key: `tv-carrot-stalk-${i}`,
      position: [stalkXOffsets[i], WARREN_END_Y + 1.1, z],
      size: [0.35, 2.2, 0.35],
      color: '#5a9a3a',
    })
  }

  checkpoints.push({
    key: 'tv-checkpoint-field',
    index: 1,
    position: [0, WARREN_END_Y + 0.5, FIELD_END_Z],
    respawnAt: [0, WARREN_END_Y + REST_Y, FIELD_END_Z],
    size: [TRACK_WIDTH, 6, 0.5],
  })
  path.push({ position: [0, WARREN_END_Y + REST_Y, FIELD_END_Z] })
  scatterButtons(6, () => WARREN_END_Y, WARREN_END_Z - 4, FIELD_END_Z + 4, -4.2)
  scatterButtons(6, () => WARREN_END_Y, WARREN_END_Z - 4, FIELD_END_Z + 4, 4.2)

  powerUps.push({
    key: 'tv-powerup-carrotdash',
    type: 'boost',
    position: [0, WARREN_END_Y + BUTTON_HEIGHT, WARREN_END_Z - 10],
  })

  // Tumbling carrots — the same predictable sine-wave hazard as Course 1's
  // dice (see TumblingCarrot.tsx), tuned as a soft, never-punishing bump.
  const CARROT_SIZE = 1.7
  const dice: DiceSpec[] = [
    {
      key: 'tv-carrot-0',
      center: [0, WARREN_END_Y + CARROT_SIZE / 2, WARREN_END_Z - 12],
      amplitude: 3,
      period: 3.4,
      phase: 0,
      size: CARROT_SIZE,
      color: '#e8822e',
    },
    {
      key: 'tv-carrot-1',
      center: [0, WARREN_END_Y + CARROT_SIZE / 2, WARREN_END_Z - 22],
      amplitude: 3,
      period: 2.8,
      phase: 2.2,
      size: CARROT_SIZE,
      color: '#ed9138',
    },
    {
      key: 'tv-carrot-2',
      center: [0, WARREN_END_Y + CARROT_SIZE / 2, WARREN_END_Z - 32],
      amplitude: 3,
      period: 3.8,
      phase: 4.1,
      size: CARROT_SIZE,
      color: '#e8822e',
    },
  ]

  // --- Section 3: The Great Burrow Market -------------------------------------
  // A short vertical-traversal beat: a mushroom bounce pad launches the
  // racer up onto a market rooftop, a gently swaying vine bridge carries
  // them across, then an ordinary ramp brings them back down to ground level.
  const MARKET_APPROACH = 6
  const marketFloorZ = FIELD_END_Z - MARKET_APPROACH
  flatPlatform('tv-market-approach', WARREN_END_Y, FIELD_END_Z, marketFloorZ, TRACK_WIDTH, '#c9a876')
  path.push({ position: [0, WARREN_END_Y + REST_Y, marketFloorZ] })

  // Market stalls + lantern strings, flanking the approach — pure decor.
  for (const side of [-1, 1] as const) {
    decor.push({
      key: `tv-stall-${side}`,
      position: [side * (TRACK_WIDTH / 2 - 1.2), WARREN_END_Y + 0.9, marketFloorZ + 2],
      size: [1.6, 1.8, 1.6],
      color: '#c98a5a',
    })
    decor.push({
      key: `tv-lantern-post-${side}`,
      position: [side * (TRACK_WIDTH / 2 - 1.2), WARREN_END_Y + 2.1, marketFloorZ - 1],
      size: [0.12, 2.6, 0.12],
      color: '#8a6a3a',
    })
    decor.push({
      key: `tv-lantern-${side}`,
      position: [side * (TRACK_WIDTH / 2 - 1.2), WARREN_END_Y + 3.3, marketFloorZ - 1],
      size: [0.4, 0.5, 0.4],
      color: '#ffcf6a',
    })
  }
  npcs.push([-3.2, WARREN_END_Y, marketFloorZ + 1.5], [3.5, WARREN_END_Y, marketFloorZ + 0.5])

  // The pad sits well inside the approach floor's own footprint (not past
  // its edge, which would leave the pad floating over open air with
  // nothing for a racer to walk onto it from) — a bot reaches it by
  // ordinary grounded walking, no jump input involved at all.
  const PAD_Z = marketFloorZ + 0.5
  const bouncePads: BouncePadSpec[] = [
    {
      key: 'tv-mushroom-0',
      position: [0, WARREN_END_Y + BUTTON_HEIGHT - 0.4, PAD_Z],
      radius: 0.6,
      color: '#e85a7a',
      // Strong and generously tuned rather than tightly ballistic-matched
      // to one exact run speed: this clears the rooftop's rise well before
      // the (small) forward gap is even covered, and the rooftop itself is
      // deep, so speed variance across characters/bots never turns this
      // into a coin-flip jump.
      bounceVelocity: 16,
    },
  ]

  const ROOFTOP_Y = WARREN_END_Y + 3
  const GAP_TO_ROOFTOP = 1.5
  const ROOFTOP_DEPTH = 7
  const ROOFTOP_NEAR_Z = PAD_Z - GAP_TO_ROOFTOP
  const ROOFTOP_FAR_Z = ROOFTOP_NEAR_Z - ROOFTOP_DEPTH
  flatPlatform('tv-market-rooftop', ROOFTOP_Y, ROOFTOP_NEAR_Z, ROOFTOP_FAR_Z, TRACK_WIDTH * 0.6, '#e0c9a0')
  const ROOFTOP_Z = (ROOFTOP_NEAR_Z + ROOFTOP_FAR_Z) / 2
  // No jump flag here — the bounce pad's own sensor does the launching the
  // moment a racer walks onto it while grounded, so an AI-triggered manual
  // jump right beforehand would only risk carrying it clear over the pad
  // without ever touching it.
  path.push({ position: [0, ROOFTOP_Y + REST_Y, ROOFTOP_Z] })
  scatterButtons(3, () => ROOFTOP_Y, ROOFTOP_NEAR_Z - 1, ROOFTOP_FAR_Z + 1, 0)

  powerUps.push({
    key: 'tv-powerup-firefly',
    type: 'shield',
    position: [0, ROOFTOP_Y + BUTTON_HEIGHT, ROOFTOP_Z + 0.5],
  })

  const BRIDGE_LENGTH = 7
  const BRIDGE_Z = ROOFTOP_FAR_Z - BRIDGE_LENGTH / 2
  const bridges: BridgeSpec[] = [
    {
      key: 'tv-vine-bridge-0',
      position: [0, ROOFTOP_Y - 0.5, BRIDGE_Z],
      size: [3.4, 0.3, BRIDGE_LENGTH],
      color: '#8a6a4a',
      amplitude: 0.07,
      period: 2.6,
      phase: 0,
    },
  ]
  const BRIDGE_END_Z = BRIDGE_Z - BRIDGE_LENGTH / 2
  path.push({ position: [0, ROOFTOP_Y - 0.5 + REST_Y, BRIDGE_END_Z] })

  const marketDown = buildRamp({
    key: 'tv-market-descent',
    startY: ROOFTOP_Y - 0.5,
    startZ: BRIDGE_END_Z,
    rise: -3.5,
    slopeLength: 10,
    width: TRACK_WIDTH * 0.6,
    color: '#e0c9a0',
    railColor: '#8a6a3a',
  })
  path.push({ position: [0, marketDown.endY + REST_Y, marketDown.endZ] })

  const MARKET_END_Y = marketDown.endY
  const MARKET_END_Z = marketDown.endZ

  checkpoints.push({
    key: 'tv-checkpoint-market',
    index: 2,
    position: [0, MARKET_END_Y + 0.5, MARKET_END_Z],
    respawnAt: [0, MARKET_END_Y + REST_Y, MARKET_END_Z],
    size: [TRACK_WIDTH * 0.6, 6, 0.5],
  })

  // --- Section 4: Clover Meadow Sprint -----------------------------------------
  const MEADOW_LENGTH = 44
  const MEADOW_END_Z = MARKET_END_Z - MEADOW_LENGTH
  flatPlatform('tv-meadow-floor', MARKET_END_Y, MARKET_END_Z, MEADOW_END_Z, TRACK_WIDTH, '#8ecb7a')
  path.push({ position: [0, MARKET_END_Y + REST_Y, MARKET_END_Z - 2] })

  scatterButtons(7, () => MARKET_END_Y, MARKET_END_Z - 4, MEADOW_END_Z + 4, -4.5)
  scatterButtons(7, () => MARKET_END_Y, MARKET_END_Z - 4, MEADOW_END_Z + 4, 4.5)

  powerUps.push({
    key: 'tv-powerup-clover',
    type: 'magnet',
    position: [0, MARKET_END_Y + BUTTON_HEIGHT, MARKET_END_Z - 15],
  })
  powerUps.push({
    key: 'tv-powerup-dandelion-0',
    type: 'float',
    position: [0, MARKET_END_Y + BUTTON_HEIGHT, MARKET_END_Z - 28],
  })

  // Drifting dandelion puffs — pure sensors, a brief comedic slow if touched,
  // never a bump or a fail. A couple scattered across the open sprint.
  const puffs: DiceSpec[] = [
    {
      key: 'tv-puff-0',
      center: [-2, MARKET_END_Y + 1.6, MARKET_END_Z - 20],
      amplitude: 2,
      period: 4.2,
      phase: 0,
      size: 1.1,
      color: '#e8c98a',
    },
    {
      key: 'tv-puff-1',
      center: [2.5, MARKET_END_Y + 1.8, MARKET_END_Z - 33],
      amplitude: 2.2,
      period: 3.6,
      phase: 2.5,
      size: 1.1,
      color: '#e8c98a',
    },
  ]

  // A small optional bonus detour, hidden up in the bushes to one side —
  // "risk/reward... rather than mandatory branches, so the race stays
  // winnable via the main path": the main lane and its AI waypoint path
  // never leave the ground floor, this is purely an extra a human player
  // can choose to climb up for.
  const BUSH_Z = MEADOW_END_Z + 16
  platforms.push({
    key: 'tv-bonus-bush',
    position: [TRACK_WIDTH / 2 + 2.2, MARKET_END_Y + 1.5, BUSH_Z],
    size: [4, 1, 8],
    color: '#6fae55',
  })
  scatterButtons(5, () => MARKET_END_Y + 2, BUSH_Z + 3.2, BUSH_Z - 3.2, TRACK_WIDTH / 2 + 2.2)
  powerUps.push({
    key: 'tv-powerup-dandelion-1',
    type: 'float',
    position: [TRACK_WIDTH / 2 + 2.2, MARKET_END_Y + 2 + BUTTON_HEIGHT, BUSH_Z],
  })

  checkpoints.push({
    key: 'tv-checkpoint-meadow',
    index: 3,
    position: [0, MARKET_END_Y + 0.5, MEADOW_END_Z],
    respawnAt: [0, MARKET_END_Y + REST_Y, MEADOW_END_Z],
    size: [TRACK_WIDTH, 6, 0.5],
  })
  path.push({ position: [0, MARKET_END_Y + REST_Y, MEADOW_END_Z] })

  // --- Section 5: The Moonwell Finish ------------------------------------------
  const FINISH_LENGTH = 22
  const finishStartZ = MEADOW_END_Z - 3
  const FINISH_END_Z = finishStartZ - FINISH_LENGTH
  flatPlatform('tv-moonwell-floor', MARKET_END_Y, finishStartZ, FINISH_END_Z, TRACK_WIDTH, '#5a9ab8')
  path.push({ position: [0, MARKET_END_Y + REST_Y, finishStartZ], jump: true })

  // Lily pads, decorative, dotted across the water.
  const lilyOffsets: Array<[number, number]> = [
    [-3, -4],
    [3, -9],
    [-2.5, -14],
    [2, -18],
  ]
  for (let i = 0; i < lilyOffsets.length; i++) {
    const [x, dz] = lilyOffsets[i]
    decor.push({
      key: `tv-lily-${i}`,
      position: [x, MARKET_END_Y + 0.02, finishStartZ + dz],
      size: [1.4, 0.04, 1.4],
      color: '#5aa85a',
      collide: false,
    })
  }
  for (const x of [-2.5, 0, 2.5]) {
    buttons.push({
      key: `tv-button-${buttonSeq++}`,
      position: [x, MARKET_END_Y + BUTTON_HEIGHT, finishStartZ - FINISH_LENGTH * 0.8],
    })
  }

  const FINISH_LINE_Z = finishStartZ - FINISH_LENGTH * 0.6
  decor.push({
    key: 'tv-moonwell-rim',
    position: [0, MARKET_END_Y + 1, FINISH_END_Z + 0.5],
    size: [TRACK_WIDTH, 2, 1],
    color: '#3a6a8a',
  })

  const finish: CheckpointSpec = {
    key: 'tv-finish-line',
    index: 4,
    position: [0, MARKET_END_Y + 0.5, FINISH_LINE_Z],
    respawnAt: [0, MARKET_END_Y + REST_Y, FINISH_LINE_Z],
    size: [TRACK_WIDTH, 6, 0.5],
  }
  path.push({ position: [0, MARKET_END_Y + REST_Y, FINISH_LINE_Z - 2] })

  return {
    id: 'tavsanya',
    name: 'Tavşanya',
    startPosition: [0, REST_Y, 0],
    platforms,
    rails,
    decor,
    checkpoints,
    dice,
    pencils: [] as PencilSpec[],
    bridges,
    bouncePads,
    puffs,
    npcs,
    path,
    buttons,
    powerUps,
    finish,
    fallMargin: 7, // a bit more forgiving than the other two courses (6)
    floorSurface: 'jelly',
    background: {
      sky: '#f2c98a',
      fogNear: 60,
      fogFar: 200,
      ambientIntensity: 0.9,
      ambientColor: '#ffe8c2',
      directionalColor: '#ffd9a0',
      finishBurstColor: '#ffe98a', // firefly gold
      finishBurstColor2: '#ff9fc9', // petal pink
    },
  }
}

export const TAVSANYA_COURSE: CourseData = buildTavsanyaCourse()
