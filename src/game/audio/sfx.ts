import { getAudioContext, getSfxBus } from './audioEngine'

/** One short synthesized tone with a linear-attack/exponential-decay
 * envelope and a frequency sweep — no audio assets in this environment, so
 * every effect is built from an oscillator. A sweep up reads as a bouncy
 * squeaky-toy "boing"; a sweep down reads as a soft thud. */
function tone(freqStart: number, freqEnd: number, duration: number, type: OscillatorType, peak: number) {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freqStart, now)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), now + duration)
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(peak, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  osc.connect(gain)
  gain.connect(getSfxBus())
  osc.start(now)
  osc.stop(now + duration + 0.05)
}

/** Jump liftoff: squeaky-toy "boing" — a quick upward sweep. */
export function playJump() {
  tone(360, 640, 0.16, 'sine', 0.5)
}

/** Landing: a soft downward-sweeping thud/squeak. */
export function playLand() {
  tone(220, 110, 0.12, 'triangle', 0.4)
}

/** Dash burst: a bright, fast sawtooth sweep. */
export function playDash() {
  tone(520, 940, 0.12, 'sawtooth', 0.32)
}

/** Button pickup: a bright single chime. */
export function playButtonCollect() {
  tone(880, 1320, 0.09, 'square', 0.35)
}

/** Power-up pickup: a satisfying two-note "pop". */
export function playPowerUp() {
  tone(660, 990, 0.08, 'square', 0.4)
  setTimeout(() => tone(990, 1320, 0.08, 'square', 0.35), 55)
}

/** Checkpoint crossed: a warm chime, distinct from the button pickup's bright ping. */
export function playCheckpoint() {
  tone(520, 780, 0.16, 'triangle', 0.45)
}

/** Finish line: a short four-note ascending fanfare. */
export function playFinish() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => setTimeout(() => tone(freq, freq, 0.2, 'square', 0.45), i * 90))
}
