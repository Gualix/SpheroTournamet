// Native Web Audio API synthesizer for gamified tournament SFX (100% offline & zero external assets)

let audioCtx: AudioContext | null = null;
let soundEnabled = true;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function toggleAudio(enabled?: boolean): boolean {
  if (enabled !== undefined) {
    soundEnabled = enabled;
  } else {
    soundEnabled = !soundEnabled;
  }
  updateRaceMusicGain();
  return soundEnabled;
}

export function isAudioEnabled(): boolean {
  return soundEnabled;
}

export function playClickSfx() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.06);
}

export function playAdvanceSfx() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Two-tone rising energetic chime
  const freqs = [440, 659.25, 880];
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now + idx * 0.06);

    gain.gain.setValueAtTime(0.12, now + idx * 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + idx * 0.06);
    osc.stop(now + idx * 0.06 + 0.26);
  });
}

export function playChampionFanfare() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Victorious brass-like arpeggio: C4, E4, G4, C5, E5, G5
  const notes = [
    { freq: 261.63, time: 0, dur: 0.18 },
    { freq: 329.63, time: 0.15, dur: 0.18 },
    { freq: 392.00, time: 0.3, dur: 0.22 },
    { freq: 523.25, time: 0.45, dur: 0.25 },
    { freq: 659.25, time: 0.7, dur: 0.35 },
    { freq: 783.99, time: 0.95, dur: 0.7 },
  ];

  notes.forEach(({ freq, time, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + time);

    gain.gain.setValueAtTime(0.15, now + time);
    gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + time);
    osc.stop(now + time + dur + 0.05);
  });
}

export function playRaceCountdownBeep(isGo: boolean = false) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  if (isGo) {
    // High-pitched celebratory GO! sound (880Hz -> 1046Hz)
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.3);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);
  } else {
    // Staccato countdown beep for 3, 2, 1 (440Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }
}

export function playRaceTick() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(900, ctx.currentTime);

  gain.gain.setValueAtTime(0.05, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

export function playRaceFinishHorn() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  // Dual-tone racing horn (587.33Hz + 739.99Hz)
  [587.33, 739.99].forEach(freq => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.75);
  });
}

/* =========================================================================
   ENERGETIC PROCEDURAL RACE MUSIC SYNTHESIZER (134 BPM Electro / Synthwave)
   - 100% Native Web Audio API procedural loop
   - Punchy sub-kick, tight hi-hats, snappy snare
   - Driving synthwave 16th-note bassline
   - Soaring energetic synth lead arpeggio
   - Zero external assets, zero latency, seamless loop
   ========================================================================= */

let raceMusicInterval: number | null = null;
let raceMusicMasterGain: GainNode | null = null;
let isRaceMusicRunning = false;
let isRaceMusicMutedState = false;
let raceMusicStep = 0;
let nextStepTime = 0;
const MUSIC_DEFAULT_VOLUME = 0.22;

function updateRaceMusicGain() {
  if (!raceMusicMasterGain || !audioCtx) return;
  const effectiveGain = soundEnabled && !isRaceMusicMutedState ? MUSIC_DEFAULT_VOLUME : 0.0001;
  try {
    raceMusicMasterGain.gain.setValueAtTime(effectiveGain, audioCtx.currentTime);
  } catch {
    // Ignore audio context state transitions
  }
}

// Bass frequencies for D Minor electro progression
const BASS_NOTES: (number | null)[] = [
  // Bar 1 (0-15): D Minor drive
  73.42, 73.42, 146.83, 73.42, 87.31, 73.42, 98.00, 73.42,
  73.42, 73.42, 146.83, 73.42, 110.00, 98.00, 87.31, 73.42,
  // Bar 2 (16-31): Bb -> C -> D Minor climax
  58.27, 58.27, 116.54, 58.27, 65.41, 65.41, 130.81, 65.41,
  73.42, 73.42, 146.83, 73.42, 110.00, 98.00, 87.31, 82.41,
];

// Melodic lead arpeggio frequencies (soaring energetic synth)
const LEAD_NOTES: (number | null)[] = [
  // Bar 1
  293.66, null, 349.23, null, 440.00, null, 587.33, null,
  523.25, null, 440.00, null, 349.23, null, 392.00, null,
  // Bar 2
  293.66, null, 392.00, null, 466.16, null, 587.33, null,
  659.25, null, 523.25, null, 440.00, null, 523.25, 587.33,
];

function scheduleStepAudio(ctx: AudioContext, masterGain: GainNode, step: number, time: number) {
  const stepDur = 0.1119; // 16th note at ~134 BPM

  // 1. KICK DRUM (Every quarter note: steps 0, 4, 8, 12, 16, 20, 24, 28)
  if (step % 4 === 0) {
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();

    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(145, time);
    kickOsc.frequency.exponentialRampToValueAtTime(42, time + 0.08);

    kickGain.gain.setValueAtTime(0.4, time);
    kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

    kickOsc.connect(kickGain);
    kickGain.connect(masterGain);

    kickOsc.start(time);
    kickOsc.stop(time + 0.12);
  }

  // 2. SNARE / CLAP (Steps 4, 12, 20, 28 - beats 2 and 4)
  if (step % 8 === 4) {
    // Body snap
    const snareOsc = ctx.createOscillator();
    const snareGain = ctx.createGain();
    snareOsc.type = 'triangle';
    snareOsc.frequency.setValueAtTime(220, time);
    snareOsc.frequency.exponentialRampToValueAtTime(80, time + 0.07);

    snareGain.gain.setValueAtTime(0.25, time);
    snareGain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    snareOsc.connect(snareGain);
    snareGain.connect(masterGain);
    snareOsc.start(time);
    snareOsc.stop(time + 0.1);

    // High snappy sizzle
    const sizzleOsc = ctx.createOscillator();
    const sizzleGain = ctx.createGain();
    sizzleOsc.type = 'sawtooth';
    sizzleOsc.frequency.setValueAtTime(1200, time);
    sizzleOsc.frequency.exponentialRampToValueAtTime(300, time + 0.08);

    sizzleGain.gain.setValueAtTime(0.12, time);
    sizzleGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    sizzleOsc.connect(sizzleGain);
    sizzleGain.connect(masterGain);
    sizzleOsc.start(time);
    sizzleOsc.stop(time + 0.09);
  }

  // 3. HI-HAT (Continuous 16th groove with offbeat accents on steps 2, 6, 10, 14...)
  const isOffbeat = step % 4 === 2;
  const hatOsc = ctx.createOscillator();
  const hatGain = ctx.createGain();
  hatOsc.type = 'square';
  hatOsc.frequency.setValueAtTime(isOffbeat ? 9500 : 7800, time);

  hatGain.gain.setValueAtTime(isOffbeat ? 0.09 : 0.035, time);
  hatGain.gain.exponentialRampToValueAtTime(0.001, time + (isOffbeat ? 0.05 : 0.03));

  hatOsc.connect(hatGain);
  hatGain.connect(masterGain);
  hatOsc.start(time);
  hatOsc.stop(time + 0.06);

  // 4. SYNTHWAVE DRIVING BASSLINE
  const bassFreq = BASS_NOTES[step];
  if (bassFreq !== null) {
    const bassOsc = ctx.createOscillator();
    const bassFilter = ctx.createBiquadFilter();
    const bassGain = ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, time);

    // Filter envelope for punchy "pluck"
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(1000, time);
    bassFilter.frequency.exponentialRampToValueAtTime(350, time + stepDur * 0.9);
    bassFilter.Q.setValueAtTime(3.0, time);

    bassGain.gain.setValueAtTime(0.22, time);
    bassGain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 0.95);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(masterGain);

    bassOsc.start(time);
    bassOsc.stop(time + stepDur);
  }

  // 5. LEAD SYNTH ARPEGGIO
  const leadFreq = LEAD_NOTES[step];
  if (leadFreq !== null) {
    const leadOsc = ctx.createOscillator();
    const leadGain = ctx.createGain();

    leadOsc.type = 'triangle';
    leadOsc.frequency.setValueAtTime(leadFreq, time);

    leadGain.gain.setValueAtTime(0.12, time);
    leadGain.gain.exponentialRampToValueAtTime(0.001, time + stepDur * 1.2);

    leadOsc.connect(leadGain);
    leadGain.connect(masterGain);

    leadOsc.start(time);
    leadOsc.stop(time + stepDur * 1.3);
  }
}

export function startRaceMusic() {
  if (isRaceMusicRunning) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // Master Gain for Race Music
  if (!raceMusicMasterGain) {
    raceMusicMasterGain = ctx.createGain();
    raceMusicMasterGain.connect(ctx.destination);
  }

  updateRaceMusicGain();

  isRaceMusicRunning = true;
  raceMusicStep = 0;
  nextStepTime = ctx.currentTime + 0.05;

  const stepDur = 0.1119; // ~134 BPM 16th note

  raceMusicInterval = window.setInterval(() => {
    if (!isRaceMusicRunning || !ctx || !raceMusicMasterGain) return;

    // Lookahead scheduler: schedule notes ahead by 150ms
    while (nextStepTime < ctx.currentTime + 0.15) {
      scheduleStepAudio(ctx, raceMusicMasterGain, raceMusicStep, nextStepTime);
      raceMusicStep = (raceMusicStep + 1) % 32;
      nextStepTime += stepDur;
    }
  }, 30);
}

export function stopRaceMusic() {
  if (!isRaceMusicRunning && !raceMusicInterval) return;

  if (raceMusicInterval !== null) {
    clearInterval(raceMusicInterval);
    raceMusicInterval = null;
  }

  isRaceMusicRunning = false;
  raceMusicStep = 0;

  if (raceMusicMasterGain && audioCtx) {
    try {
      const now = audioCtx.currentTime;
      raceMusicMasterGain.gain.setValueAtTime(raceMusicMasterGain.gain.value, now);
      raceMusicMasterGain.gain.linearRampToValueAtTime(0.0001, now + 0.12);
    } catch {
      // Audio context closing or suspended
    }
  }
}

export function toggleRaceMusicMute(): boolean {
  isRaceMusicMutedState = !isRaceMusicMutedState;
  updateRaceMusicGain();
  return isRaceMusicMutedState;
}

export function setRaceMusicMuted(muted: boolean) {
  isRaceMusicMutedState = muted;
  updateRaceMusicGain();
}

export function isRaceMusicMuted(): boolean {
  return isRaceMusicMutedState;
}

export function isRaceMusicPlaying(): boolean {
  return isRaceMusicRunning && !isRaceMusicMutedState && soundEnabled;
}
