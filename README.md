# Ginza & Strawberry's Plushopolis Grand Prix

A browser-based 3D racing game built with React Three Fiber, Rapier physics,
and Zustand. Plush toys race each other through a giant, toy-scaled house at
night.

## Status

**All build phases (0–8) from the design doc are complete**, plus a Phase 9
follow-up: scaffold, movement feel, the greyboxed "Toy Chest Tumble" course,
three AI rivals, buttons + power-ups + podium, the styled/toon-shaded
character art pass, menus/audio/juice polish, online multiplayer (a real
WebSocket relay server plus a `NetworkInput` racer dropping into the same
swappable input seam `AIController` already used — local-testable only for
now; see "Online multiplayer" below), and now the real in-race HUD — a
position indicator, a mini progress bar to the finish line, and a button
counter, replacing the raw speed/grounded/checkpoint-index debug readout
every earlier phase's own testing had leaned on instead.

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build to dist/
npm run lint
npm run server    # WebSocket relay for online mode — run alongside npm run dev
```

## Controls

- **Move:** WASD or arrow keys (desktop), on-screen joystick (touch)
- **Jump:** Space / on-screen JUMP button
- **Dash:** Shift / on-screen DASH button

Camera is a third-person auto-follow chase cam that pulls back and widens FOV
as speed increases. The HUD (`Hud.tsx`) is the minimal Section-9 race HUD:
live position (1st–4th), a mini progress bar to the finish line with a tick
per checkpoint, and the button counter. Progress is continuous, not
checkpoint-stepped — `Racer.tsx` publishes the local player's own
`position.z / FINISH.position[2]` fraction every frame it updates telemetry,
the same "the local player's own frame publishes into a small Zustand
store the HUD reads" pattern rank/buttons already used.

## Menus & flow

A screen state machine (`game/flow/flowStore.ts`) gates the whole app: title
→ character select → racing, with the podium's "Character Select" button
looping back. `Scene`/`Hud`/`TouchControls`/`Podium` only mount during the
`racing` screen, so the race's physics world, keyboard listener, and touch
controls simply don't exist until a race actually starts. The title screen's
Play button is also the one guaranteed user gesture before a race begins, so
it doubles as the audio-unlock point — browsers refuse to run an
`AudioContext` before a click/tap.

Character select renders a small standalone `<Canvas>` per racer card
(`menus/CharacterPreview.tsx`) showing the *exact* in-race styled model,
rotating in place with its normal idle animation — no separate preview asset,
just the same `Character` component fed a telemetry object that's never
registered with a real race.

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

## Online multiplayer

`NetworkRacer` (`game/net/NetworkRacer.tsx`) is the third thing that can sit
in a racer's swappable `inputSource` slot, alongside the keyboard and
`AIController`: it drives the *exact same* `Racer` physics, fed by
`{moveX, moveY, jump, dash}` relayed from a remote browser instead of a bot's
waypoint-following logic. Each connected client fully resimulates every
racer's physics locally from that shared input — there's no server-side
physics at all, `server/index.mjs` (built on `ws`) is a dumb relay that only
tracks who's connected and forwards messages. A low-rate authoritative
`state` broadcast (~10Hz: position, facing, checkpoint/button/finish
progress) both corrects drift beyond a small threshold
(`Racer`'s `getReconcileSnapshot` prop) and mirrors that racer's race
progress into every other client's own `raceStore`, so the local HUD's rank
computation — which just reads whatever's registered — sees it without that
client's own sensors ever touching a remote racer. Button/power-up pickups
are the one thing *not* networked: they're cumulative counters, and properly
syncing exactly which pickup got collected would need the server relaying
pickup identity, not just player state — out of scope for what this phase
asks for (swap `AIController` for `NetworkInput`), so peers simply don't
trigger local pickup collision (`net/isNetworkPeer.ts`).

Flow: title → character select → "Race Online" connects to the relay and
opens `OnlineLobby.tsx` (shows who's connected; anyone present can click
"Start Race"). There's no host/authority — the server just broadcasts
`start` to everyone including the sender, and every client resets its own
`raceStore` and transitions to racing off that same broadcast, symmetrically.
Since every human player is now a peer to every other (not "the player" plus
"bots"), online mode uses its own small set of spawn points
(`ONLINE_SPAWNS` in `Scene.tsx`) instead of the local-mode
player-at-`START_POSITION`-plus-bots-at-`BOT_SPAWNS` split — everyone sorts
the same set of connected racer IDs the same way, so every client
independently computes the same spawn-slot assignment for the same racer
with no coordination needed beyond that shared ordering.

**This is local-testable only** — verified with two browser tabs talking to
a relay running on the same machine as the dev server (`npm run server`
alongside `npm run dev`; the client points at `ws://<page's own
hostname>:8787`). Taking it further:

- **Deploying the relay** so real remote players can connect just needs
  `server/index.mjs` hosted somewhere reachable (a small Node process — Fly,
  Render, a VPS, etc.) and the client's `RELAY_URL` (`net/socket.ts`)
  pointed at it instead of `location.hostname`. No architecture change, only
  a hosting decision and a URL.
- **Real internet latency** would lean on the drift-correction snapshot far
  more than same-machine testing ever exercises it — worth re-tuning
  `RECONCILE_DRIFT_SQ` (`Racer.tsx`) and the broadcast rates
  (`NetworkPublisher.tsx`) against real round-trip times before calling it
  production-ready.

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

## Characters

Ginza (purple plush pony) and Strawberry (pink plush bunny) are built
procedurally from primitive geometries — no rigged/imported meshes or
animation clips, since this is a code-only environment with no modeling or
animation-capture pipeline. `MeshToonMaterial` with a hand-built step-ramp
`gradientMap` (`characters/toonGradient.ts`, a tiny code-generated
`DataTexture` — no image asset needed) gives the "Pixar-lite" cel-shaded
banding the design doc asks for; big glossy two-sphere-plus-highlight eyes
(`characters/Eye.tsx`) are shared by both models.

Each character drives its own idle/run/jump/checkpoint-celebration animation
every frame from the shared `telemetry` object and `raceStore`, entirely
through `Object3D` transforms on nested groups (sine-wave bob, mane/tail/ear
sway) — no `AnimationMixer` or skeleton, since there's nothing to rig. Ginza's
signature move, a joyful rear-up hop, retriggers on every checkpoint she
crosses; Strawberry's long ears droop further back the faster she runs, flap
like wings while airborne, and pop upright on her own checkpoint flourish.
`characters/Character.tsx` picks the model by `characterId`; `Racer.tsx`'s
physics/movement/collider are unchanged from earlier phases — only the
visual mesh inside `visualRef` was swapped, so previously tuned jump gaps and
obstacle sizing (tuned against the collider) stay valid. Every racer also
carries an `accentColor` ribbon dot so two racers sharing a character still
read apart at a glance.

## Audio & juice

No audio assets or asset pipeline exist in this environment, so every sound
is synthesized with the Web Audio API instead of played from a file:

- `audio/sfx.ts` — short oscillator+envelope tones for jump/land/dash,
  button/power-up pickup, checkpoint, and a four-note finish fanfare. An
  upward frequency sweep reads as a squeaky-toy "boing"; a downward one reads
  as a soft thud — matching the design doc's "these are plush toys" audio
  direction without a single sample file.
- `audio/music.ts` — a small procedural bass+lead loop over a pentatonic
  scale, driven by a standard lookahead scheduler (a JS timer wakes up every
  25ms but only schedules Web Audio events ~150ms ahead, so note timing comes
  from the audio clock and doesn't drift with JS jitter).
- `audio/audioEngine.ts` — the shared `AudioContext` + music/sfx gain buses,
  created lazily so nothing touches the Web Audio API before the title
  screen's Play click unlocks it. A mute button (top-right, all screens)
  toggles the master gain.

"Juice" beyond the squash/stretch built in Phase 1:

- **Screen shake** (`juice/screenShake.ts`) — a decaying "trauma" value any
  system can add to; `CameraRig` reads it every frame and applies a random
  offset scaled by trauma², so small bumps stay subtle while a hard landing
  or a dash actually punches. Landing shake scales with how far the fall
  actually was (tracked via the highest y reached since last leaving the
  ground), not a flat jolt on every touchdown.
- **Particle bursts** (`juice/particles.ts` + `Particles.tsx`) — a fixed-size
  pool of 240 recycled particles rendered as one `InstancedMesh` (one draw
  call regardless of how many bursts overlap), fired on button/power-up
  pickups, checkpoints, and the finish line.

Both local-player-only sound effects and the shake are gated on
`isLocalPlayer`/`racerId === LOCAL_PLAYER_ID` — bots trigger the same visual
particle bursts (it's a shared 3D world the camera can see), but not sound or
camera shake, or four AI racers grabbing buttons in the background would
turn into a constant cacophony.

## Project layout

```
server/
  index.mjs                 WebSocket relay (ws) — join/input/state/start, no game logic

src/
  App.tsx                  Screen switch (title/character-select/online-lobby/racing) + mute button
  net/
    protocol.ts              Client<->server message shapes
    socket.ts                Raw WebSocket connection, one shared instance
    networkStore.ts           Reactive connection status + roster, for lobby UI
    networkClient.ts          Imperative per-peer input/state registry + message routing
    isNetworkPeer.ts           Helper: does this racerId belong to a connected peer
  game/
    net/
      NetworkRacer.tsx          The NetworkInput racer: same Racer physics, network-relayed input
      NetworkPublisher.tsx       Publishes the local player's own input + state to peers
    flow/
      flowStore.ts             Screen state machine + which character/mode is selected
    menus/
      TitleScreen.tsx          Title card; Play doubles as the audio-unlock gesture
      CharacterSelect.tsx      Character picker with rotating 3D previews + Race / Race Online
      OnlineLobby.tsx          Waiting room: who's connected, Start Race for everyone
      CharacterPreview.tsx     One racer's styled model in a small standalone Canvas
    audio/
      audioEngine.ts           Shared AudioContext + music/sfx gain buses, mute
      audioStore.ts            Reactive mute flag for the mute button
      sfx.ts                   Synthesized jump/land/dash/pickup/checkpoint/finish tones
      music.ts                 Procedural bass+lead background loop (lookahead scheduler)
      MuteButton.tsx           Fixed top-right mute toggle, visible on every screen
    juice/
      screenShake.ts           Decaying "trauma" value; CameraRig reads it every frame
      particles.ts             Fixed-size recycled particle pool + spawnBurst()
      Particles.tsx            Renders the pool as one InstancedMesh
    Scene.tsx               Canvas, lighting, physics world, spawns the player + bots/peers
    Racer.tsx                Shared movement/physics body for every racer (human or bot)
    characters/
      Character.tsx           Picks a racer's styled model by characterId
      GinzaModel.tsx           Procedural purple-pony model + idle/run/hop animation
      StrawberryModel.tsx      Procedural pink-bunny model + idle/run/ear-flap animation
      Eye.tsx                  Shared big glossy eye (sclera + pupil + highlight)
      toonGradient.ts          Shared step-ramp DataTexture for MeshToonMaterial banding
      animState.ts             Shared checkpoint-celebration timing logic
    CameraRig.tsx            Third-person chase camera (follows the local player) + shake
    Hud.tsx                  Rank, progress bar to the finish line, button counter
    Podium.tsx               Post-race screen: placement, buttons earned, Race Again
    Confetti.tsx             CSS confetti burst for the podium
    format.ts                Shared `ordinal()` formatter (1st, 2nd, 3rd, ...)
    store.ts                 Zustand store (course progress + rank telemetry for the HUD)
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
