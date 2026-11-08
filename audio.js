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
  if (name === 'cannon') { noise(t, 0.5, 300, 0.5); tone(90, t, 0.35, 'sine', 0.4, 40); }
  if (name === 'boom') { noise(t, 1.1, 220, 0.6); tone(60, t, 0.8, 'sine', 0.45, 25); }
  if (name === 'crash') { noise(t, 0.6, 600, 0.25); tone(140, t + 0.05, 0.4, 'triangle', 0.15, 60); }
  if (name === 'splash') noise(t, 0.6, 1500, 0.2, 'bandpass');
  if (name === 'chirp') [2600, 3200, 2800].forEach((f, i) => tone(f, t + i * 0.08, 0.07, 'sine', 0.06, f * 1.3));
  if (name === 'crimp') tone(900, t, 0.05, 'square', 0.05, 500);
  if (name === 'miss') tone(200, t, 0.15, 'sawtooth', 0.06, 120);
  if (name === 'sizzle') noise(t, amount, 5000, 0.08, 'highpass');
  if (name === 'ding') [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, t + i * 0.06, 0.4, 'triangle', 0.1));
}

// brass stab for the mambo section: a filtered sawtooth that opens up
function brass(freq, start, dur, vol = 0.06) {
  const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(freq, start);
  f.type = 'lowpass'; f.frequency.setValueAtTime(500, start); f.frequency.exponentialRampToValueAtTime(3200, start + 0.05); f.frequency.exponentialRampToValueAtTime(900, start + dur);
  g.gain.setValueAtTime(0.0001, start); g.gain.exponentialRampToValueAtTime(vol, start + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(f).connect(g).connect(master);
  o.start(start); o.stop(start + dur + 0.02);
}

// ---- dance floor music: a small bank of synthesized tracks, or your own files ----
// Salsa: son clave 3-2, cowbell, conga, anticipated tumbao bass, piano montuno (I-IV-V-IV).
// Bachata: güira, bongo, bass on the 1 and the 4 tap, a requinto-style arpeggio over Am-Dm-E-Am.
const TRACKS = [
  { name: 'salsa', bpm: 186, len: 32, play(i, t, e) {
    // 4 bars over C - F - G - F. i is the eighth note in the 4-bar loop.
    const bar = Math.floor(i / 8), s = i % 8, two = i % 16;
    const root = [48, 53, 55, 53][bar], f = (m) => 440 * 2 ** ((m - 69) / 12);
    if ([0, 3, 6, 10, 12].includes(two)) tone(2500, t, 0.045, 'sine', 0.1); // son clave 3-2
    if (s % 2 === 0) tone(s % 4 === 0 ? 820 : 600, t, 0.08, 'square', s === 0 ? 0.035 : 0.022); // campana
    if (s === 2) tone(340, t, 0.06, 'square', 0.05); // conga slap
    if (s === 6 || s === 7) tone(s === 6 ? 220 : 196, t, 0.18, 'sine', 0.13, 160); // conga open tones
    if (s === 5) noise(t, 0.04, 6000, 0.05, 'highpass'); // a little güiro-ish scratch
    if (s === 3) tone(f(root - 12 + 7), t, e * 2.8, 'triangle', 0.24); // tumbao: the "and" of 2
    if (s === 6) tone(f([53, 55, 53, 48][bar] - 12), t, e * 2.8, 'triangle', 0.24); // the 4, anticipating the next chord
    // piano montuno: syncopated octaves bouncing between chord tones
    const ch = [0, 4, 7, 12, 7, 4, 12, 7], pat = [1, 0, 1, 1, 0, 1, 1, 0];
    if (pat[s]) { const n = f(root + 12 + ch[s]); tone(n, t, 0.16, 'triangle', 0.045); tone(n * 2, t, 0.12, 'triangle', 0.025); }
    // mambo: brass hits on the last bar of the loop
    if (bar === 3 && [0, 3, 5].includes(s)) [0, 4, 7].forEach(k => brass(f(root + 24 + k), t, s === 5 ? 0.45 : 0.18));
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
