import { REST_Y } from '../playerConstants'

export interface PlatformSpec {
  key: string
  position: [number, number, number]
  size: [number, number, number] // width (x), thickness (y), length (z)
  rotation?: [number, number, number]
  color: string
  /** false for paper-thin visual overlays (board/finish tiles) that sit on another collider. */
  collide?: boolean
}

export interface CheckpointSpec {
  key: string
  index: number
  position: [number, number, number] // sensor trigger center
  respawnAt: [number, number, number] // where the player lands, capsule-center height
  size: [number, number, number]
}

const TRACK_WIDTH = 8
const RAMP_WIDTH = 6
const RAIL_HEIGHT = 1.2
const RAIL_THICKNESS = 0.4

const platforms: PlatformSpec[] = []
const rails: PlatformSpec[] = []
const checkpoints: CheckpointSpec[] = []
const decor: PlatformSpec[] = []

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

/**
 * Builds one sloped ramp segment whose top surface starts exactly at
 * (startY at startZ) and rises `rise` over a slope of length `slopeLength`,
 * plus two guard rails flush with that same surface. Returns where the next
 * segment should start so segments chain with no seam.
 *
 * The box is authored flat (top face at local y=+thickness/2) then rotated
 * about X. A point on the top face at local z=+len/2 is the "entry" (higher
 * world Z, earlier in the -Z direction of travel); local z=-len/2 is "exit".
 * Solving world-space entry/exit position for the *surface*, not the box's
 * geometric center, is what keeps consecutive ramps and platforms flush —
 * a naive center-of-box placement leaves a seam roughly half the box
 * thickness tall at every joint.
 */
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

// --- Section A: Start / Toy Chest ---------------------------------------
const START_Z_FRONT = 4
const START_Z_BACK = -12
flatPlatform('start-floor', 0, START_Z_FRONT, START_Z_BACK, TRACK_WIDTH, '#8a6642')
// Low chest walls flanking the burst-out point, purely decorative.
for (const side of [-1, 1] as const) {
  decor.push({
    key: `chest-wall-${side}`,
    position: [side * (TRACK_WIDTH / 2 + 0.3), 0.6, 2],
    size: [0.5, 1.6, 4],
    color: '#6b4a2a',
  })
}
checkpoints.push({
  key: 'checkpoint-start',
  index: 0,
  position: [0, 0.5, 0],
  respawnAt: [0, REST_Y, 0],
  size: [TRACK_WIDTH, 1, 0.5],
})

// --- Section B: Marble Run (rising ramps) --------------------------------
const rampColors = ['#c9a66b', '#cbaa71', '#cfae77', '#d2b27d']
let cursorY = 0
let cursorZ = START_Z_BACK
for (let i = 0; i < rampColors.length; i++) {
  const result = buildRamp({
    key: `ramp-${i}`,
    startY: cursorY,
    startZ: cursorZ,
    rise: 2.25,
    slopeLength: 8.5,
    color: rampColors[i],
    railColor: '#7a5a3a',
  })
  cursorY = result.endY
  cursorZ = result.endZ
}
const MARBLE_RUN_END_Y = cursorY
const MARBLE_RUN_END_Z = cursorZ

checkpoints.push({
  key: 'checkpoint-marble-run',
  index: 1,
  position: [0, MARBLE_RUN_END_Y + 0.5, MARBLE_RUN_END_Z],
  respawnAt: [0, MARBLE_RUN_END_Y + REST_Y, MARBLE_RUN_END_Z],
  size: [RAMP_WIDTH, 1, 0.5],
})

// --- Section C: Board Game stretch ---------------------------------------
const BOARD_LENGTH = 30
const BOARD_END_Z = MARBLE_RUN_END_Z - BOARD_LENGTH
flatPlatform('board-floor', MARBLE_RUN_END_Y, MARBLE_RUN_END_Z, BOARD_END_Z, TRACK_WIDTH, '#e4dcc4')

// Snakes & Ladders style checkerboard tiles, decorative only (no separate
// collider — they sit on the single board-floor collider above).
const TILE_SIZE = 2
const tileCols = Math.floor(TRACK_WIDTH / TILE_SIZE)
const tileRows = Math.floor(BOARD_LENGTH / TILE_SIZE)
for (let row = 0; row < tileRows; row++) {
  for (let col = 0; col < tileCols; col++) {
    const isRed = (row + col) % 2 === 0
    const x = -TRACK_WIDTH / 2 + TILE_SIZE / 2 + col * TILE_SIZE
    const z = MARBLE_RUN_END_Z - TILE_SIZE / 2 - row * TILE_SIZE
    decor.push({
      key: `board-tile-${row}-${col}`,
      position: [x, MARBLE_RUN_END_Y + 0.011, z],
      size: [TILE_SIZE - 0.05, 0.02, TILE_SIZE - 0.05],
      color: isRed ? '#c1443c' : '#eae6da',
      collide: false,
    })
  }
}

checkpoints.push({
  key: 'checkpoint-board-game',
  index: 2,
  position: [0, MARBLE_RUN_END_Y + 0.5, BOARD_END_Z],
  respawnAt: [0, MARBLE_RUN_END_Y + REST_Y, BOARD_END_Z],
  size: [TRACK_WIDTH, 1, 0.5],
})

// --- Section D: Bookshelf climb (tilted stepping platforms) --------------
const bookColors = ['#4c9a8f', '#d98e3f', '#c2555a', '#5a7fc4', '#caa53d', '#7a5ba6']
const BOOK_SIZE: [number, number, number] = [3.2, 0.5, 2.2]
const BOOK_RISE = 1.5
const BOOK_GAP = 2.1 // horizontal gap between books — small enough for the Phase 1 jump arc
const BOOK_TILT = 0.14 // static cosmetic lean; the weight-shift wobble is a Phase 3 mechanic
const bookXOffsets = [-1.4, 1.4, -1.4, 1.4, -1.4, 1.4]

let bookY = MARBLE_RUN_END_Y
let bookZ = BOARD_END_Z - 2
const bookLandingCenters: Array<[number, number, number]> = []
for (let i = 0; i < bookColors.length; i++) {
  bookY += BOOK_RISE
  bookZ -= BOOK_GAP + BOOK_SIZE[2] / 2
  const x = bookXOffsets[i]
  platforms.push({
    key: `book-${i}`,
    position: [x, bookY - BOOK_SIZE[1] / 2, bookZ],
    size: BOOK_SIZE,
    rotation: [0, 0, i % 2 === 0 ? BOOK_TILT : -BOOK_TILT],
    color: bookColors[i],
  })
  bookLandingCenters.push([x, bookY, bookZ])
  bookZ -= BOOK_SIZE[2] / 2
}
const BOOKSHELF_END_Y = bookY
const BOOKSHELF_END_Z = bookZ

checkpoints.push({
  key: 'checkpoint-bookshelf',
  index: 3,
  position: [bookXOffsets[bookXOffsets.length - 1], BOOKSHELF_END_Y + 0.5, BOOKSHELF_END_Z],
  respawnAt: [
    bookXOffsets[bookXOffsets.length - 1],
    BOOKSHELF_END_Y + REST_Y,
    BOOKSHELF_END_Z,
  ],
  size: [BOOK_SIZE[0], 1, 0.5],
})

// --- Section E: Finish / Ball Pit -----------------------------------------
const FINISH_LENGTH = 18
const finishStartZ = BOOKSHELF_END_Z - 3
const FINISH_END_Z = finishStartZ - FINISH_LENGTH
flatPlatform('finish-floor', BOOKSHELF_END_Y, finishStartZ, FINISH_END_Z, TRACK_WIDTH, '#e8b4d9')

const FINISH_LINE_Z = finishStartZ - FINISH_LENGTH * 0.6
const finishTileSize = 1
const finishCols = Math.floor(TRACK_WIDTH / finishTileSize)
for (let col = 0; col < finishCols; col++) {
  for (let rowStripe = 0; rowStripe < 2; rowStripe++) {
    const isDark = (col + rowStripe) % 2 === 0
    decor.push({
      key: `finish-check-${col}-${rowStripe}`,
      position: [
        -TRACK_WIDTH / 2 + finishTileSize / 2 + col * finishTileSize,
        BOOKSHELF_END_Y + 0.011,
        FINISH_LINE_Z + finishTileSize / 2 - rowStripe * finishTileSize,
      ],
      size: [finishTileSize - 0.02, 0.02, finishTileSize - 0.02],
      color: isDark ? '#1c1c22' : '#f5f5f5',
      collide: false,
    })
  }
}

// End-of-course rim wall so falling off the far end reads the same as any
// other fall (caught by the respawn margin) instead of into an empty void.
decor.push({
  key: 'finish-rim',
  position: [0, BOOKSHELF_END_Y + 1, FINISH_END_Z + 0.5],
  size: [TRACK_WIDTH, 2, 1],
  color: '#f2a6c8',
})

export const FINISH: CheckpointSpec = {
  key: 'finish-line',
  index: 4,
  position: [0, BOOKSHELF_END_Y + 0.5, FINISH_LINE_Z],
  respawnAt: [0, BOOKSHELF_END_Y + REST_Y, FINISH_LINE_Z],
  size: [TRACK_WIDTH, 1, 0.5],
}

export const START_POSITION: [number, number, number] = [0, REST_Y, 0]
export const PLATFORMS: readonly PlatformSpec[] = platforms
export const RAILS: readonly PlatformSpec[] = rails
export const DECOR: readonly PlatformSpec[] = decor
export const CHECKPOINTS: readonly CheckpointSpec[] = checkpoints
export const FALL_MARGIN = 6
