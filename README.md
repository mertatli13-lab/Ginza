# Ginza & Strawberry's Plushopolis Grand Prix

A browser-based 3D racing game built with React Three Fiber, Rapier physics,
and Zustand. Plush toys race each other through a giant, toy-scaled house at
night.

## Status

**Phases 0–3 are complete:** scaffold, movement feel, the greyboxed "Toy
Chest Tumble" course (checkpoints, finish line, fall/respawn), and now
obstacles — rolling dice on the board-game stretch, a weight-shift tilt on
the bookshelf platforms, and rolling pencils across some of them. AI rivals,
power-ups, and styled character art all come in later phases — everything
here is still simple colored shapes, no final art.

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
as speed increases.

## The course

"Toy Chest Tumble" runs along -Z from the spawn point: a toy-chest start pad,
four rising ramps (guard-railed) up to a Snakes & Ladders checkerboard
stretch, a six-platform tilted-book climb, and a checkered finish line over a
pink "ball pit" pad. Touching a checkpoint sensor updates the respawn point;
falling more than a few units below it teleports you back there — there's no
hard fail state.

**Obstacles** (Phase 3): three giant dice roll back and forth across the
board-game stretch on staggered, predictable sine-wave rhythms — dodge them
or get physically bumped, no separate hit-detection needed since they're
kinematic bodies Rapier naturally pushes the player out of. Three of the six
book platforms carry a rolling-pencil hazard on top, oscillating across the
landing spot. Every book also has a weight-shift mechanic: linger on one too
long and it tips further in the direction it already leans, sliding you off
unless you jump to the next one — it resets back to its resting lean a
moment after you leave.

## Project layout

```
src/
  App.tsx                  Mounts the scene, HUD, and touch controls
  game/
    Scene.tsx               Canvas, lighting, physics world
    Player.tsx              Movement, jump, dash, squash/stretch juice, fall respawn
    CameraRig.tsx            Third-person chase camera
    Hud.tsx                  Debug speed/grounded/checkpoint readout
    store.ts                 Zustand store (movement telemetry for the HUD)
    telemetry.ts             Mutable per-frame player state shared with the camera
    playerConstants.ts       Capsule collider dimensions shared with course data
    course/
      courseData.ts           Course layout: ramp/platform math, checkpoints, finish, obstacles
      Course.tsx               Renders the full "Toy Chest Tumble" greybox
      Platform.tsx             One static box + explicit collider
      Checkpoint.tsx           Sensor trigger -> race store
      TiltingBook.tsx          Kinematic book platform with the weight-shift mechanic
      obstacles/
        RollingDie.tsx          Kinematic die oscillating on a fixed sine wave
        RollingPencil.tsx       Kinematic rolling-log hazard on select books
    race/
      raceStore.ts             Checkpoint progress, respawn position, finished flag
    input/
      inputState.ts          Shared mutable input snapshot
      useKeyboardInput.ts     WASD/arrows/space/shift -> inputState
      TouchControls.tsx       On-screen joystick + jump/dash buttons
```

`inputState` is intentionally shaped like the `LocalPlayerInput` half of the
racer interface described in the design doc
(`position/velocity/animationState/inputSource`), so `AIController` (Phase 4)
and eventually `NetworkInput` (Phase 8) can drive the same `Player` movement
code without a rewrite.

## Deploy

`.github/workflows/deploy.yml` builds the Vite app and publishes `dist/` to
GitHub Pages on every push to `main` (enable Pages → "GitHub Actions" as the
source in repo settings to activate it). The build is a static bundle, so it
also deploys as-is to Vercel or Netlify with no config.
