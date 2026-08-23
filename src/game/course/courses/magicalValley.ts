import { REST_Y } from '../../playerConstants'
import type {
  PlatformSpec,
  CheckpointSpec,
  DiceSpec,
  PencilSpec,
  PathWaypoint,
  ButtonSpec,
  PowerUpSpec,
  CourseData,
} from '../courseTypes'

const TRACK_WIDTH = 9
const RAMP_WIDTH = 6
const RAIL_HEIGHT = 1.2
const RAIL_THICKNESS = 0.4
const BUTTON_HEIGHT = 0.9

/**
 * "Magical Valley" — Ginza's home course: a pastel meadow burst, a cloud
 * walk (a continuous rising walkway with barriers to hop and posts to
 * weave), a rainbow ramp climb, a crystal cavern guarded by charging
 * unicorns, a flower walk (the same continuous-walkway treatment as the
 * cloud walk), and a rainbow-arch finish. Deliberately longer than Toy
 * Chest Tumble — an extra whole section (the cloud walk) plus a longer
 * ramp climb, cavern, and flower-walk run than their Toy Chest
 * equivalents (8 ramps vs 4, a 48-unit cavern vs 30, a 28-unit finish vs
 * 18). Built with the same primitive-geometry / MeshToonMaterial pieces
 * as Course 1 (no external art assets), just a pastel/rainbow palette and
 * an actual creature obstacle (MagicUnicorn.tsx) instead of a toy-box one.
 */
function buildMagicalValleyCourse(): CourseData {
  const platforms: PlatformSpec[] = []
  const rails: PlatformSpec[] = []
  const checkpoints: CheckpointSpec[] = []
  const decor: PlatformSpec[] = []
  const buttons: ButtonSpec[] = []
  const powerUps: PowerUpSpec[] = []
  const path: PathWaypoint[] = []
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
      buttons.push({ key: `mv-button-${buttonSeq++}`, position: [x, yFn(t) + BUTTON_HEIGHT, z] })
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
    color: string
    railColor: string
  }) {
    const { key, startY, startZ, rise, slopeLength: L, color, railColor } = opts
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
      size: [RAMP_WIDTH, thickness, L],
      rotation: [theta, 0, 0],
      color,
    })

    const railOffset = thickness / 2 + RAIL_HEIGHT / 2
    const railCenterY = centerY + railOffset * cosT
    const railCenterZ = centerZ + railOffset * sinT
    const railX = RAMP_WIDTH / 2 + RAIL_THICKNESS / 2
    for (const side of [-1, 1] as const) {
      rails.push({
        key: `${key}-rail-${side}`,
        position: [side * railX, railCenterY, railCenterZ],
        size: [RAIL_THICKNESS, RAIL_HEIGHT, L],
        rotation: [theta, 0, 0],
        color: railColor,
      })
    }

    return { endY: startY + rise, endZ: startZ - horizontalRun }
  }

  // --- Section A: Meadow of Beginnings --------------------------------------
  const START_Z_FRONT = 4
  const START_Z_BACK = -14
  flatPlatform('mv-meadow-floor', 0, START_Z_FRONT, START_Z_BACK, TRACK_WIDTH, '#a8e6a1')
  for (const side of [-1, 1] as const) {
    decor.push({
      key: `mv-hedge-${side}`,
      position: [side * (TRACK_WIDTH / 2 + 0.4), 0.5, 2],
      size: [0.6, 1.3, 5],
      color: '#7bc47f',
    })
  }
  checkpoints.push({
    key: 'mv-checkpoint-meadow',
    index: 0,
    position: [0, 0.5, 0],
    respawnAt: [0, REST_Y, 0],
    size: [TRACK_WIDTH, 6, 0.5],
  })
  // No waypoint at START_Z_FRONT here — see toyChest.ts's comment on the
  // same pattern: it's slightly +Z of spawn (behind the course's actual -Z
  // direction), which forces the AI's persistent heading into an immediate
  // ~180° turn-in-place before it can make any progress at all.
  path.push({ position: [0, REST_Y, START_Z_BACK + 1] })
  scatterButtons(5, () => 0, START_Z_FRONT - 1, START_Z_BACK + 1, 0)

  // --- Section B: Cloud Walk (continuous floor, no gaps) ---------------------
  // Used to be a run of 9 separate floating-cloud platforms with real gaps
  // between them — a missed jump meant falling into open air. Rebuilt as a
  // continuous rising walkway (ramp + flat landing, repeated), same pattern
  // as Toy Chest's building-block climb: the floor is never broken, and
  // each landing carries one obstacle instead — a low barrier to hop over,
  // or a charging unicorn/reed-guard to weave around.
  const cloudColors = ['#f5f0ff', '#eaf6ff', '#fff0f8', '#f0faff']
  const CLOUD_RISE = 0.8
  const CLOUD_SLOPE_LENGTH = 7
  const CLOUD_LANDING_LENGTH = 6
  const CLOUD_BARRIER_HEIGHT = 1.1
  const CLOUD_BARRIER_THICKNESS = 0.4
  const CLOUD_POST_HEIGHT = 1.3
  const CLOUD_POST_SIZE = 0.5

  let cloudY = 0
  let cloudZ = START_Z_BACK
  for (let i = 0; i < cloudColors.length; i++) {
    const ramp = buildRamp({
      key: `cloud-ramp-${i}`,
      startY: cloudY,
      startZ: cloudZ,
      rise: CLOUD_RISE,
      slopeLength: CLOUD_SLOPE_LENGTH,
      color: cloudColors[i],
      railColor: '#e8d8ff',
    })
    cloudY = ramp.endY
    cloudZ = ramp.endZ
    path.push({ position: [0, cloudY + REST_Y, cloudZ] })

    const landingStartZ = cloudZ
    const landingEndZ = cloudZ - CLOUD_LANDING_LENGTH
    const landingMidZ = (landingStartZ + landingEndZ) / 2
    flatPlatform(`cloud-landing-${i}`, cloudY, landingStartZ, landingEndZ, RAMP_WIDTH, cloudColors[i])
    scatterButtons(2, () => cloudY, landingStartZ, landingEndZ, 0, 0.15)
    // Side rails, same as the ramps — see the matching comment on
    // toyChest.ts's building-block climb.
    for (const side of [-1, 1] as const) {
      rails.push({
        key: `cloud-landing-rail-${i}-${side}`,
        position: [side * (RAMP_WIDTH / 2 + RAIL_THICKNESS / 2), cloudY + RAIL_HEIGHT / 2, (landingStartZ + landingEndZ) / 2],
        size: [RAIL_THICKNESS, RAIL_HEIGHT, CLOUD_LANDING_LENGTH],
        color: '#e8d8ff',
      })
    }

    if (i === 0 || i === 2) {
      platforms.push({
        key: `cloud-barrier-${i}`,
        position: [0, cloudY + CLOUD_BARRIER_HEIGHT / 2, landingMidZ],
        size: [RAMP_WIDTH - 0.4, CLOUD_BARRIER_HEIGHT, CLOUD_BARRIER_THICKNESS],
        color: '#e8d8ff',
      })
      for (const side of [-1, 1] as const) {
        decor.push({
          key: `cloud-barrier-post-${i}-${side}`,
          position: [side * (RAMP_WIDTH / 2 - 0.35), cloudY + CLOUD_BARRIER_HEIGHT / 2 + 0.25, landingMidZ],
          size: [0.25, CLOUD_BARRIER_HEIGHT + 0.5, 0.25],
          color: '#c9b0ff',
        })
      }
      // The ramp-top waypoint already pushed above is the takeoff trigger
      // (fixed ~3 units before the barrier) — see the detailed comment on
      // the matching barrier in toyChest.ts's building-block climb for why
      // there's no separate waypoint in between.
      path.push({ position: [0, cloudY + REST_Y, landingMidZ - CLOUD_BARRIER_THICKNESS / 2 - 2.4], jump: true })
    } else {
      // Two static posts, offset left/right — weave between them. Not a
      // moving unicorn/reed here: AIController's obstacle-avoidance
      // steering is tuned for the wide-open cavern floor those hazards
      // normally run across, and on a track this narrow it can swing a bot
      // far enough sideways to walk it clean out past a landing's rail
      // before the rail can stop it — a real, reproducible stuck-and-
      // falling bug. A fixed weave the path waypoints already route
      // through — no runtime avoidance logic involved at all — sidesteps
      // that failure mode entirely, and reads exactly the same to a human:
      // two posts to slalom around.
      const postColor = i === 1 ? '#e8d8ff' : '#7a9b6e'
      platforms.push(
        {
          key: `cloud-post-${i}-a`,
          position: [-1.6, cloudY + CLOUD_POST_HEIGHT / 2, landingMidZ + 1.3],
          size: [CLOUD_POST_SIZE, CLOUD_POST_HEIGHT, CLOUD_POST_SIZE],
          color: postColor,
        },
        {
          key: `cloud-post-${i}-b`,
          position: [1.6, cloudY + CLOUD_POST_HEIGHT / 2, landingMidZ - 1.3],
          size: [CLOUD_POST_SIZE, CLOUD_POST_HEIGHT, CLOUD_POST_SIZE],
          color: postColor,
        },
      )
      path.push({ position: [1.2, cloudY + REST_Y, landingMidZ + 1.3] })
      path.push({ position: [-1.2, cloudY + REST_Y, landingMidZ - 1.3] })
    }

    path.push({ position: [0, cloudY + REST_Y, landingEndZ] })
    cloudZ = landingEndZ
  }
  const CLOUD_HOP_END_Y = cloudY
  const CLOUD_HOP_END_Z = cloudZ

  checkpoints.push({
    key: 'mv-checkpoint-cloud-hop',
    index: 1,
    position: [0, CLOUD_HOP_END_Y + 0.5, CLOUD_HOP_END_Z],
    respawnAt: [0, CLOUD_HOP_END_Y + REST_Y, CLOUD_HOP_END_Z],
    size: [RAMP_WIDTH, 6, 0.5],
  })

  // --- Section C: Rainbow Ramp Climb -----------------------------------------
  const rampColors = ['#ff6f6f', '#ffb347', '#ffe066', '#8ce08c', '#7fd4ff', '#c58cff', '#ff8fd1', '#8ffff0']
  let cursorY = CLOUD_HOP_END_Y
  let cursorZ = CLOUD_HOP_END_Z
  for (let i = 0; i < rampColors.length; i++) {
    const rampStartY = cursorY
    const rampStartZ = cursorZ
    const result = buildRamp({
      key: `mv-ramp-${i}`,
      startY: cursorY,
      startZ: cursorZ,
      rise: 2.4,
      slopeLength: 9,
      color: rampColors[i],
      railColor: '#e8b4ff',
    })
    cursorY = result.endY
    cursorZ = result.endZ
    path.push({ position: [0, cursorY + REST_Y, cursorZ] })
    scatterButtons(2, (t) => rampStartY + (cursorY - rampStartY) * t, rampStartZ, cursorZ, 0, 0.2)
  }
  const RAMP_END_Y = cursorY
  const RAMP_END_Z = cursorZ

  checkpoints.push({
    key: 'mv-checkpoint-rainbow-ramp',
    index: 2,
    position: [0, RAMP_END_Y + 0.5, RAMP_END_Z],
    respawnAt: [0, RAMP_END_Y + REST_Y, RAMP_END_Z],
    size: [RAMP_WIDTH, 6, 0.5],
  })
  powerUps.push({
    key: 'mv-powerup-boost-0',
    type: 'boost',
    position: [-1.6, RAMP_END_Y + BUTTON_HEIGHT, RAMP_END_Z - 2],
  })
  powerUps.push({
    key: 'mv-powerup-shield-0',
    type: 'shield',
    position: [1.6, RAMP_END_Y + BUTTON_HEIGHT, RAMP_END_Z - 2],
  })

  // --- Section D: Crystal Cavern ---------------------------------------------
  const CAVERN_LENGTH = 48
  const CAVERN_END_Z = RAMP_END_Z - CAVERN_LENGTH
  flatPlatform('mv-cavern-floor', RAMP_END_Y, RAMP_END_Z, CAVERN_END_Z, TRACK_WIDTH, '#dcd6f7')

  const TILE_SIZE = 2
  const tileCols = Math.floor(TRACK_WIDTH / TILE_SIZE)
  const tileRows = Math.floor(CAVERN_LENGTH / TILE_SIZE)
  for (let row = 0; row < tileRows; row++) {
    for (let col = 0; col < tileCols; col++) {
      const isLight = (row + col) % 2 === 0
      const x = -TRACK_WIDTH / 2 + TILE_SIZE / 2 + col * TILE_SIZE
      const z = RAMP_END_Z - TILE_SIZE / 2 - row * TILE_SIZE
      decor.push({
        key: `mv-cavern-tile-${row}-${col}`,
        position: [x, RAMP_END_Y + 0.011, z],
        size: [TILE_SIZE - 0.05, 0.02, TILE_SIZE - 0.05],
        color: isLight ? '#f3ecff' : '#cfe8f3',
        collide: false,
      })
    }
  }

  checkpoints.push({
    key: 'mv-checkpoint-crystal-cavern',
    index: 3,
    position: [0, RAMP_END_Y + 0.5, CAVERN_END_Z],
    respawnAt: [0, RAMP_END_Y + REST_Y, CAVERN_END_Z],
    size: [TRACK_WIDTH, 6, 0.5],
  })
  path.push({ position: [0, RAMP_END_Y + REST_Y, CAVERN_END_Z] })

  scatterButtons(9, () => RAMP_END_Y, RAMP_END_Z - 4, CAVERN_END_Z + 4, -3.2)
  scatterButtons(9, () => RAMP_END_Y, RAMP_END_Z - 4, CAVERN_END_Z + 4, 3.2)
  powerUps.push({
    key: 'mv-powerup-magnet-0',
    type: 'magnet',
    position: [0, RAMP_END_Y + BUTTON_HEIGHT, (RAMP_END_Z + CAVERN_END_Z) / 2],
  })

  // Charging unicorns — the same predictable sine-wave hazard as Course 1's
  // dice (see MagicUnicorn.tsx), spread across the longer cavern.
  const UNICORN_SIZE = 1.5
  const dice: DiceSpec[] = [
    {
      key: 'mv-unicorn-0',
      center: [0, RAMP_END_Y + UNICORN_SIZE / 2, RAMP_END_Z - 6],
      amplitude: 2.6,
      period: 3,
      phase: 0,
      size: UNICORN_SIZE,
      color: '#f5f0f7',
    },
    {
      key: 'mv-unicorn-1',
      center: [0, RAMP_END_Y + UNICORN_SIZE / 2, RAMP_END_Z - 14],
      amplitude: 2.6,
      period: 2.5,
      phase: 1.7,
      size: UNICORN_SIZE,
      color: '#e8ddf7',
    },
    {
      key: 'mv-unicorn-2',
      center: [0, RAMP_END_Y + UNICORN_SIZE / 2, RAMP_END_Z - 22],
      amplitude: 2.6,
      period: 3.6,
      phase: 3.4,
      size: UNICORN_SIZE,
      color: '#fff4f7',
    },
    {
      key: 'mv-unicorn-3',
      center: [0, RAMP_END_Y + UNICORN_SIZE / 2, RAMP_END_Z - 30],
      amplitude: 2.6,
      period: 2.9,
      phase: 5.1,
      size: UNICORN_SIZE,
      color: '#f0f7ff',
    },
    {
      key: 'mv-unicorn-4',
      center: [0, RAMP_END_Y + UNICORN_SIZE / 2, RAMP_END_Z - 38],
      amplitude: 2.6,
      period: 3.3,
      phase: 2.4,
      size: UNICORN_SIZE,
      color: '#fdf7e8',
    },
  ]

  powerUps.push({
    key: 'mv-powerup-shield-1',
    type: 'shield',
    position: [0, RAMP_END_Y + BUTTON_HEIGHT, CAVERN_END_Z + 4],
  })

  // --- Section E: Flower Walk (continuous floor, no gaps) --------------------
  // Used to be 9 separate tilting flower-petal platforms with real gaps —
  // same rebuild as Section B and Toy Chest's climb: a continuous rising
  // walkway, with barriers and unicorn/troll obstacles on the landings
  // instead of gaps to clear.
  const petalColors = ['#ffb6c1', '#ffd8a8', '#fff4a3', '#b8f2c9']
  const PETAL_RISE = 3.2
  const PETAL_SLOPE_LENGTH = 9
  const PETAL_LANDING_LENGTH = 6
  const PETAL_BARRIER_HEIGHT = 1.15
  const PETAL_BARRIER_THICKNESS = 0.4
  const PETAL_POST_HEIGHT = 1.3
  const PETAL_POST_SIZE = 0.5

  const pencils: PencilSpec[] = []
  let petalY = RAMP_END_Y
  let petalZ = CAVERN_END_Z
  for (let i = 0; i < petalColors.length; i++) {
    const ramp = buildRamp({
      key: `petal-ramp-${i}`,
      startY: petalY,
      startZ: petalZ,
      rise: PETAL_RISE,
      slopeLength: PETAL_SLOPE_LENGTH,
      color: petalColors[i],
      railColor: '#f2d0e0',
    })
    petalY = ramp.endY
    petalZ = ramp.endZ
    path.push({ position: [0, petalY + REST_Y, petalZ] })

    const landingStartZ = petalZ
    const landingEndZ = petalZ - PETAL_LANDING_LENGTH
    const landingMidZ = (landingStartZ + landingEndZ) / 2
    flatPlatform(`petal-landing-${i}`, petalY, landingStartZ, landingEndZ, RAMP_WIDTH, petalColors[i])
    scatterButtons(2, () => petalY, landingStartZ, landingEndZ, 0, 0.15)
    // Side rails, same as the ramps — see the matching comment on
    // toyChest.ts's building-block climb.
    for (const side of [-1, 1] as const) {
      rails.push({
        key: `petal-landing-rail-${i}-${side}`,
        position: [side * (RAMP_WIDTH / 2 + RAIL_THICKNESS / 2), petalY + RAIL_HEIGHT / 2, (landingStartZ + landingEndZ) / 2],
        size: [RAIL_THICKNESS, RAIL_HEIGHT, PETAL_LANDING_LENGTH],
        color: '#f2d0e0',
      })
    }

    if (i === 0 || i === 2) {
      platforms.push({
        key: `petal-barrier-${i}`,
        position: [0, petalY + PETAL_BARRIER_HEIGHT / 2, landingMidZ],
        size: [RAMP_WIDTH - 0.4, PETAL_BARRIER_HEIGHT, PETAL_BARRIER_THICKNESS],
        color: '#f2a6d0',
      })
      for (const side of [-1, 1] as const) {
        decor.push({
          key: `petal-barrier-post-${i}-${side}`,
          position: [side * (RAMP_WIDTH / 2 - 0.35), petalY + PETAL_BARRIER_HEIGHT / 2 + 0.25, landingMidZ],
          size: [0.25, PETAL_BARRIER_HEIGHT + 0.5, 0.25],
          color: '#c98ab0',
        })
      }
      // The ramp-top waypoint already pushed above is the takeoff trigger —
      // see toyChest.ts's building-block climb.
      path.push({ position: [0, petalY + REST_Y, landingMidZ - PETAL_BARRIER_THICKNESS / 2 - 2.4], jump: true })
    } else {
      // Two static posts, offset left/right — weave between them. See the
      // matching comment on Section B's cloud-walk landings for why this
      // is a fixed weave rather than a moving unicorn/reed: AIController's
      // obstacle-avoidance steering, tuned for the wide-open cavern floor,
      // can push a bot clean off the side of a track this narrow.
      const postColor = i === 1 ? '#fff4f7' : '#7a9b6e'
      platforms.push(
        {
          key: `petal-post-${i}-a`,
          position: [-1.6, petalY + PETAL_POST_HEIGHT / 2, landingMidZ + 1.3],
          size: [PETAL_POST_SIZE, PETAL_POST_HEIGHT, PETAL_POST_SIZE],
          color: postColor,
        },
        {
          key: `petal-post-${i}-b`,
          position: [1.6, petalY + PETAL_POST_HEIGHT / 2, landingMidZ - 1.3],
          size: [PETAL_POST_SIZE, PETAL_POST_HEIGHT, PETAL_POST_SIZE],
          color: postColor,
        },
      )
      path.push({ position: [1.2, petalY + REST_Y, landingMidZ + 1.3] })
      path.push({ position: [-1.2, petalY + REST_Y, landingMidZ - 1.3] })
    }

    path.push({ position: [0, petalY + REST_Y, landingEndZ] })
    petalZ = landingEndZ
  }
  const PETAL_END_Y = petalY
  const PETAL_END_Z = petalZ

  checkpoints.push({
    key: 'mv-checkpoint-flower-stones',
    index: 4,
    position: [0, PETAL_END_Y + 0.5, PETAL_END_Z],
    respawnAt: [0, PETAL_END_Y + REST_Y, PETAL_END_Z],
    size: [RAMP_WIDTH, 6, 0.5],
  })

  // --- Section F: Rainbow Arch Finish ------------------------------------------
  const FINISH_LENGTH = 28
  const finishStartZ = PETAL_END_Z - 3
  const FINISH_END_Z = finishStartZ - FINISH_LENGTH
  flatPlatform('mv-finish-floor', PETAL_END_Y, finishStartZ, FINISH_END_Z, TRACK_WIDTH, '#f6d9ff')
  path.push({ position: [0, PETAL_END_Y + REST_Y, finishStartZ], jump: true })
  for (const x of [-2.4, 0, 2.4]) {
    buttons.push({
      key: `mv-button-${buttonSeq++}`,
      position: [x, PETAL_END_Y + BUTTON_HEIGHT, finishStartZ - FINISH_LENGTH * 0.8],
    })
  }

  const FINISH_LINE_Z = finishStartZ - FINISH_LENGTH * 0.6
  const finishTileSize = 1
  const finishCols = Math.floor(TRACK_WIDTH / finishTileSize)
  for (let col = 0; col < finishCols; col++) {
    for (let rowStripe = 0; rowStripe < 2; rowStripe++) {
      const isLight = (col + rowStripe) % 2 === 0
      decor.push({
        key: `mv-finish-check-${col}-${rowStripe}`,
        position: [
          -TRACK_WIDTH / 2 + finishTileSize / 2 + col * finishTileSize,
          PETAL_END_Y + 0.011,
          FINISH_LINE_Z + finishTileSize / 2 - rowStripe * finishTileSize,
        ],
        size: [finishTileSize - 0.02, 0.02, finishTileSize - 0.02],
        color: isLight ? '#fff5fb' : '#ffe4f7',
        collide: false,
      })
    }
  }

  decor.push({
    key: 'mv-finish-rim',
    position: [0, PETAL_END_Y + 1, FINISH_END_Z + 0.5],
    size: [TRACK_WIDTH, 2, 1],
    color: '#c58cff',
  })

  const finish: CheckpointSpec = {
    key: 'mv-finish-line',
    index: 5,
    position: [0, PETAL_END_Y + 0.5, FINISH_LINE_Z],
    respawnAt: [0, PETAL_END_Y + REST_Y, FINISH_LINE_Z],
    size: [TRACK_WIDTH, 6, 0.5],
  }
  path.push({ position: [0, PETAL_END_Y + REST_Y, FINISH_LINE_Z - 2] })

  return {
    id: 'magicalValley',
    name: 'Magical Valley',
    startPosition: [0, REST_Y, 0],
    platforms,
    rails,
    decor,
    checkpoints,
    dice,
    pencils,
    path,
    buttons,
    powerUps,
    finish,
    fallMargin: 6,
    floorSurface: 'jelly',
    background: {
      sky: '#bfe3ff',
      fogNear: 55,
      fogFar: 190,
      ambientIntensity: 0.85,
      ambientColor: '#fdf0ff',
      directionalColor: '#fff6e0',
    },
  }
}

export const MAGICAL_VALLEY_COURSE: CourseData = buildMagicalValleyCourse()
