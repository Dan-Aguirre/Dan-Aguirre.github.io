import { pack, pickLang, saveLang, LANG_NAMES } from './content.js';
import { createWorld } from './world.js';
import { GARAGE } from './vehicles.js';
import { initAudio, setMuted, isMuted, sfx } from './audio.js';
import { createTerminal } from './term.js';
import { renderSection } from './render.js';
import { flags, capture, onFlagChange, TOTAL } from './flags.js';
import { track } from './track.js';

const $ = (s) => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;
const store = { get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
let lang = pickLang(), T = pack(lang);
track(location.pathname, document.title);

// No WebGL? Straight to the readable version.
if (!document.createElement('canvas').getContext('webgl2')) location.replace('cv.html?nowebgl=1&lang=' + lang);

// ---------- progression: a suggested route, but go wherever ----------
const ROUTE = {
  desk: ['about', 'work', 'comps', 'certs', 'lab', 'teach', 'biz', 'terminal', 'contact'],
  out: ['familia', 'dance', 'lake', 'pitch', 'gym', 'summit', 'fire', 'hammock', 'race'],
};
const seen = new Set(store.get('dan.seen', []));
const markSeen = (id) => { if (seen.has(id)) return; seen.add(id); store.set('dan.seen', [...seen]); updateProgress(); };

// ---------- achievements ----------
const ach = new Set(store.get('dan.ach', []));
function achieve(id) {
  if (ach.has(id) || !T.ui.achs[id]) return;
  ach.add(id);
  store.set('dan.ach', [...ach]);
  setTimeout(() => toast(`🏆 ${T.ui.ach}: ${T.ui.achs[id]}`, 'ach'), 300);
  sfx('ding');
  track('ach/' + id, 'achievement ' + id, true);
}
const tankUnlocked = () => flags().size >= 10 || store.get('dan.tank', false);

// ---------- i18n for static UI ----------
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = e.dataset.t.split('.').reduce((o, k) => o?.[k], T) ?? e.textContent; });
  $('#keys').replaceChildren(...(touch ? [Object.assign(document.createElement('span'), { textContent: T.ui.touch })] : [...T.ui.keys, ['F', 'fire'], ['V', T.ui.garage.toLowerCase()], ['M', T.ui.map.toLowerCase()]].map(([k, v]) => {
    const s = document.createElement('span');
    const kbd = document.createElement('kbd'); kbd.textContent = k;
    s.append(kbd, ' ' + v);
    return s;
  })));
  document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.querySelectorAll('#recruiterLink, .recruiter').forEach(a => { a.href = 'cv.html?lang=' + lang; });
  $('#flagBtn').title = T.ui.flagHint;
  world?.refreshLabels();
  if (zone && T.s[zone]) showCard(zone);
  updatePrompt();
  updateProgress();
  buildGarage();
}
function setLang(l) {
  lang = l; T = pack(l); saveLang(l);
  track('lang/' + l, 'lang ' + l, true);
  applyLang();
}
for (const l of Object.keys(LANG_NAMES)) {
  const b = document.createElement('button');
  b.textContent = LANG_NAMES[l];
  b.dataset.lang = l;
  b.addEventListener('click', () => setLang(l));
  $('.lang').append(b);
}

// ---------- toasts (queued so achievements don't stomp on flags) ----------
const toasts = [];
let toastBusy = false;
function toast(text, cls = '') {
  toasts.push([text, cls]);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const n = toasts.shift();
  const t = $('#toast');
  if (!n) { toastBusy = false; return; }
  toastBusy = true;
  t.textContent = n[0];
  t.className = 'toast show ' + n[1];
  setTimeout(() => { t.className = 'toast ' + n[1]; setTimeout(nextToast, 350); }, toasts.length ? 2200 : 3200);
}

// ---------- the world ----------
const input = { up: false, down: false, left: false, right: false, boost: false, brake: false, joy: { active: false, x: 0, y: 0 } };
let world = null, zone = null, goals = 0, inBoat = false;

function showCard(id) {
  const c = $('#card');
  renderSection(id, T, c.querySelector('.card-body'), { heading: 'h2' });
  c.classList.add('show');
  c.querySelector('.card-body').scrollTop = 0;
}
const hideCard = () => $('#card').classList.remove('show');

function updatePrompt() {
  const p = $('#prompt');
  const a = zone === 'terminal' ? T.ui.termAct : zone === 'fire' ? T.ui.cookAct : inBoat ? T.ui.fishAct : null;
  const msg = a || (zone === 'window' ? T.ui.windowAct : zone === 'portal' ? T.ui.portalHint : '');
  p.replaceChildren();
  if (a) { const k = document.createElement('kbd'); k.textContent = touch ? '👆' : 'E'; p.append(k, ' ' + a); } else p.textContent = msg;
  p.classList.toggle('show', !!msg);
  p.classList.toggle('act', !!a);
  p.disabled = !a;
}
function onZone(id) {
  zone = id;
  if (id && T.s[id]) { showCard(id); markSeen(id); } else hideCard();
  if (id === 'terminal') markSeen('terminal');
  updatePrompt();
  updateProgress();
}
function act() {
  if (zone === 'terminal') openTerm();
  else if (zone === 'fire') openCook();
  else if (inBoat) world?.fish();
}

function updateProgress() {
  if (!world) return;
  const w = world.world, route = ROUTE[w];
  const next = route.find(id => !seen.has(id));
  const done = route.filter(id => seen.has(id)).length;
  $('#progress .count').textContent = `${done}/${route.length}`;
  $('#progress .where').textContent = w === 'desk' ? T.ui.deskWorld : T.ui.outWorld;
  const target = next || (w === 'desk' ? 'window' : null);
  $('#progress .next').textContent = target ? '→ ' + (target === 'window' ? T.places.outside : T.places[target]) : '✓';
  $('#progress').style.setProperty('--p', done / route.length);
  world.setGuide(target);
}

function warp(lines) {
  const ov = $('#warp'), out = ov.querySelector('pre');
  out.textContent = '';
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('on'));
  lines.forEach((l, i) => setTimeout(() => { out.textContent += l + '\n'; }, 250 + i * 330));
  return 250 + lines.length * 330 + 250;
}
function onTransition(to, mid, done) {
  hideCard();
  const total = warp(to === 'out' ? T.ui.toOutside : T.ui.toDesk);
  setTimeout(() => { mid(); track(to === 'out' ? 'world/outside' : 'world/desk', to, true); }, total);
  setTimeout(() => $('#warp').classList.remove('on'), total + 200);
  setTimeout(() => { $('#warp').hidden = true; done(); }, total + 800);
}
function resetMap() {
  try { sessionStorage.setItem('dan.autostart', '1'); } catch {}
  location.reload();
}

// ---------- terminal ----------
const term = createTerminal({
  root: $('#term'),
  getT: () => T,
  world: { setLaptop: (l) => world?.setLaptop(l), teleport: (id) => world?.teleport(id) },
  act: {
    destroy() { closeTerm(); achieve('rmrf'); setTimeout(() => world?.destroy(), 400); },
    unlockTank() { store.set('dan.tank', true); toast(T.ui.tankUnlocked, 'big'); achieve('tank'); buildGarage(); },
    garage: () => { closeTerm(); openGarage(); },
    achievements: () => Object.keys(T.ui.achs).map(k => `[${ach.has(k) ? 'x' : ' '}] ${T.ui.achs[k]}`),
    progress: () => ({ flags: flags().size, total: TOTAL, seen: seen.size, places: ROUTE.desk.length + ROUTE.out.length, ach: ach.size, achTotal: Object.keys(T.ui.achs).length }),
    duck: () => { world?.setVehicle('duck'); achieve('duck'); },
  },
  setLang,
  onClose: () => closeTerm(),
});
function openTerm() { if (!world) return; term.open(); world.setControls(false); track('terminal', 'terminal', true); }
function closeTerm() { term.close(); world?.setControls(true); }

// ---------- garage ----------
function buildGarage() {
  const list = $('#garage .rides');
  list.replaceChildren();
  for (const k of GARAGE) {
    const b = document.createElement('button');
    const locked = k === 'tank' && !tankUnlocked();
    b.className = 'ride' + (world?.vehicle === k ? ' on' : '') + (locked ? ' locked' : '');
    const n = document.createElement('b'); n.textContent = T.ui.vehicles[k];
    b.append(n);
    if (locked) { const s = document.createElement('small'); s.textContent = '🔒 ' + T.ui.locked; b.append(s); }
    b.disabled = locked;
    b.addEventListener('click', () => { world.setVehicle(k); closeGarage(); updateTankBar(); buildGarage(); track('ride/' + k, 'ride', true); });
    list.append(b);
  }
}
function openGarage() { if (!world) return; buildGarage(); $('#garage').hidden = false; world.setControls(false); }
function closeGarage() { $('#garage').hidden = true; world?.setControls(true); }
function updateTankBar() { $('#tankbar').hidden = world?.vehicle !== 'tank'; }

// ---------- Cuban empanadas: crimp with a fork, then fry without burning ----------
let cook = null;
function openCook() {
  if (!world || cook) return;
  world.setControls(false);
  const ov = $('#cook');
  ov.hidden = false;
  const emp = ov.querySelector('.emp'), dots = ov.querySelector('.dots'), fork = ov.querySelector('.fork'), bar = ov.querySelector('.frybar'), msg = ov.querySelector('.msg');
  dots.replaceChildren();
  const spots = [0.1, 0.3, 0.5, 0.7, 0.9].map(x => { const d = document.createElement('i'); d.style.left = (x * 100) + '%'; d.style.top = (100 - Math.sin(x * Math.PI) * 92) + 'px'; dots.append(d); return { x, d, done: false }; });
  emp.style.background = '#f3d9a0';
  emp.classList.remove('frying');
  bar.hidden = true;
  fork.hidden = false;
  msg.textContent = T.ui.cookCrimp;
  cook = { phase: 'crimp', t0: performance.now(), spots, miss: 0, fry: 0, done: false, pos: 0.5 };
  const loop = () => {
    if (!cook) return;
    const t = (performance.now() - cook.t0) / 1000;
    if (cook.phase === 'crimp') {
      cook.pos = 0.5 + Math.sin(t * 2.2) * 0.48;
      fork.style.left = (cook.pos * 100) + '%';
      fork.style.top = (102 - Math.sin(cook.pos * Math.PI) * 92) + 'px';
    } else if (cook.phase === 'fry' && !cook.done) {
      cook.fry = Math.min(1, (t - cook.fryStart) / 6);
      const f = cook.fry;
      emp.style.background = f < 0.45 ? mix('#f3d9a0', '#e3a33f', f / 0.45) : f < 0.75 ? mix('#e3a33f', '#9c5a22', (f - 0.45) / 0.3) : mix('#9c5a22', '#2e1d12', (f - 0.75) / 0.25);
      bar.querySelector('i').style.left = (f * 100) + '%';
      if (f >= 1) cookPress();
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  track('cook', 'cook', true);
}
function mix(a, b, k) { const p = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const x = p(a), y = p(b); return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * k)).join(',')})`; }
function cookPress() {
  if (!cook || cook.done) return;
  const ov = $('#cook'), emp = ov.querySelector('.emp');
  if (cook.phase === 'crimp') {
    const hit = cook.spots.find(s => !s.done && Math.abs(s.x - cook.pos) < 0.07);
    if (hit) { hit.done = true; hit.d.classList.add('done'); sfx('crimp'); } else { cook.miss++; sfx('miss'); emp.classList.add('shake'); setTimeout(() => emp.classList.remove('shake'), 300); }
    if (cook.spots.every(s => s.done) || cook.miss >= 4) {
      cook.phase = 'fry';
      cook.fryStart = (performance.now() - cook.t0) / 1000;
      ov.querySelector('.fork').hidden = true;
      ov.querySelector('.frybar').hidden = false;
      emp.classList.add('frying');
      ov.querySelector('.msg').textContent = T.ui.cookFry;
      sfx('sizzle', 6);
    }
    return;
  }
  if ((performance.now() - cook.t0) / 1000 - cook.fryStart < 0.8) return; // don't let a leftover tap pull it out raw
  cook.done = true;
  const crimped = cook.spots.filter(s => s.done).length, f = cook.fry;
  const fryScore = f >= 0.45 && f < 0.75 ? 3 : f < 0.45 ? 1 : f < 0.87 ? 1.5 : 0;
  const score = crimped - cook.miss * 0.5 + fryScore;
  const r = score >= 7 ? 0 : score >= 4 ? 1 : 2;
  emp.classList.remove('frying');
  ov.querySelector('.msg').textContent = T.ui.cookResults[r];
  if (r === 0) achieve('chef');
  setTimeout(closeCook, 2600);
}
function closeCook() { $('#cook').hidden = true; cook = null; world?.setControls(true); }

// ---------- minimap with fog of war ----------
const fogCanvas = document.createElement('canvas');
fogCanvas.width = fogCanvas.height = 96;
const fogImg = fogCanvas.getContext('2d').createImageData(96, 96);
for (let i = 0; i < 96 * 96; i++) { fogImg.data[i * 4] = 18; fogImg.data[i * 4 + 1] = 20; fogImg.data[i * 4 + 2] = 32; }
function drawMap(cv, big) {
  if (!world) return [];
  const w = world.world, d = world.mapData(w), g = cv.getContext('2d');
  const W = cv.width, H = cv.height, ar = d.img.width / d.img.height;
  const mw = ar >= W / H ? W : H * ar, mh = mw / ar, ox = (W - mw) / 2, oy = (H - mh) / 2;
  g.clearRect(0, 0, W, H);
  g.imageSmoothingEnabled = false;
  g.drawImage(d.img, ox, oy, mw, mh);
  // fog: unexplored cells darken, smoothing gives soft edges
  for (let i = 0; i < d.explored.length; i++) fogImg.data[i * 4 + 3] = d.explored[i] ? 0 : 205;
  fogCanvas.getContext('2d').putImageData(fogImg, 0, 0);
  g.imageSmoothingEnabled = true;
  g.drawImage(fogCanvas, ox, oy, mw, mh);
  const [x0, z0, x1, z1] = d.bounds;
  const X = (x) => ox + (x - x0) / (x1 - x0) * mw, Z = (z) => oy + (z - z0) / (z1 - z0) * mh;
  const pts = [];
  for (const p of d.places) {
    const px = X(p.x), py = Z(p.z), done = seen.has(p.id) || p.id === 'spawn' || p.id === 'outside';
    g.beginPath(); g.arc(px, py, big ? 7 : 3.5, 0, 7);
    g.fillStyle = done ? '#ff5a2a' : '#ffffff'; g.fill();
    g.lineWidth = big ? 2 : 1; g.strokeStyle = '#12141f'; g.stroke();
    if (big) { g.font = '600 13px "IBM Plex Mono", monospace'; g.lineWidth = 4; g.strokeStyle = 'rgba(18,20,31,.85)'; g.fillStyle = '#ffffff'; const n = T.places[p.id] || p.id; g.strokeText(n, px + 11, py + 4); g.fillText(n, px + 11, py + 4); }
    pts.push({ id: p.id, x: px, y: py });
  }
  const c = world.car();
  g.save(); g.translate(X(c.x), Z(c.z)); g.rotate(-c.a + Math.PI);
  const s = big ? 1.5 : 1;
  g.beginPath(); g.moveTo(0, -6 * s); g.lineTo(4 * s, 5 * s); g.lineTo(-4 * s, 5 * s); g.closePath();
  g.fillStyle = '#ffd23f'; g.fill(); g.strokeStyle = '#12141f'; g.lineWidth = 1.5; g.stroke();
  g.restore();
  return pts;
}
let mapPts = [];
function openMap() {
  if (!world) return;
  $('#bigmap').hidden = false;
  world.setControls(false);
  mapPts = drawMap($('#bigmap canvas'), true);
  track('map', 'map', true);
}
function closeMap() { $('#bigmap').hidden = true; world?.setControls(true); }
$('#bigmap canvas').addEventListener('click', (e) => {
  const cv = e.currentTarget, r = cv.getBoundingClientRect();
  const x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
  const hit = mapPts.reduce((b, p) => { const d = Math.hypot(p.x - x, p.y - y); return d < 22 && (!b || d < b.d) ? { ...p, d } : b; }, null);
  if (hit) { closeMap(); world.teleport(hit.id); }
});
setInterval(() => { if (document.body.classList.contains('playing') && !touch && $('#bigmap').hidden) drawMap($('#minimap'), false); }, 150);

// ---------- flags ----------
function updateFlags() { $('#flagCount').textContent = `${flags().size}/${TOTAL}`; }
onFlagChange(() => {
  updateFlags();
  const b = $('#flagBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  if (flags().size === 10 && !store.get('dan.tank', false)) setTimeout(() => { toast(T.ui.tankUnlocked, 'big'); achieve('tank'); buildGarage(); }, 1500);
  if (flags().size === TOTAL) setTimeout(() => toast(T.ui.allFlags, 'big'), 2500);
});
updateFlags();

function fmt(s) { const m = Math.floor(s / 60); return `${m}:${(s % 60).toFixed(2).padStart(5, '0')}`; }
let lapT = 0;
async function boot() {
  const fonts = ['800 64px Archivo', '700 64px Archivo', '600 44px Caveat', '500 28px "IBM Plex Mono"', '700 54px "IBM Plex Mono"'];
  await Promise.race([Promise.all(fonts.map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 3000))]);
  world = createWorld($('#scene'), {
    input,
    labelsEl: $('#labels'),
    labelFor: (id) => (T.s[id]?.label) || (id === 'terminal' ? '~/terminal' : id === 'window' ? '~/outside →' : id === 'portal' ? '~/desk' : id === 'fuego' ? T.ui.fuego : id),
    onZone,
    onFlag: (id, text) => { if (capture(id)) toast(`⚑ ${T.ui.flag}: ${text}`, 'flag'); },
    onToast: (k) => toast(T.ui[k]),
    onWorld: () => { updateProgress(); },
    onGoal: () => { goals++; toast(`${T.ui.goal}  ×${goals}`, 'big'); achieve('goal'); track('goal', 'goal', true); },
    onTransition,
    onVehicle: () => updateTankBar(),
    onAchieve: achieve,
    onQuetzal: () => achieve('quetzal'),
    onBoat: (b) => { inBoat = b; if (b) achieve('swim'); updatePrompt(); },
    onCatch: () => { const f = T.ui.fishes[Math.floor(Math.random() * T.ui.fishes.length)]; toast(`🎣 ${T.ui.caught} ${f}!`); achieve('fish'); },
    onRace: (r) => {
      const el = $('#lap');
      if (!r) { el.hidden = true; return; }
      el.hidden = false;
      if (r.lap) { toast(`🏁 ${T.ui.lap} ${fmt(r.lap)}`, 'big'); achieve('lap'); }
      const now = performance.now();
      if (r.lap || now - lapT > 90) { lapT = now; el.textContent = `${T.ui.lap} ${fmt(r.t ?? r.lap)}${r.best ? `  ·  ${T.ui.best} ${fmt(r.best)}` : ''}`; }
    },
    onDestroyed: () => {
      warp(['rm: it is gone. all of it.', 'restoring from backup ...', '(always keep backups)']);
      setTimeout(resetMap, 2400);
    },
  });
  world.markFlags(flags());
  applyLang();
  updateTankBar();
  document.body.classList.add('ready');
  $('#start').disabled = false;
  let auto = false;
  try { auto = sessionStorage.getItem('dan.autostart') === '1'; sessionStorage.removeItem('dan.autostart'); } catch {}
  if (auto) {
    start();
    const wake = () => { initAudio(); removeEventListener('keydown', wake); removeEventListener('pointerdown', wake); };
    addEventListener('keydown', wake); addEventListener('pointerdown', wake);
  }
}

function start() {
  if (document.body.classList.contains('playing')) return;
  initAudio();
  $('#intro').classList.add('gone');
  document.body.classList.add('playing');
  world.start();
  updateProgress();
  track('start', 'start', true);
  setTimeout(() => $('#intro')?.remove(), 900);
}
$('#start').addEventListener('click', start);

// ---------- HUD buttons ----------
$('#cardClose').addEventListener('click', hideCard);
$('#prompt').addEventListener('click', act);
$('#termBtn').addEventListener('click', () => (term.isOpen ? closeTerm() : openTerm()));
$('#termClose').addEventListener('click', () => closeTerm());
$('#placesBtn').addEventListener('click', openMap);
$('#minimap').addEventListener('click', openMap);
$('#mapClose').addEventListener('click', closeMap);
$('#garageBtn').addEventListener('click', () => ($('#garage').hidden ? openGarage() : closeGarage()));
$('#garageClose').addEventListener('click', closeGarage);
$('#resetMap').addEventListener('click', resetMap);
$('#fireBtn').addEventListener('click', () => world?.fire());
$('#cook').addEventListener('pointerdown', (e) => { if (!e.target.closest('.x')) cookPress(); });
$('#cookClose').addEventListener('click', closeCook);
$('#flagBtn').addEventListener('click', () => { openTerm(); $('#term input').value = 'flags'; $('#term form').requestSubmit(); });
const snd = $('#soundBtn');
const paintSound = () => { snd.setAttribute('aria-pressed', String(!isMuted())); snd.querySelector('i').textContent = isMuted() ? '♪̸' : '♪'; };
snd.addEventListener('click', () => { setMuted(!isMuted()); paintSound(); });
paintSound();
document.addEventListener('click', (e) => { const a = e.target.closest('[data-track]'); if (a) track(a.dataset.track, a.dataset.track, true); });

// ---------- keyboard ----------
const KEYS = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'boost', ShiftRight: 'boost', Space: 'brake' };
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
let kon = 0, movedOnce = false;
addEventListener('keydown', (e) => {
  if (term.isOpen || e.target.closest?.('input')) return;
  if (cook) { if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); cookPress(); } if (e.code === 'Escape') closeCook(); return; }
  if (!$('#bigmap').hidden || !$('#garage').hidden) { if (e.code === 'Escape' || e.code === 'KeyM' || e.code === 'KeyV') { closeMap(); closeGarage(); } return; }
  kon = e.code === KONAMI[kon] ? kon + 1 : (e.code === KONAMI[0] ? 1 : 0);
  if (kon === KONAMI.length) { kon = 0; world?.setVehicle('duck'); achieve('duck'); toast('🦆 quack mode'); track('konami', 'konami', true); }
  if (KEYS[e.code]) {
    input[KEYS[e.code]] = true; e.preventDefault();
    if (!movedOnce && document.body.classList.contains('playing')) { movedOnce = true; setTimeout(() => $('#keys').classList.add('fade'), 8000); }
  }
  if (!document.body.classList.contains('playing')) { if (e.code === 'Enter' && !$('#start').disabled) start(); return; }
  if (e.code === 'KeyE' || e.code === 'Enter') act();
  if (e.code === 'KeyF') world?.fire();
  if (e.code === 'KeyR') world?.reset();
  if (e.code === 'KeyH') world?.honk();
  if (e.code === 'KeyV' || e.code === 'KeyG') openGarage();
  if (e.code === 'KeyM') openMap();
  if (e.code === 'KeyT' || e.code === 'Backquote') { e.preventDefault(); openTerm(); }
  if (e.code === 'Escape') hideCard();
});
addEventListener('keyup', (e) => { if (KEYS[e.code]) input[KEYS[e.code]] = false; });
addEventListener('blur', () => { for (const k of Object.values(KEYS)) input[k] = false; input.joy.active = false; });

// ---------- touch / mouse drag: hold anywhere and drag toward where you want to go ----------
const joy = $('#joy');
let jid = null, jx = 0, jy = 0;
const canvas = $('#scene');
canvas.addEventListener('pointerdown', (e) => {
  if (!document.body.classList.contains('playing') || term.isOpen) return;
  e.preventDefault();
  jid = e.pointerId; jx = e.clientX; jy = e.clientY;
  canvas.setPointerCapture(jid);
  input.joy.active = true; input.joy.x = input.joy.y = 0;
  joy.style.transform = `translate(${jx}px, ${jy}px)`;
  joy.classList.add('on');
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== jid) return;
  const dx = e.clientX - jx, dy = e.clientY - jy, m = Math.hypot(dx, dy), k = Math.min(1, m / 60);
  input.joy.x = m ? dx / m * k : 0; input.joy.y = m ? dy / m * k : 0;
  joy.querySelector('i').style.transform = `translate(${input.joy.x * 34}px, ${input.joy.y * 34}px)`;
});
const endJoy = (e) => { if (e.pointerId !== jid) return; jid = null; input.joy.active = false; joy.classList.remove('on'); joy.querySelector('i').style.transform = ''; };
canvas.addEventListener('pointerup', endJoy);
canvas.addEventListener('pointercancel', endJoy);

// ---------- for the people reading the source ----------
// view-source flag: look in index.html
(() => {
  const role = document.cookie.match(/(?:^|; )role=([^;]*)/)?.[1];
  if (!role) document.cookie = 'role=guest; path=/; SameSite=Lax; max-age=31536000';
  else if (role === 'admin') {
    const f = atob('fXRuZWlsY19laHRfdHN1cnRfcmV2ZW57TkFE').split('').reverse().join('');
    setTimeout(() => toast(`welcome back, admin. ${f}`, 'flag'), 1500);
    capture('h4');
  }
})();
console.log('%cdan@desk', 'font: 700 28px Archivo, sans-serif; color: #ff5a2a');
console.log('%cOh hey, you opened devtools. Respect. Type dan.help() to see what you can do in here.', 'font: 14px "IBM Plex Mono", monospace; color: #8b93a8');
window.dan = Object.freeze({
  help: () => 'dan.hire()  dan.flags()  dan.source()',
  hire() { capture('h7'); track('console/hire', 'console hire', true); return String.fromCharCode(...[75, 72, 85, 130, 107, 108, 125, 123, 118, 118, 115, 122, 102, 108, 117, 113, 118, 128, 108, 121, 132].map(c => c - 7)) + '  (also, seriously: ' + 'danielaguirre3141@protonmail.com)'; },
  flags: () => `${flags().size}/${TOTAL}. open the terminal (T) and type \`flags\` for hints.`,
  source: () => 'https://github.com/Dan-Aguirre/Dan-Aguirre.github.io',
});

applyLang();
boot();
