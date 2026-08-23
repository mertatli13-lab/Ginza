import { getAudioContext, getSfxBus } from './audioEngine'
import type { CharacterId } from '../characters/Character'

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

/** A short burst of filtered white noise — an oscillator sweep reads as a
 * "boing", not a mechanical click, so footstep-on-keyboard needs its own
 * synthesis: a tiny noise buffer through a bandpass filter, which is what an
 * actual key switch sounds like (a broadband transient, not a pitched tone). */
function noiseClick(centerFreq: number, q: number, duration: number, peak: number) {
  const ctx = getAudioContext()
  const now = ctx.currentTime
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
  const noise = ctx.createBufferSource()
  noise.buffer = buffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = centerFreq
  filter.Q.value = q
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(peak, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
  noise.connect(filter)
  filter.connect(gain)
  gain.connect(getSfxBus())
  noise.start(now)
  noise.stop(now + duration + 0.02)
}

/** A soft, wet two-tone wobble — layering two closely-detuned sine sweeps
 * gives a "squelchy" beating texture a single tone can't, which is most of
 * what reads as "squish" rather than "boing". */
function squish(freqStart: number, freqEnd: number, duration: number, peak: number) {
  tone(freqStart, freqEnd, duration, 'sine', peak)
  tone(freqStart * 1.08, freqEnd * 0.92, duration * 1.15, 'sine', peak * 0.6)
}

/** Footstep on Toy Chest Tumble's keyboard floor: a crisp key-switch click,
 * quiet and pitch-jittered so a running cadence of these reads as ASMR
 * texture, not a metronome. */
export function playFootstepKeyboard() {
  const jitter = 0.85 + Math.random() * 0.3
  noiseClick(2600 * jitter, 3.5, 0.045, 0.16)
}

/** Footstep on Magical Valley/Tavşanya's jelly floor: a soft squish,
 * likewise quiet and jittered for a relaxed ASMR run cadence rather than a
 * repeating loop. */
export function playFootstepJelly() {
  const jitter = 0.9 + Math.random() * 0.2
  squish(260 * jitter, 150 * jitter, 0.1, 0.14)
}

interface ToneParams {
  freqStart: number
  freqEnd: number
  duration: number
  type: OscillatorType
  peak: number
}

function playFromTable(table: Record<CharacterId, ToneParams>, characterId: CharacterId) {
  const p = table[characterId]
  tone(p.freqStart, p.freqEnd, p.duration, p.type, p.peak)
}

// Each character's own "voice" for movement sounds — picked to match their
// build and personality: Ginza's original warm sine-wave boing stays her
// signature, Strawberry gets a lighter/brighter chirp, Chiti a punchier
// square-wave thump (fitting her stomp), Kusto a harsher sawtooth chirp
// (fitting an actual bird).
const JUMP_BY_CHARACTER: Record<CharacterId, ToneParams> = {
  ginza: { freqStart: 360, freqEnd: 640, duration: 0.16, type: 'sine', peak: 0.5 },
  strawberry: { freqStart: 520, freqEnd: 880, duration: 0.12, type: 'triangle', peak: 0.42 },
  chiti: { freqStart: 300, freqEnd: 480, duration: 0.13, type: 'square', peak: 0.42 },
  kusto: { freqStart: 700, freqEnd: 1300, duration: 0.1, type: 'sawtooth', peak: 0.32 },
}

const LAND_BY_CHARACTER: Record<CharacterId, ToneParams> = {
  ginza: { freqStart: 220, freqEnd: 110, duration: 0.12, type: 'triangle', peak: 0.4 },
  strawberry: { freqStart: 300, freqEnd: 150, duration: 0.1, type: 'sine', peak: 0.35 },
  chiti: { freqStart: 200, freqEnd: 90, duration: 0.11, type: 'square', peak: 0.38 },
  kusto: { freqStart: 260, freqEnd: 140, duration: 0.09, type: 'triangle', peak: 0.3 },
}

const DASH_BY_CHARACTER: Record<CharacterId, ToneParams> = {
  ginza: { freqStart: 520, freqEnd: 940, duration: 0.12, type: 'sawtooth', peak: 0.32 },
  strawberry: { freqStart: 600, freqEnd: 1100, duration: 0.1, type: 'square', peak: 0.3 },
  chiti: { freqStart: 400, freqEnd: 850, duration: 0.13, type: 'sawtooth', peak: 0.34 },
  kusto: { freqStart: 800, freqEnd: 1500, duration: 0.09, type: 'sawtooth', peak: 0.28 },
}

/** Jump liftoff: squeaky-toy "boing" — a quick upward sweep, flavored per character. */
export function playJump(characterId: CharacterId) {
  playFromTable(JUMP_BY_CHARACTER, characterId)
}

/** Landing: a soft downward-sweeping thud/squeak, flavored per character. */
export function playLand(characterId: CharacterId) {
  playFromTable(LAND_BY_CHARACTER, characterId)
}

/** Dash burst: a bright, fast sweep, flavored per character. */
export function playDash(characterId: CharacterId) {
  playFromTable(DASH_BY_CHARACTER, characterId)
}

/** Button pickup: a bright single chime — shared across characters, since
 * this is currency feedback, not a character "voice" line. */
export function playButtonCollect() {
  tone(880, 1320, 0.09, 'square', 0.35)
}

/** Power-up pickup: a satisfying two-note "pop" — shared across characters,
 * since it identifies the pickup, not the racer. */
export function playPowerUp() {
  tone(660, 990, 0.08, 'square', 0.4)
  setTimeout(() => tone(990, 1320, 0.08, 'square', 0.35), 55)
}

/** Checkpoint crossed: each character's own celebration flourish, matching
 * their visual one — Ginza and Strawberry get a single warm/light chime
 * (their rear-up hop and ear-perk are single beats); Chiti and Kusto get a
 * quick two-part hit (matching their double-stomp and double wing-flap). */
export function playCheckpoint(characterId: CharacterId) {
  switch (characterId) {
    case 'ginza':
      tone(520, 780, 0.16, 'triangle', 0.45)
      break
    case 'strawberry':
      tone(600, 900, 0.14, 'sine', 0.4)
      break
    case 'chiti':
      tone(500, 700, 0.09, 'square', 0.42)
      setTimeout(() => tone(700, 900, 0.09, 'square', 0.4), 70)
      break
    case 'kusto':
      tone(1200, 700, 0.1, 'sawtooth', 0.4)
      setTimeout(() => tone(900, 1400, 0.08, 'sawtooth', 0.3), 80)
      break
  }
}

/** Finish line: a short four-note ascending fanfare — shared across
 * characters, since this celebrates the race, not any one racer. */
export function playFinish() {
  const notes = [523.25, 659.25, 783.99, 1046.5]
  notes.forEach((freq, i) => setTimeout(() => tone(freq, freq, 0.2, 'square', 0.45), i * 90))
}
