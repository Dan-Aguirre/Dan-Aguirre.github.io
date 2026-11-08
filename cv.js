import { pack, pickLang, saveLang, LANG_NAMES } from './content.js';
import { renderSection, contactLinks } from './render.js';
import { track } from './track.js';

const MAIN = ['about', 'work', 'comps', 'certs', 'lab', 'teach', 'biz'];
const OFF = ['familia', 'summit', 'lake', 'pitch', 'dance', 'fire', 'hammock', 'gym'];
let lang = pickLang();
track('/cv', 'Recruiter mode');

function render() {
  const T = pack(lang);
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach((e) => { e.textContent = e.dataset.t.split('.').reduce((o, k) => o?.[k], T) ?? ''; });
  document.querySelector('#heroLinks').replaceChildren(contactLinks(T));
  const nav = document.querySelector('.cv-nav');
  const root = document.querySelector('#sections');
  nav.replaceChildren(); root.replaceChildren();
  for (const id of MAIN) {
    const s = document.createElement('section');
    s.className = 'section'; s.id = id;
    renderSection(id, T, s);
    root.append(s);
    const a = document.createElement('a');
    a.href = '#' + id; a.textContent = T.places[id];
    nav.append(a);
  }
  // off the clock: the outdoor stuff, compact
  const off = document.createElement('section');
  off.className = 'section'; off.id = 'off';
  const k = document.createElement('p'); k.className = 'kicker'; k.textContent = '~/outside';
  const h = document.createElement('h2'); h.className = 'title'; h.textContent = T.ui.offClock;
  const grid = document.createElement('div'); grid.className = 'off-grid';
  for (const id of OFF) {
    const s = T.s[id], c = document.createElement('article');
    const h3 = document.createElement('h3'); h3.textContent = s.title;
    const p = document.createElement('p'); p.textContent = s.body[0];
    const lab = document.createElement('span'); lab.className = 'kicker'; lab.textContent = s.label;
    c.append(lab, h3, p);
    grid.append(c);
  }
  off.append(k, h, grid);
  root.append(off);
  const a = document.createElement('a'); a.href = '#off'; a.textContent = T.ui.offClock; nav.append(a);
  const c = document.createElement('section'); c.className = 'section'; c.id = 'contact';
  renderSection('contact', T, c);
  root.append(c);
  const ac = document.createElement('a'); ac.href = '#contact'; ac.textContent = T.places.contact; nav.append(ac);
  document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  document.querySelector('.cv-back').href = './?lang=' + lang;
}

for (const l of Object.keys(LANG_NAMES)) {
  const b = document.createElement('button');
  b.textContent = LANG_NAMES[l]; b.dataset.lang = l;
  b.addEventListener('click', () => { lang = l; saveLang(l); render(); });
  document.querySelector('.lang').append(b);
}
if (new URLSearchParams(location.search).has('nowebgl')) document.querySelector('.cv-nowebgl').hidden = false;
document.querySelector('#yr').textContent = new Date().getFullYear();
document.addEventListener('click', (e) => { const a = e.target.closest('[data-track]'); if (a) track(a.dataset.track, a.dataset.track, true); });
render();
