let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let musicGain: GainNode | null = null
let sfxGain: GainNode | null = null
let muted = false

/**
 * Lazily creates the shared AudioContext + bus graph on first use. Browsers
 * require a user gesture before audio can actually play, so this is only
 * ever first called from a click handler (the title screen's Play button).
 */
function ensureContext(): AudioContext {
  if (ctx) return ctx
  ctx = new AudioContext()
  masterGain = ctx.createGain()
  masterGain.gain.value = muted ? 0 : 1
  masterGain.connect(ctx.destination)
  musicGain = ctx.createGain()
  musicGain.gain.value = 0.3
  musicGain.connect(masterGain)
  sfxGain = ctx.createGain()
  sfxGain.gain.value = 0.6
  sfxGain.connect(masterGain)
  return ctx
}

export function getAudioContext(): AudioContext {
  return ensureContext()
}

export function getMusicBus(): GainNode {
  ensureContext()
  return musicGain!
}

export function getSfxBus(): GainNode {
  ensureContext()
  return sfxGain!
}

/** Call from a user-gesture handler — creates the context if needed and
 * resumes it if the browser started it suspended. */
export function unlockAudio() {
  const c = ensureContext()
  if (c.state === 'suspended') void c.resume()
}

export function setMuted(next: boolean) {
  muted = next
  ensureContext()
  masterGain!.gain.value = next ? 0 : 1
}
