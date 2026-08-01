import { REST_Y } from '../../playerConstants'
import type {
  PlatformSpec,
  CheckpointSpec,
  BookSpec,
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
 * "Magical Valley" — Ginza's home course: a pastel meadow burst, a cloud-hop
 * gap section, a rainbow ramp climb, a crystal cavern with rolling gems, a
 * run of drifting flower-petal stepping stones, and a rainbow-arch finish.
 * Deliberately longer than Toy Chest Tumble — an extra whole section (the
 * cloud hop) plus a longer ramp climb, cavern, and petal-stone run than
 * their Toy Chest equivalents. Built with the same primitive-geometry /
 * MeshStandardMaterial pieces as Course 1 (no external art assets), just a
 * pastel/rainbow palette instead of a toy-box one.
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
  path.push({ position: [0, REST_Y, START_Z_FRONT - 1] })
  path.push({ position: [0, REST_Y, START_Z_BACK + 1] })
  scatterButtons(5, () => 0, START_Z_FRONT - 1, START_Z_BACK + 1, 0)

  // --- Section B: Cloud Hop --------------------------------------------------
  // A brand-new section Course 1 doesn't have: a run of small floating-cloud
  // platforms separated by real gaps, gently rising, so every step is a
  // timed jump rather than a walk. Meandering x offsets instead of a strict
  // zigzag keep it from reading as a metronome.
  const CLOUD_SIZE: [number, number, number] = [3.2, 0.6, 3]
  const CLOUD_GAP = 2.5
  const cloudColors = ['#f5f0ff', '#eaf6ff', '#fff0f8', '#f0faff', '#f7f0ff', '#eafcf5', '#fff5ea']
  const cloudXOffsets = [0, -2.2, 2.2, -1.6, 2.6, -2.6, 1.6]
  let cloudY = 0
  let cloudZ = START_Z_BACK
  for (let i = 0; i < cloudColors.length; i++) {
    cloudY += 0.35
    cloudZ -= CLOUD_GAP + CLOUD_SIZE[2] / 2
    const x = cloudXOffsets[i]
    platforms.push({
      key: `mv-cloud-${i}`,
      position: [x, cloudY - CLOUD_SIZE[1] / 2, cloudZ],
      size: CLOUD_SIZE,
      color: cloudColors[i],
    })
    path.push({ position: [x, cloudY + REST_Y, cloudZ], jump: true })
    buttons.push({ key: `mv-button-${buttonSeq++}`, position: [x, cloudY + BUTTON_HEIGHT, cloudZ] })
    cloudZ -= CLOUD_SIZE[2] / 2
  }
  const CLOUD_HOP_END_Y = cloudY
  const CLOUD_HOP_END_Z = cloudZ

  checkpoints.push({
    key: 'mv-checkpoint-cloud-hop',
    index: 1,
    position: [cloudXOffsets[cloudXOffsets.length - 1], CLOUD_HOP_END_Y + 0.5, CLOUD_HOP_END_Z],
    respawnAt: [cloudXOffsets[cloudXOffsets.length - 1], CLOUD_HOP_END_Y + REST_Y, CLOUD_HOP_END_Z],
    size: [CLOUD_SIZE[0], 6, 0.5],
  })

  // --- Section C: Rainbow Ramp Climb -----------------------------------------
  const rampColors = ['#ff6f6f', '#ffb347', '#ffe066', '#8ce08c', '#7fd4ff', '#c58cff']
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
  const CAVERN_LENGTH = 36
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

  scatterButtons(7, () => RAMP_END_Y, RAMP_END_Z - 4, CAVERN_END_Z + 4, -3.2)
  scatterButtons(7, () => RAMP_END_Y, RAMP_END_Z - 4, CAVERN_END_Z + 4, 3.2)
  powerUps.push({
    key: 'mv-powerup-magnet-0',
    type: 'magnet',
    position: [0, RAMP_END_Y + BUTTON_HEIGHT, (RAMP_END_Z + CAVERN_END_Z) / 2],
  })

  // Rolling gems — the same predictable sine-wave hazard as Course 1's dice,
  // recolored as pastel crystals. One more than Course 1's three, spread
  // across the longer cavern.
  const GEM_SIZE = 1.5
  const dice: DiceSpec[] = [
    {
      key: 'mv-gem-0',
      center: [0, RAMP_END_Y + GEM_SIZE / 2, RAMP_END_Z - 6],
      amplitude: 2.6,
      period: 3,
      phase: 0,
      size: GEM_SIZE,
      color: '#b39ddb',
    },
    {
      key: 'mv-gem-1',
      center: [0, RAMP_END_Y + GEM_SIZE / 2, RAMP_END_Z - 14],
      amplitude: 2.6,
      period: 2.5,
      phase: 1.7,
      size: GEM_SIZE,
      color: '#90caf9',
    },
    {
      key: 'mv-gem-2',
      center: [0, RAMP_END_Y + GEM_SIZE / 2, RAMP_END_Z - 22],
      amplitude: 2.6,
      period: 3.6,
      phase: 3.4,
      size: GEM_SIZE,
      color: '#f48fb1',
    },
    {
      key: 'mv-gem-3',
      center: [0, RAMP_END_Y + GEM_SIZE / 2, RAMP_END_Z - 30],
      amplitude: 2.6,
      period: 2.9,
      phase: 5.1,
      size: GEM_SIZE,
      color: '#a5d6a7',
    },
  ]

  powerUps.push({
    key: 'mv-powerup-shield-1',
    type: 'shield',
    position: [0, RAMP_END_Y + BUTTON_HEIGHT, CAVERN_END_Z + 4],
  })

  // --- Section E: Flower Stepping Stones --------------------------------------
  const petalColors = ['#ffb6c1', '#ffd8a8', '#fff4a3', '#b8f2c9', '#a3d8f4', '#c9b6f2', '#f2a6d0']
  const PETAL_SIZE: [number, number, number] = [3.2, 0.5, 2.4]
  const PETAL_RISE = 1.5
  const PETAL_GAP = 2.1
  const PETAL_TILT = 0.14
  const petalXOffsets = [-1.5, 1.5, -1.5, 1.5, -1.5, 1.5, -1.5]
  const REED_PETAL_INDICES = [1, 3, 5]
  const REED_RADIUS = 0.18
  const REED_LENGTH = 2.6

  const books: BookSpec[] = []
  const pencils: PencilSpec[] = []
  let petalY = RAMP_END_Y
  let petalZ = CAVERN_END_Z
  for (let i = 0; i < petalColors.length; i++) {
    petalY += PETAL_RISE
    petalZ -= PETAL_GAP + PETAL_SIZE[2] / 2
    const x = petalXOffsets[i]
    const baseTilt = i % 2 === 0 ? PETAL_TILT : -PETAL_TILT
    books.push({
      key: `mv-petal-${i}`,
      index: i,
      position: [x, petalY - PETAL_SIZE[1] / 2, petalZ],
      size: PETAL_SIZE,
      baseTilt,
      color: petalColors[i],
    })
    path.push({ position: [x, petalY + REST_Y, petalZ], jump: true })
    buttons.push({ key: `mv-button-${buttonSeq++}`, position: [x, petalY + BUTTON_HEIGHT, petalZ] })
    if (REED_PETAL_INDICES.includes(i)) {
      pencils.push({
        key: `mv-reed-${i}`,
        center: [x, petalY + REED_RADIUS, petalZ],
        amplitude: PETAL_SIZE[2] / 2 - REED_RADIUS - 0.15,
        period: 1.9,
        phase: i * 0.9,
        length: REED_LENGTH,
        radius: REED_RADIUS,
        color: '#7fd99a',
      })
    }
    petalZ -= PETAL_SIZE[2] / 2
  }
  const PETAL_END_Y = petalY
  const PETAL_END_Z = petalZ

  checkpoints.push({
    key: 'mv-checkpoint-flower-stones',
    index: 4,
    position: [petalXOffsets[petalXOffsets.length - 1], PETAL_END_Y + 0.5, PETAL_END_Z],
    respawnAt: [petalXOffsets[petalXOffsets.length - 1], PETAL_END_Y + REST_Y, PETAL_END_Z],
    size: [PETAL_SIZE[0], 6, 0.5],
  })

  // --- Section F: Rainbow Arch Finish ------------------------------------------
  const FINISH_LENGTH = 22
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
    books,
    dice,
    pencils,
    path,
    buttons,
    powerUps,
    finish,
    fallMargin: 6,
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
