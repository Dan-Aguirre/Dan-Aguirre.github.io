import { pack, pickLang, saveLang, LANG_NAMES } from './content.js';
import { createWorld } from './world.js';
import { initAudio, setMuted, isMuted } from './audio.js';
import { createTerminal } from './term.js';
import { renderSection } from './render.js';
import { flags, capture, onFlagChange, TOTAL } from './flags.js';
import { track } from './track.js';

const $ = (s) => document.querySelector(s);
const touch = matchMedia('(pointer: coarse)').matches;
let lang = pickLang(), T = pack(lang);
track(location.pathname, document.title);

// No WebGL? Straight to the readable version.
if (!document.createElement('canvas').getContext('webgl2')) location.replace('cv.html?nowebgl=1&lang=' + lang);

// ---------- progression: a suggested route, but go wherever ----------
const ROUTE = {
  desk: ['about', 'work', 'comps', 'certs', 'lab', 'teach', 'biz', 'terminal', 'contact'],
  out: ['familia', 'dance', 'lake', 'pitch', 'gym', 'summit', 'fire', 'hammock'],
};
let seen = new Set();
try { seen = new Set(JSON.parse(localStorage.getItem('dan.seen') || '[]')); } catch {}
const markSeen = (id) => { if (seen.has(id)) return; seen.add(id); try { localStorage.setItem('dan.seen', JSON.stringify([...seen])); } catch {} updateProgress(); };

// ---------- i18n for static UI ----------
function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = e.dataset.t.split('.').reduce((o, k) => o?.[k], T) ?? e.textContent; });
  $('#keys').replaceChildren(...(touch ? [Object.assign(document.createElement('span'), { textContent: T.ui.touch })] : T.ui.keys.map(([k, v]) => {
    const s = document.createElement('span');
    const kbd = document.createElement('kbd'); kbd.textContent = k;
    s.append(kbd, ' ' + v);
    return s;
  })));
  document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.querySelectorAll('#recruiterLink, .recruiter').forEach(a => { a.href = 'cv.html?lang=' + lang; });
  world?.refreshLabels();
  if (zone && T.s[zone]) showCard(zone);
  buildPlaces();
  updateProgress();
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
  document.querySelector('.lang').append(b);
}

// ---------- toasts ----------
let toastT = 0;
function toast(text, cls = '') {
  const t = $('#toast');
  t.textContent = text;
  t.className = 'toast show ' + cls;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.className = 'toast'; }, 3200);
}

// ---------- the world ----------
const input = { up: false, down: false, left: false, right: false, boost: false, brake: false, joy: { active: false, x: 0, y: 0 } };
let world = null, zone = null, cardClosed = false, goals = 0;

function showCard(id) {
  const c = $('#card');
  renderSection(id, T, c.querySelector('.card-body'), { heading: 'h2' });
  c.dataset.zone = id;
  c.classList.add('show');
  c.querySelector('.card-body').scrollTop = 0;
}
const hideCard = () => $('#card').classList.remove('show');

function onZone(id) {
  zone = id;
  cardClosed = false;
  if (id && T.s[id]) { showCard(id); markSeen(id); } else hideCard();
  const p = $('#prompt');
  const msg = id === 'terminal' ? (touch ? T.ui.termHintTouch : T.ui.termHint) : id === 'portal' ? T.ui.portalHint : '';
  p.textContent = msg;
  p.classList.toggle('show', !!msg);
  p.disabled = id !== 'terminal';
  if (id === 'terminal') markSeen('terminal');
  updateProgress();
}

function updateProgress() {
  if (!world) return;
  const w = world.world;
  const route = ROUTE[w];
  const next = route.find(id => !seen.has(id));
  const done = route.filter(id => seen.has(id)).length;
  $('#progress .count').textContent = `${done}/${route.length}`;
  $('#progress .where').textContent = w === 'desk' ? T.ui.deskWorld : T.ui.outWorld;
  const target = next || (w === 'desk' ? 'window' : null);
  $('#progress .next').textContent = target ? '→ ' + (target === 'window' ? T.places.outside : T.places[target]) : '✓';
  $('#progress').style.setProperty('--p', done / route.length);
  world.setGuide(target);
}

function onTransition(to, mid, done) {
  const ov = $('#warp'), out = ov.querySelector('pre');
  out.textContent = '';
  ov.hidden = false;
  requestAnimationFrame(() => ov.classList.add('on'));
  hideCard();
  const lines = to === 'out' ? T.ui.toOutside : T.ui.toDesk;
  lines.forEach((l, i) => setTimeout(() => { out.textContent += l + '\n'; }, 250 + i * 330));
  const total = 250 + lines.length * 330 + 250;
  setTimeout(() => { mid(); track(to === 'out' ? 'world/outside' : 'world/desk', to, true); }, total);
  setTimeout(() => ov.classList.remove('on'), total + 200);
  setTimeout(() => { ov.hidden = true; done(); }, total + 800);
}

const term = createTerminal({
  root: $('#term'),
  getT: () => T,
  world: { setLaptop: (l) => world?.setLaptop(l), teleport: (id) => world?.teleport(id), duck: () => world?.duck() },
  setLang,
  onClose: () => closeTerm(),
});
function openTerm() { if (!world) return; term.open(); world.setControls(false); track('terminal', 'terminal', true); }
function closeTerm() { term.close(); world?.setControls(true); }

function buildPlaces() {
  const list = $('#places .list');
  if (!world) return;
  list.replaceChildren();
  const group = (title, ids) => {
    const h = document.createElement('p'); h.className = 'kicker'; h.textContent = title; list.append(h);
    for (const id of ids) {
      const b = document.createElement('button');
      b.textContent = T.places[id];
      if (seen.has(id)) b.classList.add('seen');
      b.addEventListener('click', () => { $('#places').hidden = true; if (id === 'terminal') { world.teleport('terminal'); } else world.teleport(id); });
      list.append(b);
    }
  };
  group(T.ui.deskWorld, ['spawn', ...ROUTE.desk]);
  group(T.ui.outWorld, ['outside', ...ROUTE.out]);
}

function updateFlags() { $('#flagCount').textContent = `${flags().size}/${TOTAL}`; }
onFlagChange((id) => {
  updateFlags();
  if (flags().size === TOTAL) setTimeout(() => toast(T.ui.allFlags, 'big'), 1800);
});
updateFlags();

async function boot() {
  const fonts = ['800 64px Archivo', '700 64px Archivo', '600 44px Caveat', '500 28px "IBM Plex Mono"', '700 54px "IBM Plex Mono"'];
  await Promise.race([Promise.all(fonts.map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 3000))]);
  world = createWorld($('#scene'), {
    input,
    labelsEl: $('#labels'),
    labelFor: (id) => (T.s[id]?.label) || (id === 'terminal' ? '~/terminal' : id === 'window' ? '~/outside →' : id === 'portal' ? '~/desk' : id),
    onZone,
    onFlag: (id, text) => { if (capture(id)) toast(`⚑ ${T.ui.flag}: ${text}`, 'flag'); },
    onToast: (k) => toast(T.ui[k]),
    onWorld: () => { updateProgress(); },
    onGoal: () => { goals++; toast(`${T.ui.goal}  ×${goals}`, 'big'); track('goal', 'goal', true); },
    onTransition,
  });
  world.markFlags(flags());
  applyLang();
  document.body.classList.add('ready');
  $('#start').disabled = false;
}

$('#start').addEventListener('click', () => {
  initAudio();
  $('#intro').classList.add('gone');
  document.body.classList.add('playing');
  world.start();
  updateProgress();
  track('start', 'start', true);
  setTimeout(() => $('#intro').remove(), 900);
});

// ---------- HUD buttons ----------
$('#cardClose').addEventListener('click', () => { hideCard(); cardClosed = true; });
$('#prompt').addEventListener('click', () => { if (zone === 'terminal') openTerm(); });
$('#termBtn').addEventListener('click', () => (term.isOpen ? closeTerm() : openTerm()));
$('#termClose').addEventListener('click', () => closeTerm());
$('#placesBtn').addEventListener('click', () => { buildPlaces(); $('#places').hidden = !$('#places').hidden; });
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
  kon = e.code === KONAMI[kon] ? kon + 1 : (e.code === KONAMI[0] ? 1 : 0);
  if (kon === KONAMI.length) { kon = 0; world?.duck(); toast('🦆 quack mode'); track('konami', 'konami', true); }
  if (KEYS[e.code]) {
    input[KEYS[e.code]] = true; e.preventDefault();
    if (!movedOnce && document.body.classList.contains('playing')) { movedOnce = true; setTimeout(() => $('#keys').classList.add('fade'), 6000); }
  }
  if (!document.body.classList.contains('playing')) { if (e.code === 'Enter' && !$('#start').disabled) $('#start').click(); return; }
  if (e.code === 'KeyE' || e.code === 'Enter') { if (zone === 'terminal') openTerm(); }
  if (e.code === 'KeyR') world?.reset();
  if (e.code === 'KeyH') world?.honk();
  if (e.code === 'KeyM') snd.click();
  if (e.code === 'KeyT' || e.code === 'Backquote') { e.preventDefault(); openTerm(); }
  if (e.code === 'Escape') { $('#places').hidden = true; hideCard(); }
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
