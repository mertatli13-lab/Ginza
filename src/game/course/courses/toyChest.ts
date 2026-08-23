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

const TRACK_WIDTH = 8
const RAMP_WIDTH = 6
const RAIL_HEIGHT = 1.2
const RAIL_THICKNESS = 0.4
const BUTTON_HEIGHT = 0.9 // pickups float this high above the surface they rest on

/** "Toy Chest Tumble" — the original course: a toy chest burst, a marble-run
 * climb, a board-game stretch with rolling dice, a bookshelf climb, and a
 * ball-pit finish. Built once at module load into a single frozen
 * `CourseData` object. */
function buildToyChestCourse(): CourseData {
  const platforms: PlatformSpec[] = []
  const rails: PlatformSpec[] = []
  const checkpoints: CheckpointSpec[] = []
  const decor: PlatformSpec[] = []
  const buttons: ButtonSpec[] = []
  const powerUps: PowerUpSpec[] = []
  // AI navigation spine — this course is a single straight lane with no
  // branches, so a hand-placed ordered waypoint list is enough; a course with
  // forks or loops would need real pathfinding instead.
  const path: PathWaypoint[] = []
  let buttonSeq = 0
  /**
   * `inset` keeps buttons away from [zFrom, zTo]'s own endpoints — needed for
   * per-ramp placement, where consecutive calls share an endpoint (one ramp's
   * end is the next one's start): without it, two buttons land exactly on top
   * of each other at every ramp joint.
   */
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
      buttons.push({ key: `button-${buttonSeq++}`, position: [x, yFn(t) + BUTTON_HEIGHT, z] })
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
    size: [TRACK_WIDTH, 6, 0.5],
  })
  // No waypoint at START_Z_FRONT here — that's slightly +Z of spawn, i.e.
  // *behind* the direction every course actually runs (-Z). Under instant-
  // aim AI that never mattered, but the AI now steers relative to its own
  // persistent heading (see Racer.tsx/AIController.tsx), and a first target
  // requiring an immediate ~180° turn-in-place was a real, reproducible
  // stuck-at-the-start bug. The first real waypoint is straight down the
  // start floor, already aligned with spawn facing.
  path.push({ position: [0, REST_Y, START_Z_BACK + 1] })
  scatterButtons(5, () => 0, START_Z_FRONT - 1, START_Z_BACK + 1, 0)

  // --- Section B: Marble Run (rising ramps) --------------------------------
  const rampColors = ['#c9a66b', '#cbaa71', '#cfae77', '#d2b27d']
  let cursorY = 0
  let cursorZ = START_Z_BACK
  for (let i = 0; i < rampColors.length; i++) {
    const rampStartY = cursorY
    const rampStartZ = cursorZ
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
    path.push({ position: [0, cursorY + REST_Y, cursorZ] })
    scatterButtons(2, (t) => rampStartY + (cursorY - rampStartY) * t, rampStartZ, cursorZ, 0, 0.2)
  }
  const MARBLE_RUN_END_Y = cursorY
  const MARBLE_RUN_END_Z = cursorZ

  checkpoints.push({
    key: 'checkpoint-marble-run',
    index: 1,
    position: [0, MARBLE_RUN_END_Y + 0.5, MARBLE_RUN_END_Z],
    respawnAt: [0, MARBLE_RUN_END_Y + REST_Y, MARBLE_RUN_END_Z],
    size: [RAMP_WIDTH, 6, 0.5],
  })
  // A boost-or-shield choice right before the dice zone: blast straight
  // through, or ride out a hit unharmed. Side by side so it's a real choice,
  // not "the one power-up you happen across."
  powerUps.push({
    key: 'powerup-boost-0',
    type: 'boost',
    position: [-1.6, MARBLE_RUN_END_Y + BUTTON_HEIGHT, MARBLE_RUN_END_Z - 2],
  })
  powerUps.push({
    key: 'powerup-shield-0',
    type: 'shield',
    position: [1.6, MARBLE_RUN_END_Y + BUTTON_HEIGHT, MARBLE_RUN_END_Z - 2],
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
    size: [TRACK_WIDTH, 6, 0.5],
  })
  path.push({ position: [0, MARBLE_RUN_END_Y + REST_Y, BOARD_END_Z] })

  // Two safe side lanes of buttons, just outside the dice's x amplitude
  // (±2.4), so collecting them is a positioning choice rather than a
  // guaranteed hit — and a Bell Chime in the middle rewards braving the
  // center lane by sweeping them all in from range.
  scatterButtons(6, () => MARBLE_RUN_END_Y, MARBLE_RUN_END_Z - 4, BOARD_END_Z + 4, -3)
  scatterButtons(6, () => MARBLE_RUN_END_Y, MARBLE_RUN_END_Z - 4, BOARD_END_Z + 4, 3)
  powerUps.push({
    key: 'powerup-magnet-0',
    type: 'magnet',
    position: [0, MARBLE_RUN_END_Y + BUTTON_HEIGHT, (MARBLE_RUN_END_Z + BOARD_END_Z) / 2],
  })

  // Giant dice rolling across the board — a fixed sine-wave x(t) per die, so
  // each one is a predictable, learnable rhythm rather than a surprise. Three
  // different periods/phases stagger them so crossing the stretch means
  // reading and weaving, not dodging one repeating beat.
  const DICE_SIZE = 1.6
  const dice: DiceSpec[] = [
    {
      key: 'die-0',
      center: [0, MARBLE_RUN_END_Y + DICE_SIZE / 2, MARBLE_RUN_END_Z - 7],
      amplitude: 2.4,
      period: 3.2,
      phase: 0,
      size: DICE_SIZE,
      color: '#e7e2d6',
    },
    {
      key: 'die-1',
      center: [0, MARBLE_RUN_END_Y + DICE_SIZE / 2, MARBLE_RUN_END_Z - 15],
      amplitude: 2.4,
      period: 2.6,
      phase: 2.1,
      size: DICE_SIZE,
      color: '#e7e2d6',
    },
    {
      key: 'die-2',
      center: [0, MARBLE_RUN_END_Y + DICE_SIZE / 2, MARBLE_RUN_END_Z - 23],
      amplitude: 2.4,
      period: 3.8,
      phase: 4.3,
      size: DICE_SIZE,
      color: '#e7e2d6',
    },
  ]

  // A second shield, right before the bookshelf climb, so a mistimed jump
  // into a rolling pencil doesn't have to end the attempt.
  powerUps.push({
    key: 'powerup-shield-1',
    type: 'shield',
    position: [0, MARBLE_RUN_END_Y + BUTTON_HEIGHT, BOARD_END_Z + 4],
  })

  // --- Section D: Building-Block Climb (continuous floor, no gaps) ---------
  // Used to be a run of separate tilting book platforms with real gaps
  // between them — a missed jump meant falling into open air and respawning.
  // Rebuilt as a continuous rising walkway (ramp + flat landing, repeated):
  // the floor is never broken, so there's nothing to fall through. Every
  // landing instead carries one obstacle to get past — a low barrier to
  // hop over, or a die/pencil to weave around — so the challenge is timing
  // and dodging on solid ground, not precision gap-jumping.
  const bookColors = ['#4c9a8f', '#d98e3f', '#c2555a', '#5a7fc4']
  const CLIMB_RISE = 2.2
  const CLIMB_SLOPE_LENGTH = 7
  const CLIMB_LANDING_LENGTH = 6
  const BARRIER_HEIGHT = 1.1 // a comfortable hop with the current jump arc, not a precision clear
  const BARRIER_THICKNESS = 0.4
  const POST_HEIGHT = 1.3
  const POST_SIZE = 0.5

  const pencils: PencilSpec[] = []
  let climbY = MARBLE_RUN_END_Y
  let climbZ = BOARD_END_Z
  for (let i = 0; i < bookColors.length; i++) {
    const ramp = buildRamp({
      key: `climb-ramp-${i}`,
      startY: climbY,
      startZ: climbZ,
      rise: CLIMB_RISE,
      slopeLength: CLIMB_SLOPE_LENGTH,
      color: bookColors[i],
      railColor: '#7a5a3a',
    })
    climbY = ramp.endY
    climbZ = ramp.endZ
    path.push({ position: [0, climbY + REST_Y, climbZ] })

    const landingStartZ = climbZ
    const landingEndZ = climbZ - CLIMB_LANDING_LENGTH
    const landingMidZ = (landingStartZ + landingEndZ) / 2
    flatPlatform(`climb-landing-${i}`, climbY, landingStartZ, landingEndZ, RAMP_WIDTH, bookColors[i])
    scatterButtons(2, () => climbY, landingStartZ, landingEndZ, 0, 0.15)
    // Side rails, same as the ramps — a landing with a die to dodge or a
    // barrier to hop needs real avoidance steering, and without a rail to
    // catch a wide dodge the far edge of a merely 6-wide platform is a real
    // way to fall off the side while running, not jumping. That's exactly
    // the kind of fall this whole section was rebuilt to get rid of.
    for (const side of [-1, 1] as const) {
      rails.push({
        key: `climb-landing-rail-${i}-${side}`,
        position: [side * (RAMP_WIDTH / 2 + RAIL_THICKNESS / 2), climbY + RAIL_HEIGHT / 2, (landingStartZ + landingEndZ) / 2],
        size: [RAIL_THICKNESS, RAIL_HEIGHT, CLIMB_LANDING_LENGTH],
        color: '#7a5a3a',
      })
    }

    if (i === 0 || i === 2) {
      // A low barrier spanning the full landing width — no way around it,
      // just a hop, timed by a jump-flagged waypoint right in front of it.
      platforms.push({
        key: `climb-barrier-${i}`,
        position: [0, climbY + BARRIER_HEIGHT / 2, landingMidZ],
        size: [RAMP_WIDTH - 0.4, BARRIER_HEIGHT, BARRIER_THICKNESS],
        color: bookColors[(i + 2) % bookColors.length],
      })
      for (const side of [-1, 1] as const) {
        decor.push({
          key: `climb-barrier-post-${i}-${side}`,
          position: [side * (RAMP_WIDTH / 2 - 0.35), climbY + BARRIER_HEIGHT / 2 + 0.25, landingMidZ],
          size: [0.25, BARRIER_HEIGHT + 0.5, 0.25],
          color: '#7a5a3a',
        })
      }
      // The ramp-top waypoint already pushed above sits right at the start
      // of this landing (a fixed ~3 units before the barrier), which is
      // exactly the "reaching this is what triggers the jump" takeoff point
      // a barrier-hop needs — same mechanism a gap-jump relies on, where the
      // takeoff waypoint always sits right at the previous platform's edge.
      // An earlier version added a *second* waypoint partway into the
      // landing to mark the takeoff spot more precisely, but it landed only
      // ~0.8 units after ramp-top — inside AIController's own
      // waypointReachDistance (1.1-1.4), so "reaching ramp-top" and
      // "reaching that second waypoint" collapsed into the same instant,
      // and the jump fired from wherever the bot happened to be, not from
      // a reliable spot before the barrier. The jump-flagged landing
      // waypoint below is also placed well past the barrier, not just
      // past it — AIController eases throttle down once within
      // NEAR_TARGET_HOLD_DIST (2 units) of whichever waypoint it's
      // pursuing (tuned for gap-jump landings), and too tight a margin
      // here throttles the bot right as it needs full speed to clear it.
      path.push({ position: [0, climbY + REST_Y, landingMidZ - BARRIER_THICKNESS / 2 - 2.4], jump: true })
    } else {
      // Two static posts, offset left/right — weave between them. Not a
      // moving die/pencil here: AIController's obstacle-avoidance steering
      // is tuned for the wide-open board/cavern floors those hazards
      // normally sit on, and on a track this narrow it can swing a bot far
      // enough sideways to walk it clean out past a landing's rail before
      // the rail can stop it — a real, reproducible stuck-and-falling bug.
      // A fixed weave the path waypoints already route through — no
      // runtime avoidance logic involved at all — sidesteps that failure
      // mode entirely, and reads exactly the same to a human: two posts to
      // slalom around.
      const postColor = i === 1 ? '#8a6642' : '#e0a52e'
      platforms.push(
        {
          key: `climb-post-${i}-a`,
          position: [-1.6, climbY + POST_HEIGHT / 2, landingMidZ + 1.3],
          size: [POST_SIZE, POST_HEIGHT, POST_SIZE],
          color: postColor,
        },
        {
          key: `climb-post-${i}-b`,
          position: [1.6, climbY + POST_HEIGHT / 2, landingMidZ - 1.3],
          size: [POST_SIZE, POST_HEIGHT, POST_SIZE],
          color: postColor,
        },
      )
      path.push({ position: [1.2, climbY + REST_Y, landingMidZ + 1.3] })
      path.push({ position: [-1.2, climbY + REST_Y, landingMidZ - 1.3] })
    }

    path.push({ position: [0, climbY + REST_Y, landingEndZ] })
    climbZ = landingEndZ
  }
  const BOOKSHELF_END_Y = climbY
  const BOOKSHELF_END_Z = climbZ

  checkpoints.push({
    key: 'checkpoint-bookshelf',
    index: 3,
    position: [0, BOOKSHELF_END_Y + 0.5, BOOKSHELF_END_Z],
    respawnAt: [0, BOOKSHELF_END_Y + REST_Y, BOOKSHELF_END_Z],
    size: [RAMP_WIDTH, 6, 0.5],
  })

  // --- Section E: Finish / Ball Pit -----------------------------------------
  const FINISH_LENGTH = 18
  const finishStartZ = BOOKSHELF_END_Z - 3
  const FINISH_END_Z = finishStartZ - FINISH_LENGTH
  flatPlatform('finish-floor', BOOKSHELF_END_Y, finishStartZ, FINISH_END_Z, TRACK_WIDTH, '#e8b4d9')
  path.push({ position: [0, BOOKSHELF_END_Y + REST_Y, finishStartZ], jump: true })
  // A celebratory fan of buttons past the finish stripe.
  for (const x of [-2, 0, 2]) {
    buttons.push({
      key: `button-${buttonSeq++}`,
      position: [x, BOOKSHELF_END_Y + BUTTON_HEIGHT, finishStartZ - FINISH_LENGTH * 0.8],
    })
  }

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

  const finish: CheckpointSpec = {
    key: 'finish-line',
    index: 4,
    position: [0, BOOKSHELF_END_Y + 0.5, FINISH_LINE_Z],
    respawnAt: [0, BOOKSHELF_END_Y + REST_Y, FINISH_LINE_Z],
    size: [TRACK_WIDTH, 6, 0.5],
  }
  path.push({ position: [0, BOOKSHELF_END_Y + REST_Y, FINISH_LINE_Z - 2] })

  return {
    id: 'toyChest',
    name: 'Toy Chest Tumble',
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
    floorSurface: 'keyboard',
    background: {
      sky: '#151726',
      fogNear: 40,
      fogFar: 140,
      ambientIntensity: 0.55,
    },
  }
}

export const TOY_CHEST_COURSE: CourseData = buildToyChestCourse()
