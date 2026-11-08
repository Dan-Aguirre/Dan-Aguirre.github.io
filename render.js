// Turns a content section into DOM. Used by the 3D cards and by recruiter mode.
import { LINKS, SKILLS, CERTS } from './content.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function contactLinks(T) {
  const wrap = el('div', 'links');
  const add = (href, text, cls = '') => {
    const a = el('a', 'btn ' + cls, text);
    a.href = href;
    if (href.startsWith('http')) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    wrap.append(a);
    return a;
  };
  add('mailto:' + LINKS.email, LINKS.email, 'primary');
  add(LINKS.linkedin, 'LinkedIn');
  add(LINKS.github, 'GitHub');
  add(LINKS.resume, T.ui.download).dataset.track = 'resume';
  return wrap;
}

export function renderSection(id, T, root, { heading = 'h2' } = {}) {
  const s = T.s[id];
  root.replaceChildren();
  root.append(el('p', 'kicker', s.label), el(heading, 'title', s.title));
  if (s.lead) root.append(el('p', 'lead', s.lead));
  for (const p of s.body || []) root.append(el('p', '', p));
  if (s.facts) {
    const dl = el('dl', 'facts');
    for (const [k, v] of s.facts) dl.append(el('dt', '', k), el('dd', '', v));
    root.append(dl);
  }
  if (id === 'certs') {
    const ul = el('ul', 'certs');
    for (const [name, wip] of CERTS) {
      const li = el('li', wip ? 'wip' : '', name);
      if (wip) li.append(el('span', 'pill', s.wip));
      ul.append(li);
    }
    root.append(ul, el('p', 'school', s.school));
  }
  if (s.items) {
    const list = el('div', 'entries');
    for (const it of s.items) {
      const e = el('article', 'entry');
      const head = el('div', 'entry-head');
      head.append(el('h3', '', it.h));
      if (it.when) head.append(el('span', 'when', it.when));
      e.append(head);
      if (it.role) e.append(el('p', 'role', it.role + (it.where ? ' · ' + it.where : '')));
      if (it.badge) e.append(el('p', 'badge', it.badge));
      e.append(el('p', '', it.t));
      list.append(e);
    }
    root.append(list);
  }
  if (id === 'lab') {
    root.append(el('p', 'kicker small', s.skills));
    const chips = el('div', 'chips');
    for (const k of SKILLS) chips.append(el('span', 'chip', k));
    root.append(chips);
  }
  if (id === 'contact') root.append(contactLinks(T));
  return root;
}
