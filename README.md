# Ginza & Strawberry's Plushopolis Grand Prix

A browser-based 3D racing game built with React Three Fiber, Rapier physics,
and Zustand. Plush toys race each other through a giant, toy-scaled house at
night.

## Status

**Phases 0–4 are complete:** scaffold, movement feel, the greyboxed "Toy
Chest Tumble" course (checkpoints, finish line, fall/respawn, obstacles), and
now three AI rivals racing alongside the player. Power-ups, scoring, and
styled character art all come in later phases — everything here is still
simple colored shapes, no final art.

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to dist/
npm run lint
```

## Controls

- **Move:** WASD or arrow keys (desktop), on-screen joystick (touch)
- **Jump:** Space / on-screen JUMP button
- **Dash:** Shift / on-screen DASH button

Camera is a third-person auto-follow chase cam that pulls back and widens FOV
as speed increases. The HUD shows your live position (1st–4th) among all
racers, alongside speed/grounded/checkpoint debug info.

## The course

"Toy Chest Tumble" runs along -Z from the spawn point: a toy-chest start pad,
four rising ramps (guard-railed) up to a Snakes & Ladders checkerboard
stretch, a six-platform tilted-book climb, and a checkered finish line over a
pink "ball pit" pad. Touching a checkpoint sensor updates the respawn point;
falling more than a few units below it teleports you back there — there's no
hard fail state.

**Obstacles**: three giant dice roll back and forth across the board-game
stretch on staggered, predictable sine-wave rhythms — dodge them or get
physically bumped, no separate hit-detection needed since they're kinematic
bodies Rapier naturally pushes the player out of. Three of the six book
platforms carry a rolling-pencil hazard on top. Every book also has a
weight-shift mechanic: linger on one too long and it tips further in the
direction it already leans, sliding you off unless you jump to the next one.

## AI rivals

Three bots race the same course as the player, each with a different
personality (`src/game/ai/personalities.ts`):

- **Reckless** — fastest, ignores obstacles entirely, dashes often
- **Steady** — slower but reliable, actively steers around dice/pencils
- **Wildcard** — fast with loose, wobbly steering

Every racer — human or bot — shares the exact same movement/physics code
(`Racer.tsx`); the only thing that differs is what drives its input. The
local player reads keyboard/touch; each bot's `AIController` follows a
hand-placed waypoint list (`COURSE_PATH` in `courseData.ts` — this course is
a single straight lane with no branches, so real pathfinding would be
overkill) and produces the exact same `{moveX, moveY, jump, dash}` shape the
keyboard does. That's the swappable `LocalPlayerInput` / `AIController`
interface the design doc calls for; a future `NetworkInput` for online
multiplayer would plug into the same seam without touching `Racer`.

Race progress (checkpoints, respawn position, finish order) lives in one
keyed-by-racer store (`raceStore.ts`) rather than duplicated per entity, and
a `RaceManager` computes live 1st–4th position from everyone's registered
telemetry each frame.

## Project layout

```
src/
  App.tsx                  Mounts the scene, HUD, and touch controls
  game/
    Scene.tsx               Canvas, lighting, physics world, spawns the player + bots
    Racer.tsx                Shared movement/physics body for every racer (human or bot)
    CameraRig.tsx            Third-person chase camera (follows the local player)
    Hud.tsx                  Speed/grounded/checkpoint/rank readout
    store.ts                 Zustand store (movement + rank telemetry for the HUD)
    telemetry.ts             Mutable per-frame racer state (position, facing, speed)
    playerConstants.ts       Capsule collider dimensions shared with course data
    course/
      courseData.ts           Course layout: ramps, checkpoints, obstacles, AI waypoint path
      Course.tsx               Renders the full "Toy Chest Tumble" greybox
      Platform.tsx             One static box + explicit collider
      Checkpoint.tsx           Sensor trigger -> race store (racer-tagged)
      TiltingBook.tsx          Kinematic book platform with the weight-shift mechanic
      obstacles/
        RollingDie.tsx          Kinematic die oscillating on a fixed sine wave
        RollingPencil.tsx       Kinematic rolling-log hazard on select books
    ai/
      personalities.ts         The three bot archetypes and their tuning knobs
      AIController.tsx         Waypoint-following steering -> the same input shape as the keyboard
      Bot.tsx                  Wires one AIController to one Racer
    race/
      raceStore.ts             Per-racer checkpoint progress, respawn position, finish order
      racerRegistry.ts         Live telemetry registry every Racer announces itself into
      RaceManager.tsx          Computes 1st-4th position each frame from the registry
      constants.ts             Local player's racer id
    input/
      inputState.ts          Shared mutable input snapshot (the LocalPlayerInput half)
      useKeyboardInput.ts     WASD/arrows/space/shift -> inputState
      TouchControls.tsx       On-screen joystick + jump/dash buttons
```

## Deploy

`.github/workflows/deploy.yml` builds the Vite app and publishes `dist/` to
GitHub Pages on every push to `main` (enable Pages → "GitHub Actions" as the
source in repo settings to activate it). The build is a static bundle, so it
also deploys as-is to Vercel or Netlify with no config.
