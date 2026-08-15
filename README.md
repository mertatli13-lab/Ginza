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

- **Steer:** A/D or left/right arrow keys (desktop), on-screen joystick x-axis
  (touch) — turns the character's own facing left/right, relative to
  wherever it's currently pointed, not a fixed world direction
- **Throttle:** W/S or up/down arrow keys (desktop), on-screen joystick
  y-axis (touch) — drives forward/back along the character's current
  facing
- **Jump:** Space / on-screen JUMP button
- **Dash:** Shift / on-screen DASH button

Movement is relative/heading-based, like a vehicle: steering input rotates
`telemetry.facingAngle` at a capped turn rate (`Racer.tsx`) rather than
snapping to an absolute world-space direction, so holding left keeps turning
further left indefinitely and throttle always drives along whatever
direction the character is currently facing. The camera (`CameraRig.tsx`) is
a spring-arm that recomputes its target position fresh every frame directly
from that live facing angle, then chases it with damped position/look-at
lerps — it never caches or re-aims a separate camera angle, so it can't lag
behind or snap when the character turns. Bots (`AIController.tsx`) steer the
same way, via a proportional controller that compares their desired heading
to their own current `facingAngle` rather than instantly snapping to face
their target.

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
→ character select → course select → racing, with the podium's "Character
Select" button looping back to the start of that chain (and its "Next
Course" button jumping straight back into racing on the other course).
`Scene`/`Hud`/`TouchControls`/`Podium` only mount during the `racing` screen,
so the race's physics world, keyboard listener, and touch controls simply
don't exist until a race actually starts. The title screen's Play button is
also the one guaranteed user gesture before a race begins, so it doubles as
the audio-unlock point — browsers refuse to run an `AudioContext` before a
click/tap. Online mode skips course select entirely and always races Toy
Chest Tumble (see "The courses" below) — a second course only exists for the
`selectedCourse` a single client resolves locally, so wiring it through the
network sync layer as well was out of scope for this pass.

Character select renders a small standalone `<Canvas>` per racer card
(`menus/CharacterPreview.tsx`) showing the *exact* in-race styled model,
rotating in place with its normal idle animation — no separate preview asset,
just the same `Character` component fed a telemetry object that's never
registered with a real race.

## The courses

Course geometry, obstacles, pickups, and the AI waypoint path are all bundled
into one `CourseData` object per course (`course/courseTypes.ts`); a small
registry (`course/courses/registry.ts`) maps a `CourseId` to its `CourseData`,
and every component that needs course geometry (`Course.tsx`, `Racer.tsx`,
`Hud.tsx`, `AIController.tsx`, `Scene.tsx`) reads it through one hook,
`course/useActiveCourse.ts` — the player's `selectedCourse` in local mode,
always Toy Chest Tumble online. Both courses run along -Z from their own
spawn point and share the same `PlatformSpec`/`CheckpointSpec`/`PathWaypoint`
architecture; adding a course means writing one new `courses/*.ts` file, not
touching any of those consumers.

**Toy Chest Tumble** (`courses/toyChest.ts`): a toy-chest start pad, four
rising ramps (guard-railed) up to a Snakes & Ladders checkerboard stretch, a
six-platform tilted-book climb, and a checkered finish line over a pink "ball
pit" pad. Three giant dice roll back and forth across the board-game stretch
on staggered, predictable sine-wave rhythms — dodge them or get physically
bumped, no separate hit-detection needed since they're kinematic bodies
Rapier naturally pushes the player out of. Three of the six book platforms
carry a rolling-pencil hazard on top. Every book also has a weight-shift
mechanic: linger on one too long and it tips further in the direction it
already leans, sliding you off unless you jump to the next one.

**Magical Valley** (`courses/magicalValley.ts`): Ginza's home course, and
substantially longer than Toy Chest Tumble — a whole extra section (the
cloud hop) plus a longer ramp climb, cavern, and stepping-stone run than
their Toy Chest equivalents (9 clouds vs nothing, 8 ramps vs 4, a 48-unit
cavern vs 30, 9 petal stones vs 6 books, a 28-unit finish vs 18). A pastel
meadow start, a cloud-hop section of small floating platforms separated by
real gaps (a section Toy Chest Tumble doesn't have at all — every step there
is a timed jump, not a walk), an eight-ramp rainbow climb, a crystal cavern
guarded by five charging unicorns (`obstacles/MagicUnicorn.tsx`) on the same
predictable-sine-wave pattern as Toy Chest's dice (same `DiceSpec`/collider,
just a creature instead of a cube), a nine-platform run of tilting
flower-petal stepping stones (reskinned `TiltingBook`s, four of them guarded
by a shuffling troll — `obstacles/TrollGuard.tsx`, same `PencilSpec`/collider
as Toy Chest's rolling pencils, but turning to face its shuffle direction
instead of barrel-rolling like a log) and a rainbow-arch finish. `Course.tsx`
picks which obstacle component to render per course id, so both courses'
`CourseData.dice`/`.pencils` stay the same shape AIController already knows
how to dodge — only the visual differs. The sky/lighting
(`course/MagicalSky.tsx` — a procedural rainbow arc plus drifting cloud
puffs, all primitive geometry, no image assets) and a brighter pastel
fog/background (`CourseData.background`, read by `Scene.tsx`) swap in
whenever this course is active, replacing Toy Chest's dark background.

**Tavşanya** (`courses/tavsanya.ts`) — "Rabbitopolis": Strawberry's ancestral
home, reached through a rabbit hole hidden in the garden hedge. Deliberately
the biggest, most explorable course, and the *easiest* — wider paths (a
12-unit track vs the other two courses' 8-9), smaller/more forgiving gaps,
and hazards that only ever soft-bump or briefly slow. Five sections: a
momentum-only descending chute with no hazards at all (The Warren Slide,
"pure fun" per the design doc); a field of tumbling carrots to weave around
(Carrot Terrace Fields — `obstacles/TumblingCarrot.tsx`, the same oscillating
`DiceSpec`/collider as Toy Chest's dice and Magical Valley's unicorns, just a
softer/slower tuning); a vertical-traversal beat built around two brand-new
mechanics, a bounce pad that launches a racer onto a market rooftop
(`obstacles/MushroomBouncePad.tsx` + `race/bounceRegistry.ts` — a one-shot
per-racer velocity request the pad drops for `Racer.tsx` to consume and
apply, the same "write to a registry, the owning entity applies it" pattern
`RacerEffects` already uses) and a continuously swaying vine bridge
(`obstacles/SwayingBridge.tsx`, a kinematic sway angle from the same
`oscillationOffset` formula every other moving hazard uses, applied as
rotation instead of translation), plus static `BurrowNPC.tsx` rabbit figures
and market-stall decor for pure atmosphere (The Great Burrow Market); a wide
sprint straightaway with a couple of drifting dandelion-puff hazards
(`obstacles/DriftingPuff.tsx` — a pure sensor, briefly slows on touch via a
new `RacerEffects.slowUntil`, never bumps or fails) and one optional bonus
bush detour with extra buttons a human player can choose to climb up for —
the main lane and the AI waypoint path never leave the ground floor, so it's
a real risk/reward extra, not a shortcut bots need to know about (Clover
Meadow Sprint); and a two-tone firefly-gold-and-petal-pink finish burst at a
glowing pond (The Moonwell Finish — `CourseData.background.finishBurstColor`/
`finishBurstColor2`, read by `Checkpoint.tsx`, which fires a second particle
burst when a course sets one).

Course select shows a short narrative hook once Tavşanya is picked —
Strawberry inviting Ginza through the hedge — a design-doc-called-for "intro
line" kept to a card subtitle rather than a full cutscene system.

Touching a checkpoint sensor updates the respawn point on any course; falling
more than a few units below it teleports you back there — there's no hard
fail state.

## AI rivals

Three bots race the same course as the player, each with a different
personality (`src/game/ai/personalities.ts`):

- **Reckless** — fastest, ignores obstacles entirely, dashes often
- **Steady** — slower but reliable, actively steers around dice/pencils
- **Wildcard** — fast with loose, wobbly steering

On Tavşanya, the roster swaps to `TAVSANYA_PERSONALITIES` — the design doc's
"consider swapping in 1-2 rabbit-specific AI bots unique to this course"
note. Same tuned numbers as the archetypes above (so difficulty and
completion behavior are identical, already verified), just reflavored:
Reckless (already Strawberry-skinned) and Wildcard (already Chiti-skinned)
are both rabbits already, so only Steady swaps its character from Ginza (a
pony, out of place here) to Strawberry too, distinguished by accent color —
all three read as local rabbits without needing a new character model.

Every racer — human or bot — shares the exact same movement/physics code
(`Racer.tsx`); the only thing that differs is what drives its input. The
local player reads keyboard/touch; each bot's `AIController` follows the
active course's own hand-placed waypoint list (`CourseData.path` — every
course is a single straight lane with no branches, so real pathfinding would
be overkill) and produces the exact same `{moveX, moveY, jump, dash}` shape
the keyboard does. That's the swappable `LocalPlayerInput` / `AIController`
interface the design doc calls for; a future `NetworkInput` for online
multiplayer would plug into the same seam without touching `Racer`.

A course-authoring lesson worth keeping in mind for any future course: every
gap in `CourseData.path` needs an explicit `jump: true` flag, or the AI
simply walks off the edge into it forever, retrying the same fall on
respawn — this bit twice during Tavşanya's build (a missing flag at the
Moonwell's approach gap, and separately, Magical Valley's cloud-hop had a
few consecutive platforms meandering far enough sideways that the resulting
diagonal jump distance exceeded what even the fastest character's arc could
reliably cross). Worth an occasional sanity pass on any new course: gap
distance (including sideways drift, not just forward) against
`RUN_SPEED * time-of-flight` at the *slowest* character/bot speed in play.

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
shown again on the podium at the finish. Four power-up types, each with a
distinct chunky silhouette so they read at speed:

- **Yarn Ball** — 3s speed boost (1.5x)
- **Confetti Pop** — 5s shield: obstacle knockback gets overwritten the
  instant the next physics frame runs, instead of blended in and felt as a
  bump. (Horizontal only — a shielded racer can still be bumped vertically,
  which is enough to stop it from being knocked off a platform, the main
  annoyance obstacles cause.)
- **Bell Chime** — 5s magnet: any button within range gets swept in early
- **Dandelion Wish** — a floaty glide-jump: 4s of reduced gravity
  (`Racer.tsx` calls Rapier's own per-body `setGravityScale`, only on an
  actual state change rather than every frame — writing it unconditionally
  every frame measurably disturbed physics timing on the heavier courses,
  enough to throw off tightly-tuned jump gaps) plus a taller jump liftoff
  while it's active. A nice character moment for Strawberry specifically,
  per the design doc.

On Tavşanya, boost/shield/magnet get themed reskins — Carrot Dash, Firefly
Lantern, Clover Charm — same mechanics and durations, different meshes;
`PowerUp.tsx` picks the visual from a `courseId` prop `Course.tsx` passes
through. Dandelion Wish has one shared look regardless of course.

Every racer's power-up state (`RacerEffects`) is a plain mutable object like
telemetry, registered the same way — `Racer` reads it every frame to apply
the boost/shield/float/slow effects, and pickups read every *other* racer's
state to do the magnet's proximity check, all without going through React
re-renders.

"Race Again" on the podium works by bumping a `raceEpoch` counter that keys
the entire `<Physics>` world: every body, collider, pickup, and AI waypoint
index remounts fresh at its spawn on a key change, instead of needing a
bespoke reset method hand-written across a dozen components.

## Characters

Ginza (purple plush pony), Strawberry (pink plush bunny), Chiti (yellow
plush rabbit in green dungaree overalls), and Kusto (white plush gull in a
little red hat) are built procedurally from primitive geometries — no
rigged/imported meshes or animation clips, since this is a code-only
environment with no modeling or animation-capture pipeline. `MeshToonMaterial`
with a hand-built step-ramp `gradientMap` (`characters/toonGradient.ts`, a
tiny code-generated `DataTexture` — no image asset needed) gives the
"Pixar-lite" cel-shaded banding the design doc asks for; big glossy
two-sphere-plus-highlight eyes (`characters/Eye.tsx`) are shared by every
model, and chubby cheek bumps (`characters/CheekPuffs.tsx`) by the three
mammals (skipped for Kusto, whose gull anatomy doesn't have cheeks). Bodies
are built from more than one overlapping sphere (a smaller chest/torso volume
plus a larger rump/hip volume, or for Kusto a body-plus-grey-mantle patch)
rather than one uniform blob, legs get a flattened paw-cap or webbed-foot
sphere instead of ending as a plain peg, and ears/wings get a smaller
two-tone or dark-tipped detail — all cheap primitive-composition tricks for
a more sculpted silhouette without needing actual sculpted geometry or
textures. Kusto is also the one bipedal character (two legs, not four),
distinguishing her silhouette further from the three mammals at a glance.

Each character drives its own idle/run/jump/checkpoint-celebration animation
every frame from the shared `telemetry` object and `raceStore`, entirely
through `Object3D` transforms on nested groups (sine-wave bob, mane/tail/ear
sway) — no `AnimationMixer` or skeleton, since there's nothing to rig. Ginza's
signature move, a joyful rear-up hop, retriggers on every checkpoint she
crosses; Strawberry's long ears droop further back the faster she runs, flap
like wings while airborne, and pop upright on her own checkpoint flourish;
Chiti's alert upright ears twitch independently at all times, her overalls
straps bounce mid-jump, and her checkpoint flourish is a double foot-stomp
bounce (two quick hops instead of one big rear-up or an ear-perk); Kusto
bobs her head with every stride (gulls do this), flaps her wings wide
mid-jump — a literal version of Strawberry's "ears flap like wings" idea,
since Kusto actually has wings — and throws a fast double wing-flap plus a
head-tilt-back for her own checkpoint squawk. `characters/Character.tsx`
picks the model by `characterId` via a small lookup table; `Racer.tsx`'s
physics/movement/collider are unchanged from
earlier phases — only the visual mesh inside `visualRef` was swapped, so
previously tuned jump gaps and obstacle sizing (tuned against the collider)
stay valid. Every racer also carries an `accentColor` ribbon dot so two
racers sharing a character still read apart at a glance. The three bots each
drive a different character (`ai/personalities.ts`: Reckless=Strawberry,
Steady=Ginza, Wildcard=Chiti) — picking the one they leave uncovered (Kusto)
gets the player all four characters represented in a single local race;
picking any of the other three just means sharing that character with one bot.

Each model's colors and a few silhouette details were tuned against photos
of the real plush toys they're based on: Ginza got a forelock tuft between
her ears and a stitched collar band; Strawberry's ear lining is mint (not
pink) with a small bow on top of her head; Chiti got a striped party hat
with a pompom, a big open-mouth grin with a teeth bar, and orange cheek
blush; Kusto's hat became a rounded cap with a brim and a small front patch
instead of a pointed party-hat cone.

Each character also has its own top-speed multiplier (`characters/characterStats.ts`'s
`SPEED_MULTIPLIER` — the same knob `ai/personalities.ts` already gives the
three bots, now exposed to character choice too): Kusto (an actual bird)
and Strawberry (a bouncy bunny) run a bit faster than baseline, Ginza and
Chiti sit at the neutral baseline. Every value is >= 1, so no playable
character is ever slower than the game's own baseline speed. `Scene.tsx`
applies it to both the local player and any online peers based on their
`characterId`; `CharacterSelect.tsx` shows a small "Speed" badge per card
(Standard/Quick/Fastest) derived straight from that same table, so the
tradeoff is visible before picking. The Yarn Ball power-up (+50% for 3s) and
dash (Shift, a short high-speed burst) are the game's other two speed
tools — both already existed and stack with a character's own multiplier.

## Audio & juice

No audio assets or asset pipeline exist in this environment, so every sound
is synthesized with the Web Audio API instead of played from a file:

- `audio/sfx.ts` — short oscillator+envelope tones for jump/land/dash,
  button/power-up pickup, checkpoint, and a four-note finish fanfare. An
  upward frequency sweep reads as a squeaky-toy "boing"; a downward one reads
  as a soft thud — matching the design doc's "these are plush toys" audio
  direction without a single sample file. Jump/land/dash/checkpoint are each
  the *local player's currently selected character's own voice* — a lookup
  table per sound picks different oscillator waveforms/frequency ranges per
  `characterId` (Ginza's original warm sine "boing" stays her signature;
  Strawberry's is lighter/brighter; Chiti's is a punchier square-wave thump;
  Kusto's is a harsher sawtooth chirp, actually bird-like). Checkpoint
  celebration sounds go further and match each character's *visual*
  flourish: a single chime for Ginza/Strawberry's one-beat rear-up/ear-perk,
  a quick two-hit chime for Chiti/Kusto's double-stomp/double-wing-flap.
  Button/power-up/finish stay a single shared sound each — they identify the
  object or the race event, not the racer, so there's nothing to vary by
  character.
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
  App.tsx                  Screen switch (title/character-select/course-select/online-lobby/racing) + mute button
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
      flowStore.ts             Screen state machine + which character/course/mode is selected
    menus/
      TitleScreen.tsx          Title card; Play doubles as the audio-unlock gesture
      CharacterSelect.tsx      Character picker with rotating 3D previews + Race / Race Online
      CourseSelect.tsx         Track picker (local mode only) between character select and racing
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
      characterStats.ts       Per-character top-speed multiplier (SPEED_MULTIPLIER)
      GinzaModel.tsx           Procedural purple-pony model + idle/run/hop animation
      StrawberryModel.tsx      Procedural pink-bunny model + idle/run/ear-flap animation
      ChitiModel.tsx           Procedural yellow-rabbit-in-overalls model + ear-twitch/stomp animation
      KustoModel.tsx           Procedural gull-in-a-hat model + head-bob/wing-flap animation
      Eye.tsx                  Shared big glossy eye (sclera + pupil + highlight)
      CheekPuffs.tsx           Shared chubby cheek-bump face detail
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
      courseTypes.ts           Shared course data shapes (CourseData, PlatformSpec, ...) + CourseId
      useActiveCourse.ts       Hook: resolves the currently-active CourseData (selectedCourse, or
                                 Toy Chest Tumble online)
      MagicalSky.tsx           Magical Valley's decorative rainbow arc + drifting cloud puffs
      BurrowNPC.tsx            Tavşanya's decorative rabbit-toy figure (no collider, pure atmosphere)
      courses/
        toyChest.ts              "Toy Chest Tumble" CourseData: ramps, board, bookshelf, finish
        magicalValley.ts         "Magical Valley" CourseData: cloud hop, ramps, cavern, petal
                                   stones, finish — longer than Toy Chest Tumble
        tavsanya.ts               "Tavşanya" CourseData: slide, carrot fields, market (bounce pad +
                                   vine bridge), clover sprint + bonus detour, Moonwell finish —
                                   the biggest and easiest course
        registry.ts               CourseId -> CourseData lookup (COURSES, COURSE_LIST)
      Course.tsx               Renders whichever CourseData is passed to it
      Platform.tsx             One static box + explicit collider
      Checkpoint.tsx           Sensor trigger -> race store (racer-tagged); optional finish burst
                                 color override(s) per course
      TiltingBook.tsx          Kinematic tilting platform with the weight-shift mechanic
      obstacles/
        RollingDie.tsx          Kinematic cube oscillating on a fixed sine wave (Toy Chest)
        RollingPencil.tsx       Kinematic rolling-log hazard on select platforms (Toy Chest)
        MagicUnicorn.tsx        Same DiceSpec/collider, rendered as a charging unicorn (Magical Valley)
        TrollGuard.tsx          Same PencilSpec/collider, rendered as a shuffling troll (Magical Valley)
        TumblingCarrot.tsx      Same DiceSpec/collider, rendered as a soft-bump carrot (Tavşanya)
        SwayingBridge.tsx       Continuously-swaying walkable platform, new BridgeSpec (Tavşanya)
        MushroomBouncePad.tsx   Launches a racer upward on contact, via bounceRegistry (Tavşanya)
        DriftingPuff.tsx        Pure sensor; brief comedic slow on touch (Tavşanya)
    pickups/
      Button.tsx               Currency pickup; also handles the Bell Chime/Clover Charm magnet sweep-in
      PowerUp.tsx               Yarn Ball / Confetti Pop / Bell Chime / Dandelion Wish — visuals +
                                 effect timers; themed reskins per courseId
    ai/
      personalities.ts         The bot archetypes and their tuning knobs, plus Tavşanya's reflavored roster
      AIController.tsx         Waypoint-following steering -> the same input shape as the keyboard
      Bot.tsx                  Wires one AIController to one Racer
    race/
      raceStore.ts             Per-racer checkpoint progress, respawn, finish order, buttons, raceEpoch
      racerRegistry.ts         Live telemetry registry every Racer announces itself into
      effects.ts               RacerEffects type (speed boost / shield / magnet / float / slow timers)
      effectsRegistry.ts       Live effects registry, mirrors racerRegistry
      bounceRegistry.ts        One-shot per-racer bounce-pad velocity requests
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
