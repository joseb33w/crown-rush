// Tiny WebAudio sfx synth — no assets, unlocked on first user gesture.
let ctx = null;
let master = null;
let enabled = true;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { enabled = false; return; }
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  if (ctx.state === 'suspended') ctx.resume();
}

function blip(freq, dur, type = 'square', vol = 0.3, slideTo = null) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noise(dur, vol = 0.3, hp = 600) {
  if (!enabled || !ctx) return;
  const t0 = ctx.currentTime;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'highpass';
  filt.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(filt).connect(g).connect(master);
  src.start(t0);
}

export const sfx = {
  deploy: () => blip(220, 0.16, 'square', 0.25, 440),
  deployBig: () => { blip(120, 0.22, 'sawtooth', 0.3, 70); noise(0.18, 0.2, 300); },
  hit: () => blip(320, 0.05, 'square', 0.12, 220),
  shoot: () => blip(680, 0.06, 'triangle', 0.14, 420),
  spell: () => { blip(180, 0.4, 'sawtooth', 0.3, 60); noise(0.45, 0.32, 250); },
  death: () => blip(200, 0.12, 'triangle', 0.16, 90),
  towerHit: () => blip(160, 0.08, 'square', 0.18, 120),
  towerFall: () => { blip(90, 0.6, 'sawtooth', 0.4, 40); noise(0.7, 0.5, 180); },
  crown: () => { blip(523, 0.1, 'square', 0.25); setTimeout(() => blip(784, 0.16, 'square', 0.25), 90); },
  elixir: () => blip(880, 0.05, 'sine', 0.08),
  win: () => { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'square', 0.28), i * 110)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'sawtooth', 0.26), i * 130)); },
  select: () => blip(560, 0.04, 'sine', 0.1),
  error: () => blip(140, 0.1, 'square', 0.18, 110),
};
