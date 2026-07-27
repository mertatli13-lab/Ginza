# Ginza & Strawberry's Plushopolis Grand Prix

A browser-based 3D racing game built with React Three Fiber, Rapier physics,
and Zustand. Plush toys race each other through a giant, toy-scaled house at
night.

## Status

**Phases 0–2 are complete:** scaffold, movement feel, and a greyboxed "Toy
Chest Tumble" course (start → rising ramps → board-game stretch → tilted
bookshelf climb → finish) with checkpoints, a finish line, and fall/respawn
logic. Obstacles (rolling dice, swinging pencils, tilting-book physics), AI
rivals, power-ups, and styled character art all come in later phases —
everything here is still simple colored shapes, no final art.

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
      courseData.ts           Course layout: ramp/platform math, checkpoints, finish
      Course.tsx               Renders the full "Toy Chest Tumble" greybox
      Platform.tsx             One static box + explicit collider
      Checkpoint.tsx           Sensor trigger -> race store
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
