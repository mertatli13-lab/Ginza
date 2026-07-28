# Ginza & Strawberry's Plushopolis Grand Prix

A browser-based 3D racing game built with React Three Fiber, Rapier physics,
and Zustand. Plush toys race each other through a giant, toy-scaled house at
night.

## Status

**Phases 0–5 are complete:** scaffold, movement feel, the greyboxed "Toy
Chest Tumble" course (checkpoints, finish line, fall/respawn, obstacles),
three AI rivals, and now buttons + power-ups + a working podium/restart flow.
Styled character art, courses beyond this one, and a real character-select
screen all come in later phases — everything here is still simple colored
shapes, no final art.

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

## Pickups & power-ups

Buttons (the in-world currency — matches the plush-toy theme) are scattered
the length of the course; the HUD tracks how many the player has collected,
shown again on the podium at the finish. Three power-up types, each with a
distinct chunky silhouette so they read at speed:

- **Yarn Ball** — 3s speed boost (1.5x)
- **Confetti Pop** — 5s shield: obstacle knockback gets overwritten the
  instant the next physics frame runs, instead of blended in and felt as a
  bump. (Horizontal only — a shielded racer can still be bumped vertically,
  which is enough to stop it from being knocked off a platform, the main
  annoyance obstacles cause.)
- **Bell Chime** — 5s magnet: any button within range gets swept in early

Every racer's power-up state (`RacerEffects`) is a plain mutable object like
telemetry, registered the same way — `Racer` reads it every frame to apply
the boost/shield, and pickups read every *other* racer's state to do the
magnet's proximity check, all without going through React re-renders.

"Race Again" on the podium works by bumping a `raceEpoch` counter that keys
the entire `<Physics>` world: every body, collider, pickup, and AI waypoint
index remounts fresh at its spawn on a key change, instead of needing a
bespoke reset method hand-written across a dozen components.

## Project layout

```
src/
  App.tsx                  Mounts the scene, HUD, touch controls, and the podium
  game/
    Scene.tsx               Canvas, lighting, physics world, spawns the player + bots
    Racer.tsx                Shared movement/physics body for every racer (human or bot)
    CameraRig.tsx            Third-person chase camera (follows the local player)
    Hud.tsx                  Speed/grounded/checkpoint/rank/buttons readout
    Podium.tsx               Post-race screen: placement, buttons earned, Race Again
    Confetti.tsx             CSS confetti burst for the podium
    format.ts                Shared `ordinal()` formatter (1st, 2nd, 3rd, ...)
    store.ts                 Zustand store (movement + rank telemetry for the HUD)
    telemetry.ts             Mutable per-frame racer state (position, facing, speed)
    playerConstants.ts       Capsule collider dimensions shared with course data
    course/
      courseData.ts           Course layout: ramps, checkpoints, obstacles, pickups, AI path
      Course.tsx               Renders the full "Toy Chest Tumble" greybox
      Platform.tsx             One static box + explicit collider
      Checkpoint.tsx           Sensor trigger -> race store (racer-tagged)
      TiltingBook.tsx          Kinematic book platform with the weight-shift mechanic
      obstacles/
        RollingDie.tsx          Kinematic die oscillating on a fixed sine wave
        RollingPencil.tsx       Kinematic rolling-log hazard on select books
    pickups/
      Button.tsx               Currency pickup; also handles the Bell Chime magnet sweep-in
      PowerUp.tsx               Yarn Ball / Confetti Pop / Bell Chime — visuals + effect timers
    ai/
      personalities.ts         The three bot archetypes and their tuning knobs
      AIController.tsx         Waypoint-following steering -> the same input shape as the keyboard
      Bot.tsx                  Wires one AIController to one Racer
    race/
      raceStore.ts             Per-racer checkpoint progress, respawn, finish order, buttons, raceEpoch
      racerRegistry.ts         Live telemetry registry every Racer announces itself into
      effects.ts               RacerEffects type (speed boost / shield / magnet timers)
      effectsRegistry.ts       Live effects registry, mirrors racerRegistry
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
