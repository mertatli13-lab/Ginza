import { getAudioContext, getMusicBus } from './audioEngine'

const TEMPO = 128 // bpm
const STEP_DUR = 60 / TEMPO / 2 // eighth notes
// C major pentatonic-ish — no "wrong" notes no matter how the patterns overlap.
const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25]
const BASS_PATTERN = [0, 0, 3, 3, 4, 4, 3, 3] // quarter notes, one octave down
const LEAD_PATTERN = [4, -1, 5, 4, 3, -1, 2, 4, 5, -1, 4, 3, 2, -1, 3, 4] // -1 = rest

let schedulerTimer: ReturnType<typeof setTimeout> | null = null
let nextStepTime = 0
let stepIndex = 0
let running = false

function playNote(freq: number, time: number, duration: number, type: OscillatorType, peak: number) {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(peak, time + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration)
  osc.connect(gain)
  gain.connect(getMusicBus())
  osc.start(time)
  osc.stop(time + duration + 0.02)
}

function scheduleStep(time: number) {
  if (stepIndex % 2 === 0) {
    const degree = BASS_PATTERN[(stepIndex / 2) % BASS_PATTERN.length]
    playNote(SCALE[degree] / 2, time, STEP_DUR * 1.8, 'triangle', 0.22)
  }
  const leadDegree = LEAD_PATTERN[stepIndex % LEAD_PATTERN.length]
  if (leadDegree >= 0) {
    playNote(SCALE[leadDegree], time, STEP_DUR * 0.85, 'square', 0.11)
  }
  stepIndex++
}

// Standard lookahead-scheduler pattern: a JS timer wakes up often (25ms) but
// only schedules Web Audio events a little further ahead (150ms), so actual
// note timing comes from the audio clock and doesn't drift with JS jitter.
function scheduler() {
  const ctx = getAudioContext()
  while (nextStepTime < ctx.currentTime + 0.15) {
    scheduleStep(nextStepTime)
    nextStepTime += STEP_DUR
  }
  schedulerTimer = setTimeout(scheduler, 25)
}

/** Bouncy, playful background loop — "birthday-party-meets-arcade" per the
 * design doc. No music asset in this environment, so it's a small procedural
 * bass+lead pattern instead of a mixed/mastered track. */
export function startMusic() {
  if (running) return
  running = true
  const ctx = getAudioContext()
  nextStepTime = ctx.currentTime + 0.05
  stepIndex = 0
  scheduler()
}

export function stopMusic() {
  running = false
  if (schedulerTimer !== null) {
    clearTimeout(schedulerTimer)
    schedulerTimer = null
  }
}
