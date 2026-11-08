// All sound is synthesized with WebAudio. No audio files to load.
let ctx, master, eng, engGain, engFilt, noiseBuf;
let muted = false;
try { muted = localStorage.getItem('dan.muted') === '1'; } catch {}

export function initAudio() {
  if (ctx) return ctx.resume();
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ctx.destination);

  eng = ctx.createOscillator();
  eng.type = 'sawtooth';
  engFilt = ctx.createBiquadFilter();
  engFilt.type = 'lowpass';
  engFilt.frequency.value = 400;
  engGain = ctx.createGain();
  engGain.gain.value = 0;
  eng.connect(engFilt).connect(engGain).connect(master);
  eng.start();

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('dan.muted', m ? '1' : '0'); } catch {}
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
}

export function engine(speed01) {
  if (!ctx) return;
  const t = ctx.currentTime;
  eng.frequency.setTargetAtTime(38 + speed01 * 85, t, 0.08);
  engFilt.frequency.setTargetAtTime(260 + speed01 * 900, t, 0.08);
  engGain.gain.setTargetAtTime(0.012 + speed01 * 0.035, t, 0.1);
}

function tone(freq, start, dur, type = 'sine', vol = 0.2, slideTo) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(vol, start + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(master);
  o.start(start);
  o.stop(start + dur + 0.02);
}

function noise(start, dur, freq, vol = 0.2, type = 'lowpass') {
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf;
  f.type = type;
  f.frequency.value = freq;
  g.gain.setValueAtTime(vol, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  s.connect(f).connect(g).connect(master);
  s.start(start);
  s.stop(start + dur + 0.02);
}

export function sfx(name, amount = 1) {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  if (name === 'flag') [660, 880, 1320].forEach((f, i) => tone(f, t + i * 0.07, 0.25, 'triangle', 0.12));
  if (name === 'bump') noise(t, 0.12, 180 + 300 * amount, Math.min(0.35, 0.08 + 0.25 * amount));
  if (name === 'horn') { tone(392, t, 0.18, 'square', 0.05); tone(494, t + 0.2, 0.22, 'square', 0.05); }
  if (name === 'whoosh') noise(t, 1.2, 900, 0.18, 'bandpass');
  if (name === 'goal') { noise(t, 1.6, 1200, 0.12, 'bandpass'); [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.09, 0.4, 'square', 0.04)); }
  if (name === 'land') noise(t, 0.08, 120, 0.25 * amount);
  if (name === 'key') tone(1800, t, 0.03, 'square', 0.03);
}

// ---- dance floor music: a small bank of synthesized tracks, or your own files ----
// Salsa: son clave 3-2, cowbell, conga, anticipated tumbao bass, piano montuno (I-IV-V-IV).
// Bachata: güira, bongo, bass on the 1 and the 4 tap, a requinto-style arpeggio over Am-Dm-E-Am.
const TRACKS = [
  { name: 'salsa', bpm: 190, len: 16, play(i, t, e) {
    if ([0, 3, 6, 10, 12].includes(i)) tone(2400, t, 0.05, 'sine', 0.09);
    if (i % 2 === 0) tone(i % 4 === 0 ? 800 : 560, t, 0.07, 'square', 0.025);
    if (i % 4 === 3) tone(210, t, 0.18, 'sine', 0.12, 160);
    const b = [[3, 0], [6, 7], [11, 5], [14, 7]].find(([s]) => s === i);
    if (b) tone(65.4 * 2 ** (b[1] / 12), t, e * 2.6, 'triangle', 0.22);
    if (i % 2 === 1) [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]][Math.floor(i / 4)].forEach(n => tone(261.6 * 2 ** (n / 12), t, 0.12, 'triangle', 0.03));
  } },
  { name: 'bachata', bpm: 128, len: 32, play(i, t, e) {
    const bar = Math.floor(i / 8), s = i % 8;
    noise(t, s % 2 ? 0.04 : 0.07, 7000, s % 2 ? 0.05 : 0.09, 'highpass'); // güira
    if (s === 2 || s === 3) tone(s === 2 ? 340 : 300, t, 0.12, 'sine', 0.1, 220); // bongo
    if (s === 6) tone(420, t, 0.08, 'square', 0.04); // the 4 tap
    const root = [57, 62, 64, 57][bar]; // A D E A (midi)
    const f = (m) => 440 * 2 ** ((m - 69) / 12);
    if (s === 0 || s === 3 || s === 4) tone(f(root - 24 + (s === 3 ? 7 : 0)), t, e * 1.8, 'triangle', 0.2);
    const ch = bar === 2 ? [0, 4, 7, 12] : [0, 3, 7, 12];
    const arp = [0, 1, 2, 3, 2, 1, 2, 3][s];
    tone(f(root + 12 + ch[arp]), t, 0.22, 'triangle', 0.045);
  } },
];
// Optional: put royalty-free files in /music and list them here to use real recordings instead,
// e.g. [{ src: 'music/salsa.mp3', bpm: 180 }]. Leave empty to use the synth bank above.
export const MUSIC = [];

let track = null, trackIdx = -1, songStart = 0, nextStep = 0, timer = 0, fileEl = null;

function schedule() {
  const e = 60 / track.bpm / 2;
  while (nextStep < ctx.currentTime + 0.12) {
    const step = Math.round((nextStep - songStart) / e);
    track.play(step % track.len, nextStep, e);
    nextStep += e;
  }
}

export function salsa(on) {
  if (!ctx || on === !!track) return;
  clearInterval(timer);
  if (fileEl) { fileEl.pause(); fileEl = null; }
  if (!on) { track = null; return; }
  trackIdx = (trackIdx + 1) % (MUSIC.length || TRACKS.length);
  songStart = nextStep = ctx.currentTime + 0.05;
  if (MUSIC.length) {
    const m = MUSIC[trackIdx];
    track = { bpm: m.bpm };
    fileEl = new Audio(m.src);
    fileEl.loop = true;
    ctx.createMediaElementSource(fileEl).connect(master);
    fileEl.play().catch(() => {});
    return;
  }
  track = TRACKS[trackIdx];
  timer = setInterval(schedule, 25);
}

// Beat position in quarter notes, so the dance floor pulses in time with whatever is playing.
export function beat(fallbackSeconds) {
  if (ctx && track) return (ctx.currentTime - songStart) * track.bpm / 60;
  return fallbackSeconds * 2;
}
