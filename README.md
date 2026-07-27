# Ginza & Strawberry's Plushopolis Grand Prix

A browser-based 3D racing game built with React Three Fiber, Rapier physics,
and Zustand. Plush toys race each other through a giant, toy-scaled house at
night.

## Status

**Phase 0 (scaffold) and Phase 1 (movement feel) are complete.** Everything
else in the design doc — courses, obstacles, AI rivals, power-ups, styled
character art — comes in later phases. Right now this is a single placeholder
capsule on a bare grey plane, and the whole point of this phase is to make
that capsule fun to move around.

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

## Project layout

```
src/
  App.tsx                  Mounts the scene, HUD, and touch controls
  game/
    Scene.tsx               Canvas, lighting, physics world
    Player.tsx              Movement, jump, dash, squash/stretch juice
    CameraRig.tsx            Third-person chase camera
    Ground.tsx               Phase 1 flat plane (grid + physics floor)
    Hud.tsx                  Debug speed/grounded readout
    store.ts                 Zustand store (movement telemetry for the HUD)
    telemetry.ts             Mutable per-frame player state shared with the camera
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
